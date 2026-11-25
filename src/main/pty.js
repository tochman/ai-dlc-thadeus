// Terminal sessions per project: the agent (the chosen harness's CLI) and a login shell, both in the project root.
// node-pty is loaded on the first spawn, not at import: a native binary that cannot load on this
// system (e.g. built against a newer glibc) must break the terminal tab, not the whole app.
import { randomUUID } from 'node:crypto';
import { t } from '../shared/i18n.js';
import { selectableHarness } from '../shared/harnesses.js';
import { setToolPaths, shellPath, toolPath } from './tools.js';

const sessions = new Map(); // id -> { proc, projectId, kind, sender, taps }
let ptyModule = null; // cached only after a successful load, so a failed load is retried next spawn

async function loadPty() {
  if (ptyModule) return ptyModule;
  try {
    const mod = await import('node-pty');
    ptyModule = mod.spawn ? mod : mod.default; // CJS module: named export or default, depending on the loader
    return ptyModule;
  } catch (err) {
    console.error('Kunde inte ladda node-pty:', err);
    throw new Error(t('errors.ptyLoadFailed', { error: err.message }));
  }
}

/** A bare command stays a bare word; a path with a space or a quote is wrapped so the login shell reads it as one. */
export function shellCommand(file) {
  return /^[A-Za-z0-9_./-]+$/.test(file) ? file : `'${file.replace(/'/g, `'\\''`)}'`;
}

function shellArgs(kind, harness) {
  // -i makes zsh/bash read the interactive rc files (nvm usually lives in .zshrc), -l the login profile.
  if (kind === 'agent') {
    // The command comes from the fixed table, looked up by a validated id; the renderer never sends one (FR3.3, NFR4).
    const h = selectableHarness(harness);
    if (!h) throw new Error(t('errors.unknownHarness', { id: String(harness) }));
    return ['-l', '-i', '-c', shellCommand(toolPath(h.cli))]; // a chosen CLI path wins (US-0405 FR2.4)
  }
  if (kind === 'shell') return ['-l'];
  throw new Error(t('errors.unknownTerminal', { kind: String(kind) }));
}

function clampSize(n, fallback) {
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : fallback;
}

/**
 * US-0506 u1 SD2: the child's environment. Every inherited THADEUS_* key is dropped (a development run started inside
 * an app tab would otherwise leak a stale secret into every tab), then only `extra` is added. Pure.
 */
export function childEnv(base, extra = {}) {
  const env = Object.fromEntries(Object.entries(base).filter(([k]) => !k.startsWith('THADEUS_')));
  return { ...env, TERM: 'xterm-256color', COLORTERM: 'truecolor', ...extra };
}

/** US-0213 FR6.3: Claude Code compacts by itself at the handoff threshold, only when the person turned it on. */
const compactEnv = (harness, tokens) =>
  harness === 'claude' && Number.isInteger(tokens) && tokens > 0 ? { CLAUDE_CODE_AUTO_COMPACT_WINDOW: String(tokens) } : {};

/**
 * @param {object} options `env` holds the agent channel variables (US-0506 u1, agent tabs only); `onExit` is called
 *   with { id, exitCode, signal } when the process exits (RD5)
 */
export async function spawnSession({ projectId, root, kind, harness, cols, rows, toolPaths: paths, sender, env, onExit, autoCompactWindow }) {
  if (paths) setToolPaths(paths); // the saved paths at spawn time, so the two tabs use them (US-0405 FR2.4)
  const args = shellArgs(kind, harness); // validate before loading the native module
  const { spawn: spawnPty } = await loadPty();
  const shell = shellPath(); // a saved shell path wins, else $SHELL (US-0405 FR2.2)
  const proc = spawnPty(shell, args, {
    name: 'xterm-256color',
    cols: clampSize(cols, 100),
    rows: clampSize(rows, 30),
    cwd: root,
    env: childEnv(process.env, kind === 'agent' ? { ...env, ...compactEnv(harness, autoCompactWindow) } : undefined) // a shell tab never gets the channel (SD2)
  });
  const id = randomUUID();
  const taps = new Set();
  sessions.set(id, { proc, projectId, kind, sender, taps });
  const send = (channel, payload) => {
    if (!sender.isDestroyed()) sender.send(channel, payload);
  };
  proc.onData((data) => {
    send('pty:data', { id, data });
    for (const fn of taps) fn(data); // read-only taps, e.g. waiting for the agent's picker (US-0506 PD2)
  });
  proc.onExit(({ exitCode, signal }) => {
    sessions.delete(id);
    send('pty:exit', { id, exitCode, signal });
    onExit?.({ id, exitCode, signal });
  });
  return id;
}

/** US-0513 FR1.4: whether the project has an agent tab running, whatever it does. */
export const hasAgentSession = (projectId) => [...sessions.values()].some((s) => s.projectId === projectId && s.kind === 'agent');

/** US-0506 u1 PD2: calls `fn` with each chunk of the session's output until the returned remover runs. */
export function tapOutput(id, fn) {
  const taps = sessions.get(id)?.taps;
  if (!taps) return () => {};
  taps.add(fn);
  return () => {
    taps.delete(fn);
  };
}

function get(id) {
  const s = sessions.get(id);
  if (!s) throw new Error(t('errors.noSession', { id: String(id) }));
  return s;
}

export function writeSession(id, data) {
  if (typeof data !== 'string') throw new Error(t('errors.ptyDataNotString'));
  get(id).proc.write(data);
}

export function resizeSession(id, cols, rows) {
  get(id).proc.resize(clampSize(cols, 100), clampSize(rows, 30));
}

export function killSession(id) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  s.proc.kill();
}

export function killProjectSessions(projectId) {
  for (const [id, s] of sessions) if (s.projectId === projectId) killSession(id);
}

export function killAllSessions() {
  for (const id of [...sessions.keys()]) killSession(id);
}
