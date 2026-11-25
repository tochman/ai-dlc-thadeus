// Runs external commands the app's own process needs (git, aidlc): execFile without a shell,
// fixed string arguments, a timeout and the login shell's PATH (NFR1, EPIC-05; read again after a fallback, US-0035).
import { execFile } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 10000;
const PATH_TIMEOUT_MS = 20000;
// A marker keeps rc-file output (greetings, nvm notices) from leaking into the PATH value.
const PATH_MARKER = '__AIDLC_DASH_PATH__';
const PATH_PROBE = `printf '${PATH_MARKER}%s' "$PATH"`;

let keptRead = null;
let readInFlight = null;

export function defaultExec(file, args, options = {}) {
  const { input, ...opts } = options;
  return new Promise((resolve, reject) => {
    // A non-zero exit keeps its stdout on the error: `aidlc update --check` answers with exit 5 (US-0504 FR1.2). Its
    // stderr too: that is where `gh` says why (US-0804 FR1.3).
    const child = execFile(file, args, opts, (err, stdout, stderr) =>
      err ? reject(Object.assign(err, { stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })) : resolve(String(stdout))
    );
    // US-0034: `input` (the sudo password) goes to stdin only, never into args or the environment. An empty one closes
    // stdin, so the command can neither prompt nor wait (US-0804 FR1.1).
    if (input != null) {
      // A command that exits without reading its input breaks the pipe. Its exit code is the answer (the callback above),
      // and without a listener the error would end the app.
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    }
  });
}

/**
 * PATH from the login shell (as for the terminal tabs), read with a fixed command within 20 s (US-0035 FR1.3).
 * Resolves `{path, fromFallback}`. A successful read is kept for the process; callers during a read share it
 * (FR1.4). A timeout, a failed shell or a reply without the marker gives the app's own PATH with
 * `fromFallback: true` and is never kept, so the next call asks the shell again (FR1.1).
 */
export function readLoginPath(exec = defaultExec) {
  if (keptRead) return Promise.resolve(keptRead);
  if (!readInFlight) {
    const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
    readInFlight = exec(shell, ['-l', '-i', '-c', PATH_PROBE], { timeout: PATH_TIMEOUT_MS })
      .then((out) => {
        const i = out.lastIndexOf(PATH_MARKER);
        const found = i === -1 ? '' : out.slice(i + PATH_MARKER.length).trim();
        if (!found) throw new Error('inget PATH i svaret');
        keptRead = { path: found, fromFallback: false };
        return keptRead;
      })
      .catch((err) => {
        console.warn('Kunde inte läsa PATH från inloggningsskalet, använder appens PATH:', err.message);
        return { path: process.env.PATH, fromFallback: true };
      })
      .finally(() => {
        readInFlight = null;
      });
  }
  return readInFlight;
}

/** Drops a kept read so the next call asks the shell again; a read under way is left alone (US-0035 FR1.2). */
export function refreshLoginPath() {
  keptRead = null;
}

/** The login shell's PATH as a string, for runFixed and the terminal tabs (US-0035: same read as readLoginPath). */
export async function loginPath(exec = defaultExec) {
  return (await readLoginPath(exec)).path;
}

/**
 * Runs `file args` in `cwd` and resolves with stdout. `exec(file, args, options) => Promise<stdout>` is injectable for tests.
 * Rejects before running anything when an argument is not a string. `env` adds fixed variables on top of the login
 * shell's PATH (US-0021: `AIDLC_HARNESS_DIR` for a compile per harness). `maxBuffer` raises execFile's 1 MB stdout
 * limit for a command with long output (US-0303: the epic files' `git log -p`). `path` is a PATH the caller already
 * read and skips the login-shell read, so one Tools scan reads the shell once (US-0035 FR1.5). `killSignal` is what the
 * timeout sends, SIGTERM when left out (US-0804 FR1.6).
 */
export async function runFixed(
  file,
  args,
  { cwd, timeout = DEFAULT_TIMEOUT_MS, exec = defaultExec, env: extraEnv = {}, maxBuffer, input, path, killSignal } = {}
) {
  if (!Array.isArray(args) || args.some((a) => typeof a !== 'string')) {
    throw new Error(`Ogiltiga argument till ${file}`);
  }
  const env = { ...process.env, PATH: path ?? (await loginPath(exec)), ...extraEnv };
  const options = { cwd, timeout, env, ...(maxBuffer && { maxBuffer }), ...(killSignal && { killSignal }) };
  return exec(file, args, input == null ? options : { ...options, input });
}
