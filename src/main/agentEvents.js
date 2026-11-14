// US-0506 u1 FR1.4, FR1.5, FR3.1–FR3.6, FR6.1, components.md Option A: AgentEventStore (LC4). The open agent events
// of every project, their state machine (functional-spec.md), the answer check (SD4) and delivery: via the hook while
// it waits (RD2, RD3), else as keys once the agent's own picker shows (BR3.2). The renderer sends an event id and
// option indexes only; this store owns the check and every write (FR3.1). No Electron import.
//
// u1 deviation, by design: an accepted event goes straight to "shown". The pager in the dialog is the queue, and every
// open event is answerable from it, so "queued" is not used by u1.
import crypto from 'node:crypto';
import { t } from '../shared/i18n.js';
import { formatLog } from './agentChannel.js';

const SESSION_ENDED_MS = 3000; // "the session ended" stays visible this long (BR2.3)
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

/** The C3 fields the renderer may see: no raw input, no timer, no file name. The secret is never in an event. */
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
  'lastError',
  'via',
  'endedBy'
];
const view = (ev) => Object.fromEntries(PUBLIC.map((k) => [k, ev[k]]));
const byArrival = (a, b) => a.arrivedAtMs - b.arrivedAtMs || String(a.tabId ?? '').localeCompare(String(b.tabId ?? '')) || a.seq - b.seq;

/**
 * @param {{channel, adapters, pty: {write: Function, tapOutput: Function}, timing: {stamp: Function},
 *   contextOf?: (projectId) => object|null, auditEventsOf?: (projectId) => object[], log?: (line: string) => void}} deps
 */
export function createAgentEventStore({
  channel,
  adapters,
  pty,
  timing,
  contextOf = () => null,
  auditEventsOf = () => [],
  log = (line) => console.warn(line)
}) {
  const sessions = new Map(); // sessionId -> { projectId, tabId, harness, waitSeconds }
  const events = new Map(); // eventId -> event
  const changed = new Set();
  const added = new Set();
  let seq = 0;

  const list = (projectId) => {
    const own = [...events.values()].filter((e) => e.projectId === projectId).map(view);
    const live = [...sessions.values()].some((s) => s.projectId === projectId);
    return [...own, ...(live ? [] : auditEventsOf(projectId))].sort(byArrival); // BR2.7
  };
  const emit = (projectId) => {
    const payload = { projectId, events: list(projectId) };
    for (const fn of changed) fn(payload);
  };
  const logFor = (ev, reason) => log(formatLog(reason, { session: ev.sessionId, file: `${ev.file}.evt` }));

  /** The one transition: every change of state goes through here and pushes in the same turn (PD3). */
  function move(ev, state, patch = {}) {
    Object.assign(ev, { state, ...patch });
    if (state === 'ended') {
      clearTimeout(ev.timer);
      if (ev.endedBy === 'session') ev.removal = setTimeout(() => events.delete(ev.eventId) && emit(ev.projectId), SESSION_ENDED_MS);
      else events.delete(ev.eventId);
    }
    emit(ev.projectId);
  }
  const openOf = (sessionId) => [...events.values()].filter((e) => e.sessionId === sessionId && e.state !== 'ended');

  function addQuestion(raw, session, parsed) {
    for (const old of openOf(raw.sessionId)) move(old, 'ended', { endedBy: 'movedOn' }); // BR2.2, before the new one
    const ev = {
      eventId: `h${++seq}-${crypto.randomBytes(6).toString('hex')}`,
      sessionId: raw.sessionId,
      projectId: session.projectId,
      tabId: session.tabId,
      harness: session.harness,
      source: 'hook',
      kind: 'question',
      state: 'shown',
      arrivedAt: new Date(raw.arrivedAtMs).toISOString(),
      arrivedAtMs: raw.arrivedAtMs,
      seq: raw.seq,
      context: contextOf(session.projectId) ?? null, // BR2.5: context only, the options stay the agent's
      questions: parsed.questions,
      lastError: null,
      via: null,
      endedBy: null,
      file: raw.file,
      toolCallId: parsed.toolCallId,
      input: parsed.input
    };
    events.set(ev.eventId, ev);
    const due = raw.arrivedAtMs + session.waitSeconds * 1000 - Date.now();
    ev.timer = setTimeout(() => ev.state === 'shown' && move(ev, 'timedOut'), Math.max(0, due));
    emit(ev.projectId);
    timing.stamp(ev.eventId, ev.harness, 'hookReceived', raw.arrivedAtMs);
    for (const fn of added) fn(view(ev));
  }

  function onRaw(raw) {
    const session = sessions.get(raw.sessionId);
    const parsed = session && adapters[session.harness]?.parse(raw.kind, raw.body);
    if (!parsed) return; // an unknown session or kind is ignored (C1 ownership rules)
    if (!parsed.ok) {
      log(formatLog(`adapter refused: ${parsed.reason}`, { session: raw.sessionId, file: `${raw.file}.evt`, text: parsed.text }));
      // RD7: hand an unreadable waiting question back at once, so the agent's own picker shows now, not in 595 s.
      if (raw.kind === 'question') channel.writeAnswer({ sessionId: raw.sessionId, file: raw.file, text: '' }).catch(() => {});
      return;
    }
    if (parsed.kind === 'answered') {
      const open = openOf(raw.sessionId);
      const done = parsed.toolCallId ? open.filter((e) => e.toolCallId === parsed.toolCallId) : open; // BR2.3
      for (const ev of done) move(ev, 'ended', { endedBy: 'answered' });
      return;
    }
    addQuestion(raw, session, parsed);
  }
  channel.onRawEvent(onRaw);

  /** RD3: the hook still waits when its marker exists and the entry's own timeout has not passed. */
  async function hookWaits(ev) {
    const st = await channel.answerState(ev.sessionId, ev.file);
    return st.waiting && Date.now() - ev.arrivedAtMs < (sessions.get(ev.sessionId).waitSeconds + ENTRY_MARGIN_S) * 1000;
  }

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

  function refuse(ev, key, reason) {
    log(formatLog(reason, ev ? { session: ev.sessionId, file: `${ev.file}.evt` } : {}));
    return new Error(t(`agentDialog.errors.${key}`));
  }

  return {
    startSession({ sessionId, projectId, tabId, harness, waitSeconds }) {
      sessions.set(sessionId, { projectId, tabId, harness, waitSeconds });
      emit(projectId); // the project's audit questions give way to hook events (BR2.7)
    },
    /** RD5: every event of the session ends, nothing is written, and "the session ended" is pushed (FR6.4). */
    endSession(sessionId) {
      const s = sessions.get(sessionId);
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
    /** C4 agentEvents.close: hands a waiting question back with the empty answer file (BR3.5). */
    async close(eventId) {
      const ev = events.get(eventId);
      if (!ev || !OPEN.has(ev.state)) return { state: 'dismissed' };
      if (await hookWaits(ev)) await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text: '' }).catch(() => {});
      if (events.get(eventId) === ev && OPEN.has(ev.state)) move(ev, 'handedBack');
      return { state: 'handedBack' };
    },
    onChanged(fn) {
      changed.add(fn);
      return () => changed.delete(fn);
    },
    /** One call per accepted event, after the push (for u5's notifications). */
    onAdded(fn) {
      added.add(fn);
      return () => added.delete(fn);
    },
    dispose() {
      for (const ev of events.values()) {
        clearTimeout(ev.timer);
        clearTimeout(ev.removal);
      }
      events.clear();
    }
  };
}
