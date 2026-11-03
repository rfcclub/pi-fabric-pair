// Test-only crash at the state commit boundary. No model calls or live Pair state.
import fs from 'node:fs/promises';
import { PairController } from '../../src/controller.js';

const { config, cwd, takeover } = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const rename = fs.rename.bind(fs);
fs.rename = async (from, to) => {
  const commit = String(to).endsWith('state.json');
  if (commit && process.argv[3] !== 'after') process.kill(process.pid, 'SIGKILL');
  const result = await rename(from, to);
  if (commit && process.argv[3] === 'after') process.kill(process.pid, 'SIGKILL');
  return result;
};
await new PairController({ config, cwd, ownerSession: 'crashing-main', takeover }).init();
process.exitCode = 2; // the test must reach the crash injection
