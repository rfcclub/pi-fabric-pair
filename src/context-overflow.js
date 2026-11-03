import { isContextOverflow } from '@earendil-works/pi-ai';
import { plain } from './util.js';

/**
 * Use Pi's provider-aware overflow detector, but only on well-formed assistant
 * messages. Ordinary output-length truncation is not context exhaustion.
 * @param {unknown} message @param {unknown} model
 * @returns {boolean}
 */
export function isActualContextOverflow(message, model) {
  if (!plain(message) || message.role !== 'assistant') return false;
  const window = plain(model) && typeof model.contextWindow === 'number' && Number.isFinite(model.contextWindow) && model.contextWindow > 0 ? model.contextWindow : undefined;
  if (message.stopReason !== 'error') {
    const usage = message.usage;
    if (!plain(usage) || !['input', 'output', 'cacheRead'].every(k => typeof usage[k] === 'number' && Number.isFinite(usage[k]))) return false;
  }
  return isContextOverflow(/** @type {import('@earendil-works/pi-ai').AssistantMessage} */ (/** @type {unknown} */ (message)), window);
}
