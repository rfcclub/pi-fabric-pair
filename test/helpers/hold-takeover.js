import { acquireLock } from '../../src/util.js';
const original = process.kill;
process.kill = (pid, signal) => {
  if (pid === 123456) { const error = new Error('no such process'); error.code = 'ESRCH'; throw error; }
  return original(pid, signal);
};
await acquireLock(process.argv[2], { ownerSession: 'crashing-owner' }, { takeover: async () => {
  process.stdout.write('guard-entered\n');
  setInterval(() => {}, 1000);
  await new Promise(() => {});
} });
