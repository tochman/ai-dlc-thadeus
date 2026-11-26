// US-1302: savings hints. AI spend the same work could do for less, each hint with its estimated saving, how it was
// worked out and the setting that changes it. The usual numbers come from every intent, archived ones included; hints
// only for intents not archived (FR1). Pure functions, except the dismissal file in `.thadeus/` (FR6, NFR1).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isArchived } from '../shared/intentArchive.js';
import { t } from '../shared/i18n.js';
import { writeAtomic } from './fileWrite.js';
import { readJsonSafe, resolveInRoot } from './projectAccess.js';
import { modelKey, normalizeModel, priceTokens } from './reprice.js';
import { stageAttempts } from './rework.js';
import { readTranscriptCalls } from './tokenHistory.js';

const MIN_RUNS = 3; // FR2.4 [Q3]
const MAX_REJECTED_SHARE = 0.1; // FR2.3
const CACHE_POINTS_BELOW = 20; // FR3 [Q5]
const TURNS_FACTOR = 2; // FR4 [Q6]
const TURNS_MIN_EARLIER = 5;
const EPS = 1e-9;
const TOKEN_KINDS = ['input', 'output', 'cacheCreate5m', 'cacheCreate1h', 'cacheRead'];

const num = (v) => (Number.isFinite(v) ? v : 0);
const familyOf = (key) => (typeof key === 'string' ? (key.match(/^[a-z]+/)?.[0] ?? null) : null);
const sumTokens = (t) => TOKEN_KINDS.reduce((s, k) => s + num(t?.[k]), 0);
const addTokens = (a, b) => Object.fromEntries(TOKEN_KINDS.map((k) => [k, num(a?.[k]) + num(b?.[k])]));

/** The middle value (the mean of the two middle ones for an even count); null for none. */
export function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  if (!s.length) return null;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * US-1302 FR2.5 [Q4]: the rate table's model families (`opus`, `sonnet`, `haiku`, ...), dearest output price first,
 * each with its dearest model, so a saving is never over-stated.
 * @returns {{family: string, model: string}[]}
 */
export function modelFamilies(rates) {
  const best = new Map();
  for (const [model, r] of Object.entries(rates ?? {})) {
    const family = familyOf(model);
    if (family && !(best.get(family)?.output >= r.output)) best.set(family, { family, model, output: r.output });
  }
  return [...best.values()].sort((a, b) => b.output - a.output).map(({ family, model }) => ({ family, model }));
}

/** US-1302 FR2.5: the next cheaper family below a model's (Opus to Sonnet, Sonnet to Haiku), or null. */
export function cheaperFamily(model, rates, families = modelFamilies(rates)) {
  const i = families.findIndex((f) => f.family === familyOf(modelKey(model)));
  return i >= 0 && i + 1 < families.length ? families[i + 1] : null;
}

const priceRow = (key, rates) => (key ? { model: key, input: rates[key].input, output: rates[key].output } : null);

/** Every stage across the intents: its tokens per model, agents, runs and rejections, and whether a live intent ran it. */
function stagesOf({ intents, perIntent, attemptsByIntent }) {
  const stages = new Map();
  const stage = (name) => {
    if (!stages.has(name)) stages.set(name, { name, byModel: {}, agents: new Set(), agentModels: [], runs: 0, rejections: 0, live: false });
    return stages.get(name);
  };
  for (const intent of intents ?? []) {
    const cost = perIntent?.[intent.dirName];
    const live = !isArchived(intent);
    for (const row of cost?.byStage ?? []) {
      const s = stage(row.name);
      for (const [m, node] of Object.entries(row.byModel ?? {})) s.byModel[m] = addTokens(s.byModel[m], node?.tokens);
      for (const a of row.agents ?? []) s.agents.add(a);
      s.agentModels.push(cost.agentModels ?? {});
      s.live ||= live;
    }
    for (const a of attemptsByIntent?.[intent.dirName] ?? []) {
      const s = stage(a.stage);
      s.runs += 1;
      if (a.closedBy === 'GATE_REJECTED') s.rejections += 1;
      s.live ||= live;
    }
  }
  return [...stages.values()];
}

