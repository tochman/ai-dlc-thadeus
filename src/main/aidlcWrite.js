// Changes to a project's AI-DLC settings (EPIC-09 US-0902). Tier 1 runs the official `aidlc` CLI with fixed
// arguments built from the tables in shared/configTables.js; the renderer only ever sends {kind, key, value,
// where}, and anything outside the tables throws before a command runs (NFR4). Tier 2 edits only the
// `## Guard Policy` section of a memory file, after a diff, and never touches the rest of it.
import { promises as fs } from 'node:fs';
import { defaultExec, runFixed } from './exec.js';
import { resolveInRoot } from './projectAccess.js';
import { toolPath } from './tools.js';
import {
  ACTIVE_SETTINGS,
  GUARD_LOCK_LAYERS,
  GUARD_LOCK_MODES,
  GUARD_OFF_WHERE,
  GUARD_SWITCHES,
  PROJECT_SETTINGS
} from '../shared/configTables.js';
import { t } from '../shared/i18n.js';

const PREVIEW_TIMEOUT_MS = 20000;
// `config project --plugins` may fetch a release; give it time, but never hang forever.
const APPLY_TIMEOUT_MS = 120000;
const CHANGE_FIELDS = new Set(['kind', 'key', 'value', 'where']);
const SPACE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const HEADING = '## Guard Policy';

const refuse = (value) => {
  throw new Error(t('errors.invalidValue', { what: 'aidlc config', value: String(value) }));
};

/** The payload must be a plain object with string fields from CHANGE_FIELDS only (an extra `args` is refused). */
function checkShape(change) {
  if (!change || typeof change !== 'object' || Array.isArray(change)) refuse(change);
  for (const [k, v] of Object.entries(change)) {
    if (!CHANGE_FIELDS.has(k)) refuse(k);
    if (v !== undefined && typeof v !== 'string') refuse(k);
  }
}

function whereFlag(where, allowed) {
  if (!allowed.length) return where === undefined ? [] : refuse(where);
  return allowed.includes(where) ? [`--${where}`] : refuse(where ?? 'where');
}

function projectCommand({ key, value, where }) {
  const entry = Object.hasOwn(PROJECT_SETTINGS, key) ? PROJECT_SETTINGS[key] : refuse(key);
  const ok = entry.values ? entry.values.includes(value) : typeof value === 'string' && entry.pattern.test(value);
  if (!ok) refuse(value);
  const args = ['config', entry.section, entry.flag, value, ...whereFlag(where, entry.where)];
  return { args: [...args, '--yes'], dryRunArgs: [...args, '--dry-run'] };
}

function activeCommand({ key, value, where }) {
  const values = Object.hasOwn(ACTIVE_SETTINGS, key) ? ACTIVE_SETTINGS[key] : refuse(key);
  if (!values.includes(value)) refuse(value);
  if (where !== undefined) refuse(where); // always the active intent only
  return { args: ['engine', 'config', 'set', key, value], dryRunArgs: null }; // engine config has no --dry-run
}

function guardCommand({ key, value, where }) {
  if (!GUARD_SWITCHES.includes(key)) refuse(key);
  if (value === 'off') {
    const args = ['config', 'flags', '--bypass', key, ...whereFlag(where, GUARD_OFF_WHERE)];
    return { args: [...args, '--yes'], dryRunArgs: [...args, '--dry-run'] };
  }
  if (value !== 'on' || where !== undefined) refuse(value === 'on' ? where : value);
  const args = ['config', 'flags', '--clear-bypass', key];
  return { args: [...args, '--yes'], dryRunArgs: [...args, '--dry-run'] };
}

const BUILDERS = { project: projectCommand, active: activeCommand, guard: guardCommand };

/**
 * The fixed `aidlc` arguments for one change, and its `--dry-run` form or null. Throws for anything outside
 * the tables (NFR4).
 * @param {{kind: 'project'|'active'|'guard', key: string, value: string, where?: string}} change
 * @returns {{args: string[], dryRunArgs: string[]|null}}
 */
export function buildCommand(change) {
  checkShape(change);
  const build = Object.hasOwn(BUILDERS, change.kind) ? BUILDERS[change.kind] : refuse(change.kind);
  return build(change);
}

