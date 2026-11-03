import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { acquireLock } from '../src/util.js';

async function fixture(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pair-lock-race-'));
  const lock = path.join(dir, '.owner-lock'); await fs.mkdir(lock);
  const old = { pid: 123456, startedAt: Date.now(), ownerSession: 'old' };
  await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify(old));
  const original = process.kill;
  process.kill = (pid, signal) => {
    if (pid === old.pid) { const error = new Error('no such process'); error.code = 'ESRCH'; throw error; }
    return original(pid, signal);
  };
  try { await run({ dir, lock, old }); }
  finally { process.kill = original; await fs.rm(dir, { recursive: true, force: true }); }
}

test('concurrent stale-lock takeovers have at most one owner', () => fixture(async ({ dir, lock }) => {
  let enter, resume;
  const entered = new Promise(resolve => { enter = resolve; });
  const proceed = new Promise(resolve => { resume = resolve; });
  const first = acquireLock(dir, { ownerSession: 'new-a' }, { takeover: async () => { enter(); await proceed; } });
  await entered;
  await assert.rejects(acquireLock(dir, { ownerSession: 'new-b' }), /takeover.*in progress/i);
  assert.equal(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')).ownerSession, 'old');
  resume(); const release = await first;
  assert.equal(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')).ownerSession, 'new-a');
  await assert.rejects(acquireLock(dir, { ownerSession: 'new-b' }), /already owned/i);
  await release();
}));

test('a process killed mid-takeover releases its guard so the next controller can recover', { timeout: 10000 }, () => fixture(async ({ dir, lock, old }) => {
  const helper = fileURLToPath(new URL('./helpers/hold-takeover.js', import.meta.url));
  const child = spawn(process.execPath, [helper, dir], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      let text = '';
      child.stdout.on('data', chunk => { text += chunk; if (text.includes('guard-entered')) resolve(); });
      child.once('error', reject); child.once('exit', code => reject(new Error(`takeover child exited before entering guard: ${code}`)));
    });
    await assert.rejects(acquireLock(dir, { ownerSession: 'other' }), /takeover.*in progress/i);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')), old);
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGKILL'); await exited;
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')), old);
    let guarded = false;
    const release = await acquireLock(dir, { ownerSession: 'recovered' }, { takeover: async () => { guarded = true; } });
    assert.equal(guarded, true);
    assert.equal(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')).ownerSession, 'recovered');
    await release();
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
}));
