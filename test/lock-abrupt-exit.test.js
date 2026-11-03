import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { acquireLock } from '../src/util.js';

test('a real abruptly terminated owner leaves a safely reclaimable lock', { timeout: 10000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pair-abrupt-'));
  const lock = path.join(dir, '.owner-lock'); await fs.mkdir(lock);
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  try {
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    const old = { pid: child.pid, startedAt: Date.now(), ownerSession: 'abrupt-owner' };
    await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify(old));
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGKILL'); await exited;
    let guarded = false;
    const release = await acquireLock(dir, { ownerSession: 'replacement' }, { takeover: async owner => { guarded = true; assert.equal(owner.ownerSession, 'abrupt-owner'); } });
    assert.equal(guarded, true);
    assert.equal(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')).ownerSession, 'replacement');
    await release();
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await fs.rm(dir, { recursive: true, force: true });
  }
});
