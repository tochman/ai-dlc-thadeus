// Plans (scopes) of a project (EPIC-09 US-0903). Reading lists the project's own plans (`aidlc/scopes/*.md`)
// and the harness's stock ones. Saving and recompiling run the official `aidlc` CLI with fixed arguments (tier 1).
// Editing a plan's description, depth or keywords and deleting a plan are tier 2: only the project's own plan
// file, after a diff, and never a stock plan. Every path goes through resolveInRoot (NFR6).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { defaultExec, runFixed } from './exec.js';
import { listDir, readJsonSafe, readText, resolveInRoot } from './projectAccess.js';
import { frontmatterField } from './models.js';
import { inProgress } from './projectService.js';
import { toolPath } from './tools.js';
import { HARNESSES, scopesDir, setupHarness } from '../shared/harnesses.js';
import { t } from '../shared/i18n.js';
import { validPlanName } from '../shared/planName.js';

export const OWN_PLANS_DIR = 'aidlc/scopes';
export const PLAN_DEPTHS = ['Minimal', 'Standard', 'Comprehensive'];
const DEFAULT_KEYS = ['review_cap', 'sensors', 'learnings', 'summary_confirmation', 'plan_approval', 'guard_policy', 'collaborators'];
const GRID_MARKER = '<!-- BEGIN aidlc composed-scope-grid';
const KEYWORD = /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,39}$/u;
const TIMEOUT_MS = 120000; // compile and save may take a while; never hang forever

const ownFile = (name) => `${OWN_PLANS_DIR}/${name}.md`;
const harnessCopies = (name) =>
  HARNESSES.map(scopesDir)
    .filter(Boolean)
    .map((dir) => `${dir}/aidlc-${name}.md`);
const errorText = (err) => (err.killed ? t('errors.timeout') : String(err.message ?? err).trim());

export { validPlanName };

function checkName(name) {
  if (!validPlanName(name)) throw new Error(t('errors.invalidPlanName', { name: String(name) }));
}

/** The `stages` of the composed-grid JSON block after the BEGIN marker, or null. */
export function gridOf(text) {
  const at = text.indexOf(GRID_MARKER);
  if (at === -1) return null;
  const m = /```json\s*\n([\s\S]*?)\n```/.exec(text.slice(at));
  if (!m) return null;
  try {
    const stages = JSON.parse(m[1]).stages;
    return stages && typeof stages === 'object' ? stages : null;
  } catch (err) {
    console.warn('Planens stegtabell kunde inte läsas:', err.message);
    return null;
  }
}

/** Plans in one folder; an unreadable or nameless file is skipped with a warning (US-0901 FR3.4). */
async function readPlans(root, dir, own) {
  let entries;
  try {
    entries = (await listDir(root, dir)).filter((e) => !e.isDir && e.name.endsWith('.md'));
  } catch (err) {
    console.warn(`Kunde inte läsa ${dir}:`, err.message);
    return [];
  }
  const plans = [];
  for (const e of entries) {
    try {
      const text = await readText(root, `${dir}/${e.name}`);
      const name = frontmatterField(text, 'name');
      if (!name) throw new Error('inget name i frontmatter');
      const defaults = Object.fromEntries(DEFAULT_KEYS.map((k) => [k, frontmatterField(text, k)]));
      plans.push({ name, description: frontmatterField(text, 'description'), depth: frontmatterField(text, 'depth'), defaults, own, grid: gridOf(text) });
    } catch (err) {
      console.warn(`Hoppar över planen ${dir}/${e.name}:`, err.message);
    }
  }
  return plans.sort((a, b) => a.name.localeCompare(b.name));
}

/** The project's own plans first, then the harness's shipped ones without a copy of an own plan (US-0901 FR3.1–FR3.3). */
export async function loadPlans(root, harness, activeScope) {
  const shippedDir = scopesDir(setupHarness(harness));
  const [own, shipped] = await Promise.all([readPlans(root, OWN_PLANS_DIR, true), shippedDir ? readPlans(root, shippedDir, false) : []]);
  const ownNames = new Set(own.map((p) => p.name));
  return [...own, ...shipped.filter((p) => !ownNames.has(p.name))].map((p) => ({ ...p, active: p.name === activeScope }));
}

