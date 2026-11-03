import path from 'node:path';
import { Evidence } from './evidence.js';
import { migrateStoredState, validateStoredState } from './contracts.js';
import { assert, plain, readJSON, safeId } from './util.js';
import { discoverWorkspaceAssignments } from './workspace-discovery.js';

/** Read an exact retained review without adopting the old controller or acknowledging its notice.
 * @param {{workspace: string, ownerSession: string, workerId: string, taskId: string, reportId: string, file?: string, limits: {maxFiles: number, maxTotalBytes: number, maxArtifactBytes: number}, sessionsDir?: string}} input
 */
export async function inspectWorkspaceReport(input) {
  const { workspace, ownerSession, workerId, taskId, reportId, file, limits, sessionsDir } = input;
  safeId(workerId, 'workerId'); safeId(taskId, 'taskId'); safeId(reportId, 'reportId');
  const discovered = await discoverWorkspaceAssignments(workspace, { sessionsDir });
  const matches = discovered.assignments.filter(a => a.ownerSession === ownerSession && a.tasks.some(t => t.workerId === workerId && t.taskId === taskId && t.reportId === reportId));
  assert(matches.length === 1, matches.length ? 'Ambiguous retained report identity; no checkpoint was selected.' : 'No matching retained report in this workspace.');
  const assignment = matches[0], stateFile = path.join(assignment.directory, 'state.json');
  /** @returns {Promise<import('./contracts.js').StoredStateV1>} */
  const load = async () => validateStoredState(migrateStoredState(await readJSON(stateFile)).state, { ownerSession: assignment.ownerSession, cwd: assignment.cwd });
  const state = await load(), task = state.workers[workerId]?.task, report = task?.report;
  assert(task?.id === taskId && report?.reportId === reportId && report.workerId === workerId, 'Retained report changed; discover it again.');
  const evidenceRoot = path.join(assignment.directory, 'evidence');
  const expected = path.resolve(evidenceRoot, 'reports', taskId, reportId);
  assert(path.resolve(report.checkpoint.path) === expected, 'Retained checkpoint path does not match its task and report.');
  const manifest = await readJSON(path.join(expected, 'manifest.json'));
  assert(plain(manifest) && manifest.taskId === taskId && manifest.reportId === reportId && manifest.checkpointHash === report.checkpoint.checkpointHash, 'Retained checkpoint manifest identity mismatch.');
  assert(JSON.stringify(manifest.changed) === JSON.stringify(report.checkpoint.changed)
    && JSON.stringify(manifest.verification) === JSON.stringify(report.checkpoint.verification)
    && manifest.patchTruncated === report.checkpoint.patchTruncated, 'Retained checkpoint manifest differs from the report.');
  if (file !== undefined) assert(report.checkpoint.changed.includes(file), 'Requested file is not in the retained report.');
  const evidence = await new Evidence(evidenceRoot, limits).inspect(expected, file);
  assert(evidence.checkpointHash === report.checkpoint.checkpointHash, 'Retained checkpoint hash mismatch.');
  if ('changed' in evidence) assert(JSON.stringify(evidence.changed) === JSON.stringify(report.checkpoint.changed)
    && JSON.stringify(evidence.verification) === JSON.stringify(report.checkpoint.verification)
    && evidence.patchTruncated === report.checkpoint.patchTruncated, 'Retained checkpoint summary changed during inspection.');
  assert(JSON.stringify(await readJSON(path.join(expected, 'manifest.json'))) === JSON.stringify(manifest), 'Retained checkpoint manifest changed during inspection.');
  const after = (await load()).workers[workerId]?.task;
  assert(after?.id === taskId && JSON.stringify(after.report) === JSON.stringify(report), 'Retained report changed during inspection; try again.');
  return { workerId, taskId, reportId, ownerSession: report.ownerSession, ownerEpoch: report.ownerEpoch,
    workerGeneration: report.workerGeneration, attemptId: report.attemptId, planRevision: report.planRevision,
    checkpointHash: report.checkpoint.checkpointHash, payload: report.payload, verification: report.checkpoint.verification,
    status: task.status, evidence, discoveryIssues: discovered.issues, reviewAuthorized: false,
    patchAuthenticated: false,
    message: 'Read-only inspection: ownership was not transferred, the notice was not acknowledged, and this does not authorize approval. The summary patch is not authenticated; inspect individual changed files against their snapshot hashes.' };
}
