// US-0506 u3 US3.1: agent replies in AgentEventStore (LC4, plan K3). Created by the store with its own `events`,
// `sessions`, `move` and `emit`, so every state change goes through u1's one transition and pushes in the same turn.
// - classifier (SD10, BR6.6, NFR3.20): the person's terminal input moves an open reply on; terminal auto-responses do not;
// - lifecycle (BR6.4–BR6.9, BR6.13–BR6.15, RD11, RD12, RD16, RD17, SCD6): queued, shown, dismissed, stale, ended;
// - LatestMessage per project (BR6.15, SCD8, SD12), in memory only;
// - typed delivery (BR6.10–BR6.12, RD13, RD14, K1): the cleaned line, then one Enter to the same pty.
import { t } from '../shared/i18n.js';
import { cleanLine, utf8Bytes } from '../shared/agentText.js';
import { alertPlan } from '../shared/alertPlan.js';
import { formatLog } from './agentChannel.js';

// --- Classifier ------------------------------------------------------------------------------------------------------
// Data counts as a terminal auto-response only when the whole chunk is one or more of these sequences. Anything else is
// the person's input, so the default fails toward stale (SD10, K8).
// ponytail: a modified F3 (ESC [ 1 ; <mod> R) has the CPR form and counts as a cursor report. If a TUI ever binds a
// modified F3, count a CPR only within 1 s of a DSR 6 query (ESC [ 6 n) in that pty's output.
const H = '[\\da-fA-F]{1,4}';
const PARTS = [
  String.raw`\x1b\[\??\d+;\d+(?:;\d+)?R`, // CPR, reply to DSR 6 (and the DEC form)
  String.raw`\x1b\[[03]n`, // DSR 5 status
  String.raw`\x1b\[[?>][\d;]*c`, // DA1, DA2
  String.raw`\x1b\](?:4;\d+|1[0-2]);rgb:${H}/${H}/${H}(?:\x07|\x1b\\)`, // OSC 4, 10, 11, 12 colour answers
  String.raw`\x1b\[[IO]`, // focus in and out
  String.raw`\x1b\[\?\d+;\d+\$y`, // DECRPM mode report (K8)
  String.raw`\x1b\[\?\d+u` // kitty keyboard flags (K8)
];
const AUTO = new RegExp(`^(?:${PARTS.join('|')})+$`); // anchored, not global, case-sensitive on purpose

export const isAutoResponse = (data) => typeof data === 'string' && data.length > 0 && AUTO.test(data);

// --- Lifecycle -------------------------------------------------------------------------------------------------------
// ponytail: 50 ms between the text and Enter, the same for both harnesses (K1). A guess until the K2 manual run;
// make it per harness, or longer, if a TUI misses the submit.
export const ENTER_GAP_MS = 50;
const MAX_LINE_BYTES = 65_536;
const BLOCKING = new Set(['shown', 'timedOut', 'sending']); // an open question or permission event queues replies (K4)
const OPEN = new Set(['queued', 'shown', 'dismissed', 'sending']); // a reply the tab may still wait for
const UNIQUE = new Set(['queued', 'shown', 'dismissed']); // where the same text twice is one reply (RD17)
const STALE = new Set(['stale']);
const STATUS_OF = { movedOn: 'answered', sessionEnded: 'sessionEnded', notShown: 'notShown' };
const LATEST_KEYS = ['tabId', 'harness', 'text', 'arrivedAt', 'status', 'eventId', 'truncated', 'empty']; // C4, SD12

/** @param {{events: Map, sessions: Map, move: Function, emit: Function, channel, pty, timing, log: Function,
 *   refuse: Function, newId: () => string, contextOf: Function, settings: () => object, notifyAdded: Function}} deps */
