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
import { SIGNAL_KINDS } from './agentAdapters.js';
import { IDLE_MS, activityRows, dropSession, emptyActivity, reduceActivity } from '../shared/agentActivity.js';

// US-0214 FR2.3: activity pushes are gathered for this long, well inside the 2 s the rows may lag.
const ACTIVITY_PUSH_MS = 250;
/**
 * US-0214 FR1.1: what the dialog kinds already reported say about activity (a Notification of idle_prompt is not a wait).
 * US-0030 FR1.1, FR1.4: a permission waits on the row of the agent that asked; the permission_prompt Notification that
 * follows it carries no agent id, so it is not read as main's own wait (the PermissionRequest already put the wait there).
 */
const KIND_ACTIVITY = {
  reply: () => ({ name: 'stop' }),
  session: () => ({ name: 'stop' }),
  question: () => ({ name: 'waiting', reason: 'question' }),
  permission: (parsed) => ({ name: 'waiting', reason: 'permission', agentId: parsed.agentId ?? null, agentType: parsed.agentType ?? null }),
  answered: () => ({ name: 'answered' }),
  notify: (parsed) => (parsed.type === 'idle_prompt' || parsed.type === 'permission_prompt' ? null : { name: 'waiting', reason: 'notification' }),
  activity: (parsed) => parsed.activity
};

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
  'endedBy',
  'handoff' // US-0213: the handoff page's offer (moment, size, cost, choices); no session id, no file
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
      input: parsed.input,
      agentId: parsed.agentId ?? null // US-0030 FR1.3: whose wait an answer in the app ends; main only, never public
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

  // --- US-0213 FR1.3, FR1.5, FR5.1, FR8.1: session signals for the handoff, kept per session, never a page ---------
  const signals = new Map(); // sessionId -> signal state
  const signalFns = new Set();
  const readyWaits = new Set(); // { sessionId, sources, resolve, timer }
  const handoffClosed = new Set();
  const signalOf = (sessionId) => {
    if (!signals.has(sessionId))
      signals.set(sessionId, {
        lastStopMs: null,
        lastInputMs: null,
        busy: false,
        notify: null,
        backgroundTasks: null,
        transcriptPath: null,
        context: null,
        compactedAtMs: null
      });
    return signals.get(sessionId);
  };
  function recordSignal(raw, session, parsed) {
    const s = signalOf(raw.sessionId);
    const now = Date.now();
    if (parsed.kind === 'reply') Object.assign(s, { lastStopMs: now, busy: false, notify: null, ...(parsed.signals ?? {}) });
    else if (parsed.kind === 'notify') s.notify = parsed.type;
    else if (parsed.kind === 'status') s.busy = parsed.busy;
    else if (parsed.kind === 'usage') s.context = parsed.context;
    else if (parsed.kind === 'postcompact') {
      s.compactedAtMs = now;
      // US-0039 FR2.3: opencode reports no SessionStart after a compaction, so the postcompact ends the wait.
      for (const w of readyWaits) if (w.sessionId === raw.sessionId && w.sources.includes('compact')) w.resolve(true);
    } else if (parsed.kind === 'session') {
      Object.assign(s, { busy: false, context: null });
      if (parsed.source === 'compact') s.compactedAtMs ??= now; // the fallback when PostCompact is absent
      for (const w of readyWaits) if (w.sessionId === raw.sessionId && w.sources.includes(parsed.source)) w.resolve(true);
    }
    const note = { sessionId: raw.sessionId, projectId: session.projectId, tabId: session.tabId, harness: session.harness, kind: parsed.kind, parsed };
    for (const fn of signalFns) fn(note);
  }

  // --- US-0214 FR2, FR3: activity rows per project, from the activity kind and the kinds above; never a page ----------
  let activityState = emptyActivity();
  const activityFns = new Set();
  const activityTimers = new Map(); // projectId -> { push, idle }
  const activityOf = (projectId) => activityRows(activityState, Date.now()).filter((r) => sessions.get(r.sessionId)?.projectId === projectId);
  const timersOf = (projectId) => {
    if (!activityTimers.has(projectId)) activityTimers.set(projectId, { push: null, idle: null });
    return activityTimers.get(projectId);
  };
  function pushActivity(projectId) {
    const t = timersOf(projectId);
    t.push ??= setTimeout(() => {
      t.push = null;
      const change = { projectId, rows: activityOf(projectId) };
      for (const fn of activityFns) fn(change);
    }, ACTIVITY_PUSH_MS);
  }
  function feedActivity(raw, session, parsed) {
    const fields = KIND_ACTIVITY[parsed.kind]?.(parsed);
    if (fields) feedFields(raw.sessionId, session, fields, Number.isFinite(raw.arrivedAtMs) ? raw.arrivedAtMs : Date.now());
  }
  function feedFields(sessionId, session, fields, atMs) {
    activityState = reduceActivity(activityState, { ...fields, sessionId, tabId: session.tabId, harness: session.harness, atMs });
    pushActivity(session.projectId);
    const t = timersOf(session.projectId);
    clearTimeout(t.idle);
    t.idle = setTimeout(() => pushActivity(session.projectId), IDLE_MS); // A3: the quiet row turns idle
  }

  function onRaw(raw) {
    const session = sessions.get(raw.sessionId);
    const parsed = session && adapters[session.harness]?.parse(raw.kind, raw.body);
    if (!parsed) return; // an unknown session or kind is ignored (C1 ownership rules)
    if (parsed.ok) feedActivity(raw, session, parsed);
    if (parsed.ok && parsed.kind === 'activity') return; // US-0214: never a page, never moves a reply on
    if (parsed.ok && (SIGNAL_KINDS.has(parsed.kind) || parsed.kind === 'reply')) recordSignal(raw, session, parsed);
    if (parsed.ok && SIGNAL_KINDS.has(parsed.kind)) return; // US-0213: never a page, never moves a reply on
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
      signals.delete(sessionId); // US-0213; its handoff page goes at once, there is nothing left to send to
      for (const ev of [...events.values()]) if (ev.kind === 'handoff' && ev.sessionId === sessionId) move(ev, 'ended', { endedBy: 'movedOn' });
      for (const w of readyWaits) if (w.sessionId === sessionId) w.resolve(false);
      for (const ev of openOf(sessionId)) move(ev, 'ended', { endedBy: 'session' });
      activityState = dropSession(activityState, sessionId); // US-0214: its tab's rows go
      if (s) {
        emit(s.projectId);
        pushActivity(s.projectId);
      }
    },
    /** US-0214 FR2, FR3: the activity rows of a project now (main chats, their agents). */
    activity: activityOf,
    /** US-0214 FR2.3: { projectId, rows } within ACTIVITY_PUSH_MS of a change, and again when a row turns idle. */
    onActivity(fn) {
      activityFns.add(fn);
      return () => activityFns.delete(fn);
    },
    list,
    harnessOf: (eventId) => events.get(eventId)?.harness ?? null,
    /** C4 agentEvents.answer: SD4 check and the move to sending in one synchronous step, then delivery. */
    async answer(eventId, answer) {
      const ev = events.get(eventId);
      if (!ev) throw refuse(null, String(eventId).startsWith('audit-') ? 'fallback' : 'unknownEvent', 'unknown event');
      if (ev.kind === 'permission') {
        const result = await permissions.answer(ev, answer);
        const session = sessions.get(ev.sessionId);
        // US-0030 FR1.3: the answer ends the wait on the row that asked, before the agent's next hook event arrives
        if (result?.state === 'sent' && session) feedFields(ev.sessionId, session, { name: 'answered', agentId: ev.agentId }, Date.now());
        return result;
      }
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
      if (ev?.kind === 'handoff') {
        move(ev, 'ended', { endedBy: 'closed' }); // US-0213 FR6.2: Close is Not now
        for (const fn of handoffClosed) fn(ev);
        return { state: 'dismissed' };
      }
      if (ev?.kind === 'permission') return permissions.close(ev);
      if (ev?.kind === 'reply') return replies.close(ev);
      if (!ev || !OPEN.has(ev.state)) return { state: 'dismissed' };
      if (await hookWaits(ev)) await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text: '' }).catch(() => {});
      if (events.get(eventId) === ev && OPEN.has(ev.state)) move(ev, 'handedBack');
      return { state: 'handedBack' };
    },
    /** u3 C2 terminalInput: the person's input to a pty moves that tab's open reply on (BR6.6, SD10). US-0213 FR5.2:
     * every key counts as typing and means the agent is about to work. */
    terminalInput(ptyId, data) {
      replies.terminalInput(ptyId, data);
      for (const sessionId of sessions.keys())
        if (channel.ptyOf(sessionId) === ptyId) Object.assign(signalOf(sessionId), { lastInputMs: Date.now(), busy: true, notify: null });
    },
    /** US-0213 FR5.1: a copy of the session's signals with whether a question or permission waits; null when unknown. */
    signalsOf(sessionId) {
      if (!sessions.has(sessionId)) return null;
      const waiting = openOf(sessionId).some((e) => e.kind === 'question' || e.kind === 'permission');
      return { ...signalOf(sessionId), waiting };
    },
    /** US-0213: the live sessions of a project, with their tab and harness. */
    sessionsOf: (projectId) => [...sessions].filter(([, s]) => s.projectId === projectId).map(([sessionId, s]) => ({ sessionId, ...s })),
    /** US-0213 FR3.2: resolves true at the session's next SessionStart with one of `sources`, false after `ms`. */
    waitForSession(sessionId, sources, ms) {
      return new Promise((resolve) => {
        const w = { sessionId, sources };
        w.resolve = (ok) => {
          clearTimeout(w.timer);
          readyWaits.delete(w);
          resolve(ok);
        };
        w.timer = setTimeout(() => w.resolve(false), ms);
        readyWaits.add(w);
      });
    },
    /**
     * US-0213 FR3.1: shows the handoff page for a live session (one per session: a newer offer replaces it). Returns
     * its event id, or null for an unknown session.
     */
    addHandoff(sessionId, handoff) {
      const s = sessions.get(sessionId);
      if (!s) return null;
      for (const old of [...events.values()]) if (old.kind === 'handoff' && old.sessionId === sessionId) move(old, 'ended', { endedBy: 'movedOn' });
      const at = Date.now();
      const ev = {
        eventId: newId(),
        sessionId,
        projectId: s.projectId,
        tabId: s.tabId,
        harness: s.harness,
        source: 'hook',
        kind: 'handoff',
        state: 'shown',
        arrivedAt: new Date(at).toISOString(),
        arrivedAtMs: at,
        seq: 0,
        context: contextOf(s.projectId) ?? null,
        handoff,
        lastError: null,
        via: null,
        endedBy: null
      };
      events.set(ev.eventId, ev);
      emit(ev.projectId);
      for (const fn of added) fn(view(ev));
      return ev.eventId;
    },
    /** US-0213: main's own view of a handoff page, with its session; null when it is gone. */
    handoffOf(eventId) {
      const ev = events.get(eventId);
      return ev?.kind === 'handoff' && ev.state !== 'ended'
        ? { eventId, sessionId: ev.sessionId, projectId: ev.projectId, harness: ev.harness, tabId: ev.tabId, handoff: ev.handoff, state: ev.state }
        : null;
    },
    /** US-0213 FR5.3: shown, waiting (for idle) or sending; ended removes the page. */
    setHandoff(eventId, state) {
      const ev = events.get(eventId);
      if (ev?.kind === 'handoff' && ev.state !== 'ended') move(ev, state, state === 'ended' ? { endedBy: 'sent' } : {});
    },
    onHandoffClosed(fn) {
      handoffClosed.add(fn);
      return () => handoffClosed.delete(fn);
    },
    /** US-0213: one call per accepted signal (reply included), for the handoff wiring. */
    onSignal(fn) {
      signalFns.add(fn);
      return () => signalFns.delete(fn);
    },
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
      for (const t of activityTimers.values()) [clearTimeout(t.push), clearTimeout(t.idle)];
      activityTimers.clear();
      for (const w of readyWaits) w.resolve(false);
      for (const ev of events.values()) {
        clearTimeout(ev.timer);
        clearTimeout(ev.removal);
      }
      events.clear();
    }
  };
}
