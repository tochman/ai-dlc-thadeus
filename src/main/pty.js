// Terminal sessions per project: the agent (the chosen harness's CLI) and a login shell, both in the project root.
// node-pty is loaded on the first spawn, not at import: a native binary that cannot load on this
// system (e.g. built against a newer glibc) must break the terminal tab, not the whole app.
import { randomUUID } from 'node:crypto';
import { t } from '../shared/i18n.js';
import { selectableHarness } from '../shared/harnesses.js';

const sessions = new Map(); // id -> { proc, projectId, sender }
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

function shellArgs(kind, harness) {
  // -i makes zsh/bash read the interactive rc files (nvm usually lives in .zshrc), -l the login profile.
  if (kind === 'agent') {
    // The command comes from the fixed table, looked up by a validated id; the renderer never sends one (FR3.3, NFR4).
    const h = selectableHarness(harness);
    if (!h) throw new Error(t('errors.unknownHarness', { id: String(harness) }));
    return ['-l', '-i', '-c', h.cli];
  }
  if (kind === 'shell') return ['-l'];
  throw new Error(t('errors.unknownTerminal', { kind: String(kind) }));
}

function clampSize(n, fallback) {
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : fallback;
}

export async function spawnSession({ projectId, root, kind, harness, cols, rows, sender }) {
  const args = shellArgs(kind, harness); // validate before loading the native module
  const { spawn: spawnPty } = await loadPty();
  const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
  const proc = spawnPty(shell, args, {
    name: 'xterm-256color',
    cols: clampSize(cols, 100),
    rows: clampSize(rows, 30),
    cwd: root,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
  });
  const id = randomUUID();
  sessions.set(id, { proc, projectId, sender });
  const send = (channel, payload) => {
    if (!sender.isDestroyed()) sender.send(channel, payload);
  };
  proc.onData((data) => send('pty:data', { id, data }));
  proc.onExit(({ exitCode, signal }) => {
    sessions.delete(id);
    send('pty:exit', { id, exitCode, signal });
  });
  return id;
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
