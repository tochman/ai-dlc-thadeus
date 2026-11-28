// US-0209: an intent's cost from every machine. Reads the cost rollups AI-DLC writes on STAGE_COMPLETED rows in the
// committed audit shards, and merges them with this machine's ledger and other machines' snapshots, each counted once.
// Every cost here is a ledger-shaped workflow node ({totals, byStage, byModel, byAgent}), so summarizeLedger shows it.
// Pure functions with no Node imports; `events` come from loadAuditEvents.
import { repriceMap } from '../reprice.js';

const SHARD = /^(.+)-([^-]+)\.md$/;
const SCALE = { k: 1e3, M: 1e6, B: 1e9 };

/** "44408", "44.4k" and "15.4M" as numbers; anything else is NaN. The audit rounds its per-model counts (assumption). */
function amount(text) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([kMB])?\s*$/.exec(String(text ?? ''));
  return m ? Math.round(Number(m[1]) * (SCALE[m[2]] ?? 1)) : NaN;
}
const usdOf = (text) => (/^\s*\d+(\.\d+)?\s*$/.test(String(text ?? '')) ? Number(text) : NaN);
const zero = (v) => (Number.isFinite(v) ? v : 0);

/** in/out/cacheRead/cacheWrite as the ledger's token object. ponytail: the audit has no 5m/1h split, so all of it is 5m. */
function tokens(input, output, cacheRead, cacheWrite) {
  return { input: zero(input), output: zero(output), cacheCreate5m: zero(cacheWrite), cacheCreate1h: 0, cacheRead: zero(cacheRead) };
}

