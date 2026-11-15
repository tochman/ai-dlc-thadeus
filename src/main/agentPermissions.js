// US-0506 u2 BR5.4, BR5.6–BR5.11, SD8, SD10, SD11, SD13, RD10–RD12: the permission part of AgentEventStore (LC4).
// The store owns the event map, the transition move() and the shared hookWaits; this module owns what is particular
// to a permission: the answer check (BR5.7), delivery through the waiting hook only (RD10), Close, the time-out, the
// terminal answer, and the agent's own Allow always rules, which stay in a private map and never reach the renderer
// (SD11). It gets no key sender and imports none, so a permission answer can only ever be written as an answer file
// (SD13). It never moves the OS focus either (SD8, K18).
import { t } from '../shared/i18n.js';
import { formatLog } from './agentChannel.js';

const POLL_MS = 25;
const WINDOW_MS = { claude: 1000, opencode: 5000 }; // RD10: the hook's take; opencode's includes ctx.permission.reply
const SENT_MS = 3000; // a Claude Code "sent" stays visible this long, then ends: the answer file ends the request

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const onlyKey = (obj, key) => isPlainObject(obj) && Object.keys(obj).length === 1 && Object.hasOwn(obj, key);

/** A delivery outcome: the sentence for the person and the English cause for the log (OD7). */
const outcome = (state, key, cause, values) => ({ state, cause, sentence: key ? t(`agentDialog.errors.${key}`, values) : null });

/**
 * @param {{channel, adapters, timing: {stamp: Function}, move: (ev, state, patch?) => void, hookWaits: (ev) => Promise<boolean>,
 *   sessionOf: (sessionId) => object|undefined, log: (line: string) => void}} deps
 */
