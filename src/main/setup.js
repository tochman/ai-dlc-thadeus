// Prerequisites, preview and the setup run for "Initiera AI-DLC" (US-0503) and "Add harness" (US-0802).
// getSetupInfo only reads (a `--dry-run` preview); runSetup runs the steps itself after the person pressed
// Apply (US-0802 FR2.2), with fixed argument arrays through runFixed: no shell.
import { runFixed } from './exec.js';
import { toolPath } from './tools.js';
import { isGitRepo } from './git.js';
import { listDir } from './projectAccess.js';
import { DEFAULT_HARNESS, HARNESSES, setupHarness } from '../shared/harnesses.js';
import { t } from '../shared/i18n.js';

const OTHER_HARNESSES = ['.kiro', '.codex', '.cursor', '.aidlc'];
export const PRESETS = ['thorough', 'balanced', 'minimal'];
const PLUGIN_NAME = /^[a-z0-9-]+$/;
// Writing ~400 files can take a while; still bounded, so a hung CLI cannot hang the dialog (NFR3).
const STEP_TIMEOUT_MS = 120000;
const COUNT_KEYS = ['create', 'update', 'merge', 'preserve', 'remove', 'conflict'];

const errorText = (err) => (err.killed ? t('errors.timeout') : err.message);

/** Reads the counts from "create=N update=N ... conflict=N", lines that name a conflicting file, and "Note:" lines. */
export function parsePreview(raw) {
  const counts = Object.fromEntries(
    COUNT_KEYS.map((key) => {
      const m = new RegExp(`\\b${key}=(\\d+)`).exec(raw);
      return [key, m ? Number(m[1]) : null];
    })
  );
  const lines = raw.split('\n');
  const conflicts = lines.map((l) => /^\s*(?:conflict|CONFLICT)\b[:\s]+(\S.*)$/.exec(l)?.[1]?.trim()).filter((f) => f && !/^\d+$/.test(f) && !f.includes('='));
  const notes = lines.map((l) => /^\s*Note:\s*(.*)$/.exec(l)?.[1]?.trim()).filter(Boolean);
  return { raw, ...counts, conflicts, notes };
}

/**
 * With more than one harness installed, aidlc refuses `config project` without `--harness`, and it refuses a
 * harness the project does not have yet (the one being added). So try the chosen harness, then no flag (zero
 * or one harness), then each other harness in the table, and keep the first answer.
 */
async function readPlugins(root, setupId, exec) {
  const tries = [['--harness', setupId], [], ...HARNESSES.filter((h) => h.setupId !== setupId).map((h) => ['--harness', h.setupId])];
  let lastErr;
  for (const extra of tries) {
    try {
      const out = JSON.parse(await runFixed(toolPath('aidlc'), ['config', 'project', '--show', '--json', ...extra], { cwd: root, exec }));
      const installed = out?.data?.installedPlugins;
      if (out?.ok !== true || !Array.isArray(installed)) throw new Error(t('errors.missingField', { field: 'data.installedPlugins' }));
      return { plugins: installed.filter((p) => typeof p === 'string' && PLUGIN_NAME.test(p)) };
    } catch (err) {
      lastErr = err;
    }
  }
  return { plugins: [], warning: t('errors.pluginsFailed', { error: errorText(lastErr) }) };
}

/**
 * US-0609 FR3.7: whether a `.gitignore` entry hides `.thadeus/` (check-ignore exits 0 for an ignored path, 1 for one
 * that is not; any failure counts as not ignored).
 */
const thadeusIgnored = (root, exec) =>
  runFixed('git', ['check-ignore', '-q', '.thadeus/x'], { cwd: root, exec }).then(
    () => true,
    () => false
  );

/** The table entry for a setup harness id; anything else throws (US-0802 FR1.4). */
function checkedHarness(id) {
  const entry = setupHarness(id);
  if (!entry) throw new Error(t('errors.unknownHarness', { id: String(id) }));
  return entry;
}

/**
 * Never throws for a missing tool: a missing `aidlc` gives `{installed: false}` and stops there (FR4.2).
 * The preview is for `harness` (a table id, default Claude Code; US-0802 FR2.1). `exec` is injectable for tests.
 */
