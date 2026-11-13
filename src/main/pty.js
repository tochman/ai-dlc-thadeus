// Terminal sessions per project: a `claude` session and a login shell, both in the project root.
import { spawn as spawnPty } from 'node-pty'; // CJS module without a default export
import { randomUUID } from 'node:crypto';

const sessions = new Map(); // id -> { proc, projectId, sender }

function shellArgs(kind) {
  // -i makes zsh/bash read the interactive rc files (nvm usually lives in .zshrc), -l the login profile.
  if (kind === 'claude') return ['-l', '-i', '-c', 'claude'];
  if (kind === 'shell') return ['-l'];
  throw new Error(`Okänd terminaltyp: ${kind}`);
}

function clampSize(n, fallback) {
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : fallback;
}

export function spawnSession({ projectId, root, kind, cols, rows, sender }) {
  const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
  const proc = spawnPty(shell, shellArgs(kind), {
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
  if (!s) throw new Error(`Ingen terminalsession med id ${id}`);
  return s;
}

export function writeSession(id, data) {
  if (typeof data !== 'string') throw new Error('Terminaldata måste vara en sträng');
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
