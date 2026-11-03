import fs from 'node:fs/promises';
import path from 'node:path';
import { migrateStoredState, validateStoredState, incrementCounter } from './contracts.js';
import { assert, canonical, digest, mkdirPrivate, plain } from './util.js';
import { inspectWorkspaceReport } from './workspace-inspect.js';

/**
 * Read and preflight an old assignment while its existing owner lock is held. No authority or
 * task is changed here. The byte-exact state preimage is kept outside the implementation repo.
 * @param {import('./controller.js').PairController} controller
 * @param {{directory: string, cwd: string, ownerSession: string, taskId: string, workerId: string}} target
 */
export async function prepareWorkspaceTransfer(controller, target) {
  const stateFile = path.join(target.directory, 'state.json');
  const raw = await fs.readFile(stateFile, 'utf8');
  const state = validateStoredState(migrateStoredState(JSON.parse(raw)).state, { ownerSession: target.ownerSession, cwd: target.cwd });
  assert(state.ownerSession !== controller.ownerSession, 'This assignment is already owned by the current Main session.');
  const selected = state.workers[target.workerId]?.task;
  assert(selected?.id === target.taskId && !['completed', 'cancelled'].includes(selected.status), 'The retained task changed or is no longer active.');
  const active = Object.values(state.workers).filter(record => record.task && !['completed', 'cancelled'].includes(record.task.status));
  assert(active.length === 1, 'The previous Main owns multiple unfinished tasks; a single-task transfer cannot safely move the others. All assignments stay held.');
  assert((state.ownerTransitions?.length || 0) < 256, 'Owner transition history is full; the assignment stays held.');
  controller.state = state;
  for (const record of Object.values(state.workers)) {
    if (record.status !== 'stopped' || typeof record.pid === 'number') {
      const proof = await controller.exitProof(record);
      assert(proof.exited, `EXIT_UNCONFIRMED: ${record.id}: ${proof.reason} The retained assignment stays held.`);
    }
    if (!record.task || ['completed', 'cancelled'].includes(record.task.status)) continue;
    const spec = controller.config.workers.find(worker => worker.id === record.id);
    assert(spec && await canonical(controller.workspaceFor(spec)) === await canonical(record.cwd), `Worker ${record.id} is not configured for its retained workspace; the assignment stays held.`);
    if (record.task.pendingReport) assert(['awaiting_settle', 'interrupted', 'paused'].includes(record.task.status), `Worker ${record.id} has an inconsistent unfinished report; the assignment stays held.`);
    if (record.task.report) {
      await inspectWorkspaceReport({ workspace: record.repoRoot, ownerSession: state.ownerSession, workerId: record.id,
        taskId: record.task.id, reportId: record.task.report.reportId, limits: controller.config.evidence,
        sessionsDir: path.dirname(target.directory) });
    }
  }
  const backupHash = digest(raw), backupDir = path.join(target.directory, 'owner-history');
  await mkdirPrivate(backupDir);
  const backupFile = path.join(backupDir, `${backupHash}.json`);
  try {
    const handle = await fs.open(backupFile, 'wx', 0o600);
    try { await handle.writeFile(raw, 'utf8'); await handle.sync(); } finally { await handle.close(); }
  } catch (error) {
    if (!plain(error) || error.code !== 'EEXIST') throw error;
    assert(digest(await fs.readFile(backupFile, 'utf8')) === backupHash, 'Existing transition preimage hash mismatch.');
  }
  const next = structuredClone(state);
  next.workspaceOrigin ||= { cwd: state.cwd, ownerSession: state.ownerSession };
  next.ownerTransitions ||= [];
  next.ownerTransitions.push({ ownerSession: state.ownerSession, throughEpoch: state.ownerEpoch, changedAt: Date.now(), backupHash });
  next.ownerSession = controller.ownerSession;
  next.ownerEpoch = incrementCounter(state.ownerEpoch, 'state.ownerEpoch');
  delete next.mainPhase;
  for (const record of Object.values(next.workers)) {
    delete record.lastObservation; delete record.probe;
    record.status = 'stopped'; record.error = null;
    if (!record.task || ['completed', 'cancelled'].includes(record.task.status)) continue;
    record.freshSession = true;
    if (['running', 'activating', 'awaiting_settle'].includes(record.task.status)) {
      record.task.status = 'interrupted';
      record.task.interruption = 'Main session changed after an abrupt stop. Inspect the last checkpoint and LoomKit plan; a fresh worker is required. No work was replayed.';
    }
  }
  return { state: validateStoredState(next, { ownerSession: controller.ownerSession, cwd: target.cwd }), backupHash };
}