/** The compiled grid of every plan the harness knows (`<harness dir>/tools/data/scope-grid.json`), or {}. */
async function compiledGrids(root, harness) {
  const dir = setupHarness(harness)?.markers?.dirs?.[0];
  if (!dir) return {};
  const res = await readJsonSafe(root, `${dir}/tools/data/scope-grid.json`);
  if (!res.ok && !res.missing) console.warn('scope-grid.json kunde inte läsas:', res.error);
  return res.ok && res.value && typeof res.value === 'object' ? res.value : {};
}

const usesPlan = (intent, name) => !intent.missingOnDisk && (intent.plan ?? intent.scope) === name;

/**
 * Every plan with its depth, stage count, default settings, whether it is the project's own, and the intents
 * on it (`running` for one in progress). `intents` is loadIntentList's list.
 */
export async function listPlans(root, harness, activeScope, intents = []) {
  const [plans, compiled] = await Promise.all([loadPlans(root, harness, activeScope), compiledGrids(root, harness)]);
  return plans.map(({ grid, ...p }) => {
    const stages = grid ?? compiled[p.name]?.stages ?? null;
    return {
      ...p,
      stageCount: stages ? Object.values(stages).filter((v) => v === 'EXECUTE').length : null,
      intents: intents.filter((i) => usesPlan(i, p.name)).map((i) => ({ dirName: i.dirName, slug: i.slug ?? null, running: inProgress(i) }))
    };
  });
}

