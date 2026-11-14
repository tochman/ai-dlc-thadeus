// US-0506 u2 LC4: permission events in AgentEventStore with the shared fakes, the real adapters and fake timers
// (AC2.1.1–AC2.1.4; BR5.4, BR5.6–BR5.12; SD8, SD10, SD11, SD13; RD10–RD12; PD9; SCD6, SCD10; OD6–OD8).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createAgentEventStore } from '../../src/main/agentEvents.js';
import { adapters, DENY_MESSAGE } from '../../src/main/agentAdapters.js';
import { t } from '../../src/shared/i18n.js';
import { fakeChannel, fakePty } from '../helpers/agentFakes.js';

const FIX = path.resolve(__dirname, '../fixtures/agent-events');
const body = (harness, name) => readFileSync(path.join(FIX, harness, `${name}.json`));
const err = (key, values) => t(`agentDialog.errors.${key}`, values);
const SRC = path.resolve(__dirname, '../../src/main');
const source = (name) => readFileSync(path.join(SRC, name), 'utf8');

const WAITING = { folder: true, waiting: true, answerPresent: false, nack: false };
const st = (over) => ({ ...WAITING, ...over });
const TAKEN = st({ waiting: false });

let channel, pty, timing, store, pushes, logs, audit, seq;
function make() {
  store = createAgentEventStore({
    channel,
    adapters,
    pty,
    timing,
    contextOf: () => ({ intent: '261114-agent-dialogs', stage: 'code-generation' }),
    auditEventsOf: (projectId) => audit.filter((e) => e.projectId === projectId),
    log: (line) => logs.push(line)
  });
  store.onChanged((change) => pushes.push(change));
}
const start = (sessionId = 's1', harness = 'claude', waitSeconds = 595) => {
  channel.live.add(sessionId);
  store.startSession({ sessionId, projectId: 'p1', tabId: `agent:${harness}`, harness, waitSeconds });
};
const emit = (sessionId, file, { kind = 'permission', harness = 'claude', fixture = 'permission-bash', bytes, arrivedAtMs = Date.now() } = {}) =>
  channel.emit({ sessionId, version: 'v1', kind, body: bytes ?? body(harness, fixture), file, arrivedAtMs, seq: ++seq });
const perm = (sessionId, file, opts) => {
  emit(sessionId, file, opts);
  return store.list('p1').find((e) => e.seq === seq); // the event this raw file became
};
const get = (id) => store.list('p1').find((e) => e.eventId === id);
const choose = (choice) => ({ permission: { choice } });
/** Starts an answer, runs the fake clock `ms`, and gives { value } or { error }. */
async function send(ev, answer = choose(0), ms = 6000) {
  const settled = store.answer(ev.eventId, answer).then(
    (value) => ({ value }),
    (error) => ({ error })
  );
  await vi.advanceTimersByTimeAsync(ms);
  return settled;
}
const noKeys = () => expect(pty.write).not.toHaveBeenCalled();

beforeEach(() => {
  vi.useFakeTimers();
  channel = fakeChannel();
  pty = fakePty();
  timing = { stamp: vi.fn() };
  pushes = [];
  logs = [];
  audit = [];
  seq = 0;
  make();
});
afterEach(() => {
  noKeys(); // SD13: no permission test ever types a key
  store.dispose();
  vi.useRealTimers();
});

