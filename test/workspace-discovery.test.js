import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { discoverWorkspaceAssignments } from '../src/workspace-discovery.js';
import { digest } from '../src/util.js';

async function fixture(run) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pair-discovery-'));
  const repo = path.join(base, 'repo'), other = path.join(base, 'other'), sessionsDir = path.join(base, 'sessions');
  await fs.mkdir(repo); await fs.mkdir(other); await fs.mkdir(sessionsDir);
  execFileSync('git', ['init', '-q'], { cwd: repo }); execFileSync('git', ['init', '-q'], { cwd: other });
  const cwd = await fs.realpath(repo), otherCwd = await fs.realpath(other);
  const put = async (owner, stateCwd = cwd, overrides = {}) => {
    const dir = path.join(sessionsDir, digest(`${stateCwd}\0${owner}`).slice(0, 32));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'state.json'), JSON.stringify({ version: 1, cwd: stateCwd, ownerSession: owner, ownerEpoch: 1, workers: {}, requests: {}, notices: {}, ...overrides }));
    return dir;
  };
  try { await run({ cwd, otherCwd, sessionsDir, put }); }
  finally { await fs.rm(base, { recursive: true, force: true }); }
}

test('discovers validated legacy sessions for only the canonical workspace without changing state', async () => fixture(async ({ cwd, otherCwd, sessionsDir, put }) => {
  const subdirectory = path.join(cwd, 'nested'); await fs.mkdir(subdirectory);
  const nestedCwd = await fs.realpath(subdirectory);
  const dir = await put('old-owner', nestedCwd); await put('other-owner', otherCwd);
  const file = path.join(dir, 'state.json'), before = await fs.readFile(file);
  assert.deepEqual((await discoverWorkspaceAssignments(cwd, { sessionsDir })).assignments, []);
  const result = await discoverWorkspaceAssignments(cwd, { sessionsDir, includeIdle: true });
  assert.equal(result.assignments.length, 1); assert.equal(result.assignments[0].ownerSession, 'old-owner');
  assert.equal(result.assignments[0].directory, dir); assert.deepEqual(result.issues, []);
  assert.deepEqual(await fs.readFile(file), before);
}));

test('surfaces invalid state and path identity rather than adopting it', async () => fixture(async ({ cwd, sessionsDir, put }) => {
  await put('bad-version', cwd, { version: 999 });
  const misplaced = path.join(sessionsDir, 'a'.repeat(32)); await fs.mkdir(misplaced);
  await fs.writeFile(path.join(misplaced, 'state.json'), JSON.stringify({ version: 1, cwd, ownerSession: 'wrong-path', ownerEpoch: 1, workers: {}, requests: {}, notices: {} }));
  const result = await discoverWorkspaceAssignments(cwd, { sessionsDir, includeIdle: true });
  assert.equal(result.assignments.length, 0); assert.equal(result.issues.length, 2);
  assert.match(result.issues.map(issue => issue.reason).join('\n'), /Unsupported|version/i);
  assert.match(result.issues.map(issue => issue.reason).join('\n'), /path does not match/i);
}));

test('a missing session directory produces an empty result without creating it', async () => fixture(async ({ cwd, sessionsDir }) => {
  const missing = path.join(sessionsDir, 'missing');
  const result = await discoverWorkspaceAssignments(cwd, { sessionsDir: missing });
  assert.deepEqual(result.assignments, []); assert.deepEqual(result.issues, []);
  await assert.rejects(fs.stat(missing), { code: 'ENOENT' });
}));
