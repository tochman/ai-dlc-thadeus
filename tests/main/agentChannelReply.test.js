// US-0506 u3 LC2: an over-limit reply file in a real AgentChannel on a temp root (RD11, RD16, SCD9, NFR5.23, C2).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createAgentChannel } from '../../src/main/agentChannel.js';

const TMP = path.resolve(__dirname, '../.tmp');
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 2000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(10)) if (fn()) return;
  throw new Error('timed out');
};

let base, root, channel, logs, raws, refused;
beforeEach(() => {
  base = mkdtempSync(path.join(TMP, 'u3-chr-'));
  root = path.join(base, 'agent-channel');
  logs = [];
  raws = [];
  refused = vi.fn();
  channel = createAgentChannel({ root, log: (line) => logs.push(line) });
  channel.onRawEvent((raw) => raws.push(raw));
  channel.onRefusedReply(refused);
});
afterEach(async () => {
  await channel.dispose();
  rmSync(base, { recursive: true, force: true });
});

const open = () => channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
const header = (secret, kind = 'reply') => `THADEUS-EVENT v1 ${kind} ${secret}\n`;
function drop(dir, name, content) {
  const tmp = path.join(dir, 'events', `${name}.tmp`);
  writeFileSync(tmp, content);
  renameSync(tmp, path.join(dir, 'events', `${name}.evt`));
}
const over = 'x'.repeat(1_048_577);

describe('an over-limit reply (RD11)', () => {
  it('with the right secret: deleted, one "too large" line, onRefusedReply once, no raw event', async () => {
    const { sessionId, env } = await open();
    drop(env.THADEUS_SESSION_DIR, '1-1', header(env.THADEUS_SESSION_SECRET) + over);
    await waitFor(() => refused.mock.calls.length === 1);
    await sleep(100);
    expect(existsSync(path.join(env.THADEUS_SESSION_DIR, 'events', '1-1.evt'))).toBe(false);
    expect(logs).toEqual([expect.stringMatching(/^\[agent-events\] too large session=\S+ file=1-1\.evt$/)]);
    expect(refused).toHaveBeenCalledTimes(1);
    expect(refused).toHaveBeenCalledWith({ sessionId, reason: 'too large' });
    expect(raws).toEqual([]);
  });

  it('with a wrong secret: nothing fires (it may be forged)', async () => {
    const { env } = await open();
    drop(env.THADEUS_SESSION_DIR, '1-2', header('b'.repeat(64)) + over);
    await waitFor(() => logs.length === 1);
    await sleep(100);
    expect(refused).not.toHaveBeenCalled();
    expect(raws).toEqual([]);
  });

  it("an over-limit question still gets u1's hand-back and no refused-reply call", async () => {
    const { env } = await open();
    writeFileSync(path.join(env.THADEUS_SESSION_DIR, 'answers', '1-3.wait'), '');
    drop(env.THADEUS_SESSION_DIR, '1-3', header(env.THADEUS_SESSION_SECRET, 'question') + over);
    await waitFor(() => existsSync(path.join(env.THADEUS_SESSION_DIR, 'answers', '1-3.ans')));
    expect(refused).not.toHaveBeenCalled();
  });

  it('reply files left from an earlier run emit nothing after the first openSession (RD16)', async () => {
    const old = path.join(root, 'old-session', 'events');
    mkdirSync(old, { recursive: true });
    writeFileSync(path.join(old, '1-4.evt'), `${header('a'.repeat(64))}{"last_assistant_message":"old"}`);
    await open();
    await sleep(400); // longer than a sweep
    expect(existsSync(path.join(root, 'old-session'))).toBe(false);
    expect(raws).toEqual([]);
    expect(refused).not.toHaveBeenCalled();
  });
});
