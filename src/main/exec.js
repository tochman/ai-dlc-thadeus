// Runs external commands the app's own process needs (git, aidlc): execFile without a shell,
// fixed string arguments, a timeout and the login shell's PATH (NFR1, EPIC-05).
import { execFile } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 10000;
const PATH_TIMEOUT_MS = 5000;
// A marker keeps rc-file output (greetings, nvm notices) from leaking into the PATH value.
const PATH_MARKER = '__AIDLC_DASH_PATH__';
const PATH_PROBE = `printf '${PATH_MARKER}%s' "$PATH"`;

let loginPathPromise = null;

export function defaultExec(file, args, options = {}) {
  const { input, ...opts } = options;
  return new Promise((resolve, reject) => {
    // A non-zero exit keeps its stdout on the error: `aidlc update --check` answers with exit 5 (US-0504 FR1.2).
    const child = execFile(file, args, opts, (err, stdout) => (err ? reject(Object.assign(err, { stdout: String(stdout ?? '') })) : resolve(String(stdout))));
    // US-0034: `input` (the sudo password) goes to stdin only, never into args or the environment.
    if (input != null) child.stdin.end(input);
  });
}

/** PATH from the login shell (as for the terminal tabs), probed once per process with a fixed command. */
export function loginPath(exec = defaultExec) {
  if (!loginPathPromise) {
    const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
    loginPathPromise = exec(shell, ['-l', '-i', '-c', PATH_PROBE], { timeout: PATH_TIMEOUT_MS })
      .then((out) => {
        const i = out.lastIndexOf(PATH_MARKER);
        if (i === -1) throw new Error('inget PATH i svaret');
        return out.slice(i + PATH_MARKER.length).trim() || process.env.PATH;
      })
      .catch((err) => {
        console.warn('Kunde inte läsa PATH från inloggningsskalet, använder appens PATH:', err.message);
        return process.env.PATH;
      });
  }
  return loginPathPromise;
}

/**
 * Runs `file args` in `cwd` and resolves with stdout. `exec(file, args, options) => Promise<stdout>` is injectable for tests.
 * Rejects before running anything when an argument is not a string. `env` adds fixed variables on top of the login
 * shell's PATH (US-0021: `AIDLC_HARNESS_DIR` for a compile per harness). `maxBuffer` raises execFile's 1 MB stdout
 * limit for a command with long output (US-0303: the epic files' `git log -p`).
 */
export async function runFixed(file, args, { cwd, timeout = DEFAULT_TIMEOUT_MS, exec = defaultExec, env: extraEnv = {}, maxBuffer, input } = {}) {
  if (!Array.isArray(args) || args.some((a) => typeof a !== 'string')) {
    throw new Error(`Ogiltiga argument till ${file}`);
  }
  const env = { ...process.env, PATH: await loginPath(exec), ...extraEnv };
  const options = maxBuffer ? { cwd, timeout, env, maxBuffer } : { cwd, timeout, env };
  return exec(file, args, input == null ? options : { ...options, input });
}
