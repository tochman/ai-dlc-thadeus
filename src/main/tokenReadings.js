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
  const next = [...list, reading];
  if (next.length <= MAX_READINGS) return next;
  const half = Math.floor(next.length / 2);
  return [...next.slice(0, half).filter((_, i) => i % 2 === 0), ...next.slice(half)];
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
  const rel = fileOf(dirName);
  const list = await readReadings(root, dirName);
  const next = addReading(list, reading);
  if (next === list) return false;
  await fs.mkdir(path.join(root, TOKENS_DIR), { recursive: true });
  const dir = await resolveInRoot(root, TOKENS_DIR); // a symlinked .thadeus pointing outside the project is refused
  await writeAtomic(path.join(dir, path.basename(rel)), JSON.stringify(next));
  return true;
}
