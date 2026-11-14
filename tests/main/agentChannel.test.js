// US-0506 u1 LC1, LC2: AgentChannel against a real temp folder (C1, C2; SD1, SD3, SD7, RD1, RD2, RD5, RD6, PD1).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createAgentChannel, formatLog } from '../../src/main/agentChannel.js';

const TMP = path.resolve(__dirname, '../.tmp');
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 2000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(10)) if (fn()) return;
  throw new Error('timed out');
};

let base, root, channel, logs, raws;
beforeEach(() => {
  base = mkdtempSync(path.join(TMP, 'ch-'));
  root = path.join(base, 'agent-channel');
  logs = [];
  raws = [];
  channel = createAgentChannel({ root, log: (line) => logs.push(line) });
  channel.onRawEvent((raw) => raws.push(raw));
});
afterEach(async () => {
  vi.restoreAllMocks();
  await channel.dispose();
  rmSync(base, { recursive: true, force: true });
});

const open = (harness = 'claude') => channel.openSession({ projectId: 'p1', tabId: `agent:${harness}`, harness });
const header = (secret, kind = 'question', version = 'v1') => `THADEUS-EVENT ${version} ${kind} ${secret}\n`;
/** Writes an event the way the hook does: .tmp, then rename to .evt. */
function drop(dir, name, content) {
  const tmp = path.join(dir, 'events', `${name}.tmp`);
  writeFileSync(tmp, content);
  const mtimeMs = statSync(tmp).mtimeMs;
  renameSync(tmp, path.join(dir, 'events', `${name}.evt`));
  return mtimeMs;
}

describe('openSession (C2, SD1, SD2)', () => {
  it('returns a session id and exactly the three channel variables', async () => {
    const { sessionId, env } = await open();
    expect(typeof sessionId).toBe('string');
    expect(Object.keys(env).sort()).toEqual(['THADEUS_SESSION_DIR', 'THADEUS_SESSION_SECRET', 'THADEUS_WAIT_SECONDS']);
    expect(env.THADEUS_SESSION_SECRET).toMatch(/^[0-9a-f]{64}$/);
    expect(env.THADEUS_WAIT_SECONDS).toBe('595');
    expect(env.THADEUS_SESSION_DIR).toBe(path.join(root, sessionId));
    expect(readFileSync(path.join(env.THADEUS_SESSION_DIR, 'alive'), 'utf8')).toMatch(/^\d+\n$/);
  });

  it('makes every folder 0700 under the given root, also with a permissive umask (NFR3.1)', async () => {
    const old = process.umask(0);
    try {
      const { env } = await open();
      for (const dir of [root, env.THADEUS_SESSION_DIR, path.join(env.THADEUS_SESSION_DIR, 'events'), path.join(env.THADEUS_SESSION_DIR, 'answers')]) {
        expect(statSync(dir).mode & 0o777).toBe(0o700);
      }
      expect(env.THADEUS_SESSION_DIR.startsWith(root + path.sep)).toBe(true);
    } finally {
      process.umask(old);
    }
  });

  it('refuses an unknown harness', async () => {
    await expect(channel.openSession({ projectId: 'p1', tabId: 'x', harness: 'codex' })).rejects.toThrow();
  });

  it('clears folders from an earlier run before the first session, and reads none of their events (NFR5.4, RD6)', async () => {
    const old = path.join(root, 'old-session', 'events');
    mkdirSync(old, { recursive: true });
    writeFileSync(path.join(old, '1-1.evt'), `${header('a'.repeat(64))}{}`);
    await open();
    await sleep(300);
    expect(existsSync(path.join(root, 'old-session'))).toBe(false);
    expect(raws).toEqual([]);
  });

  it('binds a pty once and reports it', async () => {
    const { sessionId } = await open();
    expect(channel.ptyOf(sessionId)).toBeNull();
    channel.bindPty({ sessionId, ptyId: 'pty-1' });
    expect(channel.ptyOf(sessionId)).toBe('pty-1');
    expect(() => channel.bindPty({ sessionId, ptyId: 'pty-2' })).toThrow('session already bound');
    expect(() => channel.bindPty({ sessionId: 'nope', ptyId: 'pty-2' })).toThrow('unknown session');
    expect(channel.isLive(sessionId)).toBe(true);
  });
});

