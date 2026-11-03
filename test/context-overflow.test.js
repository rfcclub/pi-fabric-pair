import test from 'node:test';
import assert from 'node:assert/strict';
import { isActualContextOverflow } from '../src/context-overflow.js';

const model = { contextWindow: 272000 };
const usage = (input, output = 0, cacheRead = 0) => ({ input, output, cacheRead });

test('actual context overflow is classified without mistaking transient failures or output limits', () => {
  assert.equal(isActualContextOverflow({ role: 'assistant', stopReason: 'error', errorMessage: 'maximum context length exceeded' }, model), true);
  assert.equal(isActualContextOverflow({ role: 'assistant', stopReason: 'error', errorMessage: '503 service unavailable' }, model), false);
  assert.equal(isActualContextOverflow({ role: 'assistant', stopReason: 'length', usage: usage(100000, 3000) }, model), false);
  assert.equal(isActualContextOverflow({ role: 'assistant', stopReason: 'length', usage: usage(270000, 0) }, model), true);
  assert.equal(isActualContextOverflow({ role: 'assistant', stopReason: 'stop', usage: usage(272001) }, model), true);
  assert.equal(isActualContextOverflow({ role: 'assistant', stopReason: 'length' }, model), false);
  assert.equal(isActualContextOverflow({ role: 'user', stopReason: 'error', errorMessage: 'maximum context length exceeded' }, model), false);
  assert.equal(isActualContextOverflow(null, model), false);
});
