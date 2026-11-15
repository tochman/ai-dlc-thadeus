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
import { agentName } from './parsers/ledger.js';
import { t } from '../shared/i18n.js';

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

function assertName(name, what) {
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

export async function detectProject(root) {
  if (!(await exists(root, 'aidlc/spaces'))) {
    return { isAidlc: false, reason: t('errors.notAidlc') };
  }
  const spaces = await listSpaces(root);
  if (spaces.length === 0) return { isAidlc: false, reason: t('errors.noSpace') };
  const named = (await readTextOrNull(root, 'aidlc/active-space'))?.trim();
  const activeSpace = spaces.includes(named) ? named : spaces.includes('default') ? 'default' : spaces[0];
  return { isAidlc: true, activeSpace, spaces };
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
  return {
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

async function loadAuditEvents(root, base) {
  const files = (await listDir(root, `${base}/audit`)).filter((e) => !e.isDir && e.name.endsWith('.md'));
  const texts = await Promise.all(files.map(async (f) => ({ source: f.name, text: await readText(root, `${base}/audit/${f.name}`) })));
  return mergeAudits(texts).map((e) => ({ ...e, category: categoryOf(e.event) }));
}

/**
 * The agents working now (US-0901 "Arbetar nu"): per agent type, the dispatches no later completion closed,
 * oldest first. A dispatch a hook refused leaves a ghost, so only `running` (the inflight entries) are kept,
 * newest first. Pure; `events` come from loadAuditEvents in time order.
 * @returns {Array<{agent: string, name: string, startedMs: number, stage: string|null}>}
 */
export function workingAgents(events, running) {
  if (!(running > 0)) return [];
  const open = new Map(); // agent type -> dispatches not yet completed, oldest first
  let stage = null;
  for (const e of events) {
    if (e.category === 'stage' && e.fields?.Stage) stage = e.fields.Stage;
    const agent = e.fields?.['Agent Type'];
    if (!agent) continue;
    if (!open.has(agent)) open.set(agent, []);
    if (e.event === 'SUBAGENT_DISPATCHED') open.get(agent).push({ agent, name: agentName(agent), startedMs: e.timeMs, stage });
    else if (e.event === 'SUBAGENT_COMPLETED') open.get(agent).shift();
  }
  return [...open.values()]
    .flat()
    .sort((a, b) => b.startedMs - a.startedMs)
    .slice(0, running);
}

/** How many agents run now: the entries of AI-DLC's inflight file, 0 when it is missing or broken. */
async function inflightCount(root) {
  const res = await readJsonSafe(root, INFLIGHT_PATH);
  return res.ok && Array.isArray(res.value?.entries) ? res.value.entries.length : 0;
}

/** The agents working now in one intent; a missing audit folder gives none. */
export async function loadWorkingAgents(root, space, dirName) {
  assertName(space, 'space');
  assertName(dirName, 'intent');
  const running = await inflightCount(root);
  if (running === 0) return [];
  return workingAgents(await loadAuditEvents(root, `${intentsDir(space)}/${dirName}`), running);
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
