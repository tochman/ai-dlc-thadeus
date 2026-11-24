// US-1409 (contract C8): a token log per Spec Kit feature. At each agent turn end (Claude Code Stop, opencode usage)
// the session's new usage is credited to the feature `.specify/feature.json` names, else to `speckit-project`, in
// `.thadeus/tokens/speckit-<key>.json`. A per-project cursor in the app's user data counts each call once.
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { insideDir } from './contextSize.js';
import { writeAtomic } from './fileWrite.js';
import { priceTokens } from './reprice.js';
import { activeFeature } from './speckitFeatures.js';
import { callsOfTranscript } from './tokenHistory.js';
import { mergeReading, readReadings, writeReadings } from './tokenReadings.js';

export const PROJECT_BUCKET = 'speckit-project';
const CURSOR_DIR = 'speckit-tokens';
const PRUNE_MS = 30 * 24 * 3600 * 1000;
const COUNTS = ['input', 'output', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead'];
const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const countsOf = (c, kinds = COUNTS) => Object.fromEntries(kinds.map((k) => [k, num(c?.[k])]));

/** NFR3.5: one cursor file per project root, in user data, named by the root's hash (never the project). */
const cursorFile = (userDataDir, root) => path.join(userDataDir, CURSOR_DIR, `${createHash('sha1').update(root).digest('hex')}.json`);

/** NFR3.5: a session's entry as stored: `seenAt`, counts per message id (Claude) and/or a running total (opencode). */
function cleanSession(s) {
  const out = { seenAt: num(s?.seenAt) };
  if (isObject(s?.calls)) out.calls = Object.fromEntries(Object.entries(s.calls).map(([id, c]) => [id, countsOf(c)]));
  if (isObject(s?.total)) out.total = countsOf(s.total, [...COUNTS, 'usd']);
  return out;
}

/**
 * US-1409 NFR3.5: the project's session cursor `{ sessions: { [sessionKey]: entry } }`. A missing file is empty; a
 * corrupt one is logged and read as empty.
 * ponytail: a lost cursor recounts the sessions' earlier calls into `speckit-project` once; rebuild from the buckets if
 * that double credit ever matters.
 */
export async function readCursor(userDataDir, root) {
  const file = cursorFile(userDataDir, root);
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return { sessions: isObject(parsed?.sessions) ? parsed.sessions : {} };
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`[speckit tokens] cursor unreadable, starting over: ${file}: ${err.message}`);
    return { sessions: {} };
  }
}

/** US-1409 NFR3.5, BR3.2: writes the cursor atomically with ids and counts only; sessions not seen for 30 days go. */
export async function writeCursor(userDataDir, root, cursor, { now = Date.now(), write = writeAtomic } = {}) {
  const sessions = Object.fromEntries(
    Object.entries(cursor.sessions)
      .filter(([, s]) => now - num(s?.seenAt) <= PRUNE_MS)
      .map(([k, s]) => [k, cleanSession(s)])
  );
  const file = cursorFile(userDataDir, root);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await write(file, JSON.stringify({ sessions }));
}

// --- one turn's usage ------------------------------------------------------------------------------------------------
const zero = () => ({ ...countsOf(null), usd: 0 });
const hasUsage = (u) => Boolean(u) && [...COUNTS, 'usd'].some((k) => u[k] > 0);
const increase = (now, before, kinds) => Object.fromEntries(kinds.map((k) => [k, Math.max(0, num(now[k]) - num(before?.[k]))]));

/** A prompt the person typed: a user line that is not a tool result and not a meta line. */
function isPrompt(row) {
  const content = row?.message?.content;
  return row?.type === 'user' && !row.isMeta && (typeof content === 'string' || (Array.isArray(content) && !content.some((p) => p?.type === 'tool_result')));
}

/** NFR3.6: when the last prompt was sent, the start of the turn that just ended; -Infinity without one. */
function lastPromptAt(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"user"')) continue;
    try {
      const row = JSON.parse(lines[i]);
      if (isPrompt(row) && Number.isFinite(Date.parse(row.timestamp))) return Date.parse(row.timestamp);
    } catch {
      // a broken line is no prompt
    }
  }
  return -Infinity;
}

/**
 * NFR3.2: the transcript's lines, only when its real path lies inside the real `projectsDir` (so `..` and links out are
 * refused); null, with one console line, otherwise.
 * ponytail: each Stop reads the whole transcript (as US-0215 does); keep a byte offset in the cursor if that gets slow.
 */
async function readTranscript(file, projectsDir) {
  try {
    const [real, realDir] = await Promise.all([fs.realpath(file), fs.realpath(projectsDir)]);
    if (insideDir(real, realDir)) return (await fs.readFile(real, 'utf8')).split('\n');
    console.warn(`[speckit tokens] transcript outside ${projectsDir}, turn skipped: ${file}`);
  } catch (err) {
    console.warn(`[speckit tokens] transcript unreadable, turn skipped: ${file}: ${err.code ?? err.message}`);
  }
  return null;
}

