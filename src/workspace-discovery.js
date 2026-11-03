import fs from 'node:fs/promises';
import path from 'node:path';
import { migrateStoredState, validateStoredState } from './contracts.js';
import { repositoryRoot } from './evidence.js';
import { agentDir, canonical, digest, plain, readJSON } from './util.js';

/**
 * Discover existing session-format assignments without changing state, locks, evidence or processes.
 * Invalid state is surfaced rather than treated as an empty assignment. A caller must still acquire
 * the original owner lock, prove worker exit and validate evidence before attempting a takeover.
 * @param {string} cwd
 * @param {{sessionsDir?: string, includeIdle?: boolean}} [options]
 */
export async function discoverWorkspaceAssignments(cwd, { sessionsDir = path.join(agentDir(), 'fabric-pair', 'sessions'), includeIdle = false } = {}) {
  const workspace = await repositoryRoot(await canonical(cwd));
  let names;
  try { names = await fs.readdir(sessionsDir, { withFileTypes: true }); }
  catch (error) {
    if (plain(error) && error.code === 'ENOENT') return { workspace, assignments: [], issues: [] };
    throw error;
  }
  /** @type {{ownerSession: string, cwd: string, directory: string, ownerEpoch: number, tasks: {workerId: string, taskId: string, status: string, reportId: string | null, checkpointHash: string | null}[]}[]} */
  const assignments = [];
  /** @type {{directory: string, reason: string}[]} */
  const issues = [];
  for (const entry of names) {
    if (!entry.isDirectory() || !/^[a-f0-9]{32}$/.test(entry.name)) continue;
    const directory = path.join(sessionsDir, entry.name);
    let raw;
    try { raw = await readJSON(path.join(directory, 'state.json'), null); }
    catch (error) { issues.push({ directory, reason: `Unreadable state: ${error instanceof Error ? error.message : String(error)}` }); continue; }
    if (raw === null) continue;
    if (!plain(raw) || typeof raw.cwd !== 'string' || typeof raw.ownerSession !== 'string' || !raw.ownerSession) {
      issues.push({ directory, reason: 'Invalid or missing state identity' }); continue;
    }
    try {
      const state = validateStoredState(migrateStoredState(raw).state, { cwd: raw.cwd, ownerSession: raw.ownerSession });
      const origin = state.workspaceOrigin || { cwd: state.cwd, ownerSession: state.ownerSession };
      if (digest(`${origin.cwd}\0${origin.ownerSession}`).slice(0, 32) !== entry.name) throw new Error('State path does not match its owner and workspace origin');
      const stateRoot = await repositoryRoot(state.cwd).catch(() => null);
      const tasks = Object.values(state.workers).flatMap(record => {
        const task = record.task;
        if (!task || ['completed', 'cancelled'].includes(task.status) || (record.repoRoot || stateRoot) !== workspace) return [];
        return [{ workerId: record.id, taskId: task.id, status: task.status, reportId: task.report?.reportId ?? null, checkpointHash: task.report?.checkpoint?.checkpointHash ?? null }];
      });
      const belongs = stateRoot === workspace || Object.values(state.workers).some(record => record.repoRoot === workspace);
      if (tasks.length || (includeIdle && belongs)) assignments.push({ ownerSession: state.ownerSession, cwd: state.cwd, directory, ownerEpoch: state.ownerEpoch, tasks });
    } catch (error) { issues.push({ directory, reason: error instanceof Error ? error.message : String(error) }); }
  }
  assignments.sort((a, b) => a.directory.localeCompare(b.directory));
  issues.sort((a, b) => a.directory.localeCompare(b.directory));
  return { workspace, assignments, issues };
}
