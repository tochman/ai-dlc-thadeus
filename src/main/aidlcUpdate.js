// Is AI-DLC current? (EPIC-05 US-0504). The `aidlc` program on this machine and the AI-DLC files in a project.
// Only reads: `update --check` and `config --dry-run`. The commands that write are typed into the shell tab for the
// person to run (FR1.3, FR2.3); every call goes through runFixed with fixed arguments (NFR1).
import path from 'node:path';
import { runFixed } from './exec.js';
import { toolPath } from './tools.js';
import { setupHarness } from '../shared/harnesses.js';
import { t } from '../shared/i18n.js';

const CHECK_TIMEOUT_MS = 30000; // NFR2
const EXIT_NEWER = 5;
const VERSION_MAX = 80;

/** US-0504 FR5: one sentence for a failed call; a killed one timed out after the 30 s bound. */
export const errorText = (err) => (err.killed ? t('aidlcUpdate.timeout') : err.message);
const unavailable = (reason) => ({ status: 'unavailable', latest: null, reason });

function parseJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

/** The table harness for `id`; anything else throws before it becomes an argument (NFR1). */
function checkedSetupId(id) {
  const entry = setupHarness(id);
  if (!entry) throw new Error(t('errors.unknownHarness', { id: String(id) }));
  return entry.setupId;
}

/**
 * US-0504 FR1.2, FR5: the answer of `aidlc update --check --json`. Exit 5 is newer, 0 current; `ok:false` (offline)
 * is unavailable with the CLI's own message.
 * @returns {{status: 'newer'|'current'|'unavailable', latest: string|null, reason: string|null}}
 */
export function readUpdateCheck(stdout, exitCode) {
  const out = parseJson(stdout);
  if (!out) return unavailable(t('aidlcUpdate.unreadable'));
  if (out.ok !== true) return unavailable(out.message || t('aidlcUpdate.unreadable'));
  const latest = typeof out.data?.latestVersion === 'string' ? out.data.latestVersion : null;
  if (exitCode === EXIT_NEWER) return { status: 'newer', latest, reason: null };
  if (exitCode === 0) return { status: 'current', latest, reason: null };
  return unavailable(out.message || t('aidlcUpdate.unreadable'));
}

/**
 * US-0504 FR1.1, FR1.2, NFR2: the installed version and whether a newer release exists. Never throws: runFixed
 * rejects a non-zero exit, so exit 5 is read from the error's code and stdout. `exec` is injectable for tests.
 */
export async function checkProgram({ exec } = {}) {
  const run = (args) => runFixed(toolPath('aidlc'), args, { exec, timeout: CHECK_TIMEOUT_MS });
  let version;
  try {
    version = String(await run(['--version']))
      .trim()
      .split('\n')[0]
      .slice(0, VERSION_MAX);
  } catch (err) {
    return { version: null, ...unavailable(errorText(err)) };
  }
  try {
    return { version, ...readUpdateCheck(String(await run(['update', '--check', '--json'])), 0) };
  } catch (err) {
    if (typeof err.stdout === 'string' && err.stdout.trim()) return { version, ...readUpdateCheck(err.stdout, err.code) };
    return { version, ...unavailable(errorText(err)) };
  }
}

/**
 * US-0504 FR2.1, FR2.2: the dry run's counts and the files it would change (create, update, merge, remove; preserved
 * files are left out), with the conflicting files apart. Throws with the CLI's message on `ok:false`.
 */
export function readProjectPlan(json) {
  const out = parseJson(json);
  if (out?.ok !== true) throw new Error(out?.message || t('aidlcUpdate.unreadable'));
  const actions = Array.isArray(out.data?.actions) ? out.data.actions.filter((a) => typeof a?.path === 'string') : [];
  return {
    counts: out.data?.counts ?? {},
    files: actions.filter((a) => a.action !== 'preserve' && a.action !== 'conflict').map(({ path: p, action }) => ({ path: p, action })),
    conflicts: actions.filter((a) => a.action === 'conflict').map((a) => a.path)
  };
}

/** US-0504 FR2.1, NFR1: `aidlc --project-dir <root> config --harness <id> --dry-run --json` for a table harness. */
export async function projectPlan(root, harnessId, { exec } = {}) {
  const setupId = checkedSetupId(harnessId);
  if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error(t('errors.unknownProject', { id: String(root) }));
  const args = ['--project-dir', root, 'config', '--harness', setupId, '--dry-run', '--json'];
  return readProjectPlan(String(await runFixed(toolPath('aidlc'), args, { cwd: root, exec, timeout: CHECK_TIMEOUT_MS })));
}

/** US-0504 FR1.3: the command "Update AI-DLC" types into the shell tab. */
export const programCommand = () => 'aidlc update';

/** US-0504 FR2.3: the command "Update the project files" types for one table harness; anything else throws. */
export const projectCommand = (harnessId) => `aidlc config --harness ${checkedSetupId(harnessId)} --yes`;
