// US-0506 u3 LC4, LC5: typed delivery of a reply's answer (BR6.10–BR6.12, RD13, RD14, K1, K6, K9; SD8, SD9; PD9;
// NFR1.9, NFR3.15, NFR3.16, NFR3.19, NFR5.15, NFR5.16; AC3.1.1). Fake pty recording write(id, data), fake timers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentEventStore } from '../../src/main/agentEvents.js';
import { ENTER_GAP_MS } from '../../src/main/agentReplies.js';
import { adapters } from '../../src/main/agentAdapters.js';
import { t } from '../../src/shared/i18n.js';

const SECRET = 'f'.repeat(64);
const err = (key, values) => t(`agentDialog.errors.${key}`, values);
const stop = (text) => Buffer.from(JSON.stringify({ hook_event_name: 'Stop', last_assistant_message: text }));
const answerOf = (text) => ({ reply: { text } });

function fakeChannel() {
  const listeners = [];
  const ch = {
    live: new Set(),
    emit: (raw) => listeners.forEach((fn) => fn(raw)),
    onRawEvent: (fn) => listeners.push(fn),
    onRefusedReply: () => {},
    isLive: vi.fn((sid) => ch.live.has(sid)),
    ptyOf: vi.fn((sid) => (ch.live.has(sid) ? `pty-${sid}` : null)),
    writeAnswer: vi.fn(async () => {}),
    answerState: vi.fn(async () => ({ folder: true, waiting: true, answerPresent: false, nack: false })),
    retract: vi.fn(async () => false)
  };
  return ch;
}

let channel, pty, timing, store, logs, seq;
const start = (sid = 's1', projectId = 'p1') => {
  channel.live.add(sid);
  store.startSession({ sessionId: sid, projectId, tabId: `agent:${sid}`, harness: 'claude', waitSeconds: 595 });
};
const reply = (sid = 's1', text = 'Which name should the file have?') =>
  channel.emit({ sessionId: sid, version: 'v1', kind: 'reply', body: stop(text), file: `1700000000-${++seq}`, arrivedAtMs: Date.now(), seq });
const ev = (sid = 's1') => store.list('p1').find((e) => e.kind === 'reply' && e.sessionId === sid);
const settle = (p) =>
  p.then(
    (v) => ({ ok: v }),
    (e) => ({ error: e.message })
  );

beforeEach(() => {
  vi.useFakeTimers();
  channel = fakeChannel();
  pty = { write: vi.fn(), tapOutput: vi.fn(() => () => {}) };
  timing = { stamp: vi.fn() };
  logs = [];
  seq = 0;
  store = createAgentEventStore({ channel, adapters, pty, timing, log: (line) => logs.push(line) });
});
afterEach(() => {
  store.dispose();
  vi.useRealTimers();
});

describe('a typed answer (BR6.12, K1)', () => {
  it('writes the text at once, then exactly one Enter after the gap; sent, typed, lingers 3 s; the strip says answered', async () => {
    start();
    reply();
    const id = ev().eventId;
    const done = store.answer(id, answerOf('notes.md'));
    expect(pty.write.mock.calls).toEqual([['pty-s1', 'notes.md']]);
    expect(ev().state).toBe('sending');
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS);
    expect(pty.write.mock.calls).toEqual([
      ['pty-s1', 'notes.md'],
      ['pty-s1', '\r']
    ]);
    await expect(done).resolves.toEqual({ state: 'sent', via: 'typed' });
    expect(ev()).toMatchObject({ state: 'ended', via: 'typed', endedBy: 'typed' });
    expect(store.latest('p1').status).toBe('answered');
    const delivered = timing.stamp.mock.calls.findIndex((c) => c[2] === 'answerDelivered');
    expect(timing.stamp.mock.invocationCallOrder[delivered]).toBeGreaterThan(pty.write.mock.invocationCallOrder[1]);
    await vi.advanceTimersByTimeAsync(3000);
    expect(ev()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1000);
    expect(pty.write).toHaveBeenCalledTimes(2);
  });

  it('writes only to the asking tab of two (NFR3.15)', async () => {
    start('s1');
    start('s2');
    reply('s1');
    reply('s2', 'Other?');
    const done = store.answer(ev('s2').eventId, answerOf('yes'));
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS);
    await done;
    expect(pty.write.mock.calls.map((c) => c[0])).toEqual(['pty-s2', 'pty-s2']);
  });

  it('types cleanLine(text) and then only Enter: no bidi override, no CR LF reaches the pty (BR6.11, SD8)', async () => {
    start();
    reply();
    const done = store.answer(ev().eventId, answerOf(`no‮te\r\ns.md`));
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS);
    await done;
    expect(pty.write.mock.calls).toEqual([
      ['pty-s1', 'note  s.md'],
      ['pty-s1', '\r']
    ]);
  });
});