export function createPermissions({ channel, adapters, timing, move, hookWaits, sessionOf, log }) {
  const alwaysRules = new Map(); // eventId -> the agent's own suggestions or always-patterns (SD11)
  const logFor = (ev, reason) => log(formatLog(reason, { session: ev.sessionId, file: `${ev.file}.evt` }));
  const current = (ev, state) => ev.state === state;
  const disabled = (ev) => ({ permission: { ...ev.permission, choices: ev.permission.choices.map((c) => ({ ...c, enabled: false })) } });

  function refuse(ev, key, reason) {
    logFor(ev, reason);
    return new Error(t(`agentDialog.errors.${key}`));
  }

  /** SD10 shape and BR5.7 fit: exactly { permission: { choice } }, an index of an enabled choice. */
  function fits(ev, answer) {
    if (!onlyKey(answer, 'permission') || !onlyKey(answer.permission, 'choice')) return false;
    const { choice } = answer.permission;
    return Number.isInteger(choice) && ev.permission.choices[choice]?.enabled === true;
  }

  /** RD10 for a failure before or after the write: shown again while the hook still waits, else timedOut. */
  async function failed(ev, key, cause, values) {
    return (await hookWaits(ev)) ? outcome('shown', key, cause, values) : outcome('timedOut', key, cause, values);
  }

  /**
   * RD10: write, then watch the markers. Every branch that would send keys for a question ends in timedOut here.
   * ponytail: a hook killed with SIGKILL between its take and its print falls to the retract, gets ENOENT and is
   * reported sent. Claude Code kills the hook only at its 600 s entry timeout and the hook leaves at 595 s, so this
   * needs an answer in the last 5 s; the terminal still shows the prompt if it happens.
   */
  async function sendPermission(ev, text) {
    try {
      await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text });
    } catch (err) {
      if (err.code === 'sessionEnded') return outcome('timedOut', 'sessionEnded', 'session ended');
      if (err.code === 'hookGaveUp') return outcome('timedOut', 'eventNotOpen', 'the hook stopped waiting');
      return failed(ev, 'sendFailed', err.message, { cause: err.message });
    }
    for (const end = Date.now() + WINDOW_MS[ev.harness]; Date.now() < end; await sleep(POLL_MS)) {
      const st = await channel.answerState(ev.sessionId, ev.file);
      if (!st.folder) return outcome('timedOut', 'sessionEnded', 'session ended'); // never "sent" (SD14 R-04)
      if (!st.waiting && !st.answerPresent) return st.nack ? outcome('timedOut', 'notTaken', 'the agent refused the answer') : outcome('sent');
      if (!st.waiting)
        return (await channel.retract(ev.sessionId, ev.file)) ? outcome('timedOut', 'eventNotOpen', 'the hook stopped waiting') : outcome('sent');
    }
    return (await channel.retract(ev.sessionId, ev.file)) ? failed(ev, 'notTaken', 'the hook did not take the answer') : outcome('sent');
  }

  /** RD11, BR5.10: the empty answer file, only while the hook waits; otherwise there is nothing to hand back. */
  async function handBack(ev) {
    if (await hookWaits(ev)) await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text: '' }).catch(() => {});
  }

  return {
    /** Keeps the agent's rules beside the event, never on it (SD11). */
    add(ev, parsed) {
      if (parsed.alwaysRules) alwaysRules.set(ev.eventId, parsed.alwaysRules);
    },
    /** C4 agentEvents.answer for a permission: SD10 in order, sending before the first await (NFR3.15). */
    async answer(ev, answer) {
      if (!current(ev, 'shown')) throw refuse(ev, 'eventNotOpen', 'event not open');
      if (!channel.isLive(ev.sessionId) || !sessionOf(ev.sessionId)) throw refuse(ev, 'sessionEnded', 'session ended');
      if (!fits(ev, answer)) throw refuse(ev, 'doesNotFit', 'answer does not fit the event');
      const choice = answer.permission.choice;
      move(ev, 'sending', { lastError: null });
      if (!(await hookWaits(ev))) {
        const sentence = t('agentDialog.errors.eventNotOpen');
        if (current(ev, 'sending')) move(ev, 'timedOut', { lastError: sentence, ...disabled(ev) });
        throw refuse(ev, 'eventNotOpen', 'event not open');
      }
      const text = adapters[ev.harness].permissionAnswer(ev, choice, alwaysRules.get(ev.eventId));
      const result = await sendPermission(ev, text);
      if (result.state === 'sent') {
        if (current(ev, 'sending')) {
          move(ev, 'sent', { via: 'hook' });
          if (ev.harness === 'claude') ev.removal = setTimeout(() => current(ev, 'sent') && move(ev, 'ended', { endedBy: 'answered' }), SENT_MS);
        }
        timing.stamp(ev.eventId, ev.harness, 'answerDelivered');
        return { state: 'sent', via: 'hook' };
      }
      logFor(
        ev,
        result.cause === 'the agent refused the answer'
          ? `send failed: ${result.cause} effect=${ev.permission.choices[choice].effect}`
          : `send failed: ${result.cause}`
      );
      if (current(ev, 'sending')) move(ev, result.state, { lastError: result.sentence, ...(result.state === 'timedOut' ? disabled(ev) : {}) });
      throw new Error(result.sentence);
    },
    /** BR5.10: Close or Esc on a shown permission hands it back and ends it; elsewhere nothing is written (K10). */
    async close(ev) {
      if (current(ev, 'timedOut')) {
        move(ev, 'ended', { endedBy: 'closed' });
        return { state: 'dismissed' };
      }
      if (!current(ev, 'shown')) return { state: 'dismissed' };
      await handBack(ev);
      if (!current(ev, 'shown')) return { state: 'dismissed' };
      move(ev, 'handedBack');
      move(ev, 'ended', { endedBy: 'handedBack' });
      return { state: 'handedBack' };
    },
    /** BR5.11, PD9: the agent reports the request answered; from the terminal unless the app was sending it. */
    answered(ev) {
      if (current(ev, 'sending') || current(ev, 'sent')) {
        move(ev, 'ended', { endedBy: 'answered' });
        if (ev.harness === 'opencode') timing.stamp(ev.eventId, ev.harness, 'agentConfirmed'); // OD6
      } else if (ev.state !== 'ended') move(ev, 'ended', { endedBy: 'terminal' });
    },
    /** BR5.9: at waitSeconds a shown permission is timedOut with every choice disabled; nothing is written. */
    timeout(ev) {
      if (current(ev, 'shown')) move(ev, 'timedOut', disabled(ev));
    },
    /** SCD10: the rules go with the event. */
    endEvent(eventId) {
      alwaysRules.delete(eventId);
    },
    rulesHeld: () => alwaysRules.size
  };
}
