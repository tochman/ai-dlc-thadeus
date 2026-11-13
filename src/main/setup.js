// Prerequisites and the command chain for "Initiera AI-DLC" (US-0503). The checks here are read-only
// (FR4.2, FR4.3); the setup itself is typed into the visible shell tab by the renderer (FR4.4).
import { runFixed } from './exec.js';
import { isGitRepo } from './git.js';
import { listDir } from './projectAccess.js';

const OTHER_HARNESSES = ['.kiro', '.codex', '.cursor', '.aidlc'];
export const PRESETS = ['thorough', 'balanced', 'minimal'];
const PLUGIN_NAME = /^[a-z0-9-]+$/;
// `--project-dir .` because aidlc refuses non-interactive config outside a recognised project (F-02).
const BASE_COMMAND = 'aidlc --project-dir . config --harness claude --yes';
const COUNT_KEYS = ['create', 'update', 'merge', 'preserve', 'remove', 'conflict'];

const errorText = (err) => (err.killed ? 'timeout efter 10 s' : err.message);

/** Reads the counts from "create=N update=N ... conflict=N", lines that name a conflicting file, and "Note:" lines. */
export function parsePreview(raw) {
  const counts = Object.fromEntries(
    COUNT_KEYS.map((key) => {
      const m = new RegExp(`\\b${key}=(\\d+)`).exec(raw);
      return [key, m ? Number(m[1]) : null];
    })
  );
  const lines = raw.split('\n');
  const conflicts = lines
    .map((l) => /^\s*(?:conflict|CONFLICT)\b[:\s]+(\S.*)$/.exec(l)?.[1]?.trim())
    .filter((f) => f && !/^\d+$/.test(f) && !f.includes('='));
  const notes = lines.map((l) => /^\s*Note:\s*(.*)$/.exec(l)?.[1]?.trim()).filter(Boolean);
  return { raw, ...counts, conflicts, notes };
}

async function readPlugins(root, exec) {
  try {
    const out = JSON.parse(await runFixed('aidlc', ['config', 'project', '--show', '--json'], { cwd: root, exec }));
    const installed = out?.data?.installedPlugins;
    if (out?.ok !== true || !Array.isArray(installed)) throw new Error('svaret saknar data.installedPlugins');
    return { plugins: installed.filter((p) => typeof p === 'string' && PLUGIN_NAME.test(p)) };
  } catch (err) {
    return { plugins: [], warning: `Plugins kunde inte läsas: ${errorText(err)}` };
  }
}

/**
 * Never throws for a missing tool: a missing `aidlc` gives `{installed: false}` and stops there (FR4.2).
 * `exec` is injectable for tests.
 */
export async function getSetupInfo(root, { exec } = {}) {
  const harnesses = (await listDir(root, '.')).filter((e) => e.isDir && OTHER_HARNESSES.includes(e.name)).map((e) => `${e.name}/`);
  const git = { isRepo: await isGitRepo(root, { exec }) };
  const base = { git, harnesses, preview: null, plugins: [], presets: PRESETS };

  let version;
  try {
    version = (await runFixed('aidlc', ['--version'], { cwd: root, exec })).trim();
  } catch (err) {
    return { ...base, aidlc: { installed: false, error: errorText(err) } };
  }

  let preview;
  try {
    preview = parsePreview(await runFixed('aidlc', ['--project-dir', root, 'config', '--harness', 'claude', '--dry-run'], { cwd: root, exec }));
  } catch (err) {
    preview = { ...parsePreview(''), raw: String(err.stdout ?? ''), error: `Förhandsvisningen misslyckades: ${errorText(err)}` };
  }
  return { ...base, aidlc: { installed: true, version }, preview, ...(await readPlugins(root, exec)) };
}

/**
 * The visible command chain for the shell tab (FR4.4, FR4.5). Plugins must be among `availablePlugins`
 * (the list getSetupInfo read) and the preset one of PRESETS; anything else throws.
 */
export function buildSetupCommand({ needsGit = false, plugins = [], preset = null } = {}, availablePlugins = []) {
  if (!Array.isArray(plugins)) throw new Error('plugins måste vara en lista');
  for (const p of plugins) {
    if (typeof p !== 'string' || !PLUGIN_NAME.test(p) || !availablePlugins.includes(p)) throw new Error(`Okänt plugin: ${p}`);
  }
  if (preset !== null && !PRESETS.includes(preset)) throw new Error(`Okänd modellnivå: ${preset}`);
  const commands = [];
  if (needsGit) commands.push('git init -b main');
  commands.push(BASE_COMMAND);
  if (plugins.length) commands.push(`aidlc config project --plugins ${plugins.join(',')} --yes`);
  if (preset) commands.push(`aidlc config models --preset ${preset} --project --yes`);
  return commands.join(' && ');
}