describe('intake (BR1.1, SD3)', () => {
  it('a valid event gives exactly one raw event within 500 ms and is deleted (PD1, SCD2)', async () => {
    const { sessionId, env } = await open();
    const dir = env.THADEUS_SESSION_DIR;
    const started = Date.now();
    const mtime = drop(dir, '100-1', `${header(env.THADEUS_SESSION_SECRET)}{"a":"åäö"}`);
    await waitFor(() => raws.length === 1);
    expect(Date.now() - started).toBeLessThan(500);
    const [raw] = raws;
    expect(raw).toMatchObject({ sessionId, version: 'v1', kind: 'question', file: '100-1', arrivedAtMs: mtime });
    expect(raw.body.toString('utf8')).toBe('{"a":"åäö"}');
    expect(existsSync(path.join(dir, 'events', '100-1.evt'))).toBe(false);
    drop(dir, '100-2', `${header(env.THADEUS_SESSION_SECRET, 'answered')}{}`);
    await waitFor(() => raws.length === 2);
    expect(raws[1].seq).toBeGreaterThan(raws[0].seq);
    expect(logs).toEqual([]);
  });

  it('ignores and keeps a .tmp file', async () => {
    const { env } = await open();
    const tmp = path.join(env.THADEUS_SESSION_DIR, 'events', '1-1.tmp');
    writeFileSync(tmp, `${header(env.THADEUS_SESSION_SECRET)}{}`);
    await sleep(300);
    expect(existsSync(tmp)).toBe(true);
    expect(raws).toEqual([]);
    expect(logs).toEqual([]);
  });

  const refusals = [
    ['unknown session', async () => path.join(root, 'not-a-session'), (s) => `${header(s)}{}`, '1-1'],
    ['bad name', async (env) => env.THADEUS_SESSION_DIR, (s) => `${header(s)}{}`, 'abc'],
    ['too large', async (env) => env.THADEUS_SESSION_DIR, (s) => header(s) + 'x'.repeat(1_048_577), '1-2'],
    ['malformed header', async (env) => env.THADEUS_SESSION_DIR, () => 'HELLO\n{}', '1-3'],
    ['unaccepted version', async (env) => env.THADEUS_SESSION_DIR, (s) => `${header(s, 'question', 'v2')}{}`, '1-4'],
    ['wrong secret', async (env) => env.THADEUS_SESSION_DIR, () => `${header('b'.repeat(64))}{}`, '1-5']
  ];
  it.each(refusals)('refuses %s: the file is deleted, one log line, nothing emitted (NFR3.3, NFR3.11)', async (reason, dirOf, content, name) => {
    const { env } = await open();
    const dir = await dirOf(env);
    mkdirSync(path.join(dir, 'events'), { recursive: true });
    drop(dir, name, content(env.THADEUS_SESSION_SECRET));
    await waitFor(() => logs.length === 1);
    expect(existsSync(path.join(dir, 'events', `${name}.evt`))).toBe(false);
    expect(logs[0]).toMatch(new RegExp(`^\\[agent-events\\] ${reason} session=\\S+ file=${name}\\.evt$`));
    expect(logs[0]).not.toContain(env.THADEUS_SESSION_SECRET);
    expect(raws).toEqual([]);
  });

  it('refuses a file in the folder of a session that ended', async () => {
    const { sessionId, env } = await open();
    await channel.closeSession(sessionId);
    mkdirSync(path.join(env.THADEUS_SESSION_DIR, 'events'), { recursive: true });
    await sleep(150);
    drop(env.THADEUS_SESSION_DIR, '1-6', `${header(env.THADEUS_SESSION_SECRET)}{}`);
    await waitFor(() => logs.length === 1);
    expect(logs[0]).toContain('ended session');
    expect(raws).toEqual([]);
  });

  it('refuses a symlink without following it (O_NOFOLLOW, R-06)', async () => {
    const { env } = await open();
    const outside = path.join(base, 'outside.txt');
    writeFileSync(outside, `${header(env.THADEUS_SESSION_SECRET)}{}`);
    symlinkSync(outside, path.join(env.THADEUS_SESSION_DIR, 'events', '1-7.evt'));
    await waitFor(() => logs.length === 1);
    expect(logs[0]).toContain('not a file');
    expect(existsSync(outside)).toBe(true);
    expect(raws).toEqual([]);
  });

  it('a too-large waiting question with the right secret is handed back at once (review fix 3)', async () => {
    const { env } = await open();
    const answers = path.join(env.THADEUS_SESSION_DIR, 'answers');
    writeFileSync(path.join(answers, '3-1.wait'), '');
    drop(env.THADEUS_SESSION_DIR, '3-1', header(env.THADEUS_SESSION_SECRET) + 'x'.repeat(1_048_577));
    await waitFor(() => existsSync(path.join(answers, '3-1.ans')));
    expect(readFileSync(path.join(answers, '3-1.ans'), 'utf8')).toBe('');
    expect(logs).toEqual([expect.stringContaining('too large')]);
    expect(raws).toEqual([]);
  });

  it('a refused file with a wrong secret gets no hand-back, too large or not (it may be forged)', async () => {
    const { env } = await open();
    const answers = path.join(env.THADEUS_SESSION_DIR, 'answers');
    writeFileSync(path.join(answers, '3-2.wait'), '');
    writeFileSync(path.join(answers, '3-3.wait'), '');
    drop(env.THADEUS_SESSION_DIR, '3-2', header('b'.repeat(64)) + 'x'.repeat(1_048_577));
    drop(env.THADEUS_SESSION_DIR, '3-3', `${header('b'.repeat(64))}{}`);
    await waitFor(() => logs.length === 2);
    await sleep(100);
    expect(readdirSync(answers).sort()).toEqual(['3-2.wait', '3-3.wait']);
  });

  it('a too-large answered event with the right secret gets no hand-back (only a waiting question does)', async () => {
    const { env } = await open();
    const answers = path.join(env.THADEUS_SESSION_DIR, 'answers');
    writeFileSync(path.join(answers, '3-4.wait'), '');
    drop(env.THADEUS_SESSION_DIR, '3-4', header(env.THADEUS_SESSION_SECRET, 'answered') + 'x'.repeat(1_048_577));
    await waitFor(() => logs.length === 1);
    await sleep(100);
    expect(readdirSync(answers)).toEqual(['3-4.wait']);
  });

  it('heartbeat writes raise no intake event and no log line (R-07)', async () => {
    await open();
    await sleep(1200);
    expect(raws).toEqual([]);
    expect(logs).toEqual([]);
  });
});