/**
 * BR1.2, NFR6.2, NFR3.6, BR4.1: a Claude Code turn. Each call adds its increase over what the cursor counted for its
 * message id, priced per model (no price: tokens only). At first sight of the session the calls before the last prompt
 * are `earlier` (the project bucket) and the rest the `turn`.
 */
async function claudeUsage(file, prev, { projectsDir, ratesOf, root }) {
  const lines = await readTranscript(file, projectsDir);
  if (!lines) return null;
  const rates = await ratesOf(root);
  const since = prev ? -Infinity : lastPromptAt(lines);
  const earlier = zero();
  const turn = zero();
  const calls = { ...prev?.calls };
  for (const c of callsOfTranscript(lines)) {
    const id = c.id ?? `@${c.at}`;
    const inc = increase(c, prev?.calls?.[id], COUNTS);
    calls[id] = countsOf(c);
    const usd = priceTokens(c.model, { ...inc, cacheCreate5m: inc.cacheWrite5m, cacheCreate1h: inc.cacheWrite1h }, rates) ?? 0;
    const into = c.at < since ? earlier : turn;
    for (const k of COUNTS) into[k] += inc[k];
    into.usd += usd;
  }
  return { earlier, turn, session: { calls } };
}

/**
 * BR1.3, NFR6.1, NFR6.2: an opencode `session.usage.updated` event holds the session's running totals and cost, so a
 * turn is their increase over the cursor's. Reasoning counts as output. At first sight the totals so far go to the
 * project bucket (NFR3.6). An event without tokens is ignored.
 */
function opencodeUsage(usage, prev) {
  const tk = usage?.tokens;
  if (!isObject(tk)) return null;
  const total = {
    input: num(tk.input),
    output: num(tk.output) + num(tk.reasoning),
    cacheWrite5m: num(tk.cache?.write),
    cacheWrite1h: 0,
    cacheRead: num(tk.cache?.read),
    usd: num(usage.cost)
  };
  const inc = increase(total, prev?.total, [...COUNTS, 'usd']);
  return { earlier: prev ? null : inc, turn: prev ? inc : null, session: { total } };
}

/** BR1.4, BR2.1, BR3.1, NFR3.3: the active feature's bucket at turn end; no feature or a bad name gives the project one. */
async function bucketOf(root) {
  const dir = await activeFeature(root).catch((err) => console.warn(`[speckit tokens] feature.json unreadable: ${err.message}`));
  const key = `speckit-${dir}`;
  return dir && /^[\w.-]+$/.test(key) && !key.includes('..') ? key : PROJECT_BUCKET;
}

/** NFR3.6, BR1.4: bucket -> usage to add; `earlier` goes to the project bucket, `turn` to the active one (summed if equal). */
async function bucketsOf(root, { earlier, turn }) {
  const buckets = new Map();
  for (const [bucket, part] of [
    [PROJECT_BUCKET, earlier],
    [await bucketOf(root), turn]
  ]) {
    if (!hasUsage(part)) continue;
    const sum = buckets.get(bucket) ?? zero();
    for (const k of Object.keys(sum)) sum[k] += part[k];
    buckets.set(bucket, sum);
  }
  return buckets;
}

/**
 * US-1409 W1, FR9.1–FR9.3: the turn logger. `onTurn({ root, harness, sessionId, transcriptPath | usage })` credits one
 * turn of a Spec Kit project (the caller checks the framework, BR1.1); turns of one project run one at a time. It never
 * rejects: a failure is one console line (NFR1.1) and the cursor stays, so the next turn picks the usage up (BR3.2).
 * @param {{userDataDir: string, projectsDir: string, ratesOf: (root: string) => Promise<object>, now?: () => number, write?: Function}} deps
 */
export function createSpeckitTokens({ userDataDir, projectsDir, ratesOf, now = Date.now, write = (...args) => writeAtomic(...args) }) {
  const queues = new Map(); // project root -> the last queued turn

  async function credit({ root, harness, sessionId, transcriptPath, usage }) {
    const cursor = await readCursor(userDataDir, root);
    const key = harness === 'opencode' ? `opencode:${sessionId}` : `claude:${transcriptPath}`;
    const prev = cursor.sessions[key] ?? null;
    const found = harness === 'opencode' ? opencodeUsage(usage, prev) : await claudeUsage(transcriptPath, prev, { projectsDir, ratesOf, root });
    if (!found || (prev && !hasUsage(found.turn))) return;
    const at = now();
    for (const [bucket, part] of await bucketsOf(root, found)) {
      try {
        await writeReadings(root, bucket, mergeReading(await readReadings(root, bucket), part, at), write);
      } catch (err) {
        console.error(`[speckit tokens] could not write ${bucket}, kept for the next turn: ${err.message}`);
        return;
      }
    }
    // ponytail: a crash between the bucket write and this cursor write credits that turn twice; rare, and a log only.
    cursor.sessions[key] = { ...found.session, seenAt: at };
    await writeCursor(userDataDir, root, cursor, { now: at, write });
  }

  return {
    onTurn(turn) {
      const run = (queues.get(turn.root) ?? Promise.resolve())
        .then(() => credit(turn))
        .catch((err) => console.error(`[speckit tokens] turn not credited: ${err.message}`));
      queues.set(turn.root, run);
      return run;
    }
  };
}
