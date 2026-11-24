// Stored token readings per intent (EPIC-02 US-0208 FR2): the ledger has totals but no timestamps, so main keeps its
// own cumulative readings in .thadeus/tokens/<intent-dir>.json, at most one every 30 s, to draw the time history.
// readingOf and addReading are pure; the file is written atomically inside the project root (FR2.1, NFR2).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readJsonSafe, resolveInRoot } from './projectAccess.js';
import { writeAtomic } from './fileWrite.js';
import { t } from '../shared/i18n.js';

export const TOKENS_DIR = '.thadeus/tokens';
/** At most this many readings per file, about 200 kB (FR2.2, NFR4). */
export const MAX_READINGS = 2000;
const MIN_GAP_MS = 30_000;
const KINDS = ['input', 'output', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead', 'usd'];

/**
 * US-0208 FR2.3: one cumulative reading from an intent's ledger summary (`summarizeLedger`'s perIntent entry).
 * @returns {{at: number, input: number, output: number, cacheWrite5m: number, cacheWrite1h: number, cacheRead: number, usd: number}|null}
 */
export function readingOf(intentCost, now) {
  const tk = intentCost?.tokens;
  if (!tk) return null;
  return {
    at: now,
    input: tk.input,
    output: tk.output,
    cacheWrite5m: tk.cacheCreate5m,
    cacheWrite1h: tk.cacheCreate1h,
    cacheRead: tk.cacheRead,
    usd: intentCost.total.usd
  };
}

/**
 * US-0208 FR2, FR2.2: appends `reading` unless it comes under 30 s after the last or changes nothing (then the same
 * array comes back). Past MAX_READINGS every second reading of the oldest half is dropped, so history thins, never ends.
 */
export function addReading(list, reading) {
  const last = list.at(-1);
  if (last && (reading.at - last.at < MIN_GAP_MS || KINDS.every((k) => reading[k] === last[k]))) return list;
  return thin([...list, reading]);
}

/** FR2.2: past MAX_READINGS every second reading of the oldest half is dropped. */
function thin(list) {
  if (list.length <= MAX_READINGS) return list;
  const half = Math.floor(list.length / 2);
  return [...list.slice(0, half).filter((_, i) => i % 2 === 0), ...list.slice(half)];
}

/**
 * US-1409 BR2.2: adds one turn's tokens and dollars (`turn`, the reading kinds without `at`) to the last cumulative
 * reading. Under 30 s after the last reading the new total replaces it, so no usage is lost to the throttle; otherwise
 * it is appended. Thins like addReading.
 */
export function mergeReading(list, turn, at) {
  const last = list.at(-1);
  const next = { at, ...Object.fromEntries(KINDS.map((k) => [k, (last?.[k] ?? 0) + (turn[k] ?? 0)])) };
  return thin([...(last && at - last.at < MIN_GAP_MS ? list.slice(0, -1) : list), next]);
}

function fileOf(dirName) {
  if (typeof dirName !== 'string' || !/^[\w.-]+$/.test(dirName) || dirName.includes('..')) {
    throw new Error(t('errors.invalidName', { what: 'intent', name: String(dirName) }));
  }
  return `${TOKENS_DIR}/${dirName}.json`;
}

/** US-0208 FR2.1: the intent's readings, oldest first. A missing file is []; a corrupt one is logged and read as []. */
export async function readReadings(root, dirName) {
  const rel = fileOf(dirName);
  const res = await readJsonSafe(root, rel);
  if (res.ok && Array.isArray(res.value)) return res.value;
  if (!res.missing) console.error(`Kunde inte läsa ${rel}:`, res.error ?? 'not a list');
  return [];
}

/**
 * US-0208 FR2, FR2.1: adds `reading` to the intent's file when addReading takes it. Rejects on a failed write; the
 * caller logs it and the next ledger change tries again (NFR2).
 * ponytail: read-modify-write without a lock; two calls inside the same 30 s can race, the 30 s throttle makes it rare.
 * @returns {Promise<boolean>} true when a reading was written
 */
export async function recordReading(root, dirName, reading) {
  const list = await readReadings(root, dirName); // checks the name, like writeReadings
  const next = addReading(list, reading);
  if (next === list) return false;
  await writeReadings(root, dirName, next);
  return true;
}

/**
 * US-0208 FR2.1, US-1409 BR3.1, NFR3.4: writes `list` atomically as `.thadeus/tokens/<key>.json`. The key passes the
 * name check; a `.thadeus` that links out of the project is refused. `write` is writeAtomic (a test may wrap it).
 */
export async function writeReadings(root, key, list, write = writeAtomic) {
  const rel = fileOf(key);
  let dir;
  // One level at a time, so a symlinked .thadeus pointing outside the project is refused before anything is made in it.
  for (const level of ['.thadeus', TOKENS_DIR]) {
    await fs.mkdir(path.join(root, level)).catch((err) => {
      if (err.code !== 'EEXIST') throw err;
    });
    dir = await resolveInRoot(root, level);
  }
  await write(path.join(dir, path.basename(rel)), JSON.stringify(list));
}
