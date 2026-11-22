// US-0506 u1 LC4: AgentEventStore with a fake channel, a fake pty and fake timers (state machine, BR2, BR3; RD2, RD3,
// RD7, RD9; SD4; PD2, PD3; SCD2, SCD3; OD2, OD3).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createAgentEventStore } from '../../src/main/agentEvents.js';
import { adapters } from '../../src/main/agentAdapters.js';
import { t } from '../../src/shared/i18n.js';

const FIX = path.resolve(__dirname, '../fixtures/agent-events');
const body = (harness, name) => readFileSync(path.join(FIX, harness, `${name}.json`));
const SECRET = 'f'.repeat(64);
const err = (key, values) => t(`agentDialog.errors.${key}`, values);

function fakeChannel() {
  const listeners = [];
  const ch = {
    live: new Set(),
    emit: (raw) => listeners.forEach((fn) => fn(raw)),
    onRawEvent: (fn) => listeners.push(fn),
    isLive: vi.fn((sid) => ch.live.has(sid)),
    ptyOf: vi.fn((sid) => (ch.live.has(sid) ? `pty-${sid}` : null)),
    writeAnswer: vi.fn(async () => {}),
    answerState: vi.fn(async () => ({ folder: true, waiting: true, answerPresent: false, nack: false })),
    retract: vi.fn(async () => false)
  };
  return ch;
}
function fakePty() {
  const taps = new Set();
  return {
    taps,
    write: vi.fn(),
    tapOutput: vi.fn((id, fn) => {
      taps.add(fn);
      return () => taps.delete(fn);
    }),
    push: (chunk) => [...taps].forEach((fn) => fn(chunk))
  };
}

let channel, pty, timing, store, pushes, audit, logs, seq;
const make = (over = {}) => {
  store = createAgentEventStore({
    channel,
    adapters,
    pty,
    timing,
    contextOf: (projectId) => (projectId === 'p1' ? { intent: '261114-agent-dialogs', stage: 'code-generation' } : null),
    auditEventsOf: (projectId) => audit.filter((e) => e.projectId === projectId),
    log: (line) => logs.push(line),
    ...over
  });
  store.onChanged((change) => pushes.push(change));
  return store;
};
const start = (sessionId = 's1', { projectId = 'p1', harness = 'claude', tabId = `agent:${harness}`, waitSeconds = 595 } = {}) => {
  channel.live.add(sessionId);
  store.startSession({ sessionId, projectId, tabId, harness, waitSeconds });
};
const raw = (sessionId, file, { kind = 'question', harness = 'claude', fixture = 'gate-2026-11-14', arrivedAtMs = Date.now(), bytes } = {}) => {
  channel.emit({ sessionId, version: 'v1', kind, body: bytes ?? body(harness, fixture), file, arrivedAtMs, seq: ++seq });
  return store.list('p1').at(-1);
};
const open = (sid = 's1') => store.list('p1').filter((e) => e.sessionId === sid && e.state !== 'ended');
const one = (picks = [[0]], own = [null]) => ({ question: { picks, own } });

