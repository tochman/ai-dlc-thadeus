// Activity signal and command sequencing for a terminal tab (FR1.2, FR1.3, FR2.3). Pure: no React, no bridge.
import { t } from '../shared/i18n.js';

export const QUIET_MS = 1500;
export const READY_TIMEOUT_MS = 20000;
const ECHO_TIMEOUT_MS = 3000;
const ENTER = '\r';

export const withEnter = (text, submit) => (submit ? text + ENTER : text);

/** A path as a shell word: every character outside letters, digits and `_@%+=:,./-` backslash-escaped, as a drop in Terminal.app types it. */
export const shellQuote = (path) => String(path).replace(/[^\p{L}\p{N}_@%+=:,./-]/gu, '\\$&');

/** Dropped files' paths as one line for the prompt: quoted, space-separated, a trailing space and no Enter. */
export const dropText = (paths) => (paths.length ? paths.map(shellQuote).join(' ') + ' ' : '');

/**
 * `idle | busy | exited` for one pty. Output sets `busy`; `quietMs` without output sets `idle`.
 * A tab starts as `exited` (not started). `exitCode` is the last exit code, or null.
 */
export function createActivity({ quietMs = QUIET_MS } = {}) {
  let state = 'exited';
  let timer = null;
  const subscribers = new Set();
  const activity = {
    exitCode: null,
    get state() {
      return state;
    },
    onData() {
      set('busy');
      clearTimeout(timer);
      timer = setTimeout(() => set('idle'), quietMs);
    },
    onExit(code = null) {
      clearTimeout(timer);
      activity.exitCode = code;
      set('exited');
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
  function set(next) {
    if (next === state) return;
    state = next;
    for (const fn of subscribers) fn(next);
  }
  return activity;
}

/** Resolves when `activity` reaches `target`, rejects after `timeoutMs`. */
export function waitFor(activity, target, timeoutMs) {
  if (activity.state === target) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const off = activity.subscribe((s) => {
      if (s !== target) return;
      clearTimeout(timer);
      off();
      resolve();
    });
    const timer = setTimeout(() => {
      off();
      reject(new Error(t('terminal.timeout', { target, seconds: Math.round(timeoutMs / 1000) })));
    }, timeoutMs);
  });
}

/**
 * Types `steps` ({text, submit}) into `term` ({activity, write}) one at a time. Each step waits for `idle`;
 * after a submitted step it first waits (at most 3 s) for the command's output, so the next step waits
 * for that command to finish rather than for the quiet before it.
 */
export async function runSequence(term, steps, { timeoutMs = READY_TIMEOUT_MS } = {}) {
  for (const { text, submit } of steps) {
    await waitFor(term.activity, 'idle', timeoutMs);
    term.write(withEnter(text, submit));
    if (submit) await waitFor(term.activity, 'busy', ECHO_TIMEOUT_MS).catch(() => {});
  }
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// ponytail: a choice waits for idle at most this long, then gives up; a longer wait only matters for a stuck agent.
const HANDOFF_WAIT_MS = 30 * 60 * 1000;

/**
 * US-0213 FR3.2, FR3.3, FR5.3, NFR4, US-0026 FR3.3: types one handoff choice. Main gives the fixed lines and says when
 * the agent is idle; nothing is typed before that, and the page is told it waits. For Fresh session the second line
 * goes only after main saw the new session start.
 * US-0039 FR2.1–FR2.5: in `park` mode main first answers an open gate with the park request, or gives the park line,
 * which is typed at once; the page is told (`onWaiting('park')`) and the choice's lines follow once the agent stops.
 * @param {{bridge: {commands, park, idle, waiting, waitReady, sent}, eventId: string, choice: string, write: (text) => void,
 *   onWaiting?: (how: 'park'|'idle') => void, pollMs?: number}} options
 * @returns {Promise<{ok: true}|{ok: false, reason: 'noCommands'|'notIdle'|'notReady'}>}
 */
export async function sendHandoff({ bridge, eventId, choice, write, onWaiting = () => {}, pollMs = 500 }) {
  const cmds = await bridge.commands(eventId, choice);
  if (!cmds?.lines?.length) return { ok: false, reason: 'noCommands' };
  let told = false;
  const tell = async (how) => {
    told = true;
    await bridge.waiting(eventId, true);
    onWaiting(how);
  };
  if (cmds.mode === 'park') {
    const park = await bridge.park(eventId);
    if (park?.line) write(withEnter(park.line, true));
    if (park?.sent) await tell('park');
  }
  for (const end = Date.now() + HANDOFF_WAIT_MS; !(await bridge.idle(eventId)); await sleepMs(pollMs)) {
    if (Date.now() > end) return { ok: false, reason: 'notIdle' };
    if (!told) await tell('idle');
  }
  const [first, ...rest] = cmds.lines;
  write(withEnter(first, true));
  if (rest.length) {
    if (cmds.waitReady && !(await bridge.waitReady(eventId))) return { ok: false, reason: 'notReady' };
    for (const line of rest) write(withEnter(line, true));
  }
  await bridge.sent(eventId, choice);
  return { ok: true };
}
