// US-0513 FR1.3, FR1.4, FR6.2: the one archive rule, used by main, the renderer and the feature docs test. Pure.
// An intent here is a row of loadIntentList: `status` is intents.json's, `stateStatus` and `archivedFrom` are
// aidlc-state.md's `Status` and `Archived From`.

const ARCHIVED = 'archived';
const COMPLETE = /^complete/i;
const REASON_MAX = 200;

const saysArchived = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase() === ARCHIVED;

/** US-0513 FR3.1: archived when intents.json or aidlc-state.md says so, as AI-DLC itself tests it. */
export const isArchived = (intent) => saysArchived(intent?.status) || saysArchived(intent?.stateStatus);

/** US-0513 FR6.2: complete, or archived after it was complete. Any other archived intent is neither delivered nor in progress. */
export function isFinished(intent) {
  if (!isArchived(intent)) return intent?.status === 'complete' || COMPLETE.test(intent?.stateStatus ?? '');
  return COMPLETE.test((saysArchived(intent.stateStatus) ? intent.archivedFrom : intent.stateStatus) ?? '');
}

/** US-0513 FR6.1: the two audit events of archiving; they are no work, so no time measure counts them. */
export const isArchiveEvent = (e) => e?.event === 'WORKFLOW_ARCHIVED' || e?.event === 'WORKFLOW_UNARCHIVED';

/**
 * US-0513 FR1.3: the reason as it is sent, one trimmed line ('' is no reason), or why it is refused.
 * @returns {{reason: string} | {error: 'dash'|'tooLong'}}
 */
export function checkReason(text) {
  const reason = String(text ?? '')
    .replace(/\r\n|\r|\n/g, ' ')
    .trim();
  if (reason.startsWith('-')) return { error: 'dash' };
  return reason.length > REASON_MAX ? { error: 'tooLong' } : { reason };
}

// ponytail: a quiet log for this long means the outside agent stopped; a long silent step can free Resume and Archive
// early. They re-check on the next refresh, not on a timer.
export const ELSEWHERE_MS = 10 * 60_000;

/**
 * US-0513 FR1.4, and Resume's rule (US-0501 FR2.4, US-0005, US-0007, US-0009): why the active intent's work cannot be
 * touched now, or null. A parked one is not run by an open session, nor by the agent whose parking just wrote its audit.
 * @param {{busy: boolean, asking: boolean, running: boolean, activeIntent: object|null, now: number}} seen
 * @returns {'busy'|'asking'|'running'|'elsewhere'|null}
 */
export function workBlock({ busy, asking, running, activeIntent, now }) {
  if (busy) return 'busy';
  if (asking) return 'asking';
  if (activeIntent?.status !== 'in-flight' || activeIntent.parked) return null;
  if (running) return 'running';
  return now - (activeIntent.activityAt ?? 0) < ELSEWHERE_MS ? 'elsewhere' : null;
}