const commandText = (args) => ['aidlc', ...args].join(' ');
const errorText = (err) => (err.killed ? t('errors.timeout') : String(err.message ?? err).trim());

/**
 * The exact command and its `--dry-run` output where AI-DLC has one. A failed dry run comes back as `error`;
 * an invalid change throws. `exec` is injectable for tests.
 * @returns {Promise<{command: string, dryRun: string|null, error?: string}>}
 */
export async function preview(root, change, { exec = defaultExec } = {}) {
  const { args, dryRunArgs } = buildCommand(change);
  const command = commandText(args);
  if (!dryRunArgs) return { command, dryRun: null };
  try {
    return { command, dryRun: (await runFixed(toolPath('aidlc'), dryRunArgs, { cwd: root, timeout: PREVIEW_TIMEOUT_MS, exec })).trim() };
  } catch (err) {
    console.warn(`${commandText(dryRunArgs)} misslyckades:`, errorText(err));
    return { command, dryRun: null, error: errorText(err) };
  }
}

/**
 * Runs the change. Returns the CLI's output, or its error as a value; an invalid change throws before running.
 * @returns {Promise<{ok: true, command: string, output: string} | {ok: false, command: string, error: string}>}
 */
export async function apply(root, change, { exec = defaultExec } = {}) {
  const { args } = buildCommand(change);
  const command = commandText(args);
  try {
    return { ok: true, command, output: (await runFixed(toolPath('aidlc'), args, { cwd: root, timeout: APPLY_TIMEOUT_MS, exec })).trim() };
  } catch (err) {
    console.error(`${command} misslyckades:`, errorText(err));
    return { ok: false, command, error: errorText(err) };
  }
}

// Tier 2: the Guard Policy lock.

/** The memory file of one layer in a space, root-relative. Throws for a layer or space outside the tables. */
export function memoryFile(space, layer) {
  if (typeof space !== 'string' || !SPACE.test(space)) refuse(space);
  if (!GUARD_LOCK_LAYERS.includes(layer)) refuse(layer);
  return `aidlc/spaces/${space}/memory/${layer}.md`;
}

/**
 * Replaces only the body of `## Guard Policy` (up to the next `## ` heading). Comment lines in the body are kept,
 * other lines are replaced by one `- **Mode**: <mode>` line (none for `none`). Every other line is untouched.
 * @returns {{next: string, diff: string}} `diff` lists the section's removed (`-`) and added (`+`) lines.
 */
export function guardLockDiff(text, mode) {
  if (typeof text !== 'string') refuse(text);
  if (!GUARD_LOCK_MODES.includes(mode)) refuse(mode);
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.replace(/\r$/, '').trim() === HEADING);
  if (start === -1) throw new Error(t('errors.missingField', { field: HEADING }));
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end === -1) end = lines.length;
  const body = lines.slice(start + 1, end);
  const comments = body.filter((l) => l.trim().startsWith('<!--'));
  const kept = [...comments, ...(mode === 'none' ? [] : [`- **Mode**: ${mode}`])];
  const nextBody = kept.length ? ['', ...kept, ''] : [''];
  const next = [...lines.slice(0, start + 1), ...nextBody, ...lines.slice(end)].join('\n');
  const diff = [HEADING, ...body.map((l) => `- ${l}`), ...nextBody.map((l) => `+ ${l}`)].join('\n');
  return { next, diff };
}

/** Reads the memory file and returns the lock's diff with the text it was made from. */
export async function previewGuardLock(root, { space, layer, mode }) {
  const rel = memoryFile(space, layer);
  const before = await fs.readFile(await resolveInRoot(root, rel), 'utf8');
  return { file: rel, before, ...guardLockDiff(before, mode) };
}

/**
 * Writes the lock, only when the file still reads exactly `before` (the text the person saw the diff of).
 * @returns {Promise<{file: string}>}
 */
export async function applyGuardLock(root, { space, layer, mode }, before) {
  const rel = memoryFile(space, layer);
  const abs = await resolveInRoot(root, rel);
  const now = await fs.readFile(abs, 'utf8');
  if (typeof before !== 'string' || now !== before) throw new Error(t('errors.changedSincePreview', { file: rel }));
  await fs.writeFile(abs, guardLockDiff(now, mode).next);
  return { file: rel };
}
