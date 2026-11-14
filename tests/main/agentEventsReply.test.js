// US-0506 u3 LC4: replies in the real AgentEventStore with a fake channel and pty, fake timers (BR6.4–BR6.9,
// BR6.13–BR6.15, BR6.18; RD11, RD12, RD16, RD17; SCD6, SCD8; SD9, SD12; PD10, PD11; OD8; AC3.1.2, AC3.1.3).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createAgentEventStore } from '../../src/main/agentEvents.js';
import { adapters } from '../../src/main/agentAdapters.js';
import { t } from '../../src/shared/i18n.js';

const FIX = path.resolve(__dirname, '../fixtures/agent-events');
const SECRET = 'e'.repeat(64);
const TEXT = 'Which name should the file have?';
const stop = (text) => Buffer.from(JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: text }));

function fakeChannel() {
  const listeners = [];
  const refusedFns = [];
  const ch = {
    live: new Set(),
    emit: (raw) => listeners.forEach((fn) => fn(raw)),
    refuse: (payload) => refusedFns.forEach((fn) => fn(payload)),
    onRawEvent: (fn) => listeners.push(fn),
    onRefusedReply: (fn) => refusedFns.push(fn),
    isLive: vi.fn((sid) => ch.live.has(sid)),
    ptyOf: vi.fn((sid) => (ch.live.has(sid) ? `pty-${sid}` : null)),
    writeAnswer: vi.fn(async () => {}),
    answerState: vi.fn(async () => ({ folder: true, waiting: true, answerPresent: false, nack: false })),
    retract: vi.fn(async () => false)
  };
  return ch;
}

let channel, pty, timing, store, pushes, added, logs, seq;
const make = (over = {}) => {
  store = createAgentEventStore({ channel, adapters, pty, timing, log: (line) => logs.push(line), ...over });
  store.onChanged((change) => pushes.push(change));
  store.onAdded((ev) => added.push(ev));
};
const start = (sessionId = 's1', { projectId = 'p1', tabId = 'agent:claude', harness = 'claude' } = {}) => {
  channel.live.add(sessionId);
  store.startSession({ sessionId, projectId, tabId, harness, waitSeconds: 595 });
};
const send = (sessionId, kind, bytes, { file = `1700000000-${++seq}`, arrivedAtMs = Date.now() } = {}) =>
  channel.emit({ sessionId, version: 'v1', kind, body: bytes, file, arrivedAtMs, seq: ++seq });
const reply = (sessionId = 's1', text = TEXT, opts) => send(sessionId, 'reply', stop(text), opts);
const question = (sessionId) => send(sessionId, 'question', readFileSync(path.join(FIX, 'claude/gate-2026-11-14.json')));
const answered = (sessionId) => send(sessionId, 'answered', readFileSync(path.join(FIX, 'claude/post-tool-use.json')));
const replies = (projectId = 'p1') => store.list(projectId).filter((e) => e.kind === 'reply');
const only = (projectId) => {
  const r = replies(projectId);
  expect(r).toHaveLength(1);
  return r[0];
};