describe('arrival (AC2.1.1, PD7, SD11)', () => {
  it('a Claude Code permission is listed shown with its permission and pushed in the same call', () => {
    start();
    const before = pushes.length;
    const ev = perm('s1', '1-1');
    expect(pushes.length).toBe(before + 1);
    expect(ev).toMatchObject({ kind: 'permission', state: 'shown', source: 'hook', harness: 'claude' });
    expect(ev.permission.what).toBe('Bash');
    expect(ev.permission.choices.map((c) => c.effect)).toEqual(['allowOnce', 'allowAlways', 'deny']);
    for (const c of ev.permission.choices) expect(Object.keys(c).sort()).toEqual(['effect', 'enabled', 'label', 'refuses']);
    expect(timing.stamp).toHaveBeenCalledWith(ev.eventId, 'claude', 'hookReceived', expect.any(Number));
  });

  it('no list and no push holds alwaysRules, permission_suggestions or a planted sentinel (NFR3.17)', () => {
    start();
    const planted = JSON.parse(body('claude', 'permission-bash'));
    planted.permission_suggestions[0].note = 'SENTINEL-7f3a';
    perm('s1', '1-1');
    perm('s1', '1-2', { bytes: Buffer.from(JSON.stringify(planted)) });
    const seen = JSON.stringify([store.list('p1'), pushes]);
    for (const word of ['alwaysRules', 'permission_suggestions', 'SENTINEL-7f3a', 'updatedPermissions']) expect(seen).not.toContain(word);
    expect(store.rulesHeld()).toBe(1); // only the first carried rules the dialog may offer
  });
});

describe('hand-back on arrival (RD11, NFR5.13, BR5.4)', () => {
  it.each([
    ['permission-no-tool', 'adapter refused: no tool name'],
    ['permission-input-string', 'adapter refused: tool input not an object'],
    ['permission-question-tool', 'handed back: question tool']
  ])('%s writes the empty answer before the emit returns, pushes nothing, logs one line', (fixture, line) => {
    start();
    const before = pushes.length;
    emit('s1', '2-1', { fixture });
    expect(channel.writeAnswer).toHaveBeenCalledWith({ sessionId: 's1', file: '2-1', text: '' });
    expect(pushes.length).toBe(before);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain(line);
  });

  it('a permission from a session the store does not know is ignored (K16)', () => {
    emit('unknown', '2-2');
    expect(channel.writeAnswer).not.toHaveBeenCalled();
    expect(store.list('p1')).toEqual([]);
  });
});

describe('the answer check (SD10, NFR3.15)', () => {
  it.each([
    ['a choice that is not an integer', choose(1.5)],
    ['a choice outside the list', choose(3)],
    ['a negative choice', choose(-1)],
    ['a key besides choice', { permission: { choice: 0, extra: 1 } }],
    ['a key besides permission', { permission: { choice: 0 }, question: {} }],
    ['a question-shaped answer', { question: { picks: [[0]], own: [null] } }],
    ['no answer', null]
  ])('refuses %s and writes nothing', async (_name, answer) => {
    start();
    const ev = perm('s1', '3-1');
    await expect(store.answer(ev.eventId, answer)).rejects.toThrow(err('doesNotFit'));
    expect(channel.writeAnswer).not.toHaveBeenCalled();
    expect(get(ev.eventId).state).toBe('shown');
  });

  it('refuses a disabled choice (a cut command cannot be allowed, BR5.5)', async () => {
    start();
    const big = JSON.parse(body('claude', 'permission-bash'));
    big.tool_input.command = 'x'.repeat(70_000);
    const ev = perm('s1', '3-2', { bytes: Buffer.from(JSON.stringify(big)) });
    await expect(store.answer(ev.eventId, choose(0))).rejects.toThrow(err('doesNotFit'));
    await expect(store.answer(ev.eventId, choose(1))).rejects.toThrow(err('doesNotFit'));
    expect(channel.writeAnswer).not.toHaveBeenCalled();
  });

  it('refuses an unknown event, an ended session and an ended event', async () => {
    start();
    const ev = perm('s1', '3-3');
    await expect(store.answer('nope', choose(0))).rejects.toThrow(err('unknownEvent'));
    channel.live.delete('s1');
    await expect(store.answer(ev.eventId, choose(0))).rejects.toThrow(err('sessionEnded'));
    store.endSession('s1');
    expect(get(ev.eventId)).toMatchObject({ state: 'ended', endedBy: 'session' });
    await expect(store.answer(ev.eventId, choose(0))).rejects.toThrow(err('eventNotOpen'));
    expect(channel.writeAnswer).not.toHaveBeenCalled();
  });

  it('refuses a timedOut, a sent and a handed-back permission', async () => {
    start();
    const timed = perm('s1', '3-4', { arrivedAtMs: Date.now() - 595_000 });
    await vi.advanceTimersByTimeAsync(1);
    expect(get(timed.eventId).state).toBe('timedOut');
    await expect(store.answer(timed.eventId, choose(0))).rejects.toThrow(err('eventNotOpen'));
    const sent = perm('s1', '3-5');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    expect((await send(sent, choose(0), 100)).value).toEqual({ state: 'sent', via: 'hook' });
    await expect(store.answer(sent.eventId, choose(0))).rejects.toThrow(err('eventNotOpen'));
    const back = perm('s1', '3-6');
    expect(await store.close(back.eventId)).toEqual({ state: 'handedBack' });
    await expect(store.answer(back.eventId, choose(0))).rejects.toThrow(err('unknownEvent'));
    expect(channel.writeAnswer.mock.calls.map((c) => c[0].text)).toEqual([expect.stringContaining('"behavior":"allow"'), '']);
  });

  it('a hook no longer waiting: refused as not open, timedOut with lastError, nothing written (R-05)', async () => {
    start();
    const ev = perm('s1', '3-7');
    channel.answerState.mockResolvedValueOnce(st({ waiting: false }));
    await expect(store.answer(ev.eventId, choose(0))).rejects.toThrow(err('eventNotOpen'));
    expect(get(ev.eventId)).toMatchObject({ state: 'timedOut', lastError: err('eventNotOpen') });
    expect(get(ev.eventId).permission.choices.every((c) => !c.enabled)).toBe(true);
    expect(channel.writeAnswer).not.toHaveBeenCalled();
  });

  it('two answers in the same tick give one sending and one event not open', async () => {
    start();
    const ev = perm('s1', '3-8');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    const first = send(ev, choose(0), 100);
    await expect(store.answer(ev.eventId, choose(2))).rejects.toThrow(err('eventNotOpen'));
    expect((await first).value.state).toBe('sent');
    expect(channel.writeAnswer).toHaveBeenCalledTimes(1);
  });
});

