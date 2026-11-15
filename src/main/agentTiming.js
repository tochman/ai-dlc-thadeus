// US-0506 u1 NFR1.6, OD1: TimingLog (LC7), the development timing log that proves NFR1 on the release Mac.
// On only with THADEUS_TIMING=1; off, it is a no-op: no folder, no file. One JSON line per stamp with exactly
// { eventId, harness, stamp, at }, so no question text, label, answer or secret can reach the file.
import fsp from 'node:fs/promises';
import path from 'node:path';

// u5 amendment 4; agentConfirmed: opencode reported a permission the app sent answered (US-0506 u2 OD6)
const MAIN_STAMPS = new Set(['hookReceived', 'answerDelivered', 'notificationShown', 'notificationClicked', 'agentConfirmed']);
const RENDERER_STAMPS = new Set(['dialogShown', 'answerClicked']);
const MAX_ID = 64;

/** @param {{dir: string, on: boolean}} options dir is <userData>/logs */
export function createTimingLog({ dir, on }) {
  const file = path.join(dir, 'agent-timing.jsonl');
  let queue = Promise.resolve();

  // One promise queue, like the settings writes: stamps never interleave and never block a caller.
  function append(eventId, harness, stamp, at) {
    const line = `${JSON.stringify({ eventId, harness, stamp, at })}\n`;
    queue = queue
      .then(() => fsp.mkdir(dir, { recursive: true }))
      .then(() => fsp.appendFile(file, line))
      .catch((err) => console.warn(`[agent-events] timing log failed: ${err.message}`));
  }

  return {
    on,
    /** A main-side stamp; `at` defaults to now. */
    stamp(eventId, harness, stamp, at = Date.now()) {
      if (on && MAIN_STAMPS.has(stamp)) append(String(eventId), harness ?? null, stamp, at);
    },
    /** A renderer stamp (dialogShown, answerClicked only, eventId a string of at most 64 characters). */
    stampFromRenderer(eventId, stamp, harness) {
      if (!on || !RENDERER_STAMPS.has(stamp) || typeof eventId !== 'string' || eventId.length > MAX_ID) return false;
      append(eventId, harness ?? null, stamp, Date.now());
      return true;
    },
    flush: () => queue
  };
}
