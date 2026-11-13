// Runs external commands the app's own process needs (git, aidlc): execFile without a shell,
// fixed string arguments, a timeout and the login shell's PATH (NFR1, EPIC-05).
import { execFile } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 10000;
const PATH_TIMEOUT_MS = 5000;
// A marker keeps rc-file output (greetings, nvm notices) from leaking into the PATH value.
const PATH_MARKER = '__AIDLC_DASH_PATH__';
const PATH_PROBE = `printf '${PATH_MARKER}%s' "$PATH"`;

let loginPathPromise = null;

export function defaultExec(file, args, options) {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (err, stdout) => (err ? reject(err) : resolve(String(stdout))));
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
 * Rejects before running anything when an argument is not a string.
 */
export async function runFixed(file, args, { cwd, timeout = DEFAULT_TIMEOUT_MS, exec = defaultExec } = {}) {
  if (!Array.isArray(args) || args.some((a) => typeof a !== 'string')) {
    throw new Error(`Ogiltiga argument till ${file}`);
  }
  const env = { ...process.env, PATH: await loginPath(exec) };
  return exec(file, args, { cwd, timeout, env });
}
