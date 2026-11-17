// US-0211 US1.3 AC1.3.1–AC1.3.3, US1.5 AC1.5.1: USD repriced from the stored token counts, beside the recorded USD.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { priceTokens, repriceMap } from '../../src/main/reprice.js';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import { shardCosts } from '../../src/main/parsers/auditCost.js';
import { mergeAudits } from '../../src/main/parsers/audit.js';

const ledger = JSON.parse(readFileSync(path.join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const audit = readFileSync(path.join(process.cwd(), 'tests/fixtures/cost/hostb-bbbbbbbbbbbb.md'), 'utf8');
// A fixed table: opus from the project file, sonnet from the app's table; haiku-5-5 has no rate here.
const RATES = {
  'opus-5-5': { input: 1, output: 10, cacheWrite5m: 2, cacheWrite1h: 3, cacheRead: 0.5, source: 'project' },
  'sonnet-5-5': { input: 2, output: 10, cacheWrite5m: 2.5, cacheWrite1h: 4, cacheRead: 0.1, source: 'app' }
};
const M = 1e6;
const intents = [
  { dirName: '261113-a', uuid: '01a1c625-50f3-7f83-9755-b096bf4025e6', slug: 'a', scope: 'feature', date: '2026-11-13' },
  { dirName: '261113-b', uuid: '01a1d000-0000-7000-8000-000000000003', slug: 'b', scope: 'feature', date: '2026-11-13' }
];

describe('priceTokens (US-0211 FR2.1, FR2.3)', () => {
  it('prices a sonnet-5-5 ledger node from its five counts, cache reads at $0.10/M (AC1.3.1)', () => {
    const tokens = { input: M, output: M, cacheCreate5m: M, cacheCreate1h: M, cacheRead: M };
    expect(priceTokens('sonnet-5-5', tokens, RATES)).toBeCloseTo(2 + 10 + 2.5 + 4 + 0.1, 10);
    expect(priceTokens('claude-sonnet-5-5', { cacheRead: 10 * M }, RATES)).toBeCloseTo(1, 10);
  });

  it('prices an audit row without a 5m/1h split at the 5m rate (AC1.3.2, FR2.2)', () => {
    const [b] = shardCosts(mergeAudits([{ source: 'hostb-bbbbbbbbbbbb.md', text: audit }]));
    const t = b.node.byModel['sonnet-5-5'].tokens; // 30/3k/1.2M/6k as in/out/read/write
    expect(t.cacheCreate1h).toBe(0);
    expect(priceTokens('sonnet-5-5', t, RATES)).toBeCloseTo((30 * 2 + 3000 * 10 + 1.2 * M * 0.1 + 6000 * 2.5) / M, 10);
  });

  it('gives null for a model with no rate, and never borrows another row (AC1.3.3)', () => {
    expect(priceTokens('claude-haiku-5-5', { input: M }, RATES)).toBeNull();
    expect(priceTokens('opus-5', { input: M }, RATES)).toBeNull();
    expect(priceTokens('opus-5-5', { input: M }, null)).toBeNull();
  });
});

describe('repriceMap (US-0211 FR2.3, AC1.5.1)', () => {
  it('sums the priced models and counts the ones without a rate', () => {
    const r = repriceMap(ledger.byModel, RATES);
    expect(r.missing).toBe(1); // claude-haiku-5-5
    expect(r.usd).toBeCloseTo(priceTokens('opus-5-5', ledger.byModel['opus-5-5'].tokens, RATES) + priceTokens('sonnet-5-5', ledger.byModel['sonnet-5-5'].tokens, RATES), 10);
  });
  it('is null when no model in it has a rate, and ignores rows without tokens', () => {
    expect(repriceMap({ 'claude-haiku-5-5': ledger.byModel['claude-haiku-5-5'] }, RATES)).toEqual({ usd: null, missing: 1 });
    expect(repriceMap({ '<synthetic>': { tokens: {} } }, RATES)).toEqual({ usd: null, missing: 0 });
    expect(repriceMap(undefined, RATES)).toEqual({ usd: null, missing: 0 });
  });
});

describe('summarizeLedger with a rate table (US-0211 FR2, US1.5)', () => {
  const s = summarizeLedger(ledger, intents, RATES);

  it('gives every model row its current figure and the source of its rate (FR1.5)', () => {
    const opus = s.project.byModel.find((r) => r.name === 'opus-5-5');
    expect(opus.currentUsd).toBeCloseTo(priceTokens('opus-5-5', ledger.byModel['opus-5-5'].tokens, RATES), 10);
    expect(opus.source).toBe('project');
    const haiku = s.project.byModel.find((r) => r.name === 'claude-haiku-5-5');
    expect(haiku.currentUsd).toBeNull();
    expect(haiku.source).toBeNull();
    expect(haiku.key).toBe('haiku-5-5');
  });

  it('keeps agent rows at the recorded figure only (deviation: the record does not tie agents to models)', () => {
    expect(s.project.byAgent.length).toBeGreaterThan(0);
    expect(s.project.byAgent.every((r) => r.currentUsd === undefined)).toBe(true);
  });

  it('sums intent, stage and project totals from their models, missing ones counted (AC1.5.1)', () => {
    const a = s.perIntent['261113-a'];
    expect(a.total.currentUsd).toBeCloseTo(a.byModel.reduce((n, r) => n + r.currentUsd, 0), 10);
    expect(a.total.currentMissing).toBe(0);
    expect(a.byStage.every((r) => typeof r.currentUsd === 'number')).toBe(true);
    const b = s.perIntent['261113-b'];
    expect(b.total.currentMissing).toBe(1);
    expect(s.project.total.currentUsd).toBeCloseTo(repriceMap(ledger.byModel, RATES).usd, 10);
    expect(s.project.total.currentMissing).toBe(1);
  });

  it('sums the scope and timeline figures from the intents (AC1.5.1)', () => {
    const sum = s.perIntent['261113-a'].total.currentUsd + s.perIntent['261113-b'].total.currentUsd;
    expect(s.byScope.feature.currentUsd).toBeCloseTo(sum, 10);
    expect(s.byScope.feature.currentMissing).toBe(1);
    expect(s.timeline.map((p) => p.currentUsd)).toEqual([s.perIntent['261113-a'].total.currentUsd, s.perIntent['261113-b'].total.currentUsd]);
  });

  it('adds nothing without a rate table, so the recorded summary is unchanged', () => {
    const plain = summarizeLedger(ledger, intents);
    expect(plain.project.total.currentUsd).toBeUndefined();
    expect(plain.project.byModel[0].currentUsd).toBeUndefined();
    expect(plain.timeline[0].currentUsd).toBeUndefined();
  });
});