beforeEach(() => {
  vi.useFakeTimers();
  channel = fakeChannel();
  pty = { write: vi.fn(), tapOutput: vi.fn(() => () => {}) };
  timing = { stamp: vi.fn() };
  pushes = [];
  added = [];
  logs = [];
  seq = 0;
  make();
});
afterEach(() => {
  store.dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('accept and order', () => {
  it('pushes an accepted reply as kind reply, shown, with its message; no secret or folder in any push; onAdded once', () => {
    start();
    reply();
    const ev = only();
    expect(ev).toMatchObject({ kind: 'reply', state: 'shown', source: 'hook', message: { text: TEXT, truncated: false, empty: false } });
    expect(added).toHaveLength(1);
    expect(timing.stamp).toHaveBeenCalledWith(ev.eventId, 'claude', 'hookReceived', ev.arrivedAtMs);
    const all = JSON.stringify(pushes);
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain('agent-channel');
  });

  it('is queued behind an open question of the project and shown in the push that ends it (BR6.8, K4)', () => {
    start('s1');
    start('s2', { tabId: 'agent:opencode' });
    question('s2');
    reply('s1');
    expect(only().state).toBe('queued');
    pushes.length = 0;
    answered('s2');
    expect(pushes.at(-1).events.find((e) => e.kind === 'reply').state).toBe('shown');
  });
});

describe('the same message twice (RD17, BR6.4)', () => {
  it('drops the same text while the newest reply is open: no push, no onAdded, no log', () => {
    start();
    reply();
    pushes.length = 0;
    reply();
    expect(pushes).toEqual([]);
    expect(added).toHaveLength(1);
    expect(logs).toEqual([]);
    expect(replies()).toHaveLength(1);
  });

  it('different text is a newer event; the same text after the first was dismissed and ended is new', () => {
    start();
    reply();
    const first = only();
    reply('s1', 'Something else?');
    expect(replies().map((e) => e.state)).toEqual(['stale', 'shown']);
    expect(replies()[0].eventId).toBe(first.eventId);
    store.close(replies()[0].eventId); // the stale page closed: it ends
    store.terminalInput('pty-s1', 'x'); // the person answered in the terminal: the shown one goes stale
    store.close(only().eventId);
    expect(replies()).toEqual([]);
    reply('s1', 'Something else?');
    expect(only().state).toBe('shown');
  });
});

describe('moved on (RD12, BR6.5, BR6.6, PD10, SD9)', () => {
  const triggers = {
    'a newer reply': () => reply('s1', 'A newer message.'),
    'a question': () => question('s1'),
    'an answered event': () => answered('s1'),
    'a keystroke': () => store.terminalInput('pty-s1', 'a'),
    'a paste': () => store.terminalInput('pty-s1', '\x1b[200~notes.md\x1b[201~'),
    Enter: () => store.terminalInput('pty-s1', '\r'),
    'an unknown sequence': () => store.terminalInput('pty-s1', '\x1bP>|xterm(1)\x1b\\')
  };
  const priors = {
    shown: () => reply(),
    queued: () => {
      start('s2', { tabId: 'agent:opencode' });
      question('s2');
      reply();
    },
    dismissed: () => {
      reply();
      store.close(replies()[0].eventId);
    }
  };
  const cases = Object.keys(triggers).flatMap((tr) => Object.keys(priors).map((pr) => [tr, pr]));

  it.each(cases)('%s takes a %s reply on in one synchronous call, with no pty write', (trigger, prior) => {
    start();
    priors[prior]();
    const old = replies()[0].eventId;
    pushes.length = 0;
    triggers[trigger]();
    const after = replies().find((e) => e.eventId === old);
    if (prior === 'shown') expect(after).toMatchObject({ state: 'stale', staleReason: 'movedOn' });
    else expect(after).toBeUndefined();
    expect(pushes.length).toBeGreaterThanOrEqual(1);
    expect(pushes[0].events.find((e) => e.eventId === old)?.state ?? 'gone').toBe(prior === 'shown' ? 'stale' : 'gone');
    expect(pty.write).not.toHaveBeenCalled();
  });

  it('terminal auto-responses keep the reply shown; input to a pty without an open reply pushes nothing (SD10)', () => {
    start();
    reply();
    pushes.length = 0;
    for (const data of ['\x1b[12;40R', '\x1b[0n', '\x1b[?1;2c', '\x1b]11;rgb:1e1e/1e1e/1e1e\x07', '\x1b[I', '\x1b[O', '\x1b[?2026;2$y'])
      store.terminalInput('pty-s1', data);
    expect(only().state).toBe('shown');
    expect(pushes).toEqual([]);
    start('s2', { tabId: 'agent:opencode' });
    pushes.length = 0;
    store.terminalInput('pty-s2', 'a');
    store.terminalInput('pty-unknown', 'a');
    expect(pushes).toEqual([]);
  });
});

describe('refused replies (RD11)', () => {
  const refusals = {
    'an over-limit reply file': () => channel.refuse({ sessionId: 's1', reason: 'too large' }),
    'a cut JSON body': () => send('s1', 'reply', stop('x').subarray(0, 10)),
    'no last message': () => send('s1', 'reply', Buffer.from('{"hook_event_name":"Stop"}'))
  };
  it.each(Object.keys(refusals))('%s takes a shown reply stale (notShown), a dismissed one away, and marks the strip', (name) => {
    start();
    reply();
    refusals[name]();
    expect(only()).toMatchObject({ state: 'stale', staleReason: 'notShown' });
    expect(store.latest('p1').status).toBe('notShown');
    store.close(only().eventId);
    reply('s1', 'Next.');
    store.close(only().eventId);
    refusals[name]();
    expect(replies()).toEqual([]);
  });

  it('an empty message is not a refusal: it is a reply with empty set', () => {
    start();
    reply('s1', '');
    expect(only()).toMatchObject({ state: 'shown', message: { empty: true } });
    expect(store.latest('p1').status).toBe('waiting');
  });
});

describe('tab exit, close and reopen (BR6.7, BR6.14, PD11)', () => {
  it('endSession takes a shown reply stale (sessionEnded), the strip to sessionEnded; questions end as before', () => {
    start('s1');
    reply('s1');
    start('s2', { tabId: 'agent:opencode' });
    question('s2');
    store.endSession('s1');
    expect(only()).toMatchObject({ state: 'stale', staleReason: 'sessionEnded' });
    expect(store.latest('p1').status).toBe('sessionEnded');
    store.endSession('s2');
    expect(store.list('p1').find((e) => e.kind === 'question')).toMatchObject({ state: 'ended', endedBy: 'session' });
  });

  it('endSession takes a queued or dismissed reply away', () => {
    start('s1');
    reply('s1');
    store.close(only().eventId);
    store.endSession('s1');
    expect(replies()).toEqual([]);
  });

  it('close on a shown reply dismisses it: no answer file, nothing typed, the strip unchanged; on a stale one it ends', async () => {
    start();
    reply();
    const before = store.latest('p1');
    await expect(store.close(only().eventId)).resolves.toEqual({ state: 'dismissed' });
    expect(only().state).toBe('dismissed');
    expect(channel.writeAnswer).not.toHaveBeenCalled();
    expect(pty.write).not.toHaveBeenCalled();
    expect(store.latest('p1')).toEqual(before);
    store.reopen(only().eventId);
    store.terminalInput('pty-s1', 'a');
    await store.close(only().eventId);
    expect(replies()).toEqual([]);
  });

  it('reopen shows a dismissed reply of a live session again in one call with one push', () => {
    start();
    reply();
    store.close(only().eventId);
    pushes.length = 0;
    expect(store.reopen(only().eventId)).toEqual({ state: 'shown' });
    expect(only().state).toBe('shown');
    expect(pushes).toHaveLength(1);
  });

  it('reopen refuses anything but a dismissed reply, changing nothing and logging one line (SD9, OD6)', () => {
    start('s1');
    start('s2', { tabId: 'agent:opencode' });
    question('s2');
    reply('s1'); // queued
    const queued = only().eventId;
    const q = store.list('p1').find((e) => e.kind === 'question').eventId;
    const check = (id, key) => {
      const n = logs.length;
      const states = JSON.stringify(store.list('p1'));
      expect(() => store.reopen(id)).toThrow(t(`agentDialog.errors.${key}`));
      expect(JSON.stringify(store.list('p1'))).toBe(states);
      expect(logs.length).toBe(n + 1);
    };
    check(queued, 'eventNotOpen');
    check(q, 'eventNotOpen');
    answered('s2'); // the reply is shown now
    check(queued, 'eventNotOpen');
    store.terminalInput('pty-s1', 'a'); // stale
    check(queued, 'eventNotOpen');
    check('nope', 'unknownEvent');
  });
});

describe('LatestMessage (BR6.15, SCD8, SD12, RD16)', () => {
  it('is null before any reply', () => {
    expect(store.latest('p1')).toBeNull();
  });

  it('keeps one per project, the newest by arrival then tab, whatever the file names', () => {
    const t0 = Date.now();
    start('a', { tabId: 'agent:a' });
    start('b', { tabId: 'agent:b' });
    start('c', { tabId: 'agent:c' });
    start('x', { projectId: 'p2', tabId: 'agent:x' });
    start('y', { projectId: 'p2', tabId: 'agent:y' });
    reply('a', 'A', { file: '1700000000-99999', arrivedAtMs: t0 + 20 });
    reply('b', 'B', { file: '1700000000-100000', arrivedAtMs: t0 + 10 });
    reply('c', 'C', { file: '1700000001-1', arrivedAtMs: t0 + 20 });
    reply('x', 'X', { arrivedAtMs: t0 + 5 });
    reply('y', 'Y', { arrivedAtMs: t0 + 1 });
    expect(store.latest('p1')).toMatchObject({ tabId: 'agent:c', text: 'C', status: 'waiting' });
    expect(store.latest('p2')).toMatchObject({ tabId: 'agent:x', text: 'X' });
  });

  it('returns exactly the eight C4 keys and never the session id', () => {
    start();
    reply();
    const l = store.latest('p1');
    expect(Object.keys(l).sort()).toEqual(['arrivedAt', 'empty', 'eventId', 'harness', 'status', 'tabId', 'text', 'truncated']);
    expect(JSON.stringify(l)).not.toContain('"s1"');
  });

  it('turns answered when the person types in the terminal', () => {
    start();
    reply();
    store.terminalInput('pty-s1', 'a');
    expect(store.latest('p1').status).toBe('answered');
  });
});

describe('pile-up (SCD6, K5)', () => {
  it('100 queued replies of one session leave 1 open; 100 shown ones leave at most 1 open and 1 stale', () => {
    start('s1');
    start('s2', { tabId: 'agent:opencode' });
    question('s2');
    for (let i = 0; i < 100; i++) reply('s1', `queued ${i}`);
    expect(replies().map((e) => e.state)).toEqual(['queued']);
    answered('s2');
    expect(replies().map((e) => e.state)).toEqual(['shown']);
    for (let i = 0; i < 100; i++) {
      reply('s1', `shown ${i}`);
      expect(replies().map((e) => e.state)).toEqual(['stale', 'shown']);
    }
    store.close(replies()[0].eventId);
    expect(replies().map((e) => e.state)).toEqual(['shown']);
  });
});

describe('quiet paths (OD8)', () => {
  it('accept, duplicate, dismiss, reopen, stale and close write nothing to the console', () => {
    const spies = ['log', 'info', 'warn', 'error'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    store.dispose();
    make({ log: undefined }); // the store's default logger is console.warn
    start();
    reply();
    reply();
    store.close(only().eventId);
    store.reopen(only().eventId);
    store.terminalInput('pty-s1', '\x1b[I');
    store.terminalInput('pty-s1', 'a');
    store.close(only().eventId);
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