/** Reads a file through resolveInRoot, or null when it is not there. */
async function readIfThere(root, rel) {
  try {
    return await readText(root, rel);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * The stages a plan runs and skips, in pipeline order: from the own plan's grid, else the harness copy's,
 * else the compiled scope grid (stock plans carry no grid block).
 * @returns {Promise<{execute: string[], skip: string[]}>}
 */
export async function planStages(root, harness, name) {
  checkName(name);
  const dir = scopesDir(setupHarness(harness));
  const texts = [await readIfThere(root, ownFile(name)), dir ? await readIfThere(root, `${dir}/aidlc-${name}.md`) : null];
  const stages = texts.map((text) => text && gridOf(text)).find(Boolean) ?? (await compiledGrids(root, harness))[name]?.stages;
  if (!stages) throw new Error(t('errors.planNotFound', { name }));
  const entries = Object.entries(stages);
  return {
    execute: entries.filter(([, v]) => v === 'EXECUTE').map(([k]) => k),
    skip: entries.filter(([, v]) => v !== 'EXECUTE').map(([k]) => k),
    ordered: entries.map(([k]) => k)
  };
}

/** US-0906 FR1.2, FR2.2: the installed framework's ordered stage definitions, never a renderer-supplied graph. */
export async function planDesignGraph(root, harness) {
  const dir = setupHarness(harness)?.markers?.dirs?.[0];
  if (!dir) throw new Error(t('errors.invalidValue', { what: 'harness', value: String(harness) }));
  const result = await readJsonSafe(root, `${dir}/tools/data/stage-graph.json`);
  if (!result.ok || !Array.isArray(result.value)) throw new Error(t('errors.missingField', { field: `${dir}/tools/data/stage-graph.json` }));
  return result.value.filter((stage) => typeof stage?.slug === 'string').map(({ slug, phase }) => ({ slug, phase: String(phase ?? '') }));
}

/** Runs `aidlc <args>`; the CLI's output, or its error as a value. */
async function runAidlc(root, args, exec, env) {
  const command = ['aidlc', ...args].join(' ');
  try {
    return { ok: true, command, output: (await runFixed(toolPath('aidlc'), args, { cwd: root, timeout: TIMEOUT_MS, exec, env })).trim() };
  } catch (err) {
    console.error(`${command} misslyckades:`, errorText(err));
    return { ok: false, command, error: errorText(err) };
  }
}

/** The harness folders installed in the project (`.claude`, `.aidlc`, …): those that hold AI-DLC's `tools/` folder. */
async function installedHarnessDirs(root) {
  const dirs = [...new Set(HARNESSES.map((h) => h.markers?.dirs?.[0]).filter(Boolean))];
  const found = await Promise.all(
    dirs.map((dir) =>
      fs.stat(path.join(root, dir, 'tools')).then(
        (s) => s.isDirectory(),
        () => false
      )
    )
  );
  return dirs.filter((_, i) => found[i]);
}

/**
 * US-0021 FR1–FR3: `aidlc engine graph compile` rebuilds the plan list and the plan copies only for the harness it
 * runs as, so it runs once per installed harness (`AIDLC_HARNESS_DIR`). The first failure stops and names its harness;
 * the plan file itself is already written by then. Also used by the cost rule pack (US-0212 FR5.3).
 */
export async function compileEveryHarness(root, exec) {
  const dirs = await installedHarnessDirs(root);
  if (!dirs.length) return runAidlc(root, ['engine', 'graph', 'compile'], exec);
  const outputs = [];
  for (const dir of dirs) {
    const res = await runAidlc(root, ['engine', 'graph', 'compile'], exec, { AIDLC_HARNESS_DIR: dir });
    if (!res.ok) return { ...res, error: t('errors.compileFailedFor', { harness: dir, error: res.error }) };
    if (res.output) outputs.push(res.output);
  }
  return { ok: true, command: 'aidlc engine graph compile', output: outputs.join('\n') };
}

/**
 * Tier 1: saves the active intent's plan as `aidlc/scopes/<name>.md`, then recompiles every installed harness, since
 * the save writes only the running harness's copy (US-0021). An invalid name throws before anything runs.
 */
export async function savePlan(root, name, { exec = defaultExec } = {}) {
  checkName(name);
  const saved = await runAidlc(root, ['engine', 'scope', 'save', '--name', name], exec);
  if (!saved.ok) return saved;
  const compiled = await compileEveryHarness(root, exec);
  return compiled.ok ? saved : compiled;
}

function yamlText(value) {
  return /^[\p{L}\p{N}][^:#"'\n\r[\]{}]*$/u.test(value) ? value : JSON.stringify(value);
}

const FORMAT = {
  description: (v) => {
    if (typeof v !== 'string' || !v.trim() || v.length > 200 || /[\r\n]/.test(v))
      throw new Error(t('errors.invalidValue', { what: 'description', value: String(v) }));
    return yamlText(v.trim());
  },
  depth: (v) => {
    if (!PLAN_DEPTHS.includes(v)) throw new Error(t('errors.invalidValue', { what: 'depth', value: String(v) }));
    return v;
  },
  keywords: (v) => {
    const words = Array.isArray(v) ? v.map((w) => String(w).trim()).filter(Boolean) : null;
    if (!words || words.length > 20 || !words.every((w) => KEYWORD.test(w))) throw new Error(t('errors.invalidValue', { what: 'keywords', value: String(v) }));
    return `[${words.join(', ')}]`;
  }
};

/**
 * Changes only `description`, `depth` and `keywords` (those given) in the frontmatter, which must end above the
 * composed-grid marker. Every other line is untouched. A field missing from the frontmatter is added at its end.
 * @returns {{next: string, diff: string}} `diff` lists the removed (`-`) and added (`+`) lines.
 */
export function planEditDiff(text, edit) {
  if (typeof text !== 'string' || !edit || typeof edit !== 'object') throw new Error(t('errors.invalidValue', { what: 'plan', value: String(edit) }));
  if (edit.stages !== undefined) {
    if (
      !edit.stages ||
      typeof edit.stages !== 'object' ||
      Array.isArray(edit.stages) ||
      Object.values(edit.stages).some((value) => !['EXECUTE', 'SKIP'].includes(value)) ||
      !Object.values(edit.stages).includes('EXECUTE')
    )
      throw new Error(t('errors.invalidValue', { what: 'stages', value: String(edit.stages) }));
    const match = /<!-- BEGIN aidlc composed-scope-grid[^>]*-->\s*\n\s*```json\s*\n([\s\S]*?)\n\s*```/.exec(text);
    if (!match) throw new Error(t('errors.missingField', { field: 'composed scope grid' }));
    const current = JSON.parse(match[1]);
    const replacement = JSON.stringify({ ...current, stages: edit.stages }, null, 2);
    const diff = Object.keys({ ...current.stages, ...edit.stages })
      .filter((stage) => current.stages?.[stage] !== edit.stages[stage])
      .flatMap((stage) => [`- "${stage}": "${current.stages?.[stage] ?? 'SKIP'}"`, `+ "${stage}": "${edit.stages[stage] ?? 'SKIP'}"`])
      .join('\n');
    return { next: text.replace(match[1], replacement), diff };
  }
  const lines = text.split('\n');
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  const marker = lines.findIndex((l) => l.startsWith(GRID_MARKER));
  if (lines[0]?.trim() !== '---' || end === -1 || (marker !== -1 && marker < end)) throw new Error(t('errors.missingField', { field: 'frontmatter' }));
  const fm = lines.slice(1, end);
  const removed = [];
  const added = [];
  for (const field of Object.keys(FORMAT)) {
    if (edit[field] === undefined) continue;
    const line = `${field}: ${FORMAT[field](edit[field])}`;
    const at = fm.findIndex((l) => l.startsWith(`${field}:`));
    let to = at + 1;
    if (at !== -1 && fm[at].trim() === `${field}:`) while (to < fm.length && /^\s+-\s/.test(fm[to])) to++; // a block list
    const old = at === -1 ? [] : fm.slice(at, to);
    if (old.length === 1 && old[0] === line) continue;
    if (at === -1) fm.push(line);
    else fm.splice(at, to - at, line);
    removed.push(...old);
    added.push(line);
  }
  const next = [lines[0], ...fm, ...lines.slice(end)].join('\n');
  return { next, diff: [...removed.map((l) => `- ${l}`), ...added.map((l) => `+ ${l}`)].join('\n') };
}

/** The own plan's text, or throws for a stock plan (read-only) and an invalid name. */
async function ownText(root, name) {
  checkName(name);
  const text = await readIfThere(root, ownFile(name));
  if (text === null) throw new Error(t('errors.stockPlan', { name }));
  return text;
}

/** The diff of an edit with the text it was made from. */
export async function previewPlanEdit(root, name, edit) {
  const before = await ownText(root, name);
  return { file: ownFile(name), before, ...planEditDiff(before, edit) };
}

/** Removes the harness copies of a plan (`<harness>/scopes/aidlc-<name>.md`) that are there; a link itself, not its target. */
async function removeHarnessCopies(root, name) {
  for (const rel of harnessCopies(name)) {
    try {
      await resolveInRoot(root, rel); // refuses a path out of the root
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    await fs.rm(path.join(root, rel));
  }
}

/**
 * Tier 2: writes the edit only when the plan file still reads `before` (the text the diff was shown of), removes the
 * stale harness copies, then recompiles every installed harness (US-0021). A failed compile comes back as `{ok: false}`.
 */
export async function applyPlanEdit(root, name, edit, before, { exec = defaultExec } = {}) {
  const now = await ownText(root, name);
  if (typeof before !== 'string' || now !== before) throw new Error(t('errors.changedSincePreview', { file: ownFile(name) }));
  await fs.writeFile(await resolveInRoot(root, ownFile(name)), planEditDiff(now, edit).next);
  await removeHarnessCopies(root, name);
  return { file: ownFile(name), ...(await compileEveryHarness(root, exec)) };
}

/**
 * Tier 2: removes an own plan and its harness copies, then recompiles. Refuses a stock plan and a plan an
 * intent in progress uses.
 */
export async function deletePlan(root, name, intents = [], { exec = defaultExec } = {}) {
  await ownText(root, name);
  const users = intents.filter((i) => usesPlan(i, name) && inProgress(i));
  if (users.length) throw new Error(t('errors.planInUse', { name, intents: users.map((i) => i.slug ?? i.dirName).join(', ') }));
  await fs.rm(path.join(root, ownFile(name)));
  await removeHarnessCopies(root, name);
  return { file: ownFile(name), ...(await compileEveryHarness(root, exec)) };
}
