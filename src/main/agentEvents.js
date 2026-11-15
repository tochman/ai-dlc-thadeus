// US-0506 u1 FR1.4, FR1.5, FR3.1–FR3.6, FR6.1, components.md Option A: AgentEventStore (LC4). The open agent events
// of every project, their state machine (functional-spec.md), the answer check (SD4) and delivery: via the hook while
// it waits (RD2, RD3), else as keys once the agent's own picker shows (BR3.2). The renderer sends an event id and
// option indexes only; this store owns the check and every write (FR3.1). No Electron import.
//
// US-0506 u2 (K1, K12, K13): permission events are dispatched by kind to agentPermissions.js, which gets no key
// sender. A newer event ends the session's older questions and its timedOut permissions only, never a permission whose
// hook still waits (SCD6). The pager order is byPager (SCD9).
//
// u1 deviation, by design: an accepted question goes straight to "shown". The pager in the dialog is the queue, and
// every open event is answerable from it, so "queued" is used only by u3's replies (K4).
// US-0506 u3: replies live in agentReplies.js (K3); this file only dispatches to it.
// US-0506 u5 D2, D5: `settings` (main's copy, settingsNow) decides a reply's state at arrival; onAdded feeds notify.js.
import crypto from 'node:crypto';
import { t } from '../shared/i18n.js';
import { byPager } from '../shared/agentOrder.js';
import { formatLog, WAITING } from './agentChannel.js';
import { createPermissions } from './agentPermissions.js';
import { createReplies } from './agentReplies.js';

// "the session ended", "answered in the terminal" (BR2.3, BR5.11) and a typed reply's "sent" line (u3 K6) stay this long
const ENDED_MS = 3000;
const KEPT = new Set(['session', 'terminal', 'typed']);
const PICKER_WAIT_MS = 3000; // C2 picker readiness
const TAKE_MS = 1000; // RD2 step 4
const POLL_MS = 25;
const ENTRY_MARGIN_S = 5; // waitSeconds + 5 s is the hook entry's own timeout (RD3)
const BUFFER_MAX = 65_536;
const OPEN = new Set(['shown', 'timedOut']);
// CSI, OSC and two-character escape sequences, so a label wrapped in colour codes is still seen (RD3).
// eslint-disable-next-line no-control-regex -- matching terminal escape sequences is the point
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]/g;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A delivery failure: the translated sentence for the person, the English cause for the log (OD2). */
class SendFailure extends Error {
  constructor(key, cause, values) {
    super(t(`agentDialog.errors.${key}`, values));
    this.cause = cause;
  }
}
const FAIL = {
  sessionEnded: () => new SendFailure('sessionEnded', 'session ended'),
  pickerNotShowing: () => new SendFailure('pickerNotShowing', "the agent's picker is not showing"),
  notTaken: () => new SendFailure('notTaken', 'the hook did not take the answer'),
  answerInTerminal: () => new SendFailure('answerInTerminal', 'answer in the terminal (no key sequence)'),
  sendFailed: (cause) => new SendFailure('sendFailed', cause, { cause })
};

/** SD4: one entry per question, indexes inside the options, one pick for single-select, own text only where allowed. */
function fits(ev, answer) {
  const a = answer?.question;
  if (!a || !Array.isArray(a.picks) || !Array.isArray(a.own)) return false;
  if (a.picks.length !== ev.questions.length || a.own.length !== ev.questions.length) return false;
  return ev.questions.every((q, i) => {
    const picks = a.picks[i];
    const own = a.own[i];
    if (!Array.isArray(picks) || !picks.every((n) => Number.isInteger(n) && n >= 0 && n < q.options.length)) return false;
    if (new Set(picks).size !== picks.length) return false;
    if (own !== null && typeof own !== 'string') return false;
    if (typeof own === 'string' && own.length > 0) return q.allowOwn && picks.length === 0;
    return q.multiSelect ? picks.length >= 1 : picks.length === 1;
  });
}

/** The C3 fields the renderer may see: no raw input, no timer, no file name, no alwaysRules. The secret is never in an event. */
const PUBLIC = [
  'eventId',
  'sessionId',
  'projectId',
  'tabId',
  'harness',
  'source',
  'kind',
  'state',
  'arrivedAt',
  'arrivedAtMs',
  'seq',
  'context',
  'questions',
  'permission',
  'message', // u3
  'staleReason', // u3
  'lastError',
  'via',
  'endedBy'
];
const view = (ev) => Object.fromEntries(PUBLIC.map((k) => [k, ev[k]]));