describe('refusals, each with no write (BR6.10, SD9, K9, review R-03)', () => {
  it('unknown, not open, session ended and audit events are refused with their C4 sentence', async () => {
    start();
    await expect(store.answer('nope', answerOf('x'))).rejects.toThrow(err('unknownEvent'));
    await expect(store.answer('audit-1', answerOf('x'))).rejects.toThrow(err('fallback'));
    reply();
    await store.close(ev().eventId); // dismissed
    await expect(store.answer(ev().eventId, answerOf('x'))).rejects.toThrow(err('eventNotOpen'));
    store.reopen(ev().eventId);
    store.terminalInput('pty-s1', 'a'); // stale
    await expect(store.answer(ev().eventId, answerOf('x'))).rejects.toThrow(err('eventNotOpen'));
    reply('s1', 'Again?');
    channel.live.delete('s1'); // the channel says the session is gone
    const newest = store.list('p1').find((e) => e.state === 'shown');
    await expect(store.answer(newest.eventId, answerOf('x'))).rejects.toThrow(err('sessionEnded'));
    expect(pty.write).not.toHaveBeenCalled();
  });

  it('a queued reply is not open', async () => {
    start('s1');
    start('s2');
    channel.emit({
      sessionId: 's2',
      version: 'v1',
      kind: 'question',
      body: Buffer.from(JSON.stringify({ tool_input: { questions: [{ question: 'Q?', options: [{ label: 'A' }] }] } })),
      file: '1-1',
      arrivedAtMs: Date.now(),
      seq: 99
    });
    reply('s1');
    expect(ev().state).toBe('queued');
    await expect(store.answer(ev().eventId, answerOf('x'))).rejects.toThrow(err('eventNotOpen'));
    expect(pty.write).not.toHaveBeenCalled();
  });

  it.each([
    ['empty after cleaning', '\x1b\x07'],
    ['whitespace only', '\n  \t'],
    ['65 537 cleaned bytes', 'a'.repeat(65_537)],
    ['not a string', 42]
  ])('%s: "answer does not fit the event"', async (_name, text) => {
    start();
    reply();
    await expect(store.answer(ev().eventId, answerOf(text))).rejects.toThrow(err('doesNotFit'));
    expect(ev().state).toBe('shown');
    expect(pty.write).not.toHaveBeenCalled();
  });

  it('65 536 cleaned bytes are written', async () => {
    start();
    reply();
    const done = store.answer(ev().eventId, answerOf('a'.repeat(65_536)));
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS);
    await done;
    expect(pty.write.mock.calls[0][1]).toHaveLength(65_536);
  });

  it('a second answer while sending is refused and adds no write (BR6.10)', async () => {
    start();
    reply();
    const first = store.answer(ev().eventId, answerOf('one'));
    await expect(store.answer(ev().eventId, answerOf('two'))).rejects.toThrow(err('eventNotOpen'));
    expect(() => store.reopen(ev().eventId)).toThrow(err('eventNotOpen')); // reopen refuses sending
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS);
    await first;
    expect(() => store.reopen(ev().eventId)).toThrow(err('eventNotOpen')); // and the ended, lingering reply
    expect(pty.write.mock.calls).toEqual([
      ['pty-s1', 'one'],
      ['pty-s1', '\r']
    ]);
  });
});

describe('in the gap (K1)', () => {
  const cancels = {
    'a keystroke in that terminal': () => store.terminalInput('pty-s1', 'x'),
    'a newer reply of the session': () => reply('s1', 'Newer.'),
    'the session ending': () => store.endSession('s1')
  };
  it.each(Object.keys(cancels))('%s cancels the Enter for good, makes the reply stale and rejects the answer', async (name) => {
    start();
    reply();
    const id = ev().eventId;
    const done = settle(store.answer(id, answerOf('notes.md')));
    cancels[name]();
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS * 10);
    expect(await done).toEqual({ error: err('enterSkipped') });
    expect(pty.write.mock.calls).toEqual([['pty-s1', 'notes.md']]);
    expect(store.list('p1').find((e) => e.eventId === id).state).toBe('stale');
  });

  it('a terminal auto-response does not cancel it', async () => {
    start();
    reply();
    const done = store.answer(ev().eventId, answerOf('notes.md'));
    store.terminalInput('pty-s1', '\x1b[12;40R');
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS);
    await expect(done).resolves.toEqual({ state: 'sent', via: 'typed' });
    expect(pty.write).toHaveBeenLastCalledWith('pty-s1', '\r');
  });

  it('dispose during the gap writes no Enter', async () => {
    start();
    reply();
    void settle(store.answer(ev().eventId, answerOf('notes.md')));
    store.dispose();
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS * 10);
    expect(pty.write).toHaveBeenCalledTimes(1);
  });
});

describe('failures keep the answer (RD14)', () => {
  it('ptyOf null at Send: "session ended", nothing written', async () => {
    start();
    reply();
    channel.ptyOf.mockReturnValueOnce(null);
    await expect(store.answer(ev().eventId, answerOf('notes.md'))).rejects.toThrow(err('sessionEnded'));
    expect(pty.write).not.toHaveBeenCalled();
    expect(ev().state).toBe('shown');
  });

  it('a throwing text write: "send failed", no Enter, back to shown with lastError; a second Send succeeds', async () => {
    start();
    reply();
    pty.write.mockImplementationOnce(() => {
      throw new Error('EIO');
    });
    await expect(store.answer(ev().eventId, answerOf('notes.md'))).rejects.toThrow(err('sendFailed', { cause: 'EIO' }));
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS * 2);
    expect(pty.write).toHaveBeenCalledTimes(1);
    expect(ev()).toMatchObject({ state: 'shown', lastError: err('sendFailed', { cause: 'EIO' }) });
    const again = store.answer(ev().eventId, answerOf('notes.md'));
    await vi.advanceTimersByTimeAsync(ENTER_GAP_MS);
    await expect(again).resolves.toEqual({ state: 'sent', via: 'typed' });
  });

  it('logs one [agent-events] line per refusal and failure, never the secret (OD6)', async () => {
    start();
    reply();
    await store.answer(ev().eventId, answerOf('\n')).catch(() => {});
    pty.write.mockImplementationOnce(() => {
      throw new Error('EIO');
    });
    await store.answer(ev().eventId, answerOf('x')).catch(() => {});
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatch(/^\[agent-events\] answer does not fit the event session=s1 file=\S+\.evt$/);
    expect(logs[1]).toMatch(/^\[agent-events\] send failed: EIO session=s1/);
    expect(logs.join('')).not.toContain(SECRET);
  });
});
