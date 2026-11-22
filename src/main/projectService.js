// Loads AI-DLC data for one project root. All reads go through projectAccess.
// A broken file only affects its own intent; the last good result is returned instead (NFR2, FR7.4).
import { exists, listDir, newestMtime, readJsonSafe, readText } from './projectAccess.js';
import { mergeIntents } from './parsers/intents.js';
import { parseState } from './parsers/state.js';
import { parseRuntimeGraph } from './parsers/runtimeGraph.js';
import { mergeAudits, categoryOf } from './parsers/audit.js';
import { mergePipeline } from './parsers/pipeline.js';
import { unitStatuses } from './parsers/units.js';
import { pendingQuestions } from './questions.js';
import { agentName, summarizeLedger } from './parsers/ledger.js';
import { addTree, mergeIntentCosts, shardCosts } from './parsers/auditCost.js';
import { localClone, readSnapshots } from './usageSnapshot.js';
import { intentMetrics, parseMarkerHistory, projectMetrics, storyMetrics } from './parsers/velocity.js';
import { parkedFromAudit } from './intentPark.js';
import { t } from '../shared/i18n.js';
import { viewFields } from '../shared/frameworkViews.js';
import { PROJECT_FILE, readProjectFile } from './projectFile.js';

const PHASE_DIRS = ['initialization', 'ideation', 'inception', 'construction', 'operation', 'verification'];
// ponytail: unbounded per-process cache keyed by root/space/intent; fine for a handful of projects.
const listCache = new Map();
const detailCache = new Map();
const costCache = new Map();

export const LEDGER_PATH = 'aidlc/.aidlc-sessions/usage-ledger.json';
/** Has an entry per agent running now (`{entries: [...]}`), written by AI-DLC's hooks. */
export const INFLIGHT_PATH = 'aidlc/.aidlc-subagent-inflight';

const spacesDir = (space) => `aidlc/spaces/${space}`;
export const intentsDir = (space) => `${spacesDir(space)}/intents`;

export function assertName(name, what) {
  if (typeof name !== 'string' || !/^[^/\\]+$/.test(name) || name.startsWith('.')) {
    throw new Error(t('errors.invalidName', { what, name: String(name) }));
  }
}

