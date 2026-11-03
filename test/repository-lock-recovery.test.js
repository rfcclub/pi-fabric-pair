import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PairController } from '../src/controller.js';
import { DEFAULTS } from '../src/config.js';
import { digest } from '../src/util.js';

async function fixture(run) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pair-repo-recovery-'));
  const repo = path.join(base, 'repo'), oldDir = path.join(base, 'old'), stateDir = path.join(base, 'new');
  await fs.mkdir(repo); await fs.mkdir(oldDir);
  const lock = path.join(base, 'repositories', digest(repo).slice(0, 32), '.writer-lock');
  await fs.mkdir(lock, { recursive: true });
  const owner = { pid: 123456, startedAt: Date.now(), ownerSession: 'old-owner', stateDir: oldDir, repoRoot: repo };
  await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify(owner));
  const controller = new PairController({ config: DEFAULTS, cwd: repo, ownerSession: 'new-owner', storageDir: stateDir });
  const original = process.kill;
  process.kill = (pid, signal) => { if (pid === owner.pid) { const error = new Error('no such process'); error.code = 'ESRCH'; throw error; } return original(pid, signal); };
  try { await run({ controller, repo, lock, oldDir, owner }); }
  finally { process.kill = original; await controller.releaseRepoLocks(true); await fs.rm(base, { recursive: true, force: true }); }
}
const emptyState = cwd => ({ version: 1, ownerSession: 'old-owner', ownerEpoch: 1, cwd, workers: {}, requests: {}, notices: {} });

test('a missing or damaged prior state never unlocks the repository', () => fixture(async ({ controller, repo, lock, oldDir, owner }) => {
  await assert.rejects(controller.ensureRepoLock(repo), /state is missing or unreadable/i);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')), owner);
  await fs.writeFile(path.join(oldDir, 'state.json'), '{bad json');
  await assert.rejects(controller.ensureRepoLock(repo));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')), owner);
}));

test('a valid prior state with no unfinished task permits guarded writer takeover', () => fixture(async ({ controller, repo, lock, oldDir }) => {
  await fs.writeFile(path.join(oldDir, 'state.json'), JSON.stringify(emptyState(repo)));
  await controller.ensureRepoLock(repo);
  assert.equal(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')).ownerSession, 'new-owner');
}));

test('a retained review keeps the repository held and never recommends deleting state', () => fixture(async ({ controller, repo, lock, oldDir, owner }) => {
  const task = { id: 't1', requestId: 'q1', objective: 'o', context: '', constraints: [], steps: [{ id: 's1', title: 'One', instructions: 'i' }], stepIndex: 0, planRevision: 1,
    status: 'review', leaseId: 'l1', policy: { mode: 'milestones', finalReview: true, maxRevisions: 20, maxRevisionsPerStep: 3, summaryDetail: 'normal' },
    limits: { maxReportedCostUsd: null, maxOutputTokens: null, activeStepTimeoutMs: 1, maxReportsPerTask: 1, maxReportBytes: 1, maxAutomaticReportRepairs: 0, maxAutomaticRecoveryAttempts: 0 },
    verification: { commands: [], requirePassing: true, timeoutMs: 1000 }, startedAt: 1, updatedAt: 1, revisions: 0, turns: 0, usage: null,
    baseSnapshotRef: '/tmp/b.json', pendingReport: null, report: null, decisions: {}, lastDecision: null, workerId: 'w1', attemptId: 'a1', attemptNumber: 1 };
  const state = emptyState(repo);
  state.workers.w1 = { id: 'w1', cwd: repo, repoRoot: repo, status: 'stopped', sessionId: 's1', sessionFile: null, workerGeneration: 1,
    bound: { id: 'w1', provider: 'p', model: 'm', effort: 'high', cwd: null, readOnly: false }, history: [], usage: null, task };
  await fs.writeFile(path.join(oldDir, 'state.json'), JSON.stringify(state));
  await assert.rejects(controller.ensureRepoLock(repo), error => /pair_discover/.test(error.message) && /do not delete state/i.test(error.message) && !/pi --session/i.test(error.message));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')), owner);
}));
