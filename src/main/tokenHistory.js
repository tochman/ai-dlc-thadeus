// US-0215: token history for a finished intent. Recorded readings (.thadeus/tokens/) stay the source whenever any exist
// (FR1.1); with none, the history is rebuilt from the Claude Code transcripts the ledger names for the intent, counting
// only the calls inside the intent's stage windows (FR2). Read-only: nothing is written; a rebuild is kept in memory (FR6).
import { promises as fs } from 'node:fs';
import { insideDir } from './contextSize.js';
import { MAX_READINGS, readReadings } from './tokenReadings.js';

const count = (n) => (Number.isFinite(n) && n >= 0 ? n : 0);
const KINDS = ['input', 'output', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead'];
const totalOf = (r) => (r ? KINDS.reduce((s, k) => s + r[k], 0) : 0);
const LEDGER_KINDS = ['input', 'output', 'cacheCreate5m', 'cacheCreate1h', 'cacheRead'];
const SESSION_KEY = 'transcript:';

/** One transcript line into `calls` (message id -> call); the last line of an id wins. A broken line is skipped. */
function addLine(calls, line, index) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    return;
  }
  const usage = row?.type === 'assistant' ? row.message?.usage : null;
  const at = Date.parse(row?.timestamp);
  if (!usage || typeof usage !== 'object' || !Number.isFinite(at)) return;
  const split = usage.cache_creation;
  const hasSplit = split && typeof split === 'object';
  calls.set(typeof row.message.id === 'string' ? row.message.id : `#${index}`, {
    at,
    input: count(usage.input_tokens),
    output: count(usage.output_tokens),
    cacheWrite5m: hasSplit ? count(split.ephemeral_5m_input_tokens) : count(usage.cache_creation_input_tokens),
    cacheWrite1h: hasSplit ? count(split.ephemeral_1h_input_tokens) : 0,
    cacheRead: count(usage.cache_read_input_tokens)
  });
}

/**
 * US-0215 FR2.2: the model calls in transcript lines, one per `message.id` (Claude Code writes one line per content
 * block with the same usage), in order of first appearance.
 * @returns {{at: number, input: number, output: number, cacheWrite5m: number, cacheWrite1h: number, cacheRead: number}[]}
 */
export function callsOfTranscript(lines) {
  const calls = new Map();
  lines.forEach((line, i) => addLine(calls, line, i));
  return [...calls.values()];
}

const OPENS = new Set(['STAGE_STARTED', 'WORKFLOW_UNPARKED']);
const CLOSES = new Set(['STAGE_COMPLETED', 'STAGE_SKIPPED', 'STAGE_JUMPED', 'WORKFLOW_PARKED', 'WORKFLOW_COMPLETED']);

/**
 * US-0215 FR2.3: the intent's working windows from its audit events (time order). A stage start or an unpark opens one;
 * a completion, skip, jump, park, workflow end or the next start closes it; one still open runs to the last event.
 * An audit without stage events (older records) gives one first-to-last window.
 * @returns {{start: number, end: number}[]}
 */
export function stageWindows(events) {
  const timed = events.filter((e) => Number.isFinite(e.timeMs));
  if (!timed.length) return [];
  if (!timed.some((e) => e.event === 'STAGE_STARTED')) return [{ start: timed[0].timeMs, end: timed.at(-1).timeMs }];
  const windows = [];
  let open = null;
  for (const e of timed) {
    if (open != null && (OPENS.has(e.event) || CLOSES.has(e.event))) {
      windows.push({ start: open, end: e.timeMs });
      open = null;
    }
    if (OPENS.has(e.event)) open = e.timeMs;
  }
  if (open != null) windows.push({ start: open, end: timed.at(-1).timeMs });
  return windows;
}

/** US-0215 FR4.3: wall-clock milliseconds from the workflow's start to its completion; null when it has not completed. */
export function wallClockMs(events) {
  const start = events.find((e) => e.event === 'WORKFLOW_STARTED')?.timeMs;
  const end = events.findLast((e) => e.event === 'WORKFLOW_COMPLETED')?.timeMs;
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null;
}