async function readTextOrNull(root, rel) {
  try {
    return await readText(root, rel);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function listSpaces(root) {
  return (await listDir(root, 'aidlc/spaces')).filter((e) => e.isDir && !e.name.startsWith('.')).map((e) => e.name);
}

/** US-1401 FR1.3: which framework a saved value, the folders found and `askWhenBoth` give (BR1.1–BR1.4). */
function chooseFramework(found, saved, askWhenBoth) {
  if (found[saved] === true) return { framework: saved, source: 'file' };
  if (found.aidlc && found.speckit && askWhenBoth) return { framework: null, source: 'ask' }; // switched on by U4
  if (found.aidlc) return { framework: 'aidlc', source: 'detected' };
  if (found.speckit) return { framework: 'speckit', source: 'detected' };
  return { framework: null, source: 'detected' };
}

/** US-1408 FR2.3 (BR1.3, BR1.4): why the saved framework was not followed, or null when there was none to follow. */
function savedReason(read, source) {
  if (!read.ok) return read.reason === 'missing' ? null : t('projectFile.unusable', { file: PROJECT_FILE, reason: t(`projectFile.reason.${read.reason}`) });
  return source === 'file' ? null : t('projectFile.savedNotFound', { file: PROJECT_FILE });
}

/**
 * US-1401 FR1.3, FR1.5, US-1408 FR2.2, FR2.3 (contract C1): the project's Detection. The framework kept in
 * `.thadeus/project.json` is followed when its folder is there (BR1.5); otherwise detection falls back and says why
 * (BR1.3, BR1.4). `askWhenBoth` turns BR1.3 of US-1401 on (U4). Active-space resolution is unchanged.
 */
export async function detectProject(root, { askWhenBoth = false } = {}) {
  const hasSpacesDir = await exists(root, 'aidlc/spaces');
  const spaces = hasSpacesDir ? await listSpaces(root) : [];
  const speckit = (await listDir(root, '.')).some((e) => e.name === '.specify' && e.isDir);
  const found = { aidlc: spaces.length > 0, speckit };
  const read = await readProjectFile(root);
  const { framework, source } = chooseFramework(found, read.ok ? read.value.framework : null, askWhenBoth);
  const folderReason = framework === null && source === 'detected' ? t(hasSpacesDir ? 'errors.noSpace' : 'errors.notAidlc') : null;
  const reason = [savedReason(read, source), folderReason].filter(Boolean).join(' ') || null;
  const detection = { framework, source, found, reason, ...viewFields(framework), activeSpace: null, spaces: [] };
  if (framework !== 'aidlc') return detection;
  const named = (await readTextOrNull(root, 'aidlc/active-space'))?.trim();
  const activeSpace = spaces.includes(named) ? named : spaces.includes('default') ? 'default' : spaces[0];
  return { ...detection, activeSpace, spaces };
}

async function loadDescription(root, base) {
  const res = await readJsonSafe(root, `${base}/project-description.json`);
  return res.ok && typeof res.value === 'string' ? res.value : null;
}

/** Per-intent fields read from the intent's own files (state + description). */
async function summarizeIntent(root, space, dirName) {
  const base = `${intentsDir(space)}/${dirName}`;
  const stateText = await readTextOrNull(root, `${base}/aidlc-state.md`);
  const state = stateText ? parseState(stateText) : null;
  const pipeline = mergePipeline(state, null);
  // US-0510 FR4.1, FR4.6: the parked mark follows the audit, which the intents watcher reloads on every write.
  const parked = parkedFromAudit(await auditEventsOrEmpty(root, base));
  return {
    parked: parked.parked,
    parkedStage: parked.stage,
    parkedAt: parked.at,
    stateScope: state?.scope ?? null,
    plan: state?.plan ?? null,
    request: await loadDescription(root, base),
    currentStage: state?.currentStage ?? null,
    stateStatus: state?.currentStatus ?? null,
    done: pipeline.done,
    executed: pipeline.executed,
    // When AI-DLC last wrote the intent's audit log: an agent outside the app is working on it (US-0009).
    activityAt: (await newestMtime(root, `${base}/audit`)) || null
  };
}

/**
 * @param {string[]} [onlyDirs] when given, only these intents are re-read; the rest reuse the cache (FR7.2)
 */
export async function loadIntentList(root, space, onlyDirs) {
  assertName(space, 'space');
  const key = `${root}|${space}`;
  const prev = listCache.get(key);
  const dir = intentsDir(space);

  const indexRes = await readJsonSafe(root, `${dir}/intents.json`);
  // Half-written intents.json: keep the previous index instead of dropping every intent.
  const index = indexRes.ok ? indexRes.value : indexRes.missing ? [] : (prev?.index ?? []);
  const diskDirs = (await listDir(root, dir)).filter((e) => e.isDir && !e.name.startsWith('.')).map((e) => e.name);
  const active = (await readTextOrNull(root, `${dir}/active-intent`))?.trim() ?? null;

  const summaries = new Map(prev?.summaries ?? []);
  const intents = await Promise.all(
    mergeIntents(index, diskDirs, active).map(async (intent) => {
      let extra = summaries.get(intent.dirName);
      const reread = !extra || !Array.isArray(onlyDirs) || onlyDirs.includes(intent.dirName);
      if (reread && !intent.missingOnDisk) {
        try {
          extra = await summarizeIntent(root, space, intent.dirName);
          summaries.set(intent.dirName, extra);
        } catch (err) {
          extra = { ...extra, error: err.message, stale: !!extra };
        }
      }
      return { ...intent, ...extra, scope: intent.scope ?? extra?.stateScope ?? null };
    })
  );
  listCache.set(key, { index, summaries });
  return { intents, warning: indexRes.ok || indexRes.missing ? null : indexRes.error };
}

async function walkFiles(root, rel, depth, out) {
  for (const e of await listDir(root, rel)) {
    if (e.name.startsWith('.')) continue;
    const child = `${rel}/${e.name}`;
    if (e.isDir && depth > 0) await walkFiles(root, child, depth - 1, out);
    else if (!e.isDir) out.push(child);
  }
  return out;
}

/** Artifact files grouped by their folder relative to the intent, e.g. "inception/requirements-analysis". */
async function listArtifacts(root, base) {
  const groups = new Map();
  for (const phase of PHASE_DIRS) {
    for (const file of await walkFiles(root, `${base}/${phase}`, 3, [])) {
      const dir = file.slice(base.length + 1, file.lastIndexOf('/'));
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir).push({ name: file.slice(file.lastIndexOf('/') + 1), rel: file });
    }
  }
  return [...groups].map(([dir, files]) => ({ dir, files }));
}

/** An intent's audit events in time order with their category; a missing audit folder gives []. */
export async function loadAuditEvents(root, base) {
  const files = (await listDir(root, `${base}/audit`)).filter((e) => !e.isDir && e.name.endsWith('.md'));
  const texts = await Promise.all(files.map(async (f) => ({ source: f.name, text: await readText(root, `${base}/audit/${f.name}`) })));
  return mergeAudits(texts).map((e) => ({ ...e, category: categoryOf(e.event) }));
}

/**
 * The agents working now (US-0901 "Arbetar nu", US-0025): per agent type, the dispatches no later completion closed,
 * newest first. Read from the audit log alone: AI-DLC's inflight file is emptied by Claude Code's own helper agents
 * (their SUBAGENT_COMPLETED says `Agent Type: unknown`), so those are skipped and the file is not consulted.
 * A refused or interrupted dispatch leaves a ghost: a later dispatch of the same agent type in the same stage
 * replaces it, and a completed stage closes its own. Pure; `events` come from loadAuditEvents in time order.
 * @returns {Array<{agent: string, name: string, startedMs: number, stage: string|null}>}
 */
export function workingAgents(events) {
  // ponytail: one open dispatch per agent type and stage, so parallel same-type agents in one stage show as one; Unit builds have their own rows.
  let open = []; // dispatches not yet completed, oldest first
  let stage = null;
  for (const e of events) {
    if (e.category === 'stage' && e.fields?.Stage) stage = e.fields.Stage;
    if (e.event === 'STAGE_COMPLETED') open = open.filter((d) => d.stage !== e.fields?.Stage);
    const agent = e.fields?.['Agent Type'];
    if (!agent || agent === 'unknown') continue;
    if (e.event === 'SUBAGENT_DISPATCHED') {
      open = open.filter((d) => d.agent !== agent || d.stage !== stage);
      open.push({ agent, name: agentName(agent), startedMs: e.timeMs, stage });
    } else if (e.event === 'SUBAGENT_COMPLETED') {
      const i = open.findIndex((d) => d.agent === agent);
      if (i !== -1) open.splice(i, 1);
    }
  }
  return open.sort((a, b) => b.startedMs - a.startedMs);
}

/** How many agents run now: the entries of AI-DLC's inflight file, 0 when it is missing or broken. */
export async function inflightCount(root) {
  const res = await readJsonSafe(root, INFLIGHT_PATH);
  return res.ok && Array.isArray(res.value?.entries) ? res.value.entries.length : 0;
}

/** The agents working now in one intent; a missing audit folder gives none. */
export async function loadWorkingAgents(root, space, dirName) {
  assertName(space, 'space');
  assertName(dirName, 'intent');
  return workingAgents(await loadAuditEvents(root, `${intentsDir(space)}/${dirName}`));
}

/**
 * US-0213 FR2.2, FR2.3: the active intent's state text and audit events (the space's `active-intent` cursor), as a
 * one-item list; [] when there is no cursor or its intent is finished. Read only.
 */
export async function loadHandoffInputs(root, space) {
  const cursor = (await readTextOrNull(root, `${intentsDir(space)}/active-intent`))?.trim();
  if (!cursor || !/^[\w.-]+$/.test(cursor)) return [];
  const base = `${intentsDir(space)}/${cursor}`;
  const stateText = await readTextOrNull(root, `${base}/aidlc-state.md`);
  if (!stateText || /\*\*Status\*\*:\s*complete/i.test(stateText)) return [];
  return [{ dirName: cursor, stateText, events: await loadAuditEvents(root, base) }];
}

/** An intent is in progress unless intents.json or aidlc-state.md says it is finished (US-0505 FR1.1). */
export function inProgress(intent) {
  if (intent.missingOnDisk || intent.status === 'complete' || intent.status === 'archived') return false;
  if (/^complete/i.test(intent.stateStatus ?? '')) return false;
  return !(intent.executed > 0 && intent.done >= intent.executed);
}

const questionCache = new Map(); // `${root}|${space}|${dirName}` -> pending questions of that intent

/**
 * The questions and gates AI-DLC waits on in every in-progress intent of one space (US-0505 FR1.1, NFR3).
 * Only the audit logs of in-progress intents are read, and with `onlyDirs` only those intents are re-read.
 * A broken audit log keeps that intent's last result.
 * @param {{root: string, space: string, projectId: string, name: string}} project
 * @param {string[]} [onlyDirs]
 */
export async function loadPendingQuestions(project, onlyDirs) {
  const { root, space } = project;
  const { intents } = await loadIntentList(root, space, onlyDirs);
  const lists = await Promise.all(
    intents.filter(inProgress).map(async ({ dirName }) => {
      const key = `${root}|${space}|${dirName}`;
      if (questionCache.has(key) && Array.isArray(onlyDirs) && !onlyDirs.includes(dirName)) return questionCache.get(key);
      try {
        const events = await loadAuditEvents(root, `${intentsDir(space)}/${dirName}`);
        const pending = pendingQuestions(events, { project, intent: dirName });
        questionCache.set(key, pending);
        return pending;
      } catch (err) {
        console.warn(`Väntande frågor kunde inte läsas för ${dirName}:`, err.message);
        return questionCache.get(key) ?? [];
      }
    })
  );
  return lists.flat();
}

async function buildDetail(root, space, dirName, prev) {
  const base = `${intentsDir(space)}/${dirName}`;
  const warnings = [];
  const stateText = await readTextOrNull(root, `${base}/aidlc-state.md`);
  const state = stateText ? parseState(stateText) : null;

  const graphRes = await readJsonSafe(root, `${base}/runtime-graph.json`);
  let graph = graphRes.ok ? parseRuntimeGraph(graphRes.value) : null;
  if (!graphRes.ok && !graphRes.missing) {
    warnings.push(graphRes.error);
    graph = prev?.graph ?? null; // keep the last good graph while the file is mid-write
  }
  const directiveRes = await readJsonSafe(root, `${base}/.aidlc-engine/active-directive.json`);
  const events = await loadAuditEvents(root, base);

  return {
    dirName,
    base,
    request: await loadDescription(root, base),
    state,
    graph,
    pipeline: mergePipeline(state, graph),
    events,
    units: graph?.boltDag ? unitStatuses(graph.boltDag, events) : null,
    directive: directiveRes.ok ? directiveRes.value : (prev?.directive ?? null),
    files: await listArtifacts(root, base),
    warnings
  };
}

/**
 * Reads AI-DLC's usage ledger (read-only, root-confined). Never throws: a missing or broken
 * ledger only hides the cost views (FR1.5, NFR3); a half-written one keeps the last good value (FR5.3).
 * @returns {Promise<{available: true, ledger: object, stale?: boolean, warning?: string} | {available: false, reason: string}>}
 */
export async function loadCost(root) {
  const res = await readJsonSafe(root, LEDGER_PATH);
  const valid = res.ok && res.value && typeof res.value === 'object' && !Array.isArray(res.value);
  if (valid) {
    const cost = { available: true, ledger: res.value };
    costCache.set(root, cost);
    return cost;
  }
  if (res.missing) {
    costCache.delete(root);
    return { available: false, reason: t('errors.ledgerMissing', { path: LEDGER_PATH }) };
  }
  const error = res.ok ? t('errors.ledgerShape', { path: LEDGER_PATH }) : res.error;
  const prev = costCache.get(root);
  if (prev) return { ...prev, stale: true, warning: error };
  console.warn(`Kunde inte läsa ${LEDGER_PATH}:`, error);
  return { available: false, reason: t('cost.loadFailed', { error }) };
}

/** An intent's audit events, or [] with a warning when a shard cannot be read (US-0209 NFR3: the cost view never blanks). */
async function auditEventsOrEmpty(root, base) {
  try {
    return await loadAuditEvents(root, base);
  } catch (err) {
    console.warn(`Kunde inte läsa ${base}/audit:`, err.message);
    return [];
  }
}

/** The project's machines: this one first (when it has a ledger or a part), then the others by host (US-0209 FR4.1). */
function projectMachines(parts, hasLedger, local) {
  const seen = new Map();
  if (hasLedger) seen.set('', { host: local?.host ?? null, local: true });
  for (const x of parts) if (!seen.has(x.local ? '' : x.host)) seen.set(x.local ? '' : x.host, { host: x.host, local: x.local });
  return [...seen.values()].sort((a, b) => b.local - a.local || String(a.host).localeCompare(String(b.host)));
}

/**
 * US-0209 FR1.4, FR2, FR3.4, FR4.1, FR4.2: the cost summary (summarizeLedger's shape) counting every machine: this
 * machine's ledger, every intent's audit shard rows and the committed snapshots in .thadeus/usage/. Each perIntent entry
 * and the project get `machines` and `partial`. An intent without a uuid is matched by its folder (shard rows only).
 * @param {object|null} ledger this machine's parsed usage-ledger.json, or null when it has none
 * @param {Record<string, object>|null} [rates] US-0211 FR2: the current rate table; every figure also gets `currentUsd`
 * @returns {Promise<{summary: object|null, local: {host: string, cloneId: string}|null}>} summary null: no cost anywhere
 */
export async function loadCrossMachineCost(root, space, intents, ledger, rates = null) {
  assertName(space, 'space');
  const shards = await Promise.all(intents.map(async (i) => shardCosts(await auditEventsOrEmpty(root, `${intentsDir(space)}/${i.dirName}`))));
  const local = await localClone(
    root,
    shards.flat().map((s) => s.source)
  );
  const snaps = await readSnapshots(root);
  const keyed = intents.map((i) => ({ ...i, uuid: i.uuid ?? `dir:${i.dirName}` }));
  const workflows = { ...ledger?.workflows };
  const merged = {};
  let extra = null;
  keyed.forEach((intent, n) => {
    const key = `intent:${intent.uuid}`;
    const snapshots = snaps.filter((s) => s.intents[intent.uuid]).map((s) => ({ host: s.host, cloneId: s.cloneId, node: s.intents[intent.uuid] }));
    const m = mergeIntentCosts({ ledgerNode: ledger?.workflows?.[key] ?? null, local, shards: shards[n], snapshots, rates });
    if (!m) return;
    workflows[key] = m.node;
    extra = addTree(extra, m.extra);
    merged[intent.dirName] = m;
  });
  if (!ledger && !extra) return { summary: null, local };

  const all = { ...ledger, workflows };
  for (const k of ['totals', 'byModel', 'byAgent']) all[k] = addTree(ledger?.[k], extra?.[k]);
  const summary = summarizeLedger(all, keyed, rates);
  for (const [dir, m] of Object.entries(merged)) Object.assign(summary.perIntent[dir], { machines: m.machines, partial: m.partial });
  const parts = Object.values(merged);
  summary.project.machines = projectMachines(
    parts.flatMap((m) => m.machines),
    !!ledger,
    local
  );
  summary.project.partial = parts.some((m) => m.partial);
  // US-0211 FR2.2, AC1.2.3: audit rows have no 5m/1h split, so their cache writes are priced as 5m; the view says so.
  summary.project.auditFiveMinute = parts.some((m) => m.machines.some((x) => x.source === 'audit'));
  return { summary, local };
}

/** US-0303 FR4.1: finished by its audit (WORKFLOW_COMPLETED, in intentMetrics) or by intents.json / aidlc-state.md; archived is not finished. */
const stateFinished = (intent) => intent.status === 'complete' || /^complete/i.test(intent.stateStatus ?? '');

/**
 * US-0303 FR1–FR4, NFR4: the project's velocity. Every intent's audit is read, archived ones included (FR3.4), each on
 * its own: no `audit/` folder is "missing", a read error is "unreadable", and an audit without events is a row marked
 * `empty`, never a zero (FR4.2). `sources` names what was read and what was not, with paths (FR4.3).
 * @param {object} features loadFeatures' result
 * @param {{tags?: {name: string, date: string|null}[], history?: string|null, featuresDir?: string|null}} git
 *   the release tags, storyMarkerHistory's text (null: git failed) and the folder it read
 */
export async function loadVelocity(root, space, intents, features, { tags = [], history = null, featuresDir = null } = {}) {
  assertName(space, 'space');
  const read = await Promise.all(
    intents.map(async (intent) => {
      const base = `${intentsDir(space)}/${intent.dirName}`;
      const rel = `${base}/audit`;
      if (intent.missingOnDisk || !(await exists(root, rel))) return { intent, missing: { kind: 'missing', path: rel } };
      try {
        return { intent, events: await loadAuditEvents(root, base) };
      } catch (err) {
        console.warn(`Kunde inte läsa ${rel}:`, err.message);
        return { intent, missing: { kind: 'unreadable', path: rel, error: err.message } };
      }
    })
  );
  const missing = read.filter((r) => r.missing).map((r) => r.missing);
  const ok = read.filter((r) => r.events);
  const rows = ok.map(({ intent, events }) => ({
    dirName: intent.dirName,
    slug: intent.slug ?? intent.dirName,
    scope: intent.scope ?? null,
    status: intent.status ?? null,
    archived: intent.status === 'archived',
    empty: events.length === 0,
    ...intentMetrics(events, { finished: stateFinished(intent) })
  }));

  const epics = features?.available ? features.epics : [];
  if (features && !features.available) missing.push({ kind: 'features', path: features.overviewPath });
  for (const e of epics) if (e.file && !e.parsed) missing.push({ kind: 'epic', path: e.file });
  const parsed = history === null ? null : parseMarkerHistory(history);
  if (!parsed && featuresDir) missing.push({ kind: 'git', path: featuresDir });

  const named = ok.map(({ intent }, n) => ({ dirName: intent.dirName, request: intent.request ?? null, startMs: rows[n].startMs }));
  const { stories, releases } = storyMetrics({ features, intents: named, history: parsed?.stories ?? {}, tags });
  return {
    intents: rows,
    stories,
    releases,
    project: projectMetrics(rows, stories),
    sources: {
      intents: rows.length,
      shards: ok.reduce((n, r) => n + new Set(r.events.map((e) => e.source)).size, 0),
      epicFiles: epics.filter((e) => e.file && e.parsed).map((e) => e.file),
      git: parsed && { commits: parsed.commits, fromMs: parsed.fromMs, toMs: parsed.toMs, dir: featuresDir },
      missing
    }
  };
}

export async function loadIntentDetail(root, space, dirName) {
  assertName(space, 'space');
  assertName(dirName, 'intent');
  const key = `${root}|${space}|${dirName}`;
  const prev = detailCache.get(key);
  try {
    const detail = await buildDetail(root, space, dirName, prev);
    detailCache.set(key, detail);
    return detail;
  } catch (err) {
    if (!prev) throw err;
    return { ...prev, stale: true, warnings: [...prev.warnings, err.message] };
  }
}