beforeEach(() => {
  vi.useFakeTimers();
  channel = fakeChannel();
  pty = fakePty();
  timing = { stamp: vi.fn() };
  pushes = [];
  audit = [];
  logs = [];
  seq = 0;
  make();
});
afterEach(() => {
  store.dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('order and lifecycle', () => {
  it('lists events from three sessions by arrival, then tab, then seq, never by name (NFR5.9, BR2.1, SCD2)', () => {
    start('s1', { tabId: 'agent:b' });
    start('s2', { tabId: 'agent:a' });
    start('s3', { tabId: 'agent:a' });
    const now = Date.now();
    raw('s1', '9-1', { arrivedAtMs: now + 50 });
    raw('s2', '10-2', { arrivedAtMs: now + 50 });
    raw('s3', '1-3', { arrivedAtMs: now });
    expect(store.list('p1').map((e) => e.sessionId)).toEqual(['s3', 's2', 's1']);
    start('s4', { tabId: 'agent:a' });
    raw('s4', '1-4', { arrivedAtMs: now + 50 });
    expect(store.list('p1').map((e) => e.sessionId)).toEqual(['s3', 's2', 's4', 's1']);
  });

  it('a second question from one session ends the first before the second is queued (NFR5.10, BR2.2)', () => {
    start();
    const first = raw('s1', '1-1');
    let opened = 0;
    store.onChanged(({ events }) => (opened = Math.max(opened, events.filter((e) => e.sessionId === 's1' && e.state !== 'ended').length)));
    raw('s1', '1-2', { fixture: 'reordered' });
    expect(open().map((e) => e.questions[0].header)).toEqual(['Database']);
    expect(store.list('p1').some((e) => e.eventId === first.eventId)).toBe(false);
    expect(opened).toBe(1);
  });

  it('answered with a matching tool call id, answered without one, and a pty exit each end the event in the same turn (NFR1.4, PD3, BR2.3)', () => {
    start();
    raw('s1', '1-1');
    const before = pushes.length;
    raw('s1', '1-2', { kind: 'answered', fixture: 'post-tool-use' });
    expect(pushes.length).toBe(before + 1);
    expect(open()).toEqual([]);

    raw('s1', '1-3');
    raw('s1', '1-4', { kind: 'answered', bytes: Buffer.from('{}') });
    expect(open()).toEqual([]);

    raw('s1', '1-5');
    raw('s1', '1-6', { kind: 'answered', bytes: Buffer.from('{"tool_use_id":"someone-else"}') });
    expect(open()).toHaveLength(1); // a named id that does not match closes nothing
  });

  it('endSession writes nothing, pushes the session-ended state, and drops the event after 3 s (NFR5.5, FR6.4)', () => {
    start();
    const ev = raw('s1', '1-1');
    store.endSession('s1');
    const shown = store.list('p1').find((e) => e.eventId === ev.eventId);
    expect(shown).toMatchObject({ state: 'ended', endedBy: 'session' });
    expect(pushes.at(-1).events.find((e) => e.eventId === ev.eventId).state).toBe('ended');
    vi.advanceTimersByTime(3000);
    expect(store.list('p1')).toEqual([]);
    expect(channel.writeAnswer).not.toHaveBeenCalled();
    expect(pty.write).not.toHaveBeenCalled();
  });

  it('marks a question timedOut at waitSeconds (NFR5.2, AC1.1.6)', () => {
    start('s1', { waitSeconds: 10 });
    const ev = raw('s1', '1-1');
    vi.advanceTimersByTime(9999);
    expect(store.list('p1')[0].state).toBe('shown');
    vi.advanceTimersByTime(1);
    expect(store.list('p1')[0]).toMatchObject({ eventId: ev.eventId, state: 'timedOut' });
  });

  it('ignores raw events of a session it does not know, and unknown kinds', () => {
    raw('nope', '1-1');
    start();
    raw('s1', '1-2', { kind: 'permission' });
    expect(store.list('p1')).toEqual([]);
  });

  it('adds AI-DLC context without touching the options (BR2.5, AC1.1.4)', () => {
    start();
    const ev = raw('s1', '1-1');
    expect(ev.context).toEqual({ intent: '261114-agent-dialogs', stage: 'code-generation' });
    expect(ev.questions[0].options.map((o) => o.label)).toEqual(['Complete workflow', 'Request Changes']);
  });
});

describe('the answer check (SD4, BR3.1)', () => {
  const refused = async (eventId, answer, key) => {
    await expect(store.answer(eventId, answer)).rejects.toThrow(err(key));
    expect(channel.writeAnswer).not.toHaveBeenCalled();
    expect(pty.write).not.toHaveBeenCalled();
  };

  it('refuses an unknown event and a fallback event', async () => {
    await refused('nope', one(), 'unknownEvent');
    await refused('audit-0123', one(), 'fallback');
  });

  it('refuses an event that is not open', async () => {
    start();
    const ev = raw('s1', '1-1');
    await store.close(ev.eventId);
    channel.writeAnswer.mockClear();
    await refused(ev.eventId, one(), 'eventNotOpen');
  });

  it('refuses an event whose session ended', async () => {
    start();
    const ev = raw('s1', '1-1');
    channel.live.delete('s1');
    await refused(ev.eventId, one(), 'sessionEnded');
  });

  it.each([
    ['wrong count', { question: { picks: [[0], [1]], own: [null, null] } }],
    ['index out of range', one([[2]])],
    ['two picks on single-select', one([[0, 1]])],
    ['no pick and no own text', one([[]])],
    ['a negative index', one([[-1]])],
    ['no question field', { picks: [[0]], own: [null] }]
  ])('refuses an answer that does not fit: %s', async (_name, answer) => {
    start();
    const ev = raw('s1', '1-1');
    await refused(ev.eventId, answer, 'doesNotFit');
  });

  it('refuses own text where the question does not allow it', async () => {
    start();
    const bytes = Buffer.from(JSON.stringify({ tool_input: { questions: [{ question: 'Q?', options: [{ label: 'A' }], custom: false }] } }));
    const ev = raw('s1', '1-1', { bytes });
    await refused(ev.eventId, one([[]], ['mine']), 'doesNotFit');
  });

  it('refuses a second answer, and logs one line per refusal (NFR3.10, NFR3.11)', async () => {
    start();
    const ev = raw('s1', '1-1');
    channel.answerState.mockResolvedValueOnce({ folder: true, waiting: true, answerPresent: false, nack: false });
    channel.answerState.mockResolvedValueOnce({ folder: true, waiting: false, answerPresent: false, nack: false });
    await expect(store.answer(ev.eventId, one())).resolves.toEqual({ state: 'sent', via: 'hook' });
    channel.writeAnswer.mockClear();
    await refused(ev.eventId, one(), 'eventNotOpen');
    expect(logs).toEqual([expect.stringMatching(/^\[agent-events\] event not open session=s1 file=1-1\.evt$/)]);
  });
});

describe('delivery via hook (RD2, RD3)', () => {
  const state = (o) => ({ folder: true, waiting: false, answerPresent: false, nack: false, ...o });
  const deliver = async (states, { retract = false, advance = 0 } = {}) => {
    start();
    const ev = raw('s1', '1-1');
    channel.answerState.mockResolvedValueOnce(state({ waiting: true }));
    for (const s of states) channel.answerState.mockResolvedValueOnce(s);
    channel.retract.mockResolvedValue(retract);
    const p = store.answer(ev.eventId, one([[1]]));
    p.catch(() => {});
    if (advance) await vi.advanceTimersByTimeAsync(advance);
    return { ev, p };
  };

  it('taken and finished: sent via hook, with the adapter output in the answer file', async () => {
    const { ev, p } = await deliver([state({})]);
    await expect(p).resolves.toEqual({ state: 'sent', via: 'hook' });
    const [{ sessionId, file, text }] = channel.writeAnswer.mock.calls[0];
    expect([sessionId, file]).toEqual(['s1', '1-1']);
    expect(JSON.parse(text).hookSpecificOutput.updatedInput.answers).toEqual({
      '**Code Generation** is complete for `u1-questions`. How would you like to proceed?': 'Request Changes'
    });
    expect(store.list('p1')[0]).toMatchObject({ eventId: ev.eventId, state: 'sent', via: 'hook' });
    expect(timing.stamp).toHaveBeenCalledWith(ev.eventId, 'claude', 'answerDelivered');
    expect(logs).toEqual([]);
  });

  it('taken, but the harness refused it (.nack): sent as keys after the picker shows', async () => {
    const { p } = await deliver([state({ nack: true })]);
    await vi.advanceTimersByTimeAsync(0);
    pty.push('Complete workflow\nRequest Changes');
    await expect(p).resolves.toEqual({ state: 'sent', via: 'keys' });
    expect(pty.write).toHaveBeenCalledWith('pty-s1', '2');
  });

  it('the hook gave up before taking it: the answer is retracted and sent as keys', async () => {
    const { p } = await deliver([state({ answerPresent: true })], { retract: true });
    await vi.advanceTimersByTimeAsync(0);
    pty.push('Complete workflow');
    await expect(p).resolves.toEqual({ state: 'sent', via: 'keys' });
    expect(channel.retract).toHaveBeenCalledWith('s1', '1-1');
  });

  it('the hook finished right after taking it (retract gets ENOENT): sent via hook', async () => {
    const { p } = await deliver([state({ answerPresent: true })], { retract: false });
    await expect(p).resolves.toEqual({ state: 'sent', via: 'hook' });
  });

  it('not taken within 1 s, retract wins: the send fails and the answer is kept', async () => {
    channel.answerState.mockResolvedValue(state({ waiting: true, answerPresent: true }));
    const { ev, p } = await deliver([], { retract: true, advance: 1100 });
    await expect(p).rejects.toThrow(err('notTaken'));
    expect(store.list('p1')[0]).toMatchObject({ eventId: ev.eventId, state: 'shown', lastError: err('notTaken') });
    expect(logs).toEqual([expect.stringContaining('send failed: the hook did not take the answer')]);
  });

  it('not taken within 1 s, but retract finds it gone: taken, reported sent', async () => {
    channel.answerState.mockResolvedValue(state({ waiting: true, answerPresent: true }));
    const { p } = await deliver([], { retract: false, advance: 1100 });
    await expect(p).resolves.toEqual({ state: 'sent', via: 'hook' });
  });

  it('the folder is removed during the poll: never reported sent via hook (R-04, u2 SD14)', async () => {
    const { p } = await deliver([state({ folder: false })]);
    channel.live.delete('s1');
    await expect(p).rejects.toThrow(err('sessionEnded'));
    expect(pty.write).not.toHaveBeenCalled();
  });

  it('chooses hook or keys from the marker and its age (RD3)', async () => {
    start('s1', { waitSeconds: 10 });
    // No marker: keys.
    let ev = raw('s1', '1-1');
    channel.answerState.mockResolvedValueOnce(state({ waiting: false }));
    let p = store.answer(ev.eventId, one());
    await vi.advanceTimersByTimeAsync(0);
    pty.push('Complete workflow');
    await expect(p).resolves.toEqual({ state: 'sent', via: 'keys' });
    expect(channel.writeAnswer).not.toHaveBeenCalled();

    // A marker older than waitSeconds + 5 s: keys (a hook killed by SIGKILL left it).
    ev = raw('s1', '1-2', { arrivedAtMs: Date.now() - 15_001 });
    channel.answerState.mockResolvedValueOnce(state({ waiting: true }));
    p = store.answer(ev.eventId, one());
    await vi.advanceTimersByTimeAsync(0);
    pty.push('Complete workflow');
    await expect(p).resolves.toEqual({ state: 'sent', via: 'keys' });
    expect(channel.writeAnswer).not.toHaveBeenCalled();

    // timedOut with the marker still there: the hook is still inside its last second, so via hook.
    ev = raw('s1', '1-3');
    vi.advanceTimersByTime(10_000);
    expect(store.list('p1').find((e) => e.eventId === ev.eventId).state).toBe('timedOut');
    channel.answerState.mockResolvedValueOnce(state({ waiting: true }));
    channel.answerState.mockResolvedValueOnce(state({}));
    await expect(store.answer(ev.eventId, one())).resolves.toEqual({ state: 'sent', via: 'hook' });
  });

  it('writeAnswer says the hook gave up: keys instead', async () => {
    start();
    const ev = raw('s1', '1-1');
    channel.writeAnswer.mockRejectedValueOnce(Object.assign(new Error('hook gave up'), { code: 'hookGaveUp' }));
    const p = store.answer(ev.eventId, one());
    await vi.advanceTimersByTimeAsync(0);
    pty.push('Complete workflow');
    await expect(p).resolves.toEqual({ state: 'sent', via: 'keys' });
  });

  it('the answer file cannot be written: failed with the cause, and a second Send succeeds (NFR5.6, BR3.4)', async () => {
    start();
    const ev = raw('s1', '1-1');
    channel.writeAnswer.mockRejectedValueOnce(Object.assign(new Error('cannot write the answer file: EACCES'), { code: 'cannotWrite' }));
    await expect(store.answer(ev.eventId, one())).rejects.toThrow(err('sendFailed', { cause: 'cannot write the answer file: EACCES' }));
    expect(store.list('p1')[0].state).toBe('shown');
    channel.answerState.mockResolvedValueOnce(state({ waiting: true }));
    channel.answerState.mockResolvedValueOnce(state({}));
    await expect(store.answer(ev.eventId, one())).resolves.toEqual({ state: 'sent', via: 'hook' });
    expect(store.list('p1')[0].lastError).toBeNull();
  });
});

describe('delivery via keys (BR3.2, PD2, K11)', () => {
  const viaKeys = (fixture = 'gate-2026-11-14', answer = one()) => {
    start();
    const ev = raw('s1', '1-1', { fixture });
    channel.answerState.mockResolvedValue({ folder: true, waiting: false, answerPresent: false, nack: false });
    const p = store.answer(ev.eventId, answer);
    p.catch(() => {});
    return { ev, p };
  };

  it('types the keys in the same tick as the chunk with the label, also split and coloured, never before', async () => {
    const { p } = viaKeys();
    await vi.advanceTimersByTimeAsync(0);
    pty.push('\x1b[1mSome output\x1b[0m Comp');
    expect(pty.write).not.toHaveBeenCalled();
    pty.push('\x1b[32mlete workflow');
    expect(pty.write).toHaveBeenCalledWith('pty-s1', '1');
    await expect(p).resolves.toEqual({ state: 'sent', via: 'keys' });
    expect(pty.taps.size).toBe(0);
  });

  it('writes nothing and fails with "the picker is not showing" at 3 s (NFR1.3)', async () => {
    const { ev, p } = viaKeys();
    await vi.advanceTimersByTimeAsync(2999);
    expect(pty.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).rejects.toThrow(err('pickerNotShowing'));
    expect(store.list('p1')[0]).toMatchObject({ eventId: ev.eventId, state: 'shown', lastError: err('pickerNotShowing') });
    expect(pty.taps.size).toBe(0);
  });

  it('a timed-out event stays timedOut after a failed send', async () => {
    start('s1', { waitSeconds: 1 });
    const ev = raw('s1', '1-1');
    vi.advanceTimersByTime(1000);
    channel.answerState.mockResolvedValue({ folder: true, waiting: false, answerPresent: false, nack: false });
    const p = store.answer(ev.eventId, one());
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(p).rejects.toThrow(err('pickerNotShowing'));
    expect(store.list('p1')[0].state).toBe('timedOut');
  });

  it('a batch or a multi-select answer as keys fails with the terminal sentence and keeps the answer', async () => {
    const { p } = viaKeys('batch-four', { question: { picks: [[0], [0], [0], [0]], own: [null, null, null, null] } });
    await expect(p).rejects.toThrow(err('answerInTerminal'));
    expect(pty.tapOutput).not.toHaveBeenCalled();
    expect(store.list('p1')[0].state).toBe('shown');
  });

  it('a session whose pty is gone fails as session ended', async () => {
    const { p } = viaKeys();
    channel.ptyOf.mockReturnValue(null);
    await expect(p).rejects.toThrow(err('sessionEnded'));
  });
});

describe('close and hand-back (BR3.5, RD7, NFR3.7)', () => {
  it('Close writes only the empty hand-back file and marks the event handedBack (NFR5.3, AC1.1.6)', async () => {
    start();
    const ev = raw('s1', '1-1');
    await expect(store.close(ev.eventId)).resolves.toEqual({ state: 'handedBack' });
    expect(channel.writeAnswer).toHaveBeenCalledTimes(1);
    expect(channel.writeAnswer).toHaveBeenCalledWith({ sessionId: 's1', file: '1-1', text: '' });
    expect(store.list('p1')[0].state).toBe('handedBack');
    expect(pty.write).not.toHaveBeenCalled();
  });

  it('Close with the marker gone writes nothing; an unknown event is dismissed', async () => {
    start();
    const ev = raw('s1', '1-1');
    channel.answerState.mockResolvedValueOnce({ folder: true, waiting: false, answerPresent: false, nack: false });
    await expect(store.close(ev.eventId)).resolves.toEqual({ state: 'handedBack' });
    expect(channel.writeAnswer).not.toHaveBeenCalled();
    await expect(store.close('nope')).resolves.toEqual({ state: 'dismissed' });
  });

  it('an unreadable waiting question writes the empty answer, logs its reason and pushes nothing (RD7, NFR2.3)', () => {
    start();
    const before = pushes.length;
    raw('s1', '1-1', { fixture: 'no-text' });
    expect(channel.writeAnswer).toHaveBeenCalledWith({ sessionId: 's1', file: '1-1', text: '' });
    expect(pushes.length).toBe(before);
    expect(store.list('p1')).toEqual([]);
    expect(logs).toEqual(['[agent-events] adapter refused: a question without text session=s1 file=1-1.evt']);
  });

  it('arrival, timedOut, Close and exit never write a non-empty text (NFR3.7)', async () => {
    start('s1', { waitSeconds: 1 });
    const a = raw('s1', '1-1');
    vi.advanceTimersByTime(1000);
    raw('s1', '1-2');
    await store.close(store.list('p1').at(-1).eventId);
    store.endSession('s1');
    expect(a.eventId).toBeTruthy();
    expect(channel.writeAnswer).toHaveBeenCalledTimes(1); // only the hand-back of the Close
    for (const [{ text }] of channel.writeAnswer.mock.calls) expect(text).toBe('');
    expect(pty.write).not.toHaveBeenCalled();
  });
});

describe('what leaves the store', () => {
  it('no list result and no push holds the secret, the raw input or the event file name (NFR3.2)', () => {
    start();
    raw('s1', '1-1', { bytes: Buffer.from(JSON.stringify({ tool_input: { questions: [{ question: 'Q?', options: [{ label: 'A' }] }], secret: SECRET } })) });
    const all = JSON.stringify([store.list('p1'), pushes]);
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain('"input"');
  });

  it('every minted id, hook and audit, is at most 64 characters (u5 amendment 6)', () => {
    start();
    for (let i = 0; i < 50; i++) expect(raw('s1', `1-${i}`).eventId.length).toBeLessThanOrEqual(64);
  });

  it('with no live session, list() returns the audit events; with one they are hidden (BR2.7, AC1.1.4)', () => {
    audit = [{ eventId: 'audit-1', projectId: 'p1', source: 'audit', arrivedAtMs: 1, tabId: null, seq: 0 }];
    expect(store.list('p1').map((e) => e.eventId)).toEqual(['audit-1']);
    start();
    raw('s1', '1-1');
    expect(store.list('p1').map((e) => e.source)).toEqual(['hook']);
    expect(store.list('p2')).toEqual([]);
  });

  it('the happy path writes nothing to the console (NFR3.12)', async () => {
    const spies = ['log', 'info', 'warn', 'error'].map((m) => vi.spyOn(console, m));
    store.dispose();
    make({ log: undefined });
    start();
    const ev = raw('s1', '1-1');
    channel.answerState.mockResolvedValueOnce({ folder: true, waiting: true, answerPresent: false, nack: false });
    channel.answerState.mockResolvedValueOnce({ folder: true, waiting: false, answerPresent: false, nack: false });
    await store.answer(ev.eventId, one());
    raw('s1', '1-2', { kind: 'answered', fixture: 'post-tool-use' });
    store.endSession('s1');
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('tells onAdded listeners once per accepted question, and stamps hookReceived from the file time', () => {
    const added = [];
    store.onAdded((ev) => added.push(ev.eventId));
    start();
    const ev = raw('s1', '1-1', { arrivedAtMs: 12345 });
    expect(store.harnessOf(ev.eventId)).toBe('claude');
    raw('s1', '1-2', { kind: 'answered', fixture: 'post-tool-use' });
    expect(added).toEqual([ev.eventId]);
    expect(timing.stamp).toHaveBeenCalledWith(ev.eventId, 'claude', 'hookReceived', 12345);
    expect(store.harnessOf(ev.eventId)).toBeNull();
    expect(ev.arrivedAt).toBe(new Date(12345).toISOString());
  });
});

// US-0213 FR1.3, FR1.5, FR5.1: report-only kinds are session signals, never pages.
describe('handoff signals (US-0213)', () => {
  const sig = (sessionId, kind, payload, harness = 'claude') =>
    raw(sessionId, `1700000000-${seq + 100}`, { kind, harness, bytes: Buffer.from(JSON.stringify(payload)) });

  it('session, notify, precompact and postcompact open no page and push nothing', () => {
    start();
    pushes.length = 0;
    sig('s1', 'session', { source: 'clear' });
    sig('s1', 'notify', { notification_type: 'idle_prompt' });
    sig('s1', 'precompact', { trigger: 'auto' });
    sig('s1', 'postcompact', { trigger: 'auto', compact_summary: 'x' });
    expect(store.list('p1')).toEqual([]);
    expect(pushes).toEqual([]);
  });

  it('a signal does not move an open reply on (only the person and the agent do)', () => {
    start();
    raw('s1', '1700000000-1', { kind: 'reply', bytes: Buffer.from(JSON.stringify({ last_assistant_message: 'Which one?' })) });
    sig('s1', 'notify', { notification_type: 'idle_prompt' });
    expect(store.list('p1')[0]).toMatchObject({ kind: 'reply', state: 'shown' });
  });

  it('keeps per session: the last stop, its background tasks and transcript, a notify, a running status and a waiting question', () => {
    start();
    vi.setSystemTime(1_000_000);
    raw('s1', '1700000000-2', {
      kind: 'reply',
      bytes: Buffer.from(JSON.stringify({ last_assistant_message: 'Done.', transcript_path: '/t/s.jsonl', background_tasks: [{ id: 1 }] }))
    });
    expect(store.signalsOf('s1')).toMatchObject({ lastStopMs: 1_000_000, backgroundTasks: true, transcriptPath: '/t/s.jsonl', busy: false, waiting: false });
    sig('s1', 'notify', { notification_type: 'permission_prompt' });
    expect(store.signalsOf('s1').notify).toBe('permission_prompt');
    raw('s1', '1700000000-3');
    expect(store.signalsOf('s1').waiting).toBe(true);
    store.terminalInput('pty-s1', 'x');
    expect(store.signalsOf('s1')).toMatchObject({ lastInputMs: 1_000_000, busy: true });
    expect(store.signalsOf('nope')).toBeNull();
  });

  it('opencode status busy and idle set busy; usage keeps the context size', () => {
    start('s2', { harness: 'opencode' });
    sig('s2', 'status', { data: { status: { type: 'busy' } } }, 'opencode');
    expect(store.signalsOf('s2').busy).toBe(true);
    sig('s2', 'status', { data: { status: { type: 'idle' } } }, 'opencode');
    expect(store.signalsOf('s2').busy).toBe(false);
    sig('s2', 'usage', { data: { tokens: { input: 1, cache: { read: 2, write: 3 } } } }, 'opencode');
    expect(store.signalsOf('s2').context).toEqual({ tokens: 6, model: null });
  });

  it('waitForSession resolves on a session event with that source, and false on timeout (FR3.2)', async () => {
    start();
    const ready = store.waitForSession('s1', ['clear'], 5000);
    sig('s1', 'session', { source: 'startup' });
    sig('s1', 'session', { source: 'clear' });
    await expect(ready).resolves.toBe(true);
    const late = store.waitForSession('s1', ['clear'], 5000);
    vi.advanceTimersByTime(5000);
    await expect(late).resolves.toBe(false);
  });

  it('US-0039 FR2.3: a postcompact counts as the session after a compaction (opencode has no SessionStart for it)', async () => {
    start('s2', { harness: 'opencode' });
    const ready = store.waitForSession('s2', ['compact'], 5000);
    sig('s2', 'postcompact', {}, 'opencode');
    await expect(ready).resolves.toBe(true);
  });

  it('onSignal tells every signal with its session, and a compaction is stamped (FR8.1)', () => {
    const seen = [];
    store.onSignal((s) => seen.push(s));
    start();
    vi.setSystemTime(2_000_000);
    sig('s1', 'postcompact', { trigger: 'manual' });
    expect(seen).toEqual([expect.objectContaining({ sessionId: 's1', projectId: 'p1', kind: 'postcompact', harness: 'claude' })]);
    expect(store.signalsOf('s1').compactedAtMs).toBe(2_000_000);
  });
});

// US-0213 FR3.1, US-0026 FR3.3: the handoff page is one more kind of page in the same pager.
describe('handoff pages (US-0213)', () => {
  const offer = { moment: 'threshold', tokens: 160_000, model: 'claude-opus-5-5', cost: 0.08, choices: ['compact', 'fresh', 'notNow'] };

  it('addHandoff shows one page per session, after questions; a newer one replaces it', () => {
    start();
    const id = store.addHandoff('s1', offer);
    raw('s1', '1700000000-9');
    const list = store.list('p1');
    expect(list.map((e) => e.kind)).toEqual(['question', 'handoff']);
    expect(list[1]).toMatchObject({ eventId: id, state: 'shown', handoff: offer, source: 'hook', tabId: 'agent:claude' });
    const id2 = store.addHandoff('s1', { ...offer, moment: 'gate' });
    expect(
      store
        .list('p1')
        .filter((e) => e.kind === 'handoff')
        .map((e) => e.eventId)
    ).toEqual([id2]);
    expect(store.handoffOf(id2)).toMatchObject({ sessionId: 's1', projectId: 'p1', harness: 'claude', handoff: { moment: 'gate' } });
  });

  it('close ends the page and tells onHandoffClosed (Not now); unknown sessions add nothing', async () => {
    const closed = [];
    store.onHandoffClosed((h) => closed.push(h.handoff.moment));
    start();
    const id = store.addHandoff('s1', offer);
    await store.close(id);
    expect(store.list('p1')).toEqual([]);
    expect(closed).toEqual(['threshold']);
    expect(store.addHandoff('nope', offer)).toBeNull();
  });

  it('setHandoff moves the page to waiting or ends it; the session’s end ends it too', () => {
    start();
    const id = store.addHandoff('s1', offer);
    store.setHandoff(id, 'waiting');
    expect(store.list('p1')[0].state).toBe('waiting');
    store.setHandoff(id, 'ended');
    expect(store.list('p1')).toEqual([]);
    store.addHandoff('s1', offer);
    store.endSession('s1');
    expect(store.list('p1').filter((e) => e.kind === 'handoff')).toEqual([]);
  });
});

// US-0214 FR1, FR2.3, NFR2: activity events are kept per project as rows, never as a page, and pushed within 2 s.
describe('activity (US-0214)', () => {
  const hook = (sessionId, payload, kind = 'activity') => raw(sessionId, `a${seq + 1}`, { kind, bytes: Buffer.from(JSON.stringify(payload)) });
  let activity;
  beforeEach(() => {
    activity = [];
    store.onActivity((change) => activity.push(change));
  });
  const latest = () => activity.at(-1)?.rows.map((r) => [r.kind, r.state, r.tool ?? r.reason ?? r.agentType]);

  it('turns an activity event into a row, never a page, and pushes it within 2 s', () => {
    start();
    hook('s1', { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 't1', tool_input: { command: 'npm test' } });
    expect(store.list('p1')).toEqual([]);
    expect(pushes).toEqual([expect.objectContaining({ events: [] })]); // only startSession's push
    vi.advanceTimersByTime(2000);
    expect(activity.at(-1).projectId).toBe('p1');
    expect(latest()).toEqual([['main', 'tool', 'Bash']]);
    expect(store.activity('p1')[0]).toMatchObject({ harness: 'claude', tabId: 'agent:claude' });
    expect(JSON.stringify(activity)).not.toContain('npm test');
  });

  it('shows a dispatched agent within 2 s of its start and drops it within 2 s of its end (FR2.3)', () => {
    start();
    hook('s1', { hook_event_name: 'SubagentStart', agent_id: 'ag1', agent_type: 'aidlc-developer-agent' });
    vi.advanceTimersByTime(2000);
    expect(latest()).toEqual([
      ['main', 'working', null],
      ['agent', 'working', 'aidlc-developer-agent']
    ]);
    hook('s1', { hook_event_name: 'SubagentStop', agent_id: 'ag1', agent_type: 'aidlc-developer-agent' });
    vi.advanceTimersByTime(2000);
    expect(latest()).toEqual([['main', 'working', null]]);
  });

  it('reads the existing kinds as activity too: a question waits, a Stop is idle', () => {
    start();
    raw('s1', 'q1');
    vi.advanceTimersByTime(2000);
    expect(latest()).toEqual([['main', 'waiting', 'question']]);
    hook('s1', { last_assistant_message: 'Done.' }, 'reply');
    vi.advanceTimersByTime(2000);
    expect(latest()).toEqual([['main', 'idle', null]]);
  });

  it('logs a refused activity event without handing anything back, and keeps no row', () => {
    start();
    hook('s1', { hook_event_name: 'TeammateIdle' });
    vi.advanceTimersByTime(2000);
    expect(logs.join('\n')).toContain('unknown activity event');
    expect(channel.writeAnswer).not.toHaveBeenCalled();
    expect(store.activity('p1')).toEqual([]);
  });

  it('pushes idle 30 s after the last event, and drops the rows when the session ends', () => {
    start();
    hook('s1', { hook_event_name: 'MessageDisplay', message_id: 'm', final: false });
    vi.advanceTimersByTime(2000);
    expect(latest()).toEqual([['main', 'writing', null]]);
    vi.advanceTimersByTime(30_000);
    expect(latest()).toEqual([['main', 'idle', null]]);
    store.endSession('s1');
    vi.advanceTimersByTime(2000);
    expect(activity.at(-1)).toEqual({ projectId: 'p1', rows: [] });
  });

  // US-0030 FR1.1, FR1.3, FR1.4: a subagent's permission is on its own row, and an answer in the app ends the wait.
  const asks = (extra) =>
    raw('s1', `p${seq + 1}`, { kind: 'permission', bytes: Buffer.from(JSON.stringify({ ...JSON.parse(body('claude', 'permission-bash')), ...extra })) });
  const dev = { agent_id: 'ag1', agent_type: 'aidlc-developer-agent' };

  it('feeds a subagent’s permission with its agent id: its row waits, main waits for it (FR1.1, FR1.4)', () => {
    start();
    hook('s1', { hook_event_name: 'SubagentStart', ...dev });
    asks(dev);
    vi.advanceTimersByTime(2000);
    expect(latest()).toEqual([
      ['main', 'waiting', 'agent'],
      ['agent', 'waiting', 'permission']
    ]);
    hook('s1', { hook_event_name: 'Notification', notification_type: 'permission_prompt', message: 'Claude needs your permission' }, 'notify');
    vi.advanceTimersByTime(2000);
    expect(latest()[0]).toEqual(['main', 'waiting', 'agent']); // the prompt's Notification is not main's own wait
  });

  it('an answer given in the app ends the wait on the row that asked (FR1.3)', async () => {
    start();
    hook('s1', { hook_event_name: 'SubagentStart', ...dev });
    const ev = asks(dev);
    const settled = store.answer(ev.eventId, { permission: { choice: 0 } });
    await vi.advanceTimersByTimeAsync(3000);
    await expect(settled).resolves.toMatchObject({ state: 'sent' });
    expect(latest()).toEqual([
      ['main', 'working', null],
      ['agent', 'working', 'aidlc-developer-agent']
    ]);
  });
});
