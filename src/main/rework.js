// US-1301: rework cost. The AI spend that produced nothing: per intent, every stage attempt that was thrown away, with
// its reason, priced from the intent's timestamped cumulative readings. Pure functions; read-only (NFR1).
import { isArchiveEvent, isArchived, isFinished } from '../shared/intentArchive.js';

const OPENS = new Set(['STAGE_STARTED', 'STAGE_REVISING']); // a revision after a rejection is the next attempt (FR2.1)
const CLOSES_STAGE = new Set(['GATE_APPROVED', 'GATE_REJECTED', 'STAGE_COMPLETED', 'STAGE_SKIPPED']);
const CLOSES_ALL = new Set(['STAGE_JUMPED', 'WORKFLOW_PARKED', 'WORKFLOW_COMPLETED']);
const NO_UNIT = new Set(['stage-level', '(missing marker)']);
const LOOP_SOURCE = 'build-and-test';

const unitOf = (e) => {
  const u = String(e.fields?.Unit ?? '').trim();
  return u && !NO_UNIT.has(u) ? u : null;
};

/**
 * US-1301 FR1: the intent's stage attempts from its merged audit (time order). A stage start or revision opens one
 * (closing an open one of the same unit), an unpark reopens what the park closed; the stage's approval, completion,
 * rejection or skip closes it, and a jump, park or the workflow's end closes all. One still open runs to the last event.
 * The window rules are stageWindows' (tokenHistory.js), here with the stage label.
 * @returns {{stage: string, unit: string|null, from: number, to: number, closedBy: string|null}[]} by start time
 */
export function stageAttempts(events) {
  const timed = events.filter((e) => Number.isFinite(e.timeMs) && !isArchiveEvent(e));
  const attempts = [];
  let open = [];
  let parked = [];
  const close = (which, to, closedBy) => {
    for (const a of which) attempts.push({ ...a, to, closedBy });
    open = open.filter((a) => !which.includes(a));
  };
  for (const e of timed) {
    const stage = e.fields?.Stage ?? null;
    const unit = unitOf(e);
    if (OPENS.has(e.event) && stage) {
      close(
        open.filter((a) => a.unit === unit),
        e.timeMs,
        e.event
      );
      open.push({ stage, unit, from: e.timeMs });
    } else if (CLOSES_STAGE.has(e.event)) {
      close(
        open.filter((a) => a.stage === stage && (unit == null || a.unit === unit)),
        e.timeMs,
        e.event
      );
    } else if (CLOSES_ALL.has(e.event)) {
      if (e.event === 'WORKFLOW_PARKED') parked = open;
      close(open, e.timeMs, e.event);
    } else if (e.event === 'WORKFLOW_UNPARKED') {
      open = parked.map(({ stage: s, unit: u }) => ({ stage: s, unit: u, from: e.timeMs }));
      parked = [];
    }
  }
  if (open.length) close(open, timed.at(-1).timeMs, null);
  return attempts.sort((a, b) => a.from - b.from);
}

/**
 * US-1301 FR2.1–FR2.4: the attempts that were thrown away, each with one reason, the first that applies: `rejected` (its
 * gate was rejected), `loopBack` / `jumpedBack` (a backward jump from build-and-test / any other stage throws away the
 * attempts of every stage from the target to the source not already thrown away [Q1]), `redone` (a REDO throws away the
 * stage's last attempt). Stage order is the order stages first start in the audit.
 * @returns {object[]} the thrown-away attempts, by start time, each with `reason`
 */
