// The tools the app starts and where they are (EPIC-04 US-0405 FR2). A chosen path in the app settings wins;
// otherwise the tool is looked up on the login shell's PATH, the same PATH the terminal tabs get.
// No import of electron here: the terminal tabs and the settings view both use this module without the app.
import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { loginPath, readLoginPath, refreshLoginPath, runFixed } from './exec.js';
import { t } from '../shared/i18n.js';

// opencode for its agent tabs, gh for the updater (US-0410 FR4.1, FR4.2), glab for GitLab merge requests (US-1201 AC-1),
// specify for the Spec Kit setup (US-1405 FR3, R-03).
export const TOOL_IDS = ['aidlc', 'claude', 'opencode', 'gh', 'glab', 'specify', 'shell'];
const VERSION_MAX = 80;

// The saved absolute paths per tool id, applied from settings on every read and write (FR2.4, FR7.1).
let toolPaths = {};

/**
 * A path the app may keep and start from (US-0405 FR7.1, FR7.3): a non-empty absolute path without a NUL byte.
 * Anything else is left out, so the automatic path applies.
 */
export function isStoredPath(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('\0') && path.isAbsolute(value);
}

/** Keeps only the known ids with a path; anything else is dropped. */
export function setToolPaths(paths) {
  const raw = paths && typeof paths === 'object' && !Array.isArray(paths) ? paths : {};
  toolPaths = Object.fromEntries(TOOL_IDS.filter((id) => typeof raw[id] === 'string' && raw[id] !== '').map((id) => [id, raw[id]]));
}

/** The saved absolute path for a bare tool name, else the name itself (FR2.4). */
export function toolPath(name) {
  return toolPaths[name] ?? name;
}

/** The shell the terminal tabs run: $SHELL, else the platform default (the rule exec.js already uses). */
export function defaultShell() {
  return process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
}

/** The saved shell path, else the default (FR2.2). */
export function shellPath() {
  return toolPaths.shell ?? defaultShell();
}

/** A file that exists and may be run: a regular file with the executable bit (FR2.3). */
async function isExecutable(file) {
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return false;
    await fs.access(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The first executable named `name` in the login shell's PATH, or null (FR2.1). `exec` is injectable for tests;
 * loginPath falls back to the app's own PATH when the login shell cannot be read. `searchPath` is a PATH already
 * read for this scan (US-0035 FR1.5).
 */
export async function resolveOnPath(name, { exec, searchPath } = {}) {
  const dirs = (searchPath ?? (await loginPath(exec))).split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const file = path.join(dir, name);
    if (await isExecutable(file)) return file;
  }
  return null;
}

/**
 * `<file> --version` with a fixed argument and no shell, within runFixed's 10 s timeout (FR2.1, C2).
 * Never throws: a tool that cannot answer comes back as not found with its reason (A3).
 * `path` is the PATH a scan already read, so the check starts no second login-shell read (US-0035 FR1.5).
 * @returns {Promise<{found: boolean, version: string|null, error?: string}>}
 */
export async function probeTool(file, { exec, path } = {}) {
  let out;
  try {
    out = String(await runFixed(file, ['--version'], { exec, path })).trim();
  } catch (err) {
    return { found: false, version: null, error: t('errors.toolVersionFailed', { error: err.killed ? t('errors.timeout') : err.message }) };
  }
  const version = out.split('\n')[0].trim().slice(0, VERSION_MAX);
  return version ? { found: true, version } : { found: false, version: null, error: t('errors.toolNoVersion') };
}

/**
 * One row of the Verktyg section: the saved path wins, the shell falls back to $SHELL, the rest to PATH (FR2.1).
 * A row looked up on a fallback PATH carries `pathFallback: true` (US-0035 FR1.5).
 */
async function toolRow(id, exec, read) {
  try {
    const saved = toolPaths[id];
    const onPath = !saved && id !== 'shell';
    const file = saved ?? (onPath ? await resolveOnPath(id, { exec, searchPath: read.path }) : defaultShell());
    const source = saved ? 'saved' : 'auto';
    const mark = onPath && read.fromFallback ? { pathFallback: true } : {};
    if (!file) return { id, path: null, source, found: false, version: null, error: t('errors.toolNotOnPath', { name: id }), ...mark };
    return { id, path: file, source, ...(await probeTool(file, { exec, path: read.path })), ...mark };
  } catch (err) {
    // A row never rejects: the view always gets every row to show (NFR4).
    return { id, path: null, source: 'auto', found: false, version: null, error: err.message };
  }
}

/**
 * The tools with their path, whether it was chosen or found automatically, and the version they report.
 * All run in parallel and never reject (FR2.1, NFR4; five tools since US-0410 FR4.1). `exec` is injectable for tests.
 * Each scan reads the login shell's PATH again, once, for every row and its `--version` check (US-0035 FR1.2, FR1.5).
 * @returns {Promise<Array<{id: string, path: string|null, source: 'saved'|'auto', found: boolean,
 *   version: string|null, error?: string, pathFallback?: true}>>}
 */
export async function getTools({ exec } = {}) {
  refreshLoginPath();
  const read = await readLoginPath(exec);
  return Promise.all(TOOL_IDS.map((id) => toolRow(id, exec, read)));
}

/**
 * Checks a chosen path before it is saved (FR2.3): a known tool, an absolute path, a file that exists and is
 * executable, and a binary whose `--version` answers. Resolves with its version; throws a translated error
 * otherwise, so nothing invalid is ever stored. `exec` is injectable for tests.
 * @returns {Promise<{ok: true, version: string}>}
 */
export async function validateTool(id, file, { exec } = {}) {
  if (!TOOL_IDS.includes(id)) throw new Error(t('errors.unknownTool', { id: String(id) }));
  if (!isStoredPath(file)) throw new Error(t('errors.toolPathInvalid', { tool: id, path: String(file) }));
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) throw new Error(t('errors.toolMissing', { path: file }));
  await fs.access(file, constants.X_OK).catch(() => {
    throw new Error(t('errors.toolNotExecutable', { path: file }));
  });
  const probe = await probeTool(file, { exec });
  if (!probe.found) throw new Error(probe.error);
  return { ok: true, version: probe.version };
}