/** "main=3.45; aidlc-developer-agent=1.91" -> [["main", "3.45"], ...] */
function pairs(text) {
  return String(text ?? '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => [p.slice(0, p.indexOf('=')).trim(), p.slice(p.indexOf('=') + 1).trim()])
    .filter(([name]) => name);
}

/** `By X` (USD) and `Tokens By X` (in/out/read/write) as one `byX` map of ledger nodes. */
function byMap(usdText, tokensText) {
  const map = {};
  for (const [name, usd] of pairs(usdText)) map[name] = { usd: zero(usdOf(usd)), tokens: tokens() };
  for (const [name, t] of pairs(tokensText)) {
    const [i, o, r, w] = t.split('/').map(amount);
    map[name] = { usd: map[name]?.usd ?? 0, tokens: tokens(i, o, r, w) };
  }
  return map;
}

/** Deep sum of two ledger nodes (numbers add, objects merge key by key); either may be missing. */
export function addTree(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  if (typeof a !== 'object' || typeof b !== 'object') return zero(a) + zero(b);
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = addTree(a[k], v);
  return out;
}

/** One STAGE_COMPLETED row's rollup as a workflow node with that one stage; null without a valid `Cost USD` (NFR3). */
function rowNode(stage, f) {
  const usd = usdOf(f['Cost USD']);
  if (!Number.isFinite(usd)) return null;
  const totals = { usd, tokens: tokens(amount(f['Tokens In']), amount(f['Tokens Out']), amount(f['Cache Read']), amount(f['Cache Write'])) };
  const byModel = byMap(f['By Model'], f['Tokens By Model']);
  const byAgent = byMap(f['By Agent'], f['Tokens By Agent']);
  return { totals, byStage: { [stage]: { totals, byModel, byAgent } }, byModel, byAgent };
}

/**
 * US-0209 FR1.1–FR1.3: the cost rows of the shards, only the last per shard, stage and Unit; earlier rows for the same
 * stage are running totals (FR1.2). WORKFLOW_COMPLETED totals are never rows (FR1.3).
 * @param {{event: string, source: string, fields: object}[]} events in time order
 * @returns {{source: string, stage: string, unit: string|null, node: object}[]}
 */
export function stageRollups(events) {
  const last = new Map();
  for (const e of events ?? []) {
    const stage = e.fields?.Stage;
    if (e.event !== 'STAGE_COMPLETED' || !stage) continue;
    const node = rowNode(stage, e.fields);
    if (!node) continue;
    const unit = e.fields.Unit || null;
    last.set(`${e.source}\n${stage}\n${unit ?? ''}`, { source: e.source, stage, unit, node });
  }
  return [...last.values()];
}

/** "macbookpro-95cba7b6a821.md" -> {host: "macbookpro", cloneId: "95cba7b6a821"}; a name without a dash is all host. */
export function shardName(source) {
  const m = SHARD.exec(source);
  return m ? { host: m[1], cloneId: m[2] } : { host: source.replace(/\.md$/, ''), cloneId: source };
}

const usd = (node) => zero(node?.totals?.usd);

/**
 * US-0209 FR1.4, FR2.1–FR2.3, FR3.4, FR4.2: one intent's cost, every machine counted once. This machine (the clone
 * in `local`) counts from the ledger when it has the intent, else from its own shard rows (FR2.2). Every other machine
 * counts from its snapshot or its shard rows, whichever total is larger, never both (FR3.4, assumption).
 * @param {{ledgerNode: object|null, local: {host: string, cloneId: string}|null,
 *          shards: {host: string, cloneId: string, node: object}[], snapshots: {host: string, cloneId: string, node: object}[],
 *          opencode?: object|null}} opts `opencode`: this machine's opencode node (US-0058)
 * @returns {{node: object, extra: object|null, machines: {host: string|null, local: boolean, source: 'ledger'|'snapshot'|'audit'|'opencode', usd: number}[],
 *            partial: boolean}|null} `extra` is the part the ledger does not hold; null when no machine has a cost
 */
export function mergeIntentCosts({ ledgerNode, local, shards = [], snapshots = [], rates = null, opencode = null }) {
  const own = local ? shards.find((s) => s.cloneId === local.cloneId) : null;
  const parts = [];
  if (ledgerNode) parts.push({ host: local?.host ?? own?.host ?? null, local: true, source: 'ledger', node: ledgerNode });
  else if (own) parts.push({ host: own.host, local: true, source: 'audit', node: own.node });
  // US-0058 FR1: this machine's opencode work, read from opencode.db; the ledger never holds it, so it is added.
  if (opencode) parts.push({ host: local?.host ?? own?.host ?? null, local: true, source: 'opencode', node: opencode });

  const others = new Map(); // cloneId -> part; a snapshot is offered first, so a tie keeps it
  const offer = (s, source) => {
    if (local && s.cloneId === local.cloneId) return;
    const cur = others.get(s.cloneId);
    if (!cur || usd(s.node) > usd(cur.node)) others.set(s.cloneId, { host: s.host, local: false, source, node: s.node });
  };
  snapshots.forEach((s) => offer(s, 'snapshot'));
  shards.forEach((s) => offer(s, 'audit'));
  parts.push(...[...others.values()].sort((a, b) => (a.host < b.host ? -1 : a.host > b.host ? 1 : 0)));
  if (parts.length === 0) return null;

  return {
    node: parts.map((p) => p.node).reduce(addTree),
    extra: parts.filter((p) => p.source !== 'ledger').reduce((sum, p) => addTree(sum, p.node), null),
    // US-0211 FR3.2: each machine's current-price figure, from its own stored tokens, when a rate table is passed.
    machines: parts.map(({ host, local: isLocal, source, node }) => ({
      host,
      local: isLocal,
      source,
      usd: usd(node),
      ...(rates ? { currentUsd: repriceMap(node?.byModel, rates).usd } : {})
    })),
    partial: parts.some((p) => p.source === 'audit')
  };
}

/**
 * US-0209 FR1.2, FR1.4: one summed workflow node per shard, i.e. per machine (clone), sorted by shard name.
 * @returns {{source: string, host: string, cloneId: string, node: object}[]}
 */
export function shardCosts(events) {
  const perShard = new Map();
  for (const r of stageRollups(events)) perShard.set(r.source, addTree(perShard.get(r.source), r.node));
  return [...perShard].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([source, node]) => ({ source, ...shardName(source), node }));
}
