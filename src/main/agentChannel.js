// US-0506 u1 FR1.3, NFR3, NFR5, C1, C2: AgentChannel (LC2) and its heartbeat (LC1). The trust boundary between the
// agents' hooks and the app: one private folder per agent session under <userData>/agent-channel/, event files in,
// answer files out. Every byte a hook writes is checked here before any other component sees it (BR1.1, SD3).
// No Electron import: the root comes from the caller, so the whole channel runs in plain Node tests.
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import chokidar from 'chokidar';

export const MAX_EVENT_BYTES = 1_048_576;
/** The hook's full wait per harness: Claude Code's 600 s entry timeout minus a 5 s margin, applied once here (C1). */
export const WAIT_SECONDS = { claude: 595, opencode: 595 };
const ACCEPTED_VERSIONS = ['v1']; // the app's own and the one before it, once one exists (C1 versions)
const EVENT_NAME = /^\d+-\d+\.evt$/;
const BASE_NAME = /^\d+-\d+$/;
const HEADER = /^THADEUS-EVENT (v\d+) ([a-z]+) ([0-9a-f]{64})$/;
const HEADER_MAX = 128;
const SWEEP_MS = 250;

// LC1: inline worker source (eval: true runs it as CommonJS). Its own event loop keeps `alive` changing while main is
// busy; only a crash or quit of the app stops it (RD1). `alive` is replaced by rename, so a hook never reads it empty.
// A write error other than ENOENT (a folder being removed) is reported once per folder and code (OD2).
const HEARTBEAT = `
const fs = require('node:fs');
const path = require('node:path');
const { parentPort, workerData } = require('node:worker_threads');
const { root, ms } = workerData;
const told = new Set();
setInterval(() => {
  let dirs = [];
  try { dirs = fs.readdirSync(root); } catch {}
  for (const d of dirs) {
    try {
      const tmp = path.join(root, d, 'alive.tmp');
      fs.writeFileSync(tmp, Date.now() + '\\n');
      fs.renameSync(tmp, path.join(root, d, 'alive'));
    } catch (err) {
      const key = d + ' ' + err.code;
      if (err.code !== 'ENOENT' && !told.has(key)) {
        told.add(key);
        parentPort.postMessage({ dir: d, code: err.code });
      }
    }
  }
}, ms);`;

/** One log line in the OD2 shape; agent text is cut to 80 characters and kept on one line. Never holds a secret. */
export function formatLog(reason, { session, file, text } = {}) {
  const parts = [`[agent-events] ${reason}`];
  if (session) parts.push(`session=${session}`);
  if (file) parts.push(`file=${file}`);
  if (text != null)
    parts.push(
      `text="${String(text)
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 80)}"`
    );
  return parts.join(' ');
}

const channelError = (code, message) => Object.assign(new Error(message), { code });
const exists = (p) =>
  fsp.access(p).then(
    () => true,
    () => false
  );

async function mkdirPrivate(dir) {
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  await fsp.chmod(dir, 0o700); // a permissive umask or an existing folder cannot leave it wider (SD1)
}

function writeAlive(dir) {
  const tmp = path.join(dir, 'alive.open.tmp'); // not the heartbeat's alive.tmp, which it may be writing right now
  fs.writeFileSync(tmp, `${Date.now()}\n`);
  fs.renameSync(tmp, path.join(dir, 'alive'));
}

/** The watcher passes only <session>/events/*.evt; alive, alive.tmp, answers/ and .tmp files cost nothing (PD1, R-07). */
function ignoredBy(root) {
  return (p) => {
    const rel = path.relative(root, p);
    if (!rel) return false;
    const parts = rel.split(path.sep);
    if (parts.length === 1) return false; // a session folder
    if (parts.length === 2) return parts[1] !== 'events';
    return !(parts.length === 3 && parts[1] === 'events' && parts[2].endsWith('.evt'));
  };
}

/**
 * @param {{root: string, log?: (line: string) => void, heartbeatMs?: number}} options root is <userData>/agent-channel
 */