describe('answers (SD7, RD2)', () => {
  async function waiting(name = '200-1') {
    const s = await open();
    writeFileSync(path.join(s.env.THADEUS_SESSION_DIR, 'answers', `${name}.wait`), '');
    return s;
  }

  it('writes the answer by rename, leaving no temp file (NFR3.9)', async () => {
    const { sessionId, env } = await waiting();
    await channel.writeAnswer({ sessionId, file: '200-1', text: 'svar åäö' });
    const answers = path.join(env.THADEUS_SESSION_DIR, 'answers');
    expect(readFileSync(path.join(answers, '200-1.ans'), 'utf8')).toBe('svar åäö');
    expect(readdirSync(answers).sort()).toEqual(['200-1.ans', '200-1.wait']);
  });

  it('refuses a name with a separator or .., an ended session and a hook that gave up', async () => {
    const { sessionId } = await waiting();
    for (const file of ['../200-1', '200-1/x', '..', 'a-b']) {
      await expect(channel.writeAnswer({ sessionId, file, text: 'x' })).rejects.toMatchObject({ code: 'badFile' });
    }
    await expect(channel.writeAnswer({ sessionId, file: '200-9', text: 'x' })).rejects.toMatchObject({ code: 'hookGaveUp', message: 'hook gave up' });
    await channel.closeSession(sessionId);
    await expect(channel.writeAnswer({ sessionId, file: '200-1', text: 'x' })).rejects.toMatchObject({ code: 'sessionEnded', message: 'session ended' });
  });

  it('a planted symlink at the temp name does not redirect the write', async () => {
    const { sessionId, env } = await waiting();
    const target = path.join(base, 'target.txt');
    writeFileSync(target, 'untouched');
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('fixed');
    symlinkSync(target, path.join(env.THADEUS_SESSION_DIR, 'answers', '200-1.fixed.tmp'));
    await expect(channel.writeAnswer({ sessionId, file: '200-1', text: 'evil' })).rejects.toMatchObject({ code: 'cannotWrite' });
    expect(readFileSync(target, 'utf8')).toBe('untouched');
    expect(existsSync(path.join(env.THADEUS_SESSION_DIR, 'answers', '200-1.ans'))).toBe(false);
  });

  it('reports the markers and retracts an answer once', async () => {
    const { sessionId, env } = await waiting();
    const answers = path.join(env.THADEUS_SESSION_DIR, 'answers');
    expect(await channel.answerState(sessionId, '200-1')).toEqual({ folder: true, waiting: true, answerPresent: false, nack: false });
    await channel.writeAnswer({ sessionId, file: '200-1', text: 'x' });
    writeFileSync(path.join(answers, '200-1.nack'), '');
    expect(await channel.answerState(sessionId, '200-1')).toEqual({ folder: true, waiting: true, answerPresent: true, nack: true });
    expect(await channel.retract(sessionId, '200-1')).toBe(true);
    expect(await channel.retract(sessionId, '200-1')).toBe(false);
    expect(await channel.answerState('nope', '200-1')).toEqual({ folder: false, waiting: false, answerPresent: false, nack: false });
  });
});