/**
 * The family carrying most of a stage's cost (its tokens when a model has no rate) [assumption], and its models.
 * @returns {{family: string|null, models: string[]}}
 */
function dominantFamily(byModel, rates) {
  const models = Object.keys(byModel).filter((m) => sumTokens(byModel[m]) > 0 && familyOf(modelKey(m)));
  const prices = models.map((m) => priceTokens(m, byModel[m], rates));
  const weights = prices.every((p) => p != null) ? prices : models.map((m) => sumTokens(byModel[m]));
  const byFamily = new Map();
  models.forEach((m, i) => byFamily.set(familyOf(modelKey(m)), (byFamily.get(familyOf(modelKey(m))) ?? 0) + weights[i]));
  const whole = weights.reduce((s, w) => s + w, 0);
  const [family, weight] = [...byFamily].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  if (!family || weight * 2 <= whole) return { family: null, models: [] };
  return { family, models: models.filter((m) => familyOf(modelKey(m)) === family).sort((a, b) => sumTokens(byModel[b]) - sumTokens(byModel[a])) };
}

/** The one agent besides the session that ran the stage, when the ledger attributes the stage's model to it (constraint). */
function stageAgent(s, models) {
  const agents = [...s.agents].filter((a) => a !== 'main');
  if (agents.length !== 1) return null;
  return s.agentModels.some((am) => models.some((m) => am[agents[0]]?.includes(m))) ? agents[0] : null;
}

/** US-1302 FR2.5, NFR2: the top-family tokens priced at their models minus at the cheaper model; null without a rate. */
function savingOf(s, models, to, rates) {
  const from = models.map((m) => priceTokens(m, s.byModel[m], rates));
  const at = models.map((m) => priceTokens(to.model, s.byModel[m], rates));
  if ([...from, ...at].some((p) => p == null)) return null;
  const total = from.reduce((a, b) => a + b, 0) - at.reduce((a, b) => a + b, 0);
  return { total, perRun: total / s.runs };
}

/**
 * US-1302 FR1, FR2, FR5: a hint per stage that ran on the dearest family the project ran on (Opus today), with output
 * per run below the median of all stages, at most 1 in 10 runs rejected and at least 3 runs.
 * ponytail: the median is of each stage's output per run (the ledger sums a stage's runs), no outlier trimming.
 * @returns {object[]} hints `{id, kind: 'model', stage, agent, saving: {total, perRun}|null, working, links}`
 */
export function lighterModelHints({ intents, perIntent, attemptsByIntent, rates }) {
  const stages = stagesOf({ intents, perIntent, attemptsByIntent });
  const outputPerRun = (s) => Object.values(s.byModel).reduce((sum, t) => sum + num(t.output), 0) / s.runs;
  const med = median(stages.filter((s) => s.runs > 0).map(outputPerRun));
  const used = new Set(stages.flatMap((s) => Object.keys(s.byModel).filter((m) => sumTokens(s.byModel[m]) > 0)).map((m) => familyOf(modelKey(m))));
  const families = modelFamilies(rates).filter((f, i, all) => i >= all.findIndex((x) => used.has(x.family)));
  const top = families[0]?.family;
  const to = families[1] ?? null;
  const hints = [];
  for (const s of stages) {
    if (!s.live || !to || s.runs < MIN_RUNS || s.rejections > s.runs * MAX_REJECTED_SHARE + EPS) continue;
    const { family, models } = dominantFamily(s.byModel, rates);
    const perRun = outputPerRun(s);
    if (family !== top || !(perRun < med)) continue;
    const working = {
      figures: { runs: s.runs, rejections: s.rejections, outputPerRun: perRun, medianOutputPerRun: med },
      thresholds: { minRuns: MIN_RUNS, maxRejectedShare: MAX_REJECTED_SHARE },
      prices: { from: priceRow(normalizeModel(models[0], rates), rates), to: priceRow(to.model, rates) },
      to: to.model
    };
    const saving = savingOf(s, models, to, rates);
    hints.push({ id: `model:${s.name}`, kind: 'model', intent: null, stage: s.name, agent: stageAgent(s, models), saving, working, links: ['models'] });
  }
  return hints;
}

