// Summarises AI-DLC's usage-ledger.json (schemaVersion 3) per project, intent, stage, agent and model.
// The ledger's own `usd` values are the recorded figures. US-0211 FR2: with a rate table, each model row and total also
// gets `currentUsd` repriced from its stored tokens (reprice.js), beside the recorded figure, never instead of it.
// Pure functions with no Node imports: the renderer imports compareModels too.
import { t } from '../../shared/i18n.js';
import { repriceMap, repriceModel } from '../reprice.js';

const INTENT_KEY = 'intent:';
const LEGACY_KEY = /^record:.+\/legacy$/;
const MAIN_AGENT = 'main';
const SYNTHETIC_MODEL = '<synthetic>';

const num = (v) => (Number.isFinite(v) ? v : 0);
const entries = (obj) => (obj && typeof obj === 'object' ? Object.entries(obj) : []);
/** "aidlc-developer-agent" and "developer" both become "developer"; "main" (the session) stays "main". */
export const agentName = (name) =>
  String(name)
    .replace(/^aidlc-/, '')
    .replace(/-agent$/, '');

/** One ledger node -> display cost. `missingPrice`: tokens were used but the ledger has no price (FR6.2). */
export function costOf(node) {
  const t = node?.tokens ?? {};
  const tokens = {
    input: num(t.input),
    output: num(t.output),
    cacheWrite: num(t.cacheCreate5m) + num(t.cacheCreate1h),
    cacheRead: num(t.cacheRead)
  };
  const usd = num(node?.usd);
  const total = tokens.input + tokens.output + tokens.cacheWrite + tokens.cacheRead;
  return { usd, tokens, totalTokens: total, missingPrice: total > 0 && usd === 0 };
}

function addCost(a, b) {
  const tokens = {};
  for (const k of Object.keys(a.tokens)) tokens[k] = a.tokens[k] + b.tokens[k];
  const totalTokens = a.totalTokens + b.totalTokens;
  return { usd: a.usd + b.usd, tokens, totalTokens, missingPrice: a.missingPrice || b.missingPrice };
}

/** US-0211 AC1.5.1: a `byModel` map's current-price total and how many of its models have no rate. */
function current(byModel, rates) {
  const r = repriceMap(byModel, rates);
  return { currentUsd: r.usd, currentMissing: r.missing };
}

/** A `byX` map as rows, most expensive first; empty rows (no tokens, no usd) are dropped. `rates`: model rows (US-0211). */
function rows(map, rates = null) {
  return entries(map)
    .map(([name, node]) => ({ name, ...costOf(node), ...(rates ? repriceModel(name, node, rates) : {}) }))
    .filter((r) => r.usd > 0 || r.totalTokens > 0)
    .sort((a, b) => b.usd - a.usd || b.totalTokens - a.totalTokens);
}

/**
 * Models each agent actually ran on, from the per-stage byAgent/byModel maps (FR4.4).
 * The ledger does not cross agent x model, so only certain attributions are made:
 *  - a stage with one model: every agent in it ran on that model
 *  - a stage with one agent: that agent ran on every model in it
 *  - a stage with `main` + one other agent: the other agent ran on the models besides the session's
 * ponytail: anything else stays unknown (empty list), so it can never raise a false mismatch flag.
 * @param {object[]} workflows ledger workflow nodes
 * @returns {Record<string, string[]>} agent (short name) -> models, most expensive first
 */
function agentModels(workflows) {
  const stages = workflows.flatMap((wf) =>
    entries(wf?.byStage).map(([, s]) => ({
      agents: rows(s?.byAgent).map((r) => agentName(r.name)),
      models: rows(s?.byModel).filter((m) => m.name !== SYNTHETIC_MODEL)
    }))
  );
  const usage = new Map(); // agent -> Map(model -> usd)
  const add = (agent, m) => usage.get(agent).set(m.name, (usage.get(agent).get(m.name) ?? 0) + m.usd);
  for (const { agents } of stages) for (const a of agents) if (!usage.has(a)) usage.set(a, new Map());
  const deferred = [];
  for (const s of stages) {
    if (s.models.length === 1) s.agents.forEach((a) => add(a, s.models[0]));
    else if (s.agents.length === 1) s.models.forEach((m) => add(s.agents[0], m));
    else if (s.agents.length === 2 && s.agents.includes(MAIN_AGENT)) deferred.push(s);
  }
  const ordered = (models) => [...models].sort((x, y) => y[1] - x[1]).map(([m]) => m);
  const session = ordered(usage.get(MAIN_AGENT) ?? [])[0];
  if (session) {
    for (const s of deferred) {
      const other = s.agents.find((a) => a !== MAIN_AGENT);
      s.models.filter((m) => m.name !== session).forEach((m) => add(other, m));
    }
  }
  return Object.fromEntries([...usage].map(([a, models]) => [a, ordered(models)]));
}