/**
 * @param {{channel, adapters, pty: {write: Function, tapOutput: Function}, timing: {stamp: Function},
 *   contextOf?: (projectId) => object|null, auditEventsOf?: (projectId) => object[], log?: (line: string) => void,
 *   settings?: () => object}} deps
 */
export function createAgentEventStore({
  channel,
  adapters,
  pty,
  timing,
  contextOf = () => null,
  auditEventsOf = () => [],
  log = (line) => console.warn(line),
  settings = () => ({})
}) {
  const sessions = new Map(); // sessionId -> { projectId, tabId, harness, waitSeconds }
  const events = new Map(); // eventId -> event
  const changed = new Set();
  const added = new Set();
  let seq = 0;
  const newId = () => `h${++seq}-${crypto.randomBytes(6).toString('hex')}`;

  const list = (projectId) => {
    const own = [...events.values()].filter((e) => e.projectId === projectId).map(view);
    const live = [...sessions.values()].some((s) => s.projectId === projectId);
    return [...own, ...(live ? [] : auditEventsOf(projectId))].sort(byPager); // BR2.7, BR5.12
  };
  const emit = (projectId) => {
    replies.promote(projectId); // u3 BR6.8: queued replies show once no question is open
    const payload = { projectId, events: list(projectId) };
    for (const fn of changed) fn(payload);
  };
  const logFor = (ev, reason) => log(formatLog(reason, { session: ev.sessionId, file: `${ev.file}.evt` }));

  /** The one transition: every change of state goes through here and pushes in the same turn (PD3). */
  function move(ev, state, patch = {}) {
    Object.assign(ev, { state, ...patch });
    if (state === 'ended') {
      clearTimeout(ev.timer);
      permissions.endEvent(ev.eventId);
      if (KEPT.has(ev.endedBy)) {
        clearTimeout(ev.removal);
        ev.removal = setTimeout(() => events.delete(ev.eventId) && emit(ev.projectId), ENDED_MS);
      } else events.delete(ev.eventId);
    }
    emit(ev.projectId);
  }
  const openOf = (sessionId) => [...events.values()].filter((e) => e.sessionId === sessionId && e.kind !== 'reply' && e.state !== 'ended');

  function refuse(ev, key, reason) {
    log(formatLog(reason, ev ? { session: ev.sessionId, file: `${ev.file}.evt` } : {}));
    return new Error(t(`agentDialog.errors.${key}`));
  }

  const replies = createReplies({
    events,
    sessions,
    move,
    emit,
    channel,
    pty,
    timing,
    log,
    refuse,
    newId,
    contextOf,
    settings,
    notifyAdded: (ev) => {
      for (const fn of added) fn(view(ev));
    }
  });

  /** RD3: the hook still waits when its marker exists and the entry's own timeout has not passed. */
  async function hookWaits(ev) {
    const s = sessions.get(ev.sessionId);
    if (!s) return false;
    const st = await channel.answerState(ev.sessionId, ev.file);
    return st.waiting && Date.now() - ev.arrivedAtMs < (s.waitSeconds + ENTRY_MARGIN_S) * 1000;
  }

  const permissions = createPermissions({ channel, adapters, timing, move, hookWaits, sessionOf: (id) => sessions.get(id), log });

  /** K12: what a newer event of the session ends. A permission ends only once it timed out (SCD6). */
  const endsOnNewer = (e) => e.kind === 'question' || (e.kind === 'permission' && e.state === 'timedOut');

  function addEvent(raw, session, parsed) {
    for (const old of openOf(raw.sessionId).filter(endsOnNewer)) move(old, 'ended', { endedBy: 'movedOn' }); // BR2.2
    const ev = {
      eventId: newId(),
      sessionId: raw.sessionId,
      projectId: session.projectId,
      tabId: session.tabId,
      harness: session.harness,
      source: 'hook',
      kind: parsed.kind,
      state: 'shown',
      arrivedAt: new Date(raw.arrivedAtMs).toISOString(),
      arrivedAtMs: raw.arrivedAtMs,
      seq: raw.seq,
      context: contextOf(session.projectId) ?? null, // BR2.5: context only, the options stay the agent's
      questions: parsed.questions,
      permission: parsed.permission,
      lastError: null,
      via: null,
      endedBy: null,
      file: raw.file,
      toolCallId: parsed.toolCallId,
      input: parsed.input
    };
    events.set(ev.eventId, ev);
    if (ev.kind === 'permission') permissions.add(ev, parsed);
    const due = raw.arrivedAtMs + session.waitSeconds * 1000 - Date.now();
    const timeout = ev.kind === 'permission' ? () => permissions.timeout(ev) : () => ev.state === 'shown' && move(ev, 'timedOut');
    ev.timer = setTimeout(timeout, Math.max(0, due));
    emit(ev.projectId);
    timing.stamp(ev.eventId, ev.harness, 'hookReceived', raw.arrivedAtMs);
    for (const fn of added) fn(view(ev));
  }

  /** BR2.3, K12: an answered event ends its match of either kind; without a tool call id, the open questions only. */
  function onAnswered(sessionId, toolCallId) {
    const open = openOf(sessionId);
    const done = toolCallId ? open.filter((e) => e.toolCallId === toolCallId) : open.filter((e) => e.kind === 'question');
    for (const ev of done) {
      if (ev.kind === 'permission') permissions.answered(ev);
      else move(ev, 'ended', { endedBy: 'answered' });
    }
  }

  function onRaw(raw) {
    const session = sessions.get(raw.sessionId);
    const parsed = session && adapters[session.harness]?.parse(raw.kind, raw.body);
    if (!parsed) return; // an unknown session or kind is ignored (C1 ownership rules)
    if (!parsed.ok) {
      const reason = parsed.reason === 'question tool' ? 'handed back: question tool' : `adapter refused: ${parsed.reason}`;
      log(formatLog(reason, { session: raw.sessionId, file: `${raw.file}.evt`, text: parsed.text }));
      // RD7, RD11: hand an unreadable waiting event back at once, so the agent's own prompt shows now, not in 595 s.
      if (WAITING.has(raw.kind)) channel.writeAnswer({ sessionId: raw.sessionId, file: raw.file, text: '' }).catch(() => {});
      if (raw.kind === 'reply') replies.refused(raw.sessionId); // u3 RD11
      return;
    }
    if (parsed.kind === 'reply') return replies.add(raw, session, parsed);
    replies.moveOn(raw.sessionId, 'movedOn'); // u3 BR6.5: any newer event of the session
    if (parsed.kind === 'answered') return onAnswered(raw.sessionId, parsed.toolCallId);
    addEvent(raw, session, parsed);
  }
  channel.onRawEvent(onRaw);
  channel.onRefusedReply?.(({ sessionId }) => replies.refused(sessionId)); // u3 RD11

  /** RD2: write, then watch the markers. Returns 'hook' when taken, null to send as keys instead; throws a SendFailure. */
  async function sendViaHook(ev, text) {
    try {
      await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text });
    } catch (err) {
      if (err.code === 'hookGaveUp') return null;
      throw err.code === 'sessionEnded' ? FAIL.sessionEnded() : FAIL.sendFailed(err.message);
    }
    for (const end = Date.now() + TAKE_MS; Date.now() < end; await sleep(POLL_MS)) {
      const st = await channel.answerState(ev.sessionId, ev.file);
      if (!st.folder || !channel.isLive(ev.sessionId)) return null; // R-04: never "sent" for a folder that is gone
      if (!st.waiting && !st.answerPresent) return st.nack ? null : 'hook';
      if (!st.waiting) return (await channel.retract(ev.sessionId, ev.file)) ? null : 'hook';
    }
    if (await channel.retract(ev.sessionId, ev.file)) throw FAIL.notTaken();
    // ponytail: taken but not finished within 1 s is reported sent. For dialog.sh the gap is one cat; for opencode it
    // is session.form.reply, so a reply that takes over 1 s and then fails shows "Sent" while opencode's form is still
    // open. A SIGKILL right after the take is the same gap. Raise TAKE_MS for opencode if the manual run shows slow replies.
    return 'hook';
  }

  /** BR3.2: types the keys only after the event's first option label shows in that pty's output, within 3 s. */
  function sendViaKeys(ev, keys, label) {
    if (!keys) return Promise.reject(FAIL.answerInTerminal());
    const ptyId = channel.ptyOf(ev.sessionId);
    if (!ptyId) return Promise.reject(FAIL.sessionEnded());
    return new Promise((resolve, reject) => {
      let seen = '';
      let off = () => {};
      const timer = setTimeout(() => {
        off();
        reject(FAIL.pickerNotShowing());
      }, PICKER_WAIT_MS);
      off = pty.tapOutput(ptyId, (chunk) => {
        seen = (seen + chunk).slice(-BUFFER_MAX);
        if (!seen.replace(ANSI, '').includes(label)) return;
        off();
        clearTimeout(timer);
        try {
          pty.write(ptyId, keys); // the same turn as the chunk that showed the label (PD2)
          resolve('keys');
        } catch (err) {
          reject(FAIL.sendFailed(err.message));
        }
      });
    });
  }

  async function deliver(ev, answer) {
    const adapter = adapters[ev.harness];
    if (await hookWaits(ev)) {
      const via = await sendViaHook(ev, adapter.answerText(ev, answer));
      if (via) return via;
    }
    return sendViaKeys(ev, adapter.keys(ev, answer), adapter.pickerLabel(ev));
  }

  return {
    startSession({ sessionId, projectId, tabId, harness, waitSeconds }) {
      sessions.set(sessionId, { projectId, tabId, harness, waitSeconds });
      emit(projectId); // the project's audit questions give way to hook events (BR2.7)
    },
    /** RD5: every event of the session ends, nothing is written, and "the session ended" is pushed (FR6.4). */
    endSession(sessionId) {
      const s = sessions.get(sessionId);
      replies.endSession(sessionId); // u3 BR6.7: a shown reply goes stale and keeps its text
      sessions.delete(sessionId);
      for (const ev of openOf(sessionId)) move(ev, 'ended', { endedBy: 'session' });
      if (s) emit(s.projectId);
    },
    list,
    harnessOf: (eventId) => events.get(eventId)?.harness ?? null,
    /** C4 agentEvents.answer: SD4 check and the move to sending in one synchronous step, then delivery. */
    async answer(eventId, answer) {
      const ev = events.get(eventId);
      if (!ev) throw refuse(null, String(eventId).startsWith('audit-') ? 'fallback' : 'unknownEvent', 'unknown event');
      if (ev.kind === 'permission') return permissions.answer(ev, answer);
      if (ev.kind === 'reply') return replies.answer(ev, answer); // u3 BR6.10–BR6.12
      if (!OPEN.has(ev.state)) throw refuse(ev, 'eventNotOpen', 'event not open');
      if (!channel.isLive(ev.sessionId) || !sessions.has(ev.sessionId)) throw refuse(ev, 'sessionEnded', 'session ended');
      if (!fits(ev, answer)) throw refuse(ev, 'doesNotFit', 'answer does not fit the event');
      const back = ev.state;
      move(ev, 'sending', { lastError: null });
      try {
        const via = await deliver(ev, answer.question);
        if (events.get(eventId) === ev && ev.state === 'sending') move(ev, 'sent', { via });
        timing.stamp(eventId, ev.harness, 'answerDelivered');
        return { state: 'sent', via };
      } catch (err) {
        const sentence = err instanceof SendFailure ? err.message : t('agentDialog.errors.sendFailed', { cause: err.message });
        logFor(ev, `send failed: ${err instanceof SendFailure ? err.cause : err.message}`);
        if (events.get(eventId) === ev && ev.state === 'sending') move(ev, back, { lastError: sentence }); // BR3.4, RD9
        throw new Error(sentence);
      }
    },
    /** C4 agentEvents.close: hands a waiting question back with the empty answer file (BR3.5); permissions: BR5.10;
     * dismisses a reply (u3). */
    async close(eventId) {
      const ev = events.get(eventId);
      if (ev?.kind === 'permission') return permissions.close(ev);
      if (ev?.kind === 'reply') return replies.close(ev);
      if (!ev || !OPEN.has(ev.state)) return { state: 'dismissed' };
      if (await hookWaits(ev)) await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text: '' }).catch(() => {});
      if (events.get(eventId) === ev && OPEN.has(ev.state)) move(ev, 'handedBack');
      return { state: 'handedBack' };
    },
    /** u3 C2 terminalInput: the person's input to a pty moves that tab's open reply on (BR6.6, SD10). */
    terminalInput: (ptyId, data) => replies.terminalInput(ptyId, data),
    /** u3 C4 agentEvents.reopen. */
    reopen: (eventId) => replies.reopen(eventId),
    /** u3 C4 agentEvents.latest. */
    latest: (projectId) => replies.latest(projectId),
    onChanged(fn) {
      changed.add(fn);
      return () => changed.delete(fn);
    },
    /** One call per accepted event, after the push (for u5's notifications). */
    onAdded(fn) {
      added.add(fn);
      return () => added.delete(fn);
    },
    /** SCD10: how many events still hold the agent's Allow always rules (0 once every permission has ended). */
    rulesHeld: () => permissions.rulesHeld(),
    dispose() {
      replies.dispose();
      for (const ev of events.values()) {
        clearTimeout(ev.timer);
        clearTimeout(ev.removal);
      }
      events.clear();
    }
  };
}