describe('delivery through the hook only (RD10)', () => {
  it('taken: sent via hook, answerDelivered stamped, the exact hook output written; Claude Code ends 3 s later', async () => {
    start();
    const ev = perm('s1', '4-1');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    expect((await send(ev, choose(2), 100)).value).toEqual({ state: 'sent', via: 'hook' });
    expect(JSON.parse(channel.writeAnswer.mock.calls[0][0].text)).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', interrupt: true, message: DENY_MESSAGE } }
    });
    expect(get(ev.eventId)).toMatchObject({ state: 'sent', via: 'hook' });
    expect(timing.stamp).toHaveBeenCalledWith(ev.eventId, 'claude', 'answerDelivered');
    await vi.advanceTimersByTimeAsync(3000);
    expect(get(ev.eventId)).toBeUndefined();
    expect(store.rulesHeld()).toBe(0);
  });

  it('Allow always writes the recorded suggestions as updatedPermissions', async () => {
    start();
    const ev = perm('s1', '4-2', { fixture: 'permission-bash-dirs' });
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    await send(ev, choose(1), 100);
    const out = JSON.parse(channel.writeAnswer.mock.calls[0][0].text);
    expect(out.hookSpecificOutput.decision.updatedPermissions).toEqual(JSON.parse(body('claude', 'permission-bash-dirs')).permission_suggestions);
  });

  it('.nack: timedOut "the agent refused the answer", with effect= on the log line only there', async () => {
    start();
    const ev = perm('s1', '4-3');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(st({ waiting: false, nack: true }));
    expect((await send(ev, choose(0), 100)).error.message).toBe(err('notTaken'));
    expect(get(ev.eventId)).toMatchObject({ state: 'timedOut', lastError: err('notTaken') });
    expect(logs).toEqual([expect.stringMatching(/send failed: the agent refused the answer effect=allowOnce session=s1 file=4-3\.evt$/)]);
  });

  it('.wait gone with .ans still there: retracted, timedOut, never sent (NFR5.16)', async () => {
    start();
    const ev = perm('s1', '4-4');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(st({ waiting: false, answerPresent: true }));
    channel.retract.mockResolvedValueOnce(true);
    expect((await send(ev, choose(0), 100)).error).toBeTruthy();
    expect(channel.retract).toHaveBeenCalledWith('s1', '4-4');
    expect(get(ev.eventId).state).toBe('timedOut');
    expect(logs.at(-1)).toContain('send failed: the hook stopped waiting');
    expect(logs.at(-1)).not.toContain('effect=');
  });

  it('the folder gone during the poll: timedOut, never sent (SD14 R-04)', async () => {
    start();
    const ev = perm('s1', '4-5');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(st({ folder: false, waiting: false }));
    expect((await send(ev, choose(0), 100)).error.message).toBe(err('sessionEnded'));
    expect(get(ev.eventId).state).toBe('timedOut');
  });

  it('nothing taken within 1 000 ms for Claude Code: retracted, back to shown with lastError while the hook waits', async () => {
    start();
    const ev = perm('s1', '4-6');
    channel.answerState.mockResolvedValue(st({ answerPresent: true }));
    channel.retract.mockResolvedValue(true);
    const settled = store.answer(ev.eventId, choose(0)).catch((e) => e);
    await vi.advanceTimersByTimeAsync(900);
    expect(get(ev.eventId).state).toBe('sending');
    await vi.advanceTimersByTimeAsync(200);
    expect((await settled).message).toBe(err('notTaken'));
    expect(get(ev.eventId)).toMatchObject({ state: 'shown', lastError: err('notTaken') });
  });

  it('nothing taken within the window and the hook gone by then: timedOut', async () => {
    start();
    const ev = perm('s1', '4-7');
    let gone = false; // the hook leaves just as the window ends: the marker decides, never the store's clock (R-05)
    channel.answerState.mockImplementation(async () => (gone ? st({ waiting: false }) : st({ answerPresent: true })));
    channel.retract.mockImplementation(async () => (gone = true));
    expect((await send(ev, choose(0), 1200)).error.message).toBe(err('notTaken'));
    expect(get(ev.eventId)).toMatchObject({ state: 'timedOut', lastError: err('notTaken') });
  });

  it('the opencode window is 5 000 ms, not 1 000', async () => {
    start('s2', 'opencode');
    const ev = perm('s2', '4-9', { harness: 'opencode', fixture: 'permission-asked-always' });
    channel.answerState.mockResolvedValue(st({ answerPresent: true }));
    channel.retract.mockResolvedValue(true);
    const settled = send(ev, choose(0), 1200);
    await vi.advanceTimersByTimeAsync(0);
    expect(get(ev.eventId).state).toBe('sending');
    await vi.advanceTimersByTimeAsync(4000);
    await settled;
    expect(get(ev.eventId).state).toBe('shown');
    expect(channel.writeAnswer.mock.calls[0][0].text).toBe('once');
  });

  it('retract finding nothing (ENOENT) means taken: sent', async () => {
    start();
    const ev = perm('s1', '4-10');
    channel.answerState.mockResolvedValue(st({ answerPresent: true }));
    channel.retract.mockResolvedValue(false);
    expect((await send(ev, choose(0), 1200)).value.state).toBe('sent');
  });

  it('writeAnswer failing with EACCES while .wait exists: shown with lastError, and a second Send succeeds (NFR5.20)', async () => {
    start();
    const ev = perm('s1', '4-11');
    channel.writeAnswer.mockRejectedValueOnce(Object.assign(new Error('cannot write the answer file: EACCES'), { code: 'cannotWrite' }));
    const first = await send(ev, choose(0), 100);
    expect(first.error.message).toBe(err('sendFailed', { cause: 'cannot write the answer file: EACCES' }));
    expect(get(ev.eventId)).toMatchObject({ state: 'shown', lastError: first.error.message });
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    expect((await send(ev, choose(0), 100)).value.state).toBe('sent');
  });

  it('writeAnswer failing while .wait is gone: timedOut', async () => {
    start();
    const ev = perm('s1', '4-12');
    channel.writeAnswer.mockRejectedValueOnce(Object.assign(new Error('cannot write the answer file: EACCES'), { code: 'cannotWrite' }));
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(st({ waiting: false }));
    await send(ev, choose(0), 100);
    expect(get(ev.eventId).state).toBe('timedOut');
  });

  it('a hook that gave up before the write (hookGaveUp): timedOut, never sent', async () => {
    start();
    const ev = perm('s1', '4-13');
    channel.writeAnswer.mockRejectedValueOnce(Object.assign(new Error('hook gave up'), { code: 'hookGaveUp' }));
    await send(ev, choose(0), 100);
    expect(get(ev.eventId).state).toBe('timedOut');
  });
});