/**
 * US-1302 FR1, FR3, FR5: a hint per intent not archived whose cache-read share (cache reads / (input + cache writes +
 * cache reads)) is at least 20 points below the median share of every intent. No money figure: the cause is a guess.
 */
export function cacheShareHints({ intents, perIntent }) {
  const shares = (intents ?? [])
    .map((intent) => {
      const t = perIntent?.[intent.dirName]?.total?.tokens;
      const whole = num(t?.input) + num(t?.cacheWrite) + num(t?.cacheRead);
      return whole > 0 ? { intent, share: num(t.cacheRead) / whole } : null;
    })
    .filter(Boolean);
  const med = median(shares.map((s) => s.share));
  return shares
    .filter((s) => !isArchived(s.intent) && (med - s.share) * 100 >= CACHE_POINTS_BELOW - EPS)
    .map(({ intent, share }) => ({
      id: `cache:${intent.dirName}`,
      kind: 'cache',
      intent: intent.dirName,
      stage: null,
      agent: null,
      saving: null,
      working: { figures: { share, medianShare: med }, thresholds: { pointsBelow: CACHE_POINTS_BELOW }, prices: null },
      links: []
    }));
}

/**
 * US-1302 FR1, FR4, FR5 [Q6]: a hint per stage run (of an intent not archived) whose turns, the model calls inside its
 * window, are at least twice the median of that stage's earlier runs, once it has 5. Only intents with transcript calls
 * count: a run without them gets no hint, never a guessed one [assumption]. One hint per intent and stage, its largest run.
 * ponytail: the median of all earlier runs, no outlier trimming or time decay.
 */
export function turnsHints({ intents, attemptsByIntent, callsByIntent }) {
  const byStage = new Map();
  for (const intent of intents ?? []) {
    const calls = callsByIntent?.[intent.dirName];
    if (!calls?.length) continue;
    for (const a of attemptsByIntent?.[intent.dirName] ?? []) {
      const turns = calls.filter((c) => c.at >= a.from && c.at <= a.to).length;
      if (!byStage.has(a.stage)) byStage.set(a.stage, []);
      byStage.get(a.stage).push({ intent, stage: a.stage, from: a.from, turns });
    }
  }
  const found = new Map();
  for (const list of byStage.values()) {
    list.sort((a, b) => a.from - b.from);
    list.forEach((run, k) => {
      if (k < TURNS_MIN_EARLIER || isArchived(run.intent)) return;
      const med = median(list.slice(0, k).map((r) => r.turns));
      const id = `turns:${run.intent.dirName}:${run.stage}`;
      if (!(med > 0) || run.turns < TURNS_FACTOR * med || found.get(id)?.working.figures.turns >= run.turns) return;
      found.set(id, {
        id,
        kind: 'turns',
        intent: run.intent.dirName,
        stage: run.stage,
        agent: null,
        saving: null,
        working: {
          figures: { turns: run.turns, medianTurns: med, earlierRuns: k },
          thresholds: { factor: TURNS_FACTOR, minEarlierRuns: TURNS_MIN_EARLIER },
          prices: null
        },
        links: ['costRules', 'handoff']
      });
    });
  }
  return [...found.values()];
}

/** US-1302 FR7: the largest saving first; hints without a money figure after, in their own order. */
export function sortHints(hints) {
  const money = hints.filter((h) => h.saving != null).sort((a, b) => b.saving.total - a.saving.total);
  return [...money, ...hints.filter((h) => h.saving == null)];
}

