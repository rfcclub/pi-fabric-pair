import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, plain, safeId } from './util.js';

/** @param {{workspace: string, change: string, layout?: 'openspec' | 'loomkit'}} link @param {string} taskId */
export function loomkitLinkPath(link, taskId) {
  safeId(link.change, 'LoomKit change'); safeId(taskId, 'taskId');
  return path.join(link.workspace, link.layout || 'openspec', 'changes', link.change, `.pair-checkpoint-${taskId}.json`);
}

/** Match the LoomKit CLI's preference for openspec/ when both layouts exist. @param {string} workspace */
export async function loomkitLayout(workspace) {
  try { if ((await fs.stat(path.join(workspace, 'openspec'))).isDirectory()) return /** @type {const} */ ('openspec'); }
  catch (error) { if (!plain(error) || error.code !== 'ENOENT') throw error; }
  return /** @type {const} */ ('loomkit');
}

/**
 * Sync Pair identity alongside an explicitly associated LoomKit change. This never edits the
 * LoomKit checklist or asserts a gate result. The reserved metadata path is excluded from Pair's
 * worker evidence, so updating this bookkeeping cannot make an unchanged checkpoint stale.
 * @param {import('./contracts.js').StoredStateV1} state
 * @param {import('./contracts.js').StoredWorkerV1} worker
 */
export async function syncLoomkitLink(state, worker) {
  const task = worker.task, link = task?.loomkit;
  assert(task && link, 'Task has no LoomKit association.');
  safeId(link.change, 'LoomKit change'); safeId(task.id, 'taskId');
  const root = await fs.realpath(link.workspace), repo = await fs.realpath(worker.repoRoot);
  assert(root === repo, 'LoomKit workspace differs from the worker repository.');
  const directory = path.join(root, link.layout || 'openspec', 'changes', link.change);
  const realDirectory = await fs.realpath(directory);
  assert(realDirectory === directory, 'LoomKit change path must not redirect elsewhere.');
  assert((await fs.stat(path.join(directory, 'tasks.md'))).isFile(), 'LoomKit change is missing tasks.md.');
  const target = loomkitLinkPath(link, task.id), report = task.report, decision = report ? task.decisions[report.reportId] : null;
  const value = {
    version: 1, managedBy: 'fabric-pair', workspace: root, change: link.change, workerId: worker.id, taskId: task.id,
    ownerSession: state.ownerSession, ownerEpoch: state.ownerEpoch, taskStatus: task.status,
    report: report ? { reportId: report.reportId, ownerSession: report.ownerSession, ownerEpoch: report.ownerEpoch,
      workerGeneration: report.workerGeneration, attemptId: report.attemptId, planRevision: report.planRevision,
      checkpointHash: report.checkpoint.checkpointHash, checkpointPath: report.checkpoint.path,
      pairDecision: decision?.action || null } : null,
    loomkitChecklist: 'authoritative-not-modified', gateCode: 'not-inferred'
  };
  const encoded = `${JSON.stringify(value, null, 2)}\n`;
  try {
    await fs.writeFile(target, encoded, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (!plain(error) || error.code !== 'EEXIST') throw error;
    const stat = await fs.lstat(target);
    assert(stat.isFile() && !stat.isSymbolicLink(), 'LoomKit metadata path is not a regular file.');
    const existing = JSON.parse(await fs.readFile(target, 'utf8'));
    assert(plain(existing) && existing.version === 1 && existing.managedBy === 'fabric-pair' && existing.workspace === root
      && existing.change === link.change && existing.workerId === worker.id && existing.taskId === task.id,
    'LoomKit metadata path is already occupied by another file; nothing was overwritten.');
    if (JSON.stringify(existing) !== JSON.stringify(value)) await atomicJSON(target, value);
  }
  return { path: target, value };
}
