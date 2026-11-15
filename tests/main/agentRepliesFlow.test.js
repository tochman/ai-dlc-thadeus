// US-0506 u3: the main side end to end. A real AgentChannel on a temp root, the real store and adapters, a fake pty,
// real time (scenario 7 replays for both harnesses, RD11's named test, OD5's timing lines; NFR2.4, AC3.1.1, AC3.1.4).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createAgentChannel } from '../../src/main/agentChannel.js';
import { createAgentEventStore } from '../../src/main/agentEvents.js';
import { adapters } from '../../src/main/agentAdapters.js';
import { createTimingLog } from '../../src/main/agentTiming.js';

const ROOT = path.resolve(__dirname, '../..');
const TMP = path.join(ROOT, 'tests/.tmp');
const FIX = path.join(ROOT, 'tests/fixtures/agent-events');
mkdirSync(TMP, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 3000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(10)) {
    const v = fn();
    if (v) return v;
  }
  throw new Error('timed out');
};

let base, channel, store, pty, logs, pushes, timing;
async function setup({ timingOn = false } = {}) {
  timing = createTimingLog({ dir: path.join(base, 'logs'), on: timingOn });
  channel = createAgentChannel({ root: path.join(base, 'agent-channel'), log: (l) => logs.push(l) });
  store = createAgentEventStore({ channel, adapters, pty, timing, log: (l) => logs.push(l) });
  store.onChanged((p) => pushes.push(p));
}
async function open(harness = 'claude') {
  const { sessionId, env, waitSeconds } = await channel.openSession({ projectId: 'p1', tabId: `agent:${harness}`, harness });
  channel.bindPty({ sessionId, ptyId: `pty-${harness}` });
  store.startSession({ sessionId, projectId: 'p1', tabId: `agent:${harness}`, harness, waitSeconds });
  return env;
}
let n = 0;
function drop(env, body) {
  const name = `${Date.now()}-${++n}`;
  const tmp = path.join(env.THADEUS_SESSION_DIR, 'events', `${name}.tmp`);
  writeFileSync(tmp, Buffer.concat([Buffer.from(`THADEUS-EVENT v1 reply ${env.THADEUS_SESSION_SECRET}\n`), body]));
  renameSync(tmp, path.join(env.THADEUS_SESSION_DIR, 'events', `${name}.evt`));
  return name;
}
const shownReply = () => waitFor(() => store.list('p1').find((e) => e.kind === 'reply' && e.state === 'shown'));

beforeEach(() => {
  base = mkdtempSync(path.join(TMP, 'u3-flow-'));
  pty = { write: vi.fn(), tapOutput: vi.fn(() => () => {}) };
  logs = [];
  pushes = [];
});
afterEach(async () => {
  store.dispose();
  await channel.dispose();
  rmSync(base, { recursive: true, force: true });
});

describe('scenario 7 replays (NFR2.4)', () => {
  it.each([
    ['claude', 'claude/stop-which-name.json'],
    ['opencode', 'opencode/idle-which-name.json']
  ])('%s: one shown reply; "notes.md" is typed, then Enter, into that tab only', { timeout: 10_000 }, async (harness, fixture) => {
    await setup();
    await open('claude' === harness ? 'opencode' : 'claude'); // a second agent tab that must stay untouched
    const env = await open(harness);
    drop(env, readFileSync(path.join(FIX, fixture)));
    const ev = await shownReply();
    expect(ev).toMatchObject({ harness, message: { text: 'Which name should the file have?' } });
    await expect(store.answer(ev.eventId, { reply: { text: 'notes.md' } })).resolves.toEqual({ state: 'sent', via: 'typed' });
    expect(pty.write.mock.calls).toEqual([
      [`pty-${harness}`, 'notes.md'],
      [`pty-${harness}`, '\r']
    ]);
  });
});

describe('RD11: an over-limit reply while one is shown', () => {
  it('the file is gone, one "too large" line, the shown reply stale (notShown), no pty write, one push', { timeout: 10_000 }, async () => {
    await setup();
    const env = await open('claude');
    drop(env, readFileSync(path.join(FIX, 'claude/stop-which-name.json')));
    const ev = await shownReply();
    pushes.length = 0;
    const name = drop(env, Buffer.alloc(1_048_577, 'x'));
    const stale = await waitFor(() => store.list('p1').find((e) => e.eventId === ev.eventId && e.state === 'stale'));
    await sleep(300);
    expect(stale.staleReason).toBe('notShown');
    expect(existsSync(path.join(env.THADEUS_SESSION_DIR, 'events', `${name}.evt`))).toBe(false);
    expect(logs.filter((l) => l.includes('too large'))).toHaveLength(1);
    expect(pty.write).not.toHaveBeenCalled();
    expect(store.latest('p1').status).toBe('notShown');
    expect(pushes).toHaveLength(1);
  });
});

describe('OD5: timing lines for replies', () => {
  const lines = () => {
    const file = path.join(base, 'logs', 'agent-timing.jsonl');
    return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse) : [];
  };

  it('an answered reply gives four lines with the four fields only; a dismissed one gives two', { timeout: 10_000 }, async () => {
    await setup({ timingOn: true });
    const env = await open('claude');
    drop(env, readFileSync(path.join(FIX, 'claude/stop-which-name.json')));
    const a = await shownReply();
    timing.stampFromRenderer(a.eventId, 'dialogShown', 'claude');
    timing.stampFromRenderer(a.eventId, 'answerClicked', 'claude');
    await store.answer(a.eventId, { reply: { text: 'notes.md' } });
    drop(env, readFileSync(path.join(FIX, 'claude/stop-done.json')));
    const b = await waitFor(() => store.list('p1').find((e) => e.kind === 'reply' && e.state === 'shown' && e.eventId !== a.eventId));
    timing.stampFromRenderer(b.eventId, 'dialogShown', 'claude');
    await store.close(b.eventId);
    await timing.flush();
    const all = lines();
    expect(all.filter((l) => l.eventId === a.eventId).map((l) => l.stamp)).toEqual(['hookReceived', 'dialogShown', 'answerClicked', 'answerDelivered']);
    expect(all.filter((l) => l.eventId === b.eventId).map((l) => l.stamp)).toEqual(['hookReceived', 'dialogShown']);
    for (const l of all) expect(Object.keys(l).sort()).toEqual(['at', 'eventId', 'harness', 'stamp']);
    expect(JSON.stringify(all)).not.toContain('notes.md');
  });

  it('with the switch off no file exists', { timeout: 10_000 }, async () => {
    await setup({ timingOn: false });
    const env = await open('claude');
    drop(env, readFileSync(path.join(FIX, 'claude/stop-which-name.json')));
    const ev = await shownReply();
    await store.answer(ev.eventId, { reply: { text: 'notes.md' } });
    await timing.flush();
    expect(existsSync(path.join(base, 'logs'))).toBe(false);
  });
});
