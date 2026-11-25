// Whether a tool is signed in (EPIC-08 US-0804 FR1, NFR1, NFR3): its own status command, fixed here, with stdin closed
// and a time limit. The app never reads a credential file and never runs a command that prints a secret (FR1.7). Only
// a tool's id comes in and only {state, account, reason} goes out; nothing is logged.
import { defaultExec, runFixed } from './exec.js';
import { childEnv, shellCommand } from './pty.js';
import { locateTool, shellPath, toolPath } from './tools.js';
import { parseClaude, parseGh, parseOpencode } from './parsers/signIn.js';
import { t } from '../shared/i18n.js';

const LIMIT_MS = 20000;
// Only what follows it is the tool's answer, so a greeting from a startup file changes nothing (FR1.2).
const MARKER = '__THADEUS_SIGN_IN__';

/** A run as the parsers read it. Never rejects: a failed one carries its exit code, or none when it got no further. */
const outcome = (run) =>
  run.then(
    (stdout) => ({ code: 0, stdout, stderr: '', killed: false }),
    (err) => ({ code: err.code ?? null, stdout: err.stdout ?? '', stderr: err.stderr ?? '', killed: err.killed === true })
  );

/** FR1.2: `gh` as the app runs it, with the login shell's PATH. */
const asApp = (file, args, options) => outcome(runFixed(file, args, options));

/**
 * FR1.2: as an agent tab runs the tool, so a key set in the shell's startup files counts. `exec` leaves no shell in
 * between, so the limit stops the tool itself.
 * ponytail: a program that a startup file leaves waiting outlives the kill; a process group of its own would end it too.
 */
async function asAgentTab(file, args, options) {
  const line = `printf ${MARKER}; exec ${shellCommand(file)} ${args.join(' ')}`;
  const result = await outcome(defaultExec(shellPath(), ['-l', '-i', '-c', line], { ...options, env: childEnv(process.env) }));
  const at = result.stdout.lastIndexOf(MARKER);
  // Without the marker the shell never got to the tool, whatever it printed and whatever its exit code.
  return at === -1 ? { ...result, code: null, stdout: '' } : { ...result, stdout: result.stdout.slice(at + MARKER.length) };
}

// FR1.1: the fixed commands. The arguments are plain words, safe in a shell line.
const CHECKS = {
  gh: { args: ['api', 'user', '--hostname', 'github.com', '--jq', '.login'], run: asApp, parse: parseGh },
  claude: { args: ['auth', 'status'], run: asAgentTab, parse: parseClaude },
  opencode: { args: ['auth', 'list', '--format', 'json'], run: asAgentTab, parse: parseOpencode }
};

async function check(id, file, timeout) {
  if (!(await locateTool(id))) return null;
  const { args, run, parse } = CHECKS[id];
  // SIGKILL: an interactive shell, and the tool may, ignore SIGTERM (FR1.6). The empty input closes stdin (FR1.1).
  return parse(await run(file, args, { timeout, killSignal: 'SIGKILL', input: '' }));
}

const running = new Map(); // tool and path -> the check under way (NFR3)

/**
 * US-0804 FR1: whether the tool is signed in, or null when it is not found. Rejects for an id outside the table, before
 * anything runs. A second request while a check of the same tool and path runs shares it (NFR3). `timeout` is for tests.
 * @returns {Promise<{state: 'in'|'out'|'none'|'unknown', account: string|null, reason: string|null}|null>}
 */
export async function checkSignIn(id, { timeout = LIMIT_MS } = {}) {
  if (typeof id !== 'string' || !Object.hasOwn(CHECKS, id)) throw new Error(t('errors.unknownTool', { id: String(id) }));
  const file = toolPath(id); // the path this check is of, should it change while the check runs
  const key = `${id}\n${file}`;
  if (!running.has(key)) {
    const run = check(id, file, timeout).finally(() => running.delete(key));
    running.set(key, run);
  }
  return running.get(key);
}