/** US-1302 FR2–FR4, FR7: every hint of the project, sorted. */
export function savingsHints({ intents, perIntent, attemptsByIntent, callsByIntent, rates }) {
  return sortHints([
    ...lighterModelHints({ intents, perIntent, attemptsByIntent, rates }),
    ...cacheShareHints({ intents, perIntent }),
    ...turnsHints({ intents, attemptsByIntent, callsByIntent })
  ]);
}

const SESSION_KEY = 'transcript:';

/** US-1302 FR4: the model calls of the transcripts the ledger names for an intent, read only inside `projectsDir`. */
export async function sessionCalls({ ledger, uuid, projectsDir }) {
  const wf = uuid ? ledger?.workflows?.[`intent:${uuid}`] : null;
  const files = Object.keys(wf?.sessions ?? {})
    .filter((k) => k.startsWith(SESSION_KEY))
    .map((k) => k.slice(SESSION_KEY.length));
  const read = await Promise.all(files.map((f) => readTranscriptCalls(f, projectsDir)));
  return read.flatMap((c) => c ?? []);
}

/**
 * US-1302 NFR4: the project:savings handler's body. The runs come from each intent's audit (US-1301 stageAttempts),
 * the turns from `loadCalls(intent)`; a failed read is logged and that intent counts no turns.
 * ponytail: every intent's transcripts are read each time the Savings section opens; a cache per finished intent if it shows.
 * @returns {Promise<{hints: object[], dismissed: string[]}>}
 */
export async function loadSavings({ root, intents, perIntent, eventsByIntent, rates, loadCalls, readDismissed: readIds = readDismissed }) {
  const attemptsByIntent = Object.fromEntries(intents.map((i) => [i.dirName, stageAttempts(eventsByIntent?.[i.dirName] ?? [])]));
  const calls = await Promise.all(
    intents.map((i) =>
      Promise.resolve()
        .then(() => loadCalls(i))
        .catch((err) => {
          console.error(`Kunde inte läsa transkripten för sparförslag i ${i.dirName}:`, err.message);
          return [];
        })
    )
  );
  const callsByIntent = Object.fromEntries(intents.map((i, n) => [i.dirName, calls[n]]));
  const hints = savingsHints({ intents, perIntent, attemptsByIntent, callsByIntent, rates });
  return { hints, dismissed: Object.keys(await readIds(root)) };
}

export const DISMISSED_PATH = '.thadeus/savings-dismissed.json';
const HINT_ID = /^(model|cache|turns):[\w.:-]{1,200}$/;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** US-1302 FR6: the dismissed hint ids with their time; a missing file gives {}, a broken one is logged and gives {}. */
export async function readDismissed(root) {
  const res = await readJsonSafe(root, DISMISSED_PATH);
  if (res.ok && isPlainObject(res.value)) return Object.fromEntries(Object.entries(res.value).filter(([k, v]) => HINT_ID.test(k) && typeof v === 'string'));
  if (!res.missing) console.warn(`${DISMISSED_PATH} kunde inte läsas, inga tips är avfärdade:`, res.ok ? 'inget objekt' : res.error);
  return {};
}

/**
 * US-1302 FR6, NFR1: dismisses (`on`) or brings back one hint for the project, written atomically. The only write of
 * the savings hints; a bad id or a `.thadeus` leading out of the root throws and writes nothing.
 * @returns {Promise<Record<string, string>>} the dismissed ids after the change
 */
export async function setDismissed(root, id, on, now = new Date()) {
  if (typeof id !== 'string' || !HINT_ID.test(id)) throw new Error(t('errors.invalidValue', { what: 'id', value: String(id) }));
  const dismissed = await readDismissed(root);
  if (on) dismissed[id] = now.toISOString();
  else delete dismissed[id];
  await fs.mkdir(path.join(root, path.dirname(DISMISSED_PATH)), { recursive: true });
  const abs = path.join(await resolveInRoot(root, path.dirname(DISMISSED_PATH)), path.basename(DISMISSED_PATH)); // a symlinked .thadeus out of the root is refused
  await writeAtomic(abs, Buffer.from(`${JSON.stringify(dismissed, null, 2)}\n`, 'utf8'));
  return dismissed;
}
