// US-0506 u1 LC2 (review fix 5): the 250 ms sweep alone delivers an event the watcher never reported.
// chokidar is stubbed with a watcher that is ready at once and never emits, so only the sweep can find the file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn(),
      once: vi.fn((event, fn) => event === 'ready' && fn()),
      close: vi.fn(async () => {})
    }))
  }
}));
const { createAgentChannel } = await import('../../src/main/agentChannel.js');

const TMP = path.resolve(__dirname, '../.tmp');
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let base, channel, raws;
beforeEach(() => {
  base = mkdtempSync(path.join(TMP, 'sw-'));
  channel = createAgentChannel({ root: path.join(base, 'agent-channel'), log: () => {} });
  raws = [];
  channel.onRawEvent((raw) => raws.push(raw));
});
afterEach(async () => {
  await channel.dispose();
  rmSync(base, { recursive: true, force: true });
});

describe('the sweep behind the watcher', () => {
  it('finds a file the watcher never reported, exactly once, within about 400 ms', async () => {
    const { sessionId, env } = await channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    const tmp = path.join(env.THADEUS_SESSION_DIR, 'events', '5-1.tmp');
    writeFileSync(tmp, `THADEUS-EVENT v1 question ${env.THADEUS_SESSION_SECRET}\n{}`);
    renameSync(tmp, path.join(env.THADEUS_SESSION_DIR, 'events', '5-1.evt'));
    const dropped = Date.now();
    for (const end = dropped + 600; Date.now() < end && raws.length === 0; await sleep(10));
    expect(Date.now() - dropped).toBeLessThanOrEqual(400);
    await sleep(600); // two more sweeps: the file is gone, so nothing is emitted twice
    expect(raws).toHaveLength(1);
    expect(raws[0]).toMatchObject({ sessionId, kind: 'question', file: '5-1' });
  });
});