export function createAgentChannel({ root, log = (line) => console.warn(line), heartbeatMs = 500 }) {
  const sessions = new Map(); // sessionId -> { dir, secret: Buffer, projectId, tabId, harness, ptyId }
  const ended = new Set();
  const listeners = new Set();
  const reading = new Set();
  let ready = null;
  let worker = null;
  let watcher = null;
  let sweeper = null;
  let seq = 0;

  // RD6: nothing from an earlier run. The folder is cleared before the watcher starts, so no old event is ever read.
  function init() {
    ready ??= (async () => {
      await fsp.rm(root, { recursive: true, force: true });
      await mkdirPrivate(root);
      worker = new Worker(HEARTBEAT, { eval: true, workerData: { root, ms: heartbeatMs } });
      worker.on('message', ({ dir, code }) => log(formatLog(`heartbeat failed: ${code}`, { session: dir })));
      worker.on('error', (err) => log(formatLog(`heartbeat failed: ${err.message}`)));
      worker.unref();
      watcher = chokidar.watch(root, { depth: 2, ignoreInitial: true, ignored: ignoredBy(root) });
      watcher.on('add', (file) => intake(file));
      watcher.on('error', (err) => log(formatLog(`watch failed: ${err.message}`)));
      await new Promise((resolve) => watcher.once('ready', resolve));
      sweeper = setInterval(sweep, SWEEP_MS);
      sweeper.unref();
    })();
    return ready;
  }

  // ponytail: the watcher can miss a file written into a session folder in the moment before it watches that folder
  // (seen with fs.watch on macOS when a hook writes right after the folder appears). This sweep lists every
  // events/ folder each SWEEP_MS and takes what is left, so a missed file costs at most SWEEP_MS, never the question.
  // Drop it if the watcher ever proves complete on its own.
  async function sweep() {
    let dirs = [];
    try {
      dirs = await fsp.readdir(root);
    } catch {
      return;
    }
    for (const d of dirs) {
      const events = path.join(root, d, 'events');
      const names = await fsp.readdir(events).catch(() => []);
      for (const name of names) if (name.endsWith('.evt')) intake(path.join(events, name));
    }
  }

  /** SD3 checks 3 to 5 on the file's bytes; returns the refusal reason, or the parsed header. */
  function checkHeader(buf, session) {
    const nl = buf.indexOf(10);
    const m = nl > 0 && nl <= HEADER_MAX ? HEADER.exec(buf.subarray(0, nl).toString('latin1')) : null;
    if (!m) return { reason: 'malformed header' };
    if (!ACCEPTED_VERSIONS.includes(m[1])) return { reason: 'unaccepted version' };
    if (!crypto.timingSafeEqual(Buffer.from(m[3], 'hex'), session.secret)) return { reason: 'wrong secret' };
    return { version: m[1], kind: m[2], body: buf.subarray(nl + 1) };
  }

  /** Opens without following a link and checks type and size on the descriptor (SD3 check 2, R-06). */
  async function readEvent(abs) {
    let fh;
    try {
      fh = await fsp.open(abs, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    } catch (err) {
      if (err.code === 'ENOENT') return { gone: true };
      return { reason: err.code === 'ELOOP' ? 'not a file' : `cannot read: ${err.code}` };
    }
    try {
      const st = await fh.stat();
      if (!st.isFile()) return { reason: 'not a file' };
      if (st.size > MAX_EVENT_BYTES) {
        // Only the header is read, so a hand-back can be decided on a checked secret (review fix 3).
        const head = Buffer.alloc(HEADER_MAX + 1);
        const { bytesRead } = await fh.read(head, 0, head.length, 0);
        return { reason: 'too large', head: head.subarray(0, bytesRead) };
      }
      return { buf: await fh.readFile(), mtimeMs: st.mtimeMs };
    } finally {
      await fh.close();
    }
  }

  async function intake(abs) {
    const parts = path.relative(root, abs).split(path.sep);
    if (parts.length !== 3 || parts[1] !== 'events' || reading.has(abs)) return;
    const [sessionId, , name] = parts;
    reading.add(abs);
    try {
      const session = sessions.get(sessionId);
      let result;
      if (!session) result = { reason: ended.has(sessionId) ? 'ended session' : 'unknown session' };
      else if (!EVENT_NAME.test(name)) result = { reason: 'bad name' };
      else result = await readEvent(abs);
      if (result.gone) return;
      const parsed = result.reason ? result : checkHeader(result.buf, session);
      await fsp.unlink(abs).catch(() => {}); // read once, deleted at once, accepted or refused (PD1, SCD5)
      if (parsed.reason) {
        log(formatLog(parsed.reason, { session: sessionId, file: name }));
        // A waiting question that cannot be read, but whose secret matched, is handed back at once so the agent's own
        // picker shows now (as RD7 does for adapter refusals). A wrong secret gets nothing: it may be forged.
        if (result.head && checkHeader(result.head, session).kind === 'question') {
          api.writeAnswer({ sessionId, file: name.slice(0, -4), text: '' }).catch(() => {});
        }
        return;
      }
      const raw = {
        sessionId,
        version: parsed.version,
        kind: parsed.kind,
        body: parsed.body,
        file: name.slice(0, -4),
        arrivedAtMs: result.mtimeMs,
        seq: ++seq
      };
      for (const fn of listeners) fn(raw);
    } catch (err) {
      log(formatLog(`intake failed: ${err.message}`, { session: sessionId, file: name }));
    } finally {
      reading.delete(abs);
    }
  }

  function live(sessionId) {
    const s = sessions.get(sessionId);
    if (!s) throw channelError('sessionEnded', 'session ended');
    return s;
  }

  const answerPath = (s, file, ext) => path.join(s.dir, 'answers', `${file}.${ext}`);

  const api = {
    /** C2: called before an agent pty spawns. The secret leaves only inside env, for the child process. */
    async openSession({ projectId, tabId, harness }) {
      if (!Object.hasOwn(WAIT_SECONDS, harness)) throw new Error(`unknown harness: ${String(harness)}`);
      await init();
      const sessionId = crypto.randomUUID();
      const dir = path.join(root, sessionId);
      for (const d of [dir, path.join(dir, 'events'), path.join(dir, 'answers')]) await mkdirPrivate(d);
      writeAlive(dir); // before the env is handed out, so a hook never starts before alive exists (RD1)
      const secret = crypto.randomBytes(32);
      sessions.set(sessionId, { dir, secret, projectId, tabId, harness, ptyId: null });
      const waitSeconds = WAIT_SECONDS[harness];
      return {
        sessionId,
        waitSeconds,
        env: { THADEUS_SESSION_DIR: dir, THADEUS_SESSION_SECRET: secret.toString('hex'), THADEUS_WAIT_SECONDS: String(waitSeconds) }
      };
    },
    bindPty({ sessionId, ptyId }) {
      const s = sessions.get(sessionId);
      if (!s) throw new Error('unknown session');
      if (s.ptyId) throw new Error('session already bound');
      s.ptyId = ptyId;
    },
    ptyOf: (sessionId) => sessions.get(sessionId)?.ptyId ?? null,
    isLive: (sessionId) => sessions.has(sessionId),
    /** C2: on pty exit and at shutdown. Later files for the session are refused as "ended session" (RD5). */
    async closeSession(sessionId) {
      const s = sessions.get(sessionId);
      if (!s) return;
      sessions.delete(sessionId);
      ended.add(sessionId);
      await fsp.rm(s.dir, { recursive: true, force: true, maxRetries: 3 }); // the retries cover a heartbeat write
    },
    onRawEvent(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /**
     * C2: writes `<file>.ans` by a `wx` temp file and a rename (SD7), only while the hook's wait marker exists (RD3).
     * Throws an Error with `code` sessionEnded, badFile, hookGaveUp or cannotWrite.
     */
    async writeAnswer({ sessionId, file, text }) {
      const s = live(sessionId);
      if (typeof file !== 'string' || !BASE_NAME.test(file)) throw channelError('badFile', 'bad answer file');
      if (!(await exists(answerPath(s, file, 'wait')))) throw channelError('hookGaveUp', 'hook gave up');
      const tmp = answerPath(s, file, `${crypto.randomUUID()}.tmp`);
      try {
        await fsp.writeFile(tmp, String(text), { flag: 'wx', mode: 0o600 });
        await fsp.rename(tmp, answerPath(s, file, 'ans'));
      } catch (err) {
        await fsp.unlink(tmp).catch(() => {}); // a planted link is removed, never followed
        throw channelError('cannotWrite', `cannot write the answer file: ${err.code ?? err.message}`);
      }
    },
    /** Main-internal (LC2): the hook's markers for one answer file. */
    async answerState(sessionId, file) {
      const s = sessions.get(sessionId);
      if (!s || !BASE_NAME.test(String(file)) || !(await exists(s.dir))) return { folder: false, waiting: false, answerPresent: false, nack: false };
      const [waiting, answerPresent, nack] = await Promise.all(['wait', 'ans', 'nack'].map((ext) => exists(answerPath(s, file, ext))));
      return { folder: true, waiting, answerPresent, nack };
    },
    /** Main-internal (LC2): deletes `<file>.ans`; true when it was still there (not taken), false when taken (RD2). */
    async retract(sessionId, file) {
      const s = sessions.get(sessionId);
      if (!s || !BASE_NAME.test(String(file))) return false;
      try {
        await fsp.unlink(answerPath(s, file, 'ans'));
        return true;
      } catch (err) {
        if (err.code === 'ENOENT') return false;
        throw err;
      }
    },
    /** Stops the watcher and the heartbeat (tests and app quit). */
    async dispose() {
      await ready?.catch(() => {});
      clearInterval(sweeper);
      await watcher?.close();
      await worker?.terminate();
      watcher = null;
      worker = null;
      ready = null;
    }
  };
  return api;
}