export function thrownAway(attempts, events) {
  const reason = new Map();
  const order = [...new Set(attempts.map((a) => a.stage))];
  for (const a of attempts) if (a.closedBy === 'GATE_REJECTED') reason.set(a, 'rejected');
  const mark = (a, why) => reason.has(a) || reason.set(a, why);
  const jumps = events.filter((e) => e.event === 'STAGE_JUMPED' && Number.isFinite(e.timeMs));
  for (const j of jumps) {
    const { Direction: dir, Source: src, Target: tgt } = j.fields ?? {};
    const before = attempts.filter((a) => a.to <= j.timeMs);
    if (dir === 'REDO' || (src && src === tgt)) {
      const last = before.findLast((a) => a.stage === src);
      if (last) mark(last, 'redone');
    } else if (dir === 'BACKWARD') {
      const from = order.indexOf(tgt);
      const to = order.indexOf(src);
      const stages = from >= 0 && to >= from ? order.slice(from, to + 1) : [src];
      const why = src === LOOP_SOURCE ? 'loopBack' : 'jumpedBack';
      for (const a of before) if (stages.includes(a.stage)) mark(a, why);
    }
  }
  return attempts.filter((a) => reason.has(a)).map((a) => ({ ...a, reason: reason.get(a) }));
}

const KINDS = ['input', 'output', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead'];
const num = (v) => (Number.isFinite(v) ? v : 0);
const tokensOf = (r) => KINDS.reduce((s, k) => s + num(r?.[k]), 0);
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * US-1301 FR3: the rise of the cumulative readings (oldest first) across [from, to]: the last reading at or before each
 * end. A window starting before the first reading is an estimate (the rise from that reading on), with its reason;
 * `usd` is null when the readings carry none (rebuilt from transcripts).
 * @returns {{tokens: number, usd: number|null, estimate: boolean, why: {key: string, date?: string}|null}}
 */
export function costOfWindow(readings, from, to) {
  if (!readings?.length) return { tokens: 0, usd: 0, estimate: true, why: { key: 'noReadings' } };
  const first = readings[0];
  const a = readings.findLast((r) => r.at <= from) ?? first;
  const b = readings.findLast((r) => r.at <= to) ?? first;
  const usd = a.usd == null || b.usd == null ? null : Math.max(0, b.usd - a.usd);
  const tokens = Math.max(0, tokensOf(b) - tokensOf(a));
  const covered = first.at <= from;
  return { tokens, usd, estimate: !covered, why: covered ? null : { key: 'noReadingsBefore', date: dayOf(first.at) } };
}

/**
 * US-1301 FR3: one attempt's cost, window by window between every attempt's start and end, each window's rise shared
 * evenly by the attempts open in it.
 * ponytail: parallel units in one intent are split evenly, marked an estimate [assumption]; per-unit readings if they come.
 */
function priceAttempt(a, attempts, readings) {
  const inner = attempts.flatMap((o) => [o.from, o.to]).filter((p) => p > a.from && p < a.to);
  const points = [...new Set([a.from, ...inner, a.to])].sort((x, y) => x - y);
  if (points.length < 2) return costOfWindow(readings, a.from, a.to);
  let tokens = 0;
  let usd = 0;
  let why = null;
  for (let i = 0; i + 1 < points.length; i++) {
    const [p, q] = [points[i], points[i + 1]];
    const n = attempts.filter((o) => o.from <= p && o.to >= q).length || 1;
    const c = costOfWindow(readings, p, q);
    tokens += c.tokens / n;
    usd = usd == null || c.usd == null ? null : usd + c.usd / n;
    why ??= c.why ?? (n > 1 ? { key: 'parallel' } : null);
  }
  return { tokens: Math.round(tokens), usd, estimate: why != null, why };
}

const shareOf = (part, whole) => (whole.usd > 0 ? part.usd / whole.usd : whole.tokens > 0 ? part.tokens / whole.tokens : 0);

/**
 * US-1301 FR2, FR3: an intent's rework. `total` is the intent's cost from the ledger ({usd, tokens}), which stays the
 * source of the whole; readings rebuilt from transcripts (`source: 'rebuilt'`) carry no usd, so an attempt is priced by
 * its tokens' share of the total and marked an estimate. The sum never exceeds the total (constraint): the total wins,
 * marked an estimate. An intent archived before it completed counts its whole cost (FR2.5).
 * @returns {{total: {tokens: number, usd: number}, share: number, attempts: object[], estimate: boolean, why: object|null}}
 */
export function reworkOf({ events, readings, source, archived, finished, total }) {
  const all = { tokens: num(total?.tokens), usd: num(total?.usd) };
  if (archived && !finished) {
    const whole = { stage: null, unit: null, from: null, to: null, closedBy: null, reason: 'archived', ...all, estimate: false, why: null };
    return { total: all, share: all.usd > 0 || all.tokens > 0 ? 1 : 0, attempts: [whole], estimate: false, why: null };
  }
  const attempts = stageAttempts(events ?? []);
  const priced = thrownAway(attempts, events ?? []).map((a) => {
    const c = priceAttempt(a, attempts, readings ?? []);
    if (source !== 'rebuilt' && c.usd != null) return { ...a, ...c };
    const usd = all.tokens > 0 ? (c.tokens / all.tokens) * all.usd : 0;
    return { ...a, ...c, usd, estimate: true, why: { key: 'rebuilt' } };
  });
  const sum = priced.reduce((s, a) => ({ tokens: s.tokens + a.tokens, usd: s.usd + a.usd }), { tokens: 0, usd: 0 });
  const capped = total != null && ((all.tokens > 0 && sum.tokens > all.tokens) || (all.usd > 0 && sum.usd > all.usd));
  const shown = capped ? { tokens: Math.min(sum.tokens, all.tokens || sum.tokens), usd: Math.min(sum.usd, all.usd || sum.usd) } : sum;
  const why = capped ? { key: 'capped' } : (priced.find((a) => a.why)?.why ?? null);
  return { total: shown, share: Math.min(1, shareOf(shown, all)), attempts: priced, estimate: why != null, why };
}

/**
 * US-1301 FR4 [Q4]: the intent:rework handler's body. `loadHistory` gives `{source, readings}` (loadTokenHistory for a
 * finished intent, so missing readings are rebuilt from transcripts); a failed read is logged and priced without
 * readings, marked an estimate, so the cost tab never blanks.
 */
export async function loadRework({ intent, events, total, loadHistory }) {
  let history = { source: 'none', readings: [] };
  try {
    history = await loadHistory();
  } catch (err) {
    console.error(`Kunde inte läsa tokenhistorik för omarbete i ${intent?.dirName}:`, err.message);
  }
  return reworkOf({ events, readings: history.readings, source: history.source, archived: isArchived(intent), finished: isFinished(intent), total });
}

/**
 * US-1301 FR5, NFR4: an intent's rework for the project overview, from its stored readings only (no transcript reads).
 * Without stored readings each thrown-away attempt gets its stage's ledger cost split evenly over that stage's attempts,
 * marked an estimate. `cost` is summarizeLedger's perIntent entry; null (no ledger entry) gives null.
 * ponytail: the ledger sums a stage's attempts, so the even split is a guess; readings are the real source when present.
 */
export function overviewRework({ events, readings, archived, finished, cost }) {
  if (!cost) return null;
  const total = { usd: num(cost.total?.usd), tokens: num(cost.total?.totalTokens) };
  if (readings?.length || (archived && !finished)) return reworkOf({ events, readings, source: 'recorded', archived, finished, total });
  const attempts = stageAttempts(events ?? []);
  const stageRow = new Map((cost.byStage ?? []).map((r) => [r.name, r]));
  const priced = thrownAway(attempts, events ?? []).map((a) => {
    const n = attempts.filter((o) => o.stage === a.stage).length;
    const row = stageRow.get(a.stage);
    return { ...a, tokens: Math.round(num(row?.totalTokens) / n), usd: num(row?.usd) / n, estimate: true, why: { key: 'ledger' } };
  });
  const sum = priced.reduce((s, a) => ({ tokens: s.tokens + a.tokens, usd: s.usd + a.usd }), { tokens: 0, usd: 0 });
  const shown = { tokens: Math.min(sum.tokens, total.tokens), usd: Math.min(sum.usd, total.usd) };
  return {
    total: shown,
    share: Math.min(1, shareOf(shown, total)),
    attempts: priced,
    estimate: priced.length > 0,
    why: priced.length ? { key: 'ledger' } : null
  };
}