describe('never on its own (SD8, SD13, NFR3.13, NFR3.19)', () => {
  it('arrival, the time-out, Close and a tab exit write only the empty answer or nothing', async () => {
    start();
    perm('s1', '5-1', { arrivedAtMs: Date.now() - 595_000 });
    const closed = perm('s1', '5-2');
    perm('s1', '5-3');
    await vi.advanceTimersByTimeAsync(10);
    await store.close(closed.eventId);
    store.endSession('s1');
    await vi.advanceTimersByTimeAsync(600_000);
    expect(channel.writeAnswer.mock.calls.every(([a]) => a.text === '')).toBe(true);
  });

  it('agentPermissions.js has no key sender and handBack takes the event only', () => {
    const src = source('agentPermissions.js');
    for (const word of [/\bpty\b/, /writeSession/, /tapOutput/, /sendViaKeys/]) expect(src).not.toMatch(word);
    expect(src).toMatch(/async function handBack\(ev\)/);
  });

  it('agentPermissions.js, agentEvents.js and agentIpc.js never move the OS focus (K18)', () => {
    for (const name of ['agentPermissions.js', 'agentEvents.js', 'agentIpc.js']) {
      const src = source(name);
      for (const word of ['.focus(', '.show(', 'moveTop']) expect(src, `${name} ${word}`).not.toContain(word);
    }
  });
});