export function createReplies({ events, sessions, move, emit, channel, pty, timing, log, refuse, newId, contextOf, settings, notifyAdded }) {
  const latest = new Map(); // projectId -> LatestMessage, with sessionId for main's own use only
  const isReply = (e) => e.kind === 'reply';
  const of = (sessionId, states) => [...events.values()].filter((e) => isReply(e) && e.sessionId === sessionId && states.has(e.state));
  const blocked = (projectId) => [...events.values()].some((e) => !isReply(e) && e.projectId === projectId && BLOCKING.has(e.state));
  const logFor = (ev, reason) => log(formatLog(reason, { session: ev.sessionId, file: `${ev.file}.evt` }));

  /** A pending Enter (K1) is cancelled: it is never written, then or later, and the send fails with one sentence. */
  function cancelSend(ev) {
    const s = ev.send;
    if (!s) return;
    clearTimeout(s.timer);
    ev.send = null;
    logFor(ev, 'enter skipped');
    s.reject(new Error(t('agentDialog.errors.enterSkipped')));
  }

  /** RD12: a shown (or sending) reply goes stale, a queued or dismissed one ends; at most one stale per session (K5). */
  function moveOn(sessionId, reason) {
    const moved = of(sessionId, OPEN);
    let marked = false;
    for (const l of latest.values()) {
      if (l.sessionId !== sessionId) continue;
      if (reason === 'movedOn' && !(l.status === 'waiting' && moved.some((e) => e.eventId === l.eventId))) continue;
      l.status = STATUS_OF[reason];
      marked = true;
    }
    for (const ev of moved) {
      if (ev.state === 'shown' || ev.state === 'sending') {
        cancelSend(ev);
        // ponytail: the older stale page and its typed text are dropped (K5); keep a list per session if more than the
        // latest stale text is ever needed.
        for (const old of of(sessionId, STALE)) move(old, 'ended', { endedBy: reason });
        move(ev, 'stale', { staleReason: reason });
      } else move(ev, 'ended', { endedBy: reason });
    }
    if (marked && moved.length === 0) {
      const projectId = sessions.get(sessionId)?.projectId;
      if (projectId) emit(projectId); // the strip refetches on a push
    }
  }

  function add(raw, session, parsed) {
    const newest = of(raw.sessionId, UNIQUE)
      .sort((a, b) => a.seq - b.seq)
      .at(-1);
    if (newest && newest.message.text === parsed.message.text) return; // RD17: dropped quietly (OD8)
    moveOn(raw.sessionId, 'movedOn');
    const ev = {
      eventId: newId(),
      sessionId: raw.sessionId,
      projectId: session.projectId,
      tabId: session.tabId,
      harness: session.harness,
      source: 'hook',
      kind: 'reply',
      // emit's promote shows a queued reply unless a question or permission event is open (K4, BR6.8). With "Line only"
      // or "Off" it is dismissed at once: the strip shows it and Answer reopens it (US-0506 u5 D2, BR8.2).
      state: alertPlan('reply', settings(), false).open ? 'queued' : 'dismissed',
      arrivedAt: new Date(raw.arrivedAtMs).toISOString(),
      arrivedAtMs: raw.arrivedAtMs,
      seq: raw.seq,
      context: contextOf(session.projectId) ?? null,
      message: parsed.message,
      lastError: null,
      via: null,
      endedBy: null,
      staleReason: null,
      file: raw.file
    };
    events.set(ev.eventId, ev);
    const cur = latest.get(ev.projectId); // BR6.15: by arrival (mtime, SCD8), then tab
    if (!cur || ev.arrivedAtMs > cur.arrivedAtMs || (ev.arrivedAtMs === cur.arrivedAtMs && String(ev.tabId) > String(cur.tabId))) {
      latest.set(ev.projectId, {
        sessionId: ev.sessionId,
        eventId: ev.eventId,
        tabId: ev.tabId,
        harness: ev.harness,
        text: ev.message.text,
        arrivedAt: ev.arrivedAt,
        arrivedAtMs: ev.arrivedAtMs,
        status: 'waiting',
        truncated: ev.message.truncated,
        empty: ev.message.empty
      });
    }
    emit(ev.projectId);
    timing.stamp(ev.eventId, ev.harness, 'hookReceived', raw.arrivedAtMs);
    notifyAdded(ev);
  }

  /** RD14: a failed send goes back to shown with one sentence, or stale when the session is gone. */
  function failSend(ev, sentence, cause) {
    logFor(ev, cause);
    if (events.get(ev.eventId) === ev && ev.state === 'sending') {
      if (channel.isLive(ev.sessionId)) move(ev, 'shown', { lastError: sentence });
      else move(ev, 'stale', { staleReason: 'sessionEnded', lastError: sentence });
    }
    return new Error(sentence);
  }

  /**
   * BR6.10–BR6.12, RD13, K1: the check, the move to sending and the text write in one synchronous step; then one
   * Enter to the same captured pty after ENTER_GAP_MS, only while this same send is still pending.
   */
  function answer(ev, raw) {
    if (ev.state !== 'shown') return Promise.reject(refuse(ev, 'eventNotOpen', 'event not open'));
    if (!channel.isLive(ev.sessionId) || !sessions.has(ev.sessionId)) return Promise.reject(refuse(ev, 'sessionEnded', 'session ended'));
    const text = raw?.reply?.text;
    const line = typeof text === 'string' ? cleanLine(text) : '';
    if (!line.trim() || utf8Bytes(line) > MAX_LINE_BYTES) return Promise.reject(refuse(ev, 'doesNotFit', 'answer does not fit the event'));
    const ptyId = channel.ptyOf(ev.sessionId);
    if (!ptyId) return Promise.reject(refuse(ev, 'sessionEnded', 'session ended'));
    move(ev, 'sending', { lastError: null });
    try {
      pty.write(ptyId, line); // the store's own write (writeSession), never pty:write, so it never counts as input
    } catch (err) {
      return Promise.reject(failSend(ev, t('agentDialog.errors.sendFailed', { cause: err.message }), `send failed: ${err.message}`));
    }
    return new Promise((resolve, reject) => {
      const send = { reject };
      send.timer = setTimeout(() => {
        if (ev.send !== send || ev.state !== 'sending') return; // another send, or moved on: never an Enter
        ev.send = null;
        try {
          pty.write(ptyId, '\r');
        } catch (err) {
          reject(failSend(ev, t('agentDialog.errors.sendFailed', { cause: err.message }), `send failed: ${err.message}`));
          return;
        }
        timing.stamp(ev.eventId, ev.harness, 'answerDelivered');
        const l = latest.get(ev.projectId);
        if (l?.eventId === ev.eventId) l.status = 'answered';
        move(ev, 'ended', { endedBy: 'typed', via: 'typed' }); // lingers 3 s for the "sent" line (K6)
        resolve({ state: 'sent', via: 'typed' });
      }, ENTER_GAP_MS);
      ev.send = send;
    });
  }

  return {
    add,
    moveOn,
    answer,
    /** RD11: an authentic reply that cannot be shown moves the open reply on and marks the strip. */
    refused: (sessionId) => moveOn(sessionId, 'notShown'),
    /** SD10, BR6.6: called by pty:write before writeSession. Never logs (OD8). */
    terminalInput(ptyId, data) {
      if (isAutoResponse(data)) return;
      for (const sessionId of sessions.keys()) if (channel.ptyOf(sessionId) === ptyId) moveOn(sessionId, 'movedOn');
    },
    /** BR6.7: on tab exit, before u1 ends the session's questions. */
    endSession: (sessionId) => moveOn(sessionId, 'sessionEnded'),
    /** BR6.14: Close dismisses a shown reply (nothing typed, no answer file); on a stale reply it ends it. */
    close(ev) {
      if (ev.state === 'shown') move(ev, 'dismissed');
      else if (ev.state === 'stale') move(ev, 'ended', { endedBy: 'closed' });
      return { state: 'dismissed' };
    },
    /** C4 agentEvents.reopen (PD11): only a dismissed reply of a live session. */
    reopen(eventId) {
      const ev = events.get(eventId);
      if (!ev) throw refuse(null, 'unknownEvent', 'unknown event');
      if (!isReply(ev) || ev.state !== 'dismissed' || !channel.isLive(ev.sessionId)) throw refuse(ev, 'eventNotOpen', 'event not open');
      move(ev, 'shown', { lastError: null });
      return { state: 'shown' };
    },
    /** C4 agentEvents.latest: exactly the eight keys, never the session id (SD12). */
    latest(projectId) {
      const l = latest.get(projectId);
      return l ? Object.fromEntries(LATEST_KEYS.map((k) => [k, l[k]])) : null;
    },
    /** Called by emit before it lists: queued replies show once no question or permission event is open (BR6.8). */
    promote(projectId) {
      if (blocked(projectId)) return;
      for (const e of events.values()) if (isReply(e) && e.projectId === projectId && e.state === 'queued') e.state = 'shown';
    },
    dispose() {
      for (const e of events.values()) if (e.send) clearTimeout(e.send.timer);
    }
  };
}
