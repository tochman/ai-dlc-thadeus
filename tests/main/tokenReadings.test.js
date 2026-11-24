// Stored token readings per intent (EPIC-02 US-0208 FR2): the reading shape, the 30 s throttle, the thinning past
// 2000 readings, and the file under .thadeus/tokens/ in a temp project.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import { MAX_READINGS, addReading, mergeReading, readReadings, readingOf, recordReading } from '../../src/main/tokenReadings.js';

const ledger = JSON.parse(readFileSync(path.join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const UUID = '01a1c625-50f3-7f83-9755-b096bf4025e6';
const intentCost = () => summarizeLedger(ledger, [{ dirName: '261113-live', uuid: UUID, slug: 'live', scope: 'feature', date: null }]).perIntent['261113-live'];
const reading = (at, input = 100) => ({ at, input, output: 10, cacheWrite5m: 1, cacheWrite1h: 0, cacheRead: 50, usd: 0.1 });

let tmp;
beforeEach(async () => {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'token-readings-')));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('readingOf (US-0208 FR2.3)', () => {
  it('maps an intent cost to the reading shape, with cache write 5 m and 1 h kept apart', () => {
    expect(readingOf(intentCost(), 1000)).toEqual({ at: 1000, input: 3000, output: 1500, cacheWrite5m: 200, cacheWrite1h: 100, cacheRead: 5000, usd: 4 });
    expect(readingOf(null, 1000)).toBeNull();
  });
});

describe('addReading (US-0208 FR2, FR2.2, NFR4)', () => {
  it('skips a reading under 30 s after the last and an unchanged one, and appends otherwise', () => {
    const first = addReading([], reading(0));
    expect(first).toEqual([reading(0)]);
    expect(addReading(first, reading(29_999, 200))).toBe(first); // too soon
    expect(addReading(first, reading(60_000))).toBe(first); // unchanged totals
    expect(addReading(first, reading(30_000, 200))).toEqual([reading(0), reading(30_000, 200)]);
  });

  it('past 2000 readings thins the oldest half and keeps the newest', () => {
    const full = Array.from({ length: MAX_READINGS }, (_, i) => reading(i * 30_000, i + 1));
    const next = addReading(full, reading(MAX_READINGS * 30_000, MAX_READINGS + 1));
    expect(next.length).toBeLessThanOrEqual(MAX_READINGS);
    expect(next.length).toBeGreaterThan(MAX_READINGS / 2);
    expect(next[0]).toEqual(full[0]); // the start stays
    expect(next.at(-1).input).toBe(MAX_READINGS + 1);
    expect(next.slice(-1000).map((r) => r.input)).toEqual(Array.from({ length: 1000 }, (_, i) => MAX_READINGS - 998 + i)); // newest half untouched
    expect(JSON.stringify(next).length).toBeLessThan(200_000); // NFR4
  });
});

describe('mergeReading (US-1409 BR2.2)', () => {
  const turn = (n, usd = 0.01) => ({ input: n, output: n, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: n, usd });

  it('starts a list with the turn as the first cumulative reading', () => {
    expect(mergeReading([], turn(5), 1000)).toEqual([{ at: 1000, input: 5, output: 5, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 5, usd: 0.01 }]);
  });

  it('replaces the last reading with the new total when the turn ends under 30 s after it, so nothing is lost', () => {
    const first = mergeReading([], turn(5), 0);
    expect(mergeReading(first, turn(3), 29_999)).toEqual([{ at: 29_999, input: 8, output: 8, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 8, usd: 0.02 }]);
  });

  it('appends a new cumulative reading 30 s or more after the last', () => {
    const first = mergeReading([], turn(5), 0);
    const next = mergeReading(first, turn(3, 0), 30_000);
    expect(next.map((r) => [r.at, r.input, r.usd])).toEqual([
      [0, 5, 0.01],
      [30_000, 8, 0.01]
    ]);
  });

  it('past 2000 readings thins the oldest half, as addReading does', () => {
    const full = Array.from({ length: MAX_READINGS }, (_, i) => reading(i * 30_000, i + 1));
    const next = mergeReading(full, turn(1), MAX_READINGS * 30_000);
    expect(next.length).toBeLessThanOrEqual(MAX_READINGS);
    expect(next[0]).toEqual(full[0]);
    expect(next.at(-1).input).toBe(MAX_READINGS + 1);
  });
});

describe('recordReading / readReadings (US-0208 FR2.1)', () => {
  it('round-trips through .thadeus/tokens/<dir>.json; a missing file reads []', async () => {
    expect(await readReadings(tmp, '261113-live')).toEqual([]);
    await recordReading(tmp, '261113-live', reading(0));
    await recordReading(tmp, '261113-live', reading(10_000, 200)); // throttled
    await recordReading(tmp, '261113-live', reading(40_000, 300));
    expect(await readReadings(tmp, '261113-live')).toEqual([reading(0), reading(40_000, 300)]);
    const onDisk = JSON.parse(await fs.readFile(path.join(tmp, '.thadeus/tokens/261113-live.json'), 'utf8'));
    expect(onDisk).toHaveLength(2);
  });

  it('a corrupt file is logged and reads [], and the next reading starts over', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await fs.mkdir(path.join(tmp, '.thadeus/tokens'), { recursive: true });
    await fs.writeFile(path.join(tmp, '.thadeus/tokens/261113-live.json'), '[{"at":');
    expect(await readReadings(tmp, '261113-live')).toEqual([]);
    expect(log).toHaveBeenCalled();
    await recordReading(tmp, '261113-live', reading(0));
    expect(await readReadings(tmp, '261113-live')).toEqual([reading(0)]);
  });

  it('refuses a dir name with .. or a slash', async () => {
    for (const bad of ['..', '../x', 'a/b', 'a\\b', '', 'a..b']) {
      await expect(readReadings(tmp, bad)).rejects.toThrow();
      await expect(recordReading(tmp, bad, reading(0))).rejects.toThrow();
    }
    await expect(fs.access(path.join(tmp, '.thadeus'))).rejects.toThrow();
  });
});