describe('time-out (BR5.9, NFR5.15)', () => {
  it('at waitSeconds a shown permission is timedOut, every choice disabled, nothing written', async () => {
    start();
    const ev = perm('s1', '6-1');
    await vi.advanceTimersByTimeAsync(594_999);
    expect(get(ev.eventId).state).toBe('shown');
    await vi.advanceTimersByTimeAsync(2);
    expect(get(ev.eventId).state).toBe('timedOut');
    expect(get(ev.eventId).permission.choices.map((c) => c.enabled)).toEqual([false, false, false]);
    expect(channel.writeAnswer).not.toHaveBeenCalled();
  });

  it('a permission that is sending when the time runs out is left to its delivery (K10)', async () => {
    start();
    const ev = perm('s1', '6-2', { arrivedAtMs: Date.now() - 594_500 });
    channel.answerState.mockResolvedValue(st({ answerPresent: true }));
    const settled = send(ev, choose(0), 700);
    channel.answerState.mockResolvedValue(st({ answerPresent: true }));
    await vi.advanceTimersByTimeAsync(0);
    expect(get(ev.eventId).state).toBe('sending');
    channel.answerState.mockResolvedValue(TAKEN);
    expect((await settled).value.state).toBe('sent');
  });
});

describe('Close and Esc (BR5.10, NFR5.17, K10)', () => {
  it('on shown: the empty answer, handedBack, then ended at once', async () => {
    start();
    const ev = perm('s1', '7-1');
    expect(await store.close(ev.eventId)).toEqual({ state: 'handedBack' });
    expect(channel.writeAnswer).toHaveBeenCalledWith({ sessionId: 's1', file: '7-1', text: '' });
    const states = pushes.map((p) => p.events.find((e) => e.eventId === ev.eventId)?.state);
    expect(states.slice(-2)).toEqual(['handedBack', undefined]);
    expect(logs).toEqual([]); // a quiet path (OD8)
  });

  it('on timedOut: nothing written, ended', async () => {
    start();
    const ev = perm('s1', '7-2', { arrivedAtMs: Date.now() - 595_000 });
    await vi.advanceTimersByTimeAsync(1);
    expect(await store.close(ev.eventId)).toEqual({ state: 'dismissed' });
    expect(get(ev.eventId)).toBeUndefined();
    expect(channel.writeAnswer).not.toHaveBeenCalled();
  });

  it('during sending: dismissed, nothing written, and the delivery outcome still shows', async () => {
    start();
    const ev = perm('s1', '7-3');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(WAITING).mockResolvedValue(TAKEN);
    const settled = send(ev, choose(0), 200);
    expect(await store.close(ev.eventId)).toEqual({ state: 'dismissed' });
    await settled;
    expect(get(ev.eventId).state).toBe('sent');
    expect(channel.writeAnswer).toHaveBeenCalledTimes(1);
  });
});

