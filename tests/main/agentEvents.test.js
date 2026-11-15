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
