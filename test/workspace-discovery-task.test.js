import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { discoverWorkspaceAssignments } from '../src/workspace-discovery.js';
import { digest } from '../src/util.js';

test('an unfinished task from a different Pi session is discoverable without replay', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pair-discovery-task-'));
  try {
    const repo = path.join(base, 'repo'), mainRepo = path.join(base, 'main'), sessionsDir = path.join(base, 'sessions');
    await fs.mkdir(repo); await fs.mkdir(mainRepo);
    execFileSync('git', ['init', '-q'], { cwd: repo }); execFileSync('git', ['init', '-q'], { cwd: mainRepo });
    const cwd = await fs.realpath(repo), mainCwd = await fs.realpath(mainRepo), ownerSession = 'old-owner';
    const directory = path.join(sessionsDir, digest(`${mainCwd}\0${ownerSession}`).slice(0, 32));
    await fs.mkdir(directory, { recursive: true });
    const task = { id: 't1', requestId: 'q1', objective: 'o', context: '', constraints: [], steps: [{ id: 's1', title: 'One', instructions: 'i' }], stepIndex: 0, planRevision: 1,
      status: 'review', leaseId: 'l1', policy: { mode: 'milestones', finalReview: true, maxRevisions: 20, maxRevisionsPerStep: 3, summaryDetail: 'normal' },
      limits: { maxReportedCostUsd: null, maxOutputTokens: null, activeStepTimeoutMs: 1, maxReportsPerTask: 1, maxReportBytes: 1, maxAutomaticReportRepairs: 0, maxAutomaticRecoveryAttempts: 0 },
      verification: { commands: [], requirePassing: true, timeoutMs: 1000 }, startedAt: 1, updatedAt: 1, revisions: 0, turns: 0, usage: null,
      baseSnapshotRef: '/tmp/b.json', pendingReport: null, report: null, decisions: {}, lastDecision: null, workerId: 'w1', attemptId: 'a1', attemptNumber: 1 };
    const state = { version: 1, ownerSession, ownerEpoch: 1, cwd: mainCwd, requests: {}, notices: {}, workers: { w1: { id: 'w1', cwd, repoRoot: cwd, status: 'ready', sessionId: 's1', sessionFile: null, workerGeneration: 1,
      bound: { id: 'w1', provider: 'p', model: 'm', effort: 'high', cwd: null, readOnly: false }, history: [], usage: null, task } } };
    const stateFile = path.join(directory, 'state.json'); await fs.writeFile(stateFile, JSON.stringify(state));
    const before = await fs.readFile(stateFile);
    const result = await discoverWorkspaceAssignments(cwd, { sessionsDir });
    assert.deepEqual(result.issues, []); assert.equal(result.assignments.length, 1);
    assert.deepEqual(result.assignments[0].tasks, [{ workerId: 'w1', taskId: 't1', status: 'review', reportId: null, checkpointHash: null }]);
    assert.deepEqual(await fs.readFile(stateFile), before, 'discovery must not mutate retained state');
  } finally { await fs.rm(base, { recursive: true, force: true }); }
});