export async function getSetupInfo(root, { harness = DEFAULT_HARNESS, exec } = {}) {
  const { id, setupId } = checkedHarness(harness);
  const harnesses = (await listDir(root, '.')).filter((e) => e.isDir && OTHER_HARNESSES.includes(e.name)).map((e) => `${e.name}/`);
  const git = { isRepo: await isGitRepo(root, { exec }) };
  const base = { harness: id, git, harnesses, preview: null, plugins: [], presets: PRESETS, thadeusIgnored: git.isRepo && (await thadeusIgnored(root, exec)) };

  let version;
  try {
    version = (await runFixed(toolPath('aidlc'), ['--version'], { cwd: root, exec })).trim();
  } catch (err) {
    return { ...base, aidlc: { installed: false, error: errorText(err) } };
  }

  let preview;
  try {
    preview = parsePreview(await runFixed(toolPath('aidlc'), ['--project-dir', root, 'config', '--harness', setupId, '--dry-run'], { cwd: root, exec }));
  } catch (err) {
    preview = { ...parsePreview(''), raw: String(err.stdout ?? ''), error: t('errors.previewFailed', { error: errorText(err) }) };
  }
  return { ...base, aidlc: { installed: true, version }, preview, ...(await readPlugins(root, setupId, exec)) };
}

/**
 * The steps for one run, in the order the old typed chain had them (US-0503 FR4.4, US-0802 FR2.3):
 *   1. `git init -b main`, only when setting up a folder that is no git repository (never in add mode);
 *   2. `aidlc --project-dir <root> config --harness <id> --yes`;
 *   3. `aidlc config project --plugins … --yes`, when plugins were chosen;
 *   4. `aidlc config models --preset … --project --yes`, when a preset was chosen.
 * Every value is checked here first; anything unknown throws before a step runs (FR1.4).
 */
function setupSteps(root, { harness, mode = 'setup', plugins = [], preset = null } = {}, info) {
  const { id, setupId } = checkedHarness(harness);
  if (!Array.isArray(plugins)) throw new Error(t('errors.pluginsNotList'));
  for (const p of plugins) {
    if (typeof p !== 'string' || !PLUGIN_NAME.test(p) || !info.plugins.includes(p)) throw new Error(t('errors.unknownPlugin', { name: String(p) }));
  }
  if (preset !== null && !PRESETS.includes(preset)) throw new Error(t('errors.unknownPreset', { name: String(preset) }));
  checkPreview(id, mode, info);
  const steps = [];
  if (mode !== 'add' && !info.git?.isRepo) steps.push(['git', ['init', '-b', 'main']]);
  // `--project-dir` because aidlc refuses non-interactive config outside a recognised project (F-02).
  steps.push([toolPath('aidlc'), ['--project-dir', root, 'config', '--harness', setupId, '--yes']]);
  // `--harness`: with more than one harness installed (always so after adding one) aidlc refuses these without it.
  if (plugins.length) steps.push([toolPath('aidlc'), ['config', 'project', '--plugins', plugins.join(','), '--harness', setupId, '--yes']]);
  if (preset) steps.push([toolPath('aidlc'), ['config', 'models', '--preset', preset, '--project', '--harness', setupId, '--yes']]);
  return steps;
}

/**
 * Nothing runs without a preview for this very harness (FR2.4) that reported no conflict. Adding a harness to
 * an AI-DLC project must leave what is there untouched, so add mode also refuses a preview that removes
 * anything or could not be read (FR3.2).
 */
function checkPreview(id, mode, info) {
  const preview = info?.harness === id ? info.preview : null;
  if (!preview) throw new Error(t('errors.previewFirst', { harness: id }));
  const touchesExisting = (preview.conflict ?? 0) > 0 || preview.conflicts.length > 0 || (mode === 'add' && (preview.error || (preview.remove ?? 0) > 0));
  if (touchesExisting) throw new Error(t('errors.setupTouchesExisting'));
}

const running = new Set(); // roots with a setup in progress (NFR3)

/**
 * Runs the setup steps one after another and stops at the first failure (US-0802 FR2.2, FR2.3). `choices` is
 * {harness, mode: 'setup'|'add', plugins, preset}; `info` is the last getSetupInfo result for this project
 * (its preview, plugins and git state). Throws, before anything runs, for an invalid choice, a missing or
 * refused preview, or a second run for the same root. `exec` is injectable for tests.
 * @returns {Promise<{ok: boolean, steps: Array<{command: string, ok: boolean, output?: string, error?: string}>}>}
 */
export async function runSetup(root, choices, info, { exec } = {}) {
  const planned = setupSteps(root, choices, info ?? {});
  if (running.has(root)) throw new Error(t('errors.setupRunning'));
  running.add(root);
  const steps = [];
  try {
    for (const [file, args] of planned) {
      const command = [file, ...args].join(' ');
      try {
        steps.push({ command, ok: true, output: await runFixed(file, args, { cwd: root, timeout: STEP_TIMEOUT_MS, exec }) });
      } catch (err) {
        steps.push({ command, ok: false, error: errorText(err) });
        return { ok: false, steps };
      }
    }
    return { ok: true, steps };
  } finally {
    running.delete(root);
  }
}
