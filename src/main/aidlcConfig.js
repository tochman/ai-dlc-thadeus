// A project's AI-DLC configuration, read-only (EPIC-09 US-0901). Every value comes from `aidlc config`
// (fixed arguments, execFile without a shell) or from the plan files' frontmatter. Nothing is written (NFR1).
//
// `aidlc config --show` refuses `--harness` and fails every section once a project has more than one harness,
// so each section is read with its own `aidlc config <section> --show --json --harness <h>`; the envelope is
// the same one `config --show` nests under `sections.<section>`.
import { defaultExec, runFixed } from './exec.js';
import { listDir, readText } from './projectAccess.js';
import { frontmatterField } from './models.js';
import { agentName } from './parsers/ledger.js';
import { toolPath } from './tools.js';
import { HARNESSES, scopesDir, setupHarness } from '../shared/harnesses.js';
import { t } from '../shared/i18n.js';

const TIMEOUT_MS = 10000;
const OWN_PLANS_DIR = 'aidlc/scopes';
const isEnv = (source) => typeof source === 'string' && /^env\b/.test(source);

/**
 * Refuses a harness id outside the fixed table or not installed in the project (FR4.3, NFR2).
 * `detected` is detectHarnesses' list.
 */
export function checkHarness(id, detected) {
  const entry = typeof id === 'string' ? setupHarness(id) : null;
  if (!entry) throw new Error(t('errors.unknownHarness', { id: String(id) }));
  if (!(detected ?? []).some((d) => d.id === id && d.installed)) throw new Error(t('errors.harnessNotInstalled', { harness: entry.label }));
  return entry;
}

/** Runs one `aidlc` command and returns its parsed JSON, or `{error, missing}`. Never throws. */
async function runJson(root, args, exec) {
  try {
    return { value: JSON.parse(await runFixed(toolPath('aidlc'), args, { cwd: root, timeout: TIMEOUT_MS, exec })) };
  } catch (err) {
    const error = err.killed ? t('errors.timeout') : err.message;
    console.warn(`aidlc ${args.join(' ')} misslyckades:`, error);
    return { error, missing: err.code === 'ENOENT' };
  }
}

/** The `data` of an `{ok, data}` envelope, or throws with the CLI's own message. */
function envelopeData(out) {
  if (out?.ok !== true || !out.data) throw new Error(out?.message ?? t('errors.missingField', { field: 'data' }));
  return out.data;
}

const parse = {
  models: (data) => {
    if (!Array.isArray(data.effective)) throw new Error(t('errors.missingField', { field: 'data.effective' }));
    return data.effective
      .filter((e) => e && typeof e.agent === 'string')
      .map((e) => ({
        agent: agentName(e.agent),
        model: e.model ?? null,
        effort: e.effort ?? null,
        modelSource: e.modelSource ?? null,
        effortSource: e.effortSource ?? null,
        env: isEnv(e.modelSource) || isEnv(e.effortSource)
      }));
  },
  // Every switch AI-DLC names, also those at the shipped default (FR2.3).
  flags: (data) => {
    const effective = data.effective ?? {};
    return Object.entries(data.sources ?? {}).map(([name, source]) => ({
      name,
      value: effective[name] == null ? null : String(effective[name]),
      source: String(source),
      env: isEnv(source)
    }));
  },
  // ponytail: the record's field names are assumed (provider, region, profile); none was recorded on this machine.
  providers: (data) => ({
    provider: data.record?.provider ?? null,
    region: data.record?.region ?? null,
    profile: data.record?.profile ?? null,
    harnessManaged: data.harnessManaged === true
  }),
  project: (data) => ({
    installed: Array.isArray(data.installedPlugins) ? data.installedPlugins.map(String) : [],
    selected: Array.isArray(data.plugins) ? data.plugins.map(String) : null
  })
};

/** "off (guard policy off (from scope x))" -> {value: "off", source: "guard policy off (from scope x)"} (FR2.4). */
export function splitSource(text) {
  const s = String(text ?? '').trim();
  if (!s.endsWith(')')) return { value: s, source: null };
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ')') depth++;
    else if (s[i] === '(' && --depth === 0) {
      return { value: s.slice(0, i).trim(), source: s.slice(i + 1, -1).trim().replace(/^from\s+/, '') };
    }
  }
  return { value: s, source: null }; // unbalanced: shown as it is
}

function parseList(out) {
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error(t('errors.missingField', { field: 'config list' }));
  if (out.ok === false) throw new Error(out.message ?? 'config list');
  return Object.entries(out).map(([key, raw]) => ({ key, ...splitSource(raw), env: false }));
}

/** Plans in one folder; an unreadable or nameless file is skipped with a warning (FR3.4). */
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
      plans.push({ name, description: frontmatterField(text, 'description'), own });
    } catch (err) {
      console.warn(`Hoppar över planen ${dir}/${e.name}:`, err.message);
    }
  }
  return plans.sort((a, b) => a.name.localeCompare(b.name));
}

/** The project's own plans first, then the harness's shipped ones without a copy of an own plan (FR3.1–FR3.3). */
async function loadPlans(root, harness, activeScope) {
  const shippedDir = scopesDir(setupHarness(harness));
  const [own, shipped] = await Promise.all([
    readPlans(root, OWN_PLANS_DIR, true),
    shippedDir ? readPlans(root, shippedDir, false) : []
  ]);
  const ownNames = new Set(own.map((p) => p.name));
  return [...own, ...shipped.filter((p) => !ownNames.has(p.name))].map((p) => ({ ...p, active: p.name === activeScope }));
}

const SECTIONS = ['models', 'flags', 'providers', 'project'];

/**
 * Never throws (NFR3). `harness` must have passed checkHarness. `exec(file, args, options) => Promise<stdout>`
 * is injectable for tests. A failed command leaves its section null with its error in `errors` (FR5.3).
 * @returns {Promise<{harness: string, models: object[]|null, flags: object[]|null, active: object[]|null,
 *   provider: object|null, plugins: object|null, plans: object[],
 *   errors: {missing?: true, models?: string, flags?: string, active?: string, provider?: string, plugins?: string}}>}
 */
export async function getAidlcConfig(root, { harness, activeScope = null, exec = defaultExec } = {}) {
  const [sectionRuns, listRun, plans] = await Promise.all([
    Promise.all(SECTIONS.map((s) => runJson(root, ['config', s, '--show', '--json', '--harness', harness], exec))),
    runJson(root, ['config', 'list', '--json'], exec),
    loadPlans(root, harness, activeScope)
  ]);
  const errors = {};
  const read = (key, run, fn) => {
    if (run.missing) errors.missing = true;
    if (run.error) {
      errors[key] = run.error;
      return null;
    }
    try {
      return fn(run.value);
    } catch (err) {
      errors[key] = err.message;
      return null;
    }
  };
  const [models, flags, provider, plugins] = SECTIONS.map((s, i) =>
    read({ providers: 'provider', project: 'plugins' }[s] ?? s, sectionRuns[i], (out) => parse[s](envelopeData(out)))
  );
  const active = read('active', listRun, parseList);
  return { harness, models, flags, active, provider, plugins, plans, errors };
}

/** Root-relative paths whose change can alter the configuration (FR6.1); the intent state comes via project:changed. */
export const CONFIG_WATCH_PATHS = [
  'aidlc.settings.json',
  'aidlc.settings.local.json',
  OWN_PLANS_DIR,
  ...HARNESSES.map(scopesDir).filter(Boolean)
];
