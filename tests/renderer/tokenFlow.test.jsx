import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import { HISTORY_MAX, meterLevel, niceCeil, pushSample, tokensOf } from '../../src/renderer/tokenFlow.js';

// The fixture ledger, summarised as `project:cost` sends it (EPIC-02 US-0207).
const ledger = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const UUID = '01a1c625-50f3-7f83-9755-b096bf4025e6';
const intents = [{ dirName: '261113-live', uuid: UUID, slug: 'live', scope: 'feature', date: null }];
const cost = (l = ledger) => ({ available: true, ...summarizeLedger(l, intents) });
/** A later reading of the same ledger: more input and output for the intent. */
function later(extraIn, extraOut) {
  const next = structuredClone(ledger);
  const t = next.workflows[`intent:${UUID}`].totals.tokens;
  t.input += extraIn;
  t.output += extraOut;
  return next;
}

describe('tokenFlow (US-0207 FR1.3, NFR5)', () => {
  it('reads the intent\'s tokens from the ledger, with cache write = 5m + 1h', () => {
    expect(tokensOf(cost(), '261113-live')).toEqual({ input: 3000, output: 1500, cacheWrite: 300, cacheRead: 5000 });
  });

  it('a missing intent, a missing entry or no ledger gives null', () => {
    expect(tokensOf(cost(), 'other')).toBeNull();
    expect(tokensOf({ available: true, ...summarizeLedger(ledger, [{ ...intents[0], uuid: null }]) }, '261113-live')).toBeNull();
    expect(tokensOf({ available: false, reason: 'saknas' }, '261113-live')).toBeNull();
    expect(tokensOf(null, '261113-live')).toBeNull();
  });

  it('computes the rate in tokens per minute from two readings, and skips an unchanged one', () => {
    const t0 = 1_000_000;
    let h = pushSample([], tokensOf(cost(), '261113-live'), t0);
    expect(h).toEqual([{ at: t0, total: 9800, tokens: expect.any(Object), rate: 0 }]);
    h = pushSample(h, tokensOf(cost(later(1000, 500)), '261113-live'), t0 + 30_000); // +1500 in 30 s
    expect(h.map((s) => s.rate)).toEqual([0, 3000]);
    expect(pushSample(h, tokensOf(cost(later(1000, 500)), '261113-live'), t0 + 60_000)).toBe(h); // no new tokens
    expect(pushSample(h, null, t0 + 60_000)).toBe(h); // a missing reading keeps the history (NFR5)
  });

  it('a lower total (a new session or a reset) starts a new history; it keeps at most HISTORY_MAX', () => {
    const h = pushSample(pushSample([], { input: 900, output: 0, cacheWrite: 0, cacheRead: 0 }, 0), { input: 1000, output: 0, cacheWrite: 0, cacheRead: 0 }, 60_000);
    expect(h).toHaveLength(2);
    const reset = pushSample(h, { input: 10, output: 0, cacheWrite: 0, cacheRead: 0 }, 120_000);
    expect(reset).toEqual([{ at: 120_000, total: 10, tokens: expect.any(Object), rate: 0 }]);
    let long = [];
    for (let i = 1; i <= HISTORY_MAX + 5; i++) long = pushSample(long, { input: i, output: 0, cacheWrite: 0, cacheRead: 0 }, i * 1000);
    expect(long).toHaveLength(HISTORY_MAX);
    expect(long[0].total).toBe(6);
  });

  it('meter levels hold at the boundaries, on a scale rounded up to 1, 2 or 5 × 10^k', () => {
    expect([niceCeil(0), niceCeil(1), niceCeil(3), niceCeil(5000), niceCeil(5001), niceCeil(12_345)]).toEqual([0, 1, 5, 5000, 10_000, 20_000]);
    expect(meterLevel(0, 5000)).toEqual({ level: 0, scale: 5000 });
    expect(meterLevel(1, 5000)).toEqual({ level: 1, scale: 5000 }); // any use lights one segment
    expect(meterLevel(500, 5000).level).toBe(1);
    expect(meterLevel(501, 5000).level).toBe(2);
    expect(meterLevel(5000, 5000)).toEqual({ level: 10, scale: 5000 });
    expect(meterLevel(9999, 5000).level).toBe(10); // never above the top segment
    expect(meterLevel(10, 0)).toEqual({ level: 0, scale: 0 });
  });
});