function intentCost(wf, rates) {
  const stages = rows(Object.fromEntries(entries(wf.byStage).map(([s, n]) => [s, n?.totals])));
  const byStage = rates ? stages.map((r) => ({ ...r, ...current(wf.byStage[r.name]?.byModel, rates) })) : stages;
  const stageModels = {};
  for (const [stage, node] of entries(wf.byStage)) {
    stageModels[stage] = rows(node?.byModel)
      .filter((r) => r.name !== SYNTHETIC_MODEL)
      .map((r) => r.name);
  }
  const byModel = rows(wf.byModel, rates);
  const raw = wf.totals?.tokens ?? {};
  return {
    total: { ...costOf(wf.totals), ...(rates ? current(wf.byModel, rates) : {}) },
    // The ledger's own split, cache writes 5 m and 1 h apart, for the stored readings (US-0208 FR2.3).
    tokens: {
      input: num(raw.input),
      output: num(raw.output),
      cacheCreate5m: num(raw.cacheCreate5m),
      cacheCreate1h: num(raw.cacheCreate1h),
      cacheRead: num(raw.cacheRead)
    },
    byStage,
    byAgent: rows(wf.byAgent),
    byModel,
    stageModels,
    agentModels: agentModels([wf]),
    complete: !byModel.some((r) => r.missingPrice)
  };
}

/**
 * @param {object} ledger parsed usage-ledger.json
 * @param {{dirName: string, uuid: string|null, slug: string, scope: string|null, date: string|null}[]} intents
 * @param {Record<string, object>|null} [rates] US-0211: the current rate table (modelRates.js); without it nothing is repriced
 */
export function summarizeLedger(ledger, intents, rates = null) {
  const workflows = entries(ledger?.workflows);
  const byUuid = new Map(workflows.filter(([k]) => k.startsWith(INTENT_KEY)).map(([k, wf]) => [k.slice(INTENT_KEY.length), wf]));
  const legacyNodes = workflows.filter(([k]) => LEGACY_KEY.test(k)).map(([, wf]) => wf);

  const perIntent = {};
  for (const intent of intents) {
    const wf = intent.uuid ? byUuid.get(intent.uuid) : null;
    perIntent[intent.dirName] = wf ? intentCost(wf, rates) : null; // null = no entry, shown as "–" (FR1.4)
  }

  const byScope = {};
  for (const intent of intents) {
    const c = perIntent[intent.dirName];
    if (!c) continue;
    const s = (byScope[intent.scope ?? t('cost.unknown')] ??= { usd: 0, count: 0, missingPrice: false });
    s.usd += c.total.usd;
    s.count += 1;
    s.missingPrice ||= !c.complete;
    if (rates) {
      s.currentUsd = c.total.currentUsd === null ? (s.currentUsd ?? null) : (s.currentUsd ?? 0) + c.total.currentUsd;
      s.currentMissing = (s.currentMissing ?? 0) + c.total.currentMissing;
    }
  }
  for (const s of Object.values(byScope)) s.avg = s.usd / s.count;

  const timeline = intents
    .filter((i) => perIntent[i.dirName])
    .map((i) => {
      const { usd, currentUsd } = perIntent[i.dirName].total;
      return { dirName: i.dirName, slug: i.slug, date: i.date, usd, ...(rates ? { currentUsd } : {}) };
    })
    .sort((a, b) => a.dirName.localeCompare(b.dirName));

  const byModel = rows(ledger?.byModel, rates);
  return {
    project: {
      total: { ...costOf(ledger?.totals), ...(rates ? current(ledger?.byModel, rates) : {}) },
      byModel,
      byAgent: rows(ledger?.byAgent),
      legacy: legacyNodes.length ? legacyNodes.map((wf) => costOf(wf?.totals)).reduce(addCost) : null,
      agentModels: agentModels(workflows.map(([, wf]) => wf)),
      complete: !byModel.some((r) => r.missingPrice)
    },
    perIntent,
    byScope,
    timeline
  };
}

/** "opus" matches "opus-5-5" and "claude-opus-5-5"; "opus-4-1" does not match "opus-5-5". */
function sameModel(configured, actual) {
  const norm = (m) =>
    String(m)
      .toLowerCase()
      .replace(/\[.*\]$/, '')
      .replace(/^claude-/, '');
  const c = norm(configured);
  const a = norm(actual);
  return a === c || a.startsWith(`${c}-`) || c.startsWith(`${a}-`);
}

/**
 * Configured vs actual model per agent (FR4.3–FR4.5). `inherit` means the session's model,
 * i.e. the model the `main` agent ran on.
 * @param {{agents: {agent: string, model: string|null, effort: string|null}[]}|null} configured
 * @param {Record<string, string[]>} actualByAgent `agentModels` from summarizeLedger
 * @param {{onlyParticipants?: boolean}} [opts] true: only agents present in actualByAgent (intent view)
 */
export function compareModels(configured, actualByAgent = {}, { onlyParticipants = false } = {}) {
  const sessionModel = actualByAgent[MAIN_AGENT]?.[0] ?? null;
  const conf = new Map((configured?.agents ?? []).map((a) => [agentName(a.agent), a]));
  const names = new Set([...conf.keys(), ...Object.keys(actualByAgent)]);
  return [...names]
    .filter((n) => !onlyParticipants || n in actualByAgent)
    .sort((a, b) => (a === MAIN_AGENT ? -1 : b === MAIN_AGENT ? 1 : a.localeCompare(b)))
    .map((agent) => {
      const c = conf.get(agent);
      const inherit = c?.model === 'inherit';
      const expected = inherit ? sessionModel : (c?.model ?? null);
      const actual = actualByAgent[agent] ?? [];
      const mismatch = !!expected && actual.some((m) => !sameModel(expected, m));
      return { agent, configured: c?.model ?? null, effort: c?.effort ?? null, inherit, expected, actual, mismatch };
    });
}
