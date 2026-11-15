// US-0506 u1: the real dialog.sh against a real AgentChannel (W1 steps 2 to 6, RD2 race, RD5, SCD5), per shell.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createAgentChannel } from '../../src/main/agentChannel.js';
import { SHELLS } from '../helpers/shells.js';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, '.thadeus/hooks/dialog.sh');
const TMP = path.join(ROOT, 'tests/.tmp');
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let base, channel, raws;
beforeEach(() => {
  base = mkdtempSync(path.join(TMP, 'chs-'));
  channel = createAgentChannel({ root: path.join(base, 'agent-channel'), log: () => {} });
  raws = [];
  channel.onRawEvent((raw) => raws.push(raw));
});
afterEach(async () => {
  await channel.dispose();
  rmSync(base, { recursive: true, force: true });
});

function hook(shell, env, input, kind = 'question') {
  const child = spawn(shell, [SCRIPT, kind], { env: { PATH: process.env.PATH, ...env } });
  let out = '';
  child.stdout.on('data', (b) => (out += b));
  child.stdin.on('error', () => {});
  child.stdin.end(input);
  return { child, done: new Promise((resolve) => child.on('close', (code) => resolve({ code, out, at: Date.now() }))) };
}
const rawFor = async (sessionId, ms = 3000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(5)) {
    const raw = raws.find((r) => r.sessionId === sessionId);
    if (raw) return raw;
  }
  throw new Error('no raw event');
};

describe.each(SHELLS)('dialog.sh with AgentChannel under %s', (shell) => {
  it('a question reaches main byte for byte, and the written answer is printed (W1)', { timeout: 10_000 }, async () => {
    const { sessionId, env } = await channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    const input = '{"tool_input":{"questions":[{"question":"Vilken? 👍"}]}}';
    const { done } = hook(shell, env, input);
    const raw = await rawFor(sessionId);
    expect(raw.body.toString('utf8')).toBe(input);
    await channel.writeAnswer({ sessionId, file: raw.file, text: '{"ok":true}' });
    const r = await done;
    expect(r).toMatchObject({ code: 0, out: '{"ok":true}' });
    expect(await channel.answerState(sessionId, raw.file)).toEqual({ folder: true, waiting: false, answerPresent: false, nack: false });
    // SCD5: only alive and the two empty folders are left.
    expect(readdirSync(env.THADEUS_SESSION_DIR).sort()).toEqual(['alive', 'answers', 'events']);
    expect(readdirSync(path.join(env.THADEUS_SESSION_DIR, 'events'))).toEqual([]);
    expect(readdirSync(path.join(env.THADEUS_SESSION_DIR, 'answers'))).toEqual([]);
  });

  it('a permission reaches main byte for byte and the written hook output is printed (US-0506 u2 W1)', { timeout: 10_000 }, async () => {
    const { sessionId, env } = await channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    const input = '{"tool_name":"Bash","tool_input":{"command":"git push 👍"}}';
    const { done } = hook(shell, env, input, 'permission');
    const raw = await rawFor(sessionId);
    expect(raw.kind).toBe('permission');
    expect(raw.body.toString('utf8')).toBe(input);
    const out = '{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}';
    await channel.writeAnswer({ sessionId, file: raw.file, text: out });
    expect(await done).toMatchObject({ code: 0, out });
  });

  it('three permission round trips (allow, hand-back, time-out) leave only alive and two empty folders (SCD10)', { timeout: 15_000 }, async () => {
    const { sessionId, env } = await channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    for (const text of ['{"ok":true}', '']) {
      raws.length = 0;
      const { done } = hook(shell, env, '{}', 'permission');
      const raw = await rawFor(sessionId);
      await channel.writeAnswer({ sessionId, file: raw.file, text });
      expect(await done).toMatchObject({ code: 0, out: text });
    }
    const timedOut = await hook(shell, { ...env, THADEUS_WAIT_SECONDS: '1' }, '{}', 'permission').done;
    expect(timedOut).toMatchObject({ code: 0, out: '' });
    await sleep(400); // the sweep takes the last event file
    const dir = env.THADEUS_SESSION_DIR;
    expect(readdirSync(dir).sort()).toEqual(['alive', 'answers', 'events']);
    expect(readdirSync(path.join(dir, 'events'))).toEqual([]);
    expect(readdirSync(path.join(dir, 'answers'))).toEqual([]);
  });

  // US-0010: wall-clock, so it retries up to twice under a loaded suite; each attempt keeps the full 100 ms limit.
  it('closeSession makes a waiting hook exit at its next poll (RD5)', { timeout: 10_000, retry: 2 }, async () => {
    const { sessionId, env } = await channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    const { done } = hook(shell, env, '{}');
    await rawFor(sessionId);
    await sleep(250);
    await channel.closeSession(sessionId);
    const closed = Date.now();
    const r = await done;
    expect(r.code).toBe(0);
    expect(r.out).toBe('');
    expect(r.at - closed).toBeLessThanOrEqual(100); // RD1: the next poll's read fails, within 100 ms
  });

  it('a hook and a retract started together: exactly one of them gets the answer, 200 times (RD2)', { timeout: 60_000 }, async () => {
    const runOnce = async () => {
      const { sessionId, env } = await channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
      const { done } = hook(shell, env, '{}');
      const raw = await rawFor(sessionId);
      await channel.writeAnswer({ sessionId, file: raw.file, text: 'ANSWER' });
      const retracted = await channel.retract(sessionId, raw.file);
      if (retracted) await channel.writeAnswer({ sessionId, file: raw.file, text: '' }); // let the hook go
      const r = await done;
      await channel.closeSession(sessionId);
      return { printed: r.out === 'ANSWER', retracted };
    };
    const results = [];
    for (let batch = 0; batch < 20; batch++) results.push(...(await Promise.all(Array.from({ length: 10 }, runOnce))));
    expect(results).toHaveLength(200);
    for (const r of results) expect(r.printed !== r.retracted).toBe(true);
  });
});
