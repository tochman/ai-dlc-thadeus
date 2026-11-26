// Whether the tools the app needs are there (EPIC-08 US-0805 FR2): what each tool is for a project's framework, how it
// is, and ready or not. Pure; the rows are the scan's (US-0410) and the sign-in states are US-0804's.
import { HEALTH_IDS } from './installCommands.js';
import { SIGN_IN_IDS } from './signIn.js';

const EITHER = ['aidlc', 'specify']; // with no framework, one of them is enough (FR2.1)
const NEEDED = { aidlc: ['claude', 'aidlc'], speckit: ['claude', 'specify'] };

/** FR2.1: needed, optional, or one of a pair where either is enough. */
function needOf(id, framework) {
  const needed = NEEDED[framework] ?? ['claude'];
  if (needed.includes(id)) return 'needed';
  return !NEEDED[framework] && EITHER.includes(id) ? 'either' : 'optional';
}

/**
 * How one tool is: no answer yet, not found, found without a version (FR4.7), not signed in, or ok. A sign-in that is
 * unknown, has no account or has no answer after a finished check is ok: only "not signed in" counts (FR2.2).
 */
function stateOf(row, signIn, busy) {
  if (!row || row.found === null) return 'checking';
  if (!row.found) return row.noAnswer ? 'noAnswer' : 'missing';
  if (signIn === 'out') return 'out';
  return signIn === 'checking' || (busy && !signIn) ? 'checking' : 'ok';
}

/**
 * US-0805 FR2: the five tools, problems first, and ready or not for `framework` ('aidlc', 'speckit' or null).
 * `signIns` is a sign-in state per tool id and `checking` the ids being checked; the last answers stay meanwhile
 * (FR3.4), but a needed tool in it is never "ready". "checking" also stands for a scan that gave no answer.
 * @returns {{status: 'checking'|'ready'|'problems', tools: Array<{id: string, need: 'needed'|'either'|'optional',
 *   state: 'checking'|'missing'|'noAnswer'|'out'|'ok', problem: boolean, broken: boolean}>}}
 */
export function healthOf({ rows, signIns, framework, checking }) {
  const all = HEALTH_IDS.map((id) => {
    const busy = checking.includes(id);
    const state = stateOf(
      rows.find((r) => r.id === id),
      signIns[id],
      busy && SIGN_IN_IDS.includes(id) // the others have no sign-in to wait for
    );
    return { id, need: needOf(id, framework), state, busy, broken: ['missing', 'noAnswer', 'out'].includes(state) };
  });
  const either = all.filter((x) => x.need === 'either');
  const neither = either.every((x) => x.broken);
  const answered = (x) => x.state === 'ok' && !x.busy;
  const ready = all.every((x) => x.need !== 'needed' || answered(x)) && (!either.length || either.some(answered));

  const counts = (need) => need === 'needed' || (need === 'either' && neither);
  const tools = all.map(({ id, need, state, broken }) => ({ id, need, state, problem: broken && counts(need), broken }));
  tools.sort((a, b) => b.problem - a.problem);
  const status = tools.some((x) => x.problem) ? 'problems' : ready ? 'ready' : 'checking';
  return { status, tools };
}