describe('opencode answered (PD9, NFR1.11, BR5.11, OD6)', () => {
  const replied = () => emit('s2', '8-9', { kind: 'answered', harness: 'opencode', fixture: 'permission-replied' });
  const ask = (file) => perm('s2', file, { harness: 'opencode', fixture: 'permission-asked-always' });

  it('for a shown permission: ended by the terminal, pushed before the call returns, kept 3 s', async () => {
    start('s2', 'opencode');
    const ev = ask('8-1');
    const before = pushes.length;
    replied();
    expect(pushes.length).toBe(before + 1);
    expect(get(ev.eventId)).toMatchObject({ state: 'ended', endedBy: 'terminal' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(get(ev.eventId)).toBeUndefined();
    expect(timing.stamp).not.toHaveBeenCalledWith(ev.eventId, 'opencode', 'agentConfirmed');
  });

  it('for a sending permission: ended with one agentConfirmed; a later .nack changes nothing visible', async () => {
    start('s2', 'opencode');
    const ev = ask('8-2');
    channel.answerState
      .mockResolvedValueOnce(WAITING)
      .mockResolvedValueOnce(WAITING)
      .mockResolvedValue(st({ waiting: false, nack: true }));
    const settled = send(ev, choose(1), 0);
    await vi.advanceTimersByTimeAsync(0);
    replied();
    await vi.advanceTimersByTimeAsync(200);
    await settled;
    expect(get(ev.eventId)).toBeUndefined();
    expect(timing.stamp.mock.calls.filter((c) => c[2] === 'agentConfirmed')).toEqual([[ev.eventId, 'opencode', 'agentConfirmed']]);
    expect(channel.writeAnswer.mock.calls[0][0].text).toBe('always');
  });

  it('for a sent permission: ended with one agentConfirmed; Claude Code never stamps it', async () => {
    start('s2', 'opencode');
    const ev = ask('8-3');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    await send(ev, choose(2), 100);
    expect(channel.writeAnswer.mock.calls[0][0].text).toBe('reject');
    expect(get(ev.eventId).state).toBe('sent');
    replied();
    expect(get(ev.eventId)).toBeUndefined();
    start();
    const cc = perm('s1', '8-4');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    await send(cc, choose(0), 100);
    expect(timing.stamp.mock.calls.filter((c) => c[2] === 'agentConfirmed')).toHaveLength(1);
  });
});

describe('several per session (SCD6, NFR5.21, K12)', () => {
  it('three permissions are three pages; answering the second writes only its file; a later question ends none', async () => {
    start();
    const evs = ['9-1', '9-2', '9-3'].map((f) => perm('s1', f));
    expect(store.list('p1').filter((e) => e.kind === 'permission' && e.state === 'shown')).toHaveLength(3);
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    await send(evs[1], choose(0), 100);
    expect(channel.writeAnswer.mock.calls.map((c) => c[0].file)).toEqual(['9-2']);
    emit('s1', '9-4', { kind: 'question', fixture: 'gate-2026-11-14' });
    expect(evs.map((e) => get(e.eventId)?.state)).toEqual(['shown', 'sent', 'shown']);
    expect(store.list('p1').filter((e) => e.kind === 'question')).toHaveLength(1);
  });

  it('a newer event ends a timedOut permission and no other; an answered without a tool call id ends no permission', async () => {
    start();
    const old = perm('s1', '9-5', { arrivedAtMs: Date.now() - 595_000 });
    await vi.advanceTimersByTimeAsync(1);
    const open = perm('s1', '9-6');
    expect(get(old.eventId)).toBeUndefined();
    emit('s1', '9-7', { kind: 'question', fixture: 'gate-2026-11-14' });
    emit('s1', '9-8', { kind: 'answered', bytes: Buffer.from('{}') });
    expect(get(open.eventId).state).toBe('shown');
    expect(store.list('p1').filter((e) => e.kind === 'question')).toEqual([]);
  });
});

describe('tab exit (NFR5.18, RD12)', () => {
  it('three permissions in different states all end by session and nothing is written after', async () => {
    start();
    const shown = perm('s1', '10-2');
    const sending = perm('s1', '10-3');
    channel.answerState.mockResolvedValue(st({ answerPresent: true }));
    const settled = send(sending, choose(0), 0);
    const timed = perm('s1', '10-1', { arrivedAtMs: Date.now() - 595_000 }); // last, so no newer event ends it (K12)
    await vi.advanceTimersByTimeAsync(1);
    expect([shown, sending, timed].map((e) => get(e.eventId).state)).toEqual(['shown', 'sending', 'timedOut']);
    const writes = channel.writeAnswer.mock.calls.length;
    store.endSession('s1');
    channel.live.delete('s1');
    for (const e of [timed, shown, sending]) expect(get(e.eventId)).toMatchObject({ state: 'ended', endedBy: 'session' });
    channel.answerState.mockResolvedValue(st({ folder: false, waiting: false }));
    await vi.advanceTimersByTimeAsync(2000);
    await settled;
    expect(channel.writeAnswer.mock.calls.length).toBe(writes);
    expect(store.rulesHeld()).toBe(0);
  });
});

describe('order (AC2.1.4, BR5.12)', () => {
  it('a permission after an open question follows it, and a reply that arrived first sorts after both', async () => {
    start('s1');
    start('s3'); // another tab of the project: a permission from the same session would end the question (K12)
    const now = Date.now();
    emit('s1', '11-1', { kind: 'question', fixture: 'gate-2026-11-14', arrivedAtMs: now + 10 });
    perm('s3', '11-2', { arrivedAtMs: now + 20 });
    store.endSession('s1'); // the ended pages stay 3 s; the project's audit events are listed again
    store.endSession('s3');
    audit.push({ eventId: 'reply-a', projectId: 'p1', kind: 'reply', tabId: 'agent:a', arrivedAtMs: now, seq: 0 });
    expect(store.list('p1').map((e) => e.kind)).toEqual(['question', 'permission', 'reply']);
  });
});

describe('logs (OD7, OD8)', () => {
  it('one line per refused answer, none on the quiet paths, never a secret or a rule line', async () => {
    start();
    const ev = perm('s1', '12-1');
    channel.answerState.mockResolvedValueOnce(WAITING).mockResolvedValueOnce(TAKEN);
    await send(ev, choose(1), 100);
    expect(logs).toEqual([]);
    await expect(store.answer(ev.eventId, choose(1))).rejects.toThrow();
    await expect(store.answer('nope', choose(1))).rejects.toThrow();
    expect(logs).toHaveLength(2);
    for (const line of logs) {
      expect(line.startsWith('[agent-events] ')).toBe(true);
      expect(line).not.toContain('git push');
      expect(line).not.toMatch(/[0-9a-f]{64}/);
    }
    expect(logs[0]).toMatch(/event not open session=s1 file=12-1\.evt$/);
  });
});
