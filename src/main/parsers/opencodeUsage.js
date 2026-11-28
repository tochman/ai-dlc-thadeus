// US-0058 FR1: opencode's own assistant messages (read from opencode.db by opencodeDb.js) as ledger-shaped workflow
// nodes, one per intent, so Cost and Activity count opencode work the AI-DLC ledger never sees. Pure, no Node imports.
import { addTree } from './auditCost.js';
import { priceTokens } from '../reprice.js';

const num = (v) => (Number.isFinite(v) ? v : 0);

/** opencode's token object as the ledger's; reasoning is billed as output. ponytail: no 5m/1h split, all of it is 5m. */
function ledgerTokens(t = {}) {
  return {
    input: num(t.input),
    output: num(t.output) + num(t.reasoning),
    cacheCreate5m: num(t.cache?.write),
    cacheCreate1h: 0,
    cacheRead: num(t.cache?.read)
  };
}

/**
 * The intent and stage a message at `at` belongs to: the intent with the latest audit event at or before it, never one
 * that finished before it. ponytail: two intents running at once in opencode are told apart by time only; the later
 * one wins. Upgrade path: opencode's session id in the audit, once the adapter records it.
 */
function owner(at, intents) {
  let best = null;
  for (const i of intents) {
    const done = i.events.findLast((e) => e.event === 'WORKFLOW_COMPLETED')?.timeMs;
    if (done != null && done < at) continue;
    const last = i.events.findLast((e) => e.timeMs <= at);
    if (last && (!best || last.timeMs > best.timeMs))
      best = { key: i.key, timeMs: last.timeMs, stage: i.events.findLast((e) => e.timeMs <= at && e.fields?.Stage)?.fields.Stage };
  }
  return best;
}

/**
 * @param {{at: number, agent: string, model: string, cost: number, tokens: object}[]} messages
 * @param {{key: string, events: {timeMs: number, event: string, fields: object}[]}[]} intents `key` as the ledger's ("intent:<uuid>")
 * @param {Record<string, object>|null} [rates] prices tokens opencode gave no cost for; a model without a rate is 0 USD
 * @returns {Record<string, object>} key -> {totals, byStage, byModel, byAgent}
 */
export function opencodeNodes(messages, intents, rates = null) {
  const out = {};
  for (const m of messages) {
    const o = owner(m.at, intents);
    if (!o) continue;
    const tokens = ledgerTokens(m.tokens);
    const usd = m.cost > 0 ? m.cost : ((rates && priceTokens(m.model, tokens, rates)) ?? 0);
    const leaf = { usd, tokens };
    const byModel = { [m.model]: leaf };
    const byAgent = { [m.agent === 'build' ? 'main' : m.agent]: leaf };
    const byStage = o.stage ? { [o.stage]: { totals: leaf, byModel, byAgent } } : {};
    out[o.key] = addTree(out[o.key], { totals: leaf, byStage, byModel, byAgent });
  }
  return out;
}
