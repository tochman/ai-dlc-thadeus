// US-0510 FR4.1–FR4.6, NFR4: park and unpark an intent through AI-DLC's own commands, never by editing its files.
// Every command runs with fixed arguments and a timeout, never `--help` (park and unpark ignore it and run).
import { defaultExec, runFixed } from './exec.js';
import { toolPath } from './tools.js';
import { assertName } from './projectService.js';
import { t } from '../shared/i18n.js';

const TIMEOUT_MS = 20000;

/** US-0510 FR4.1, FR4.6: `{parked, stage, at}` from the last WORKFLOW_PARKED or WORKFLOW_UNPARKED event. Pure. */
export function parkedFromAudit(events) {
  const last = (events ?? []).findLast((e) => e.event === 'WORKFLOW_PARKED' || e.event === 'WORKFLOW_UNPARKED');
  if (!last) return { parked: false, stage: null, at: null };
  const parked = last.event === 'WORKFLOW_PARKED';
  return { parked, stage: parked ? (last.fields?.Stage ?? null) : null, at: last.timeMs ?? null };
}

/**
 * US-0510 FR4.1: whether `aidlc engine status` (the active intent only) says it is parked. Pure.
 * ponytail: the Status line of a parked intent was not seen while planning; any line naming parking counts. The audit covers it either way.
 */
export function parkedFromStatus(text) {
  return /^Status:\s*.*\bpark/im.test(String(text ?? ''));
}

/** A refusal's own words: AI-DLC answers on stdout, execFile puts stderr in the message. */
const reason = (err) =>
  err.killed ? t('errors.timeoutAfter', { seconds: TIMEOUT_MS / 1000 }) : String(err.stdout ?? '').trim() || String(err.message ?? err).trim();

/** Runs one `aidlc` command in the project (NFR4); never throws: `{ok}` or `{ok: false, error}`. Also US-0513's. */
export async function aidlc(root, args, exec) {
  try {
    await runFixed(toolPath('aidlc'), args, { cwd: root, timeout: TIMEOUT_MS, exec });
    return { ok: true };
  } catch (err) {
    console.warn(`aidlc ${args.join(' ')} misslyckades:`, reason(err));
    return { ok: false, error: reason(err) };
  }
}

/** US-0510 FR4.1: `aidlc engine status` for the active intent: `{parked, at}` with its read time, or null when it fails. */
export async function readParkStatus(root, { exec = defaultExec, now = Date.now } = {}) {
  try {
    const text = await runFixed(toolPath('aidlc'), ['engine', 'status'], { cwd: root, timeout: TIMEOUT_MS, exec });
    return { parked: parkedFromStatus(text), at: now() };
  } catch (err) {
    console.warn('aidlc engine status misslyckades:', reason(err));
    return null;
  }
}

/**
 * US-0510 FR4.1: the intent list with the status read laid over the active intent: newer than the audit's last park
 * event, a parked status marks it parked.
 * ponytail: the status only raises the mark, never clears it: a parked intent's state was seen with `Status: Running`,
 * so a not-parked status is no proof. Clear on it once AI-DLC's status output for a parked intent is known.
 */
export function withParkStatus(list, status) {
  if (!status?.parked) return list;
  const mark = (i) => (i.active && !i.parked && status.at > (i.parkedAt ?? 0) ? { ...i, parked: true, parkedStage: i.currentStage ?? null } : i);
  return { ...list, intents: list.intents.map(mark) };
}

/** US-0510 FR4.2: parks the active intent. Never throws: `{ok}` or `{ok: false, error}` with AI-DLC's reason (FR4.5). */
export function park(root, { exec = defaultExec } = {}) {
  return aidlc(root, ['engine', 'orchestrate', 'park', '--person-asked'], exec);
}

/** NFR4, US-0513 NFR1: throws unless `dirName` is a valid name, no option, and one of `known`, the space's own intents. */
export function assertKnownIntent(dirName, known) {
  assertName(dirName, 'intent');
  if (dirName.startsWith('-') || !Array.isArray(known) || !known.includes(dirName)) throw new Error(t('errors.invalidName', { what: 'intent', name: dirName }));
}

/**
 * US-0510 FR4.3, FR4.5: unparks `dirName`, first making it the active intent when it is not. Throws before running
 * anything when the name is not valid or not in `known` (NFR4); otherwise `{ok, switched}` or `{ok: false, error, switched}`.
 */
export async function unpark(root, dirName, { activeDirName, known, exec = defaultExec } = {}) {
  assertKnownIntent(dirName, known);
  let switched = false;
  if (dirName !== activeDirName) {
    const res = await aidlc(root, ['intent', dirName], exec);
    if (!res.ok) return { ...res, switched };
    switched = true;
  }
  return { ...(await aidlc(root, ['engine', 'state', 'unpark'], exec)), switched };
}
