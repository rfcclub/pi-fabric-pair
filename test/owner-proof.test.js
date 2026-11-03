import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { acquireLock, ownerAlive, processStartedAt, processState } from '../src/util.js';

test('Windows process start proof uses real creation time and returns unknown for a nonexistent PID', { skip: process.platform !== 'win32' }, async () => {
  const before = Date.now();
  const start = await processStartedAt(process.pid);
  assert.ok(typeof start === 'number' && start > 0 && start <= before + 5000);
  assert.equal(await processStartedAt(2147483646), null);
  assert.equal(await processStartedAt(0), null);
});

test('an owner whose PID cannot be inspected is not treated as dead', async () => {
  const original = process.kill;
  try {
    process.kill = () => { const error = new Error('access denied'); error.code = 'EPERM'; throw error; };
    assert.equal(processState(123456), 'foreign');
    assert.equal(await ownerAlive({ pid: 123456, startedAt: Date.now() }), true, 'EPERM cannot prove the old owner exited');
  } finally { process.kill = original; }
});

test('a held lock is not removed when its owner returns EPERM', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pair-owner-denied-'));
  const lock = path.join(dir, '.owner-lock'); await fs.mkdir(lock);
  const old = { pid: 123456, startedAt: Date.now(), ownerSession: 'old' };
  await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify(old));
  const original = process.kill;
  try {
    process.kill = () => { const error = new Error('access denied'); error.code = 'EPERM'; throw error; };
    await assert.rejects(acquireLock(dir, { ownerSession: 'new' }), /already owned/i);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')), old);
  } finally { process.kill = original; await fs.rm(dir, { recursive: true, force: true }); }
});

test('stale Windows lock runs its guard before a dead owner can be replaced', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pair-owner-stale-'));
  const lock = path.join(dir, '.owner-lock'); await fs.mkdir(lock);
  const old = { pid: 123456, startedAt: Date.now(), ownerSession: 'old' };
  await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify(old));
  const original = process.kill; let guarded = 0;
  try {
    process.kill = () => { const error = new Error('no such process'); error.code = 'ESRCH'; throw error; };
    await assert.rejects(acquireLock(dir, { ownerSession: 'new' }, { takeover: async () => { guarded++; throw new Error('retained task held'); } }), /retained task held/);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')), old);
    const release = await acquireLock(dir, { ownerSession: 'new' }, { takeover: async owner => { guarded++; assert.equal(owner.ownerSession, 'old'); } });
    assert.equal(guarded, 2); assert.equal(JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8')).ownerSession, 'new');
    await release(); await assert.rejects(fs.stat(lock), { code: 'ENOENT' });
  } finally { process.kill = original; await fs.rm(dir, { recursive: true, force: true }); }
});

test('a nonexistent owner remains eligible for guarded lock takeover', async () => {
  const original = process.kill;
  try {
    process.kill = () => { const error = new Error('no such process'); error.code = 'ESRCH'; throw error; };
    assert.equal(processState(123456), 'dead');
    assert.equal(await ownerAlive({ pid: 123456, startedAt: Date.now() }), false);
  } finally { process.kill = original; }
});