/** US-0215 FR2.1, NFR1: a transcript's calls, read line by line, only inside `allowedDir`; null when outside or unreadable. */
export async function readTranscriptCalls(file, allowedDir) {
  const abs = insideDir(file, allowedDir);
  if (!abs) return null;
  try {
    const fh = await fs.open(abs, 'r');
    const calls = new Map();
    let i = 0;
    for await (const line of fh.readLines()) addLine(calls, line, i++); // the stream closes the file at its end or error
    return [...calls.values()];
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[token history] transcript read failed:', err.code ?? err.message);
    return null;
  }
}

/**
 * US-0215 FR2.3, FR2.4: the calls inside a window as cumulative readings in the stored shape (`usd` unknown, null),
 * oldest first; calls at the same millisecond make one reading.
 * ponytail: past MAX_READINGS an even stride is kept (and the last), like stored files; finer only if a chart needs it.
 */
export function rebuildReadings(calls, windows) {
  const inside = calls.filter((c) => windows.some((w) => c.at >= w.start && c.at <= w.end)).sort((a, b) => a.at - b.at);
  const readings = [];
  for (const c of inside) {
    const prev = readings.at(-1);
    const next = { at: c.at, ...Object.fromEntries(KINDS.map((k) => [k, (prev?.[k] ?? 0) + c[k]])), usd: null };
    if (prev?.at === c.at) readings[readings.length - 1] = next;
    else readings.push(next);
  }
  if (readings.length <= MAX_READINGS) return readings;
  const stride = Math.ceil(readings.length / MAX_READINGS);
  return readings.filter((_, i) => i % stride === 0 || i === readings.length - 1);
}

// US-0215 FR6: rebuilt histories per project root and intent while the app runs; a finished intent does not change.
// ponytail: never evicted; one small entry per opened finished intent. An LRU if many hundreds are opened in one run.
const rebuilt = new Map();

/**
 * US-0215 FR1.1, FR2, FR3, FR5, FR6: a finished intent's token history. Recorded readings win whenever any exist;
 * otherwise the ledger's transcript sessions for the intent are read (only inside `projectsDir`) and rebuilt inside its
 * stage windows. `gap` says why the rebuilt total differs from the ledger's, or is null when they agree.
 * @param {{root: string, dirName: string, uuid: string|null, ledger: object|null, events: object[], projectsDir: string, readStored?: Function}} args
 * @returns {Promise<{source: 'recorded'|'rebuilt'|'none', readings: object[], wallMs: number|null, gap: object|null}>}
 */
export async function loadTokenHistory({ root, dirName, uuid, ledger, events, projectsDir, readStored = readReadings }) {
  const wallMs = wallClockMs(events);
  const stored = await readStored(root, dirName);
  if (stored.length) return { source: 'recorded', readings: stored, wallMs, gap: null };
  const key = `${root}\0${dirName}`;
  if (rebuilt.has(key)) return rebuilt.get(key);

  const wf = uuid ? ledger?.workflows?.[`intent:${uuid}`] : null;
  const files = Object.keys(wf?.sessions ?? {})
    .filter((k) => k.startsWith(SESSION_KEY))
    .map((k) => k.slice(SESSION_KEY.length));
  const read = await Promise.all(files.map((f) => readTranscriptCalls(f, projectsDir)));
  const calls = read.flatMap((c) => c ?? []);
  const readings = rebuildReadings(calls, stageWindows(events));
  const rebuiltTokens = totalOf(readings.at(-1));
  const ledgerTokens = LEDGER_KINDS.reduce((s, k) => s + count(wf?.totals?.tokens?.[k]), 0);
  const gap =
    wf && ledgerTokens !== rebuiltTokens
      ? {
          ledgerTokens,
          rebuiltTokens,
          missingSessions: read.filter((c) => c == null).length,
          outsideTokens: calls.reduce((s, c) => s + totalOf(c), 0) - rebuiltTokens
        }
      : null;
  const result = { source: readings.length ? 'rebuilt' : 'none', readings, wallMs, gap };
  rebuilt.set(key, result);
  return result;
}
