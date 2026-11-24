// Preview and run for "Set up Spec Kit" (US-1405 FR3, contract C3), mirroring the AI-DLC setup in setup.js.
// The preview only reads; the run is one fixed `specify init` through runFixed, no shell, with a timeout.
// The app's own code never writes under `.specify/` or `specs/`: `specify init` is their only writer (BR3.7).
import { runFixed } from './exec.js';
import { probeTool, toolPath } from './tools.js';
import { listDir } from './projectAccess.js';
import { t } from '../shared/i18n.js';

export const INSTALL_HINT = 'uv tool install specify-cli'; // text only: the app never installs specify (BR3.6)
export const SPECKIT_HARNESSES = ['claude', 'opencode'];
const TIMEOUT_MS = 120000; // as the AI-DLC setup step (STEP_TIMEOUT_MS in setup.js)

/** The fixed argument list for a checked harness (BR3.4, R-02: `--force --non-interactive` for a folder with files). */
const initArgs = (harness) => ['init', '--here', '--force', '--non-interactive', '--integration', harness];

/** Throws for anything but claude or opencode, naming the value (BR3.2). */
function checkHarness(harness) {
  if (!SPECKIT_HARNESSES.includes(harness)) throw new Error(t('errors.unknownHarness', { id: String(harness) }));
}

/**
 * US-1405 FR3.2, BR3.1: whether `specify` answers and its version, the project's harnesses, and the command for
 * `harness` (the picked one, else the project's only one, else null). Never throws for a missing `specify`.
 * `exec` is injectable for tests.
 * @returns {Promise<{specifyOnPath: boolean, version: string|null, installHint: string, harnesses: string[],
 *   harness: string|null, command: string[]|null, adds: string[], notEmpty: boolean}>}
 */
export async function getSpeckitSetupInfo(root, { harness = null, exec } = {}) {
  if (harness !== null) checkHarness(harness);
  const entries = await listDir(root, '.');
  const has = (name, isDir) => entries.some((e) => e.name === name && e.isDir === isDir);
  const harnesses = SPECKIT_HARNESSES.filter((h) => (h === 'claude' ? has('.claude', true) : has('.opencode', true) || has('opencode.json', false)));
  const chosen = harness ?? (harnesses.length === 1 ? harnesses[0] : null);
  const probe = await probeTool(toolPath('specify'), { exec });
  return {
    specifyOnPath: probe.found,
    version: probe.version,
    installHint: INSTALL_HINT,
    harnesses,
    harness: chosen,
    command: chosen ? ['specify', ...initArgs(chosen)] : null,
    adds: chosen ? ['.specify/', `.${chosen}/`] : [],
    notEmpty: entries.some((e) => e.name !== '.git') // R-02: "existing files stay; Spec Kit adds its own"
  };
}

const running = new Set(); // roots with a Spec Kit setup in progress (BR3.3)

/** notFound, timeout or failed, from what runFixed rejected with (BR3.5). */
const errorCode = (err) => (err.killed ? 'timeout' : err.code === 'ENOENT' ? 'notFound' : 'failed');

/**
 * US-1405 FR3.1, FR3.3: runs `specify init` for `harness` after a preview for that very harness (`info`, the last
 * getSpeckitSetupInfo result for this project). Throws before running for an unknown harness, a missing or other
 * preview, or a second run for the same root (BR3.2, BR3.3). A failure resolves with its code and output and
 * changes nothing else (BR3.5); detection after success follows from U1's setup watcher (BR3.8).
 * @returns {Promise<{ok: true, output: string} | {ok: false, error: {code: 'notFound'|'failed'|'timeout', message: string}, output: string}>}
 */
export async function runSpeckitSetup(root, { harness } = {}, info, { exec } = {}) {
  checkHarness(harness);
  if (info?.harness !== harness) throw new Error(t('errors.previewFirst', { harness }));
  if (running.has(root)) throw new Error(t('errors.setupRunning'));
  running.add(root);
  try {
    return { ok: true, output: await runFixed(toolPath('specify'), initArgs(harness), { cwd: root, timeout: TIMEOUT_MS, exec }) };
  } catch (err) {
    const code = errorCode(err);
    const message = code === 'timeout' ? t('speckitSetup.timeout') : err.message;
    return { ok: false, error: { code, message }, output: String(err.stdout ?? '') };
  } finally {
    running.delete(root);
  }
}