describe('heartbeat and close (RD1, RD5)', () => {
  it('keeps alive changing while the main thread is busy for 1.5 s', async () => {
    const { env } = await open();
    const alive = path.join(env.THADEUS_SESSION_DIR, 'alive');
    await sleep(100);
    const start = Date.now();
    while (Date.now() - start < 1500); // a stalled main loop
    expect(Number(readFileSync(alive, 'utf8'))).toBeGreaterThan(start);
  });

  it('alive is never read empty', async () => {
    const { env } = await open();
    const alive = path.join(env.THADEUS_SESSION_DIR, 'alive');
    for (let i = 0; i < 1000; i++) {
      expect(readFileSync(alive, 'utf8')).toMatch(/^\d+\n$/);
      if (i % 100 === 0) await sleep(60);
    }
  });

  it('closeSession removes the folder while the heartbeat runs, 100 times', async () => {
    for (let i = 0; i < 100; i++) {
      const { sessionId, env } = await open();
      await channel.closeSession(sessionId);
      expect(existsSync(env.THADEUS_SESSION_DIR)).toBe(false);
      expect(channel.isLive(sessionId)).toBe(false);
    }
    await channel.closeSession('unknown');
  });

  it('the happy path writes nothing to the console (NFR3.12, OD3)', async () => {
    const spies = ['log', 'info', 'warn', 'error'].map((m) => vi.spyOn(console, m));
    const quiet = createAgentChannel({ root: path.join(base, 'quiet') });
    const got = [];
    quiet.onRawEvent((raw) => got.push(raw));
    const { sessionId, env } = await quiet.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    writeFileSync(path.join(env.THADEUS_SESSION_DIR, 'answers', '1-1.wait'), '');
    drop(env.THADEUS_SESSION_DIR, '1-1', `${header(env.THADEUS_SESSION_SECRET)}{}`);
    await waitFor(() => got.length === 1);
    await quiet.writeAnswer({ sessionId, file: '1-1', text: 'x' });
    await quiet.closeSession(sessionId);
    await quiet.dispose();
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('formatLog (OD2)', () => {
  it('names reason, session and file, and quotes at most 80 characters of text on one line', () => {
    expect(formatLog('wrong secret', { session: 's1', file: '1-1.evt' })).toBe('[agent-events] wrong secret session=s1 file=1-1.evt');
    const line = formatLog('adapter refused: no text', { session: 's1', file: '1-1.evt', text: `a\nb${'x'.repeat(200)}` });
    expect(line).toMatch(/ text="a bx+"$/);
    expect(line.match(/text="(.*)"$/)[1]).toHaveLength(80);
  });
});
