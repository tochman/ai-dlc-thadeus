// US-0209 FR1.1–FR1.3, NFR1: the cost rollups in the committed audit shards, read as ledger-shaped nodes.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { mergeAudits } from '../../src/main/parsers/audit.js';
import { shardCosts, stageRollups } from '../../src/main/parsers/auditCost.js';

const FIX = path.join(process.cwd(), 'tests/fixtures/cost');
const shard = (file, source = file) => ({ source, text: readFileSync(path.join(FIX, file), 'utf8') });
const events = (...files) => mergeAudits(files);

describe('stageRollups (US-0209 FR1.1–FR1.3)', () => {
  it('reads one STAGE_COMPLETED block as USD and tokens, by model and agent, with 1.2M and 3k read as numbers (FR1.1)', () => {
    const [row] = stageRollups(events(shard('hostb-bbbbbbbbbbbb.md')));
    expect(row).toMatchObject({ source: 'hostb-bbbbbbbbbbbb.md', stage: 'build-and-test', unit: null });
    expect(row.node.totals).toEqual({ usd: 3, tokens: { input: 30, output: 3000, cacheCreate5m: 6000, cacheCreate1h: 0, cacheRead: 1_200_000 } });
    expect(row.node.byModel['sonnet-5-5']).toEqual({
      usd: 3,
      tokens: { input: 30, output: 3000, cacheCreate5m: 6000, cacheCreate1h: 0, cacheRead: 1_200_000 }
    });
    expect(row.node.byAgent['aidlc-quality-agent'].usd).toBe(3);
    expect(row.node.byStage['build-and-test'].totals.usd).toBe(3);
  });

  it('counts only the last row per stage in a shard, and Units of one stage apart (FR1.2)', () => {
    const rows = stageRollups(events(shard('cost-and-models.md'), shard('hosta-aaaaaaaaaaaa.md')));
    const codeGen = rows.filter((r) => r.source === 'cost-and-models.md' && r.stage === 'code-generation');
    expect(codeGen.map((r) => r.node.totals.usd)).toEqual([12.54]);
    const units = rows.filter((r) => r.source === 'hosta-aaaaaaaaaaaa.md' && r.stage === 'code-generation');
    expect(units.map((r) => [r.unit, r.node.totals.usd])).toEqual([
      ['u1', 2],
      ['u2', 0.5]
    ]);
  });

  it('never adds the WORKFLOW_COMPLETED totals, and skips a block without Cost USD (FR1.3, NFR3)', () => {
    const rows = stageRollups(events(shard('cost-and-models.md')));
    expect(rows.map((r) => r.stage)).not.toContain(undefined);
    expect(rows).toHaveLength(6); // 6 stages; the workflow row and the STAGE_STARTED block are not rows
    const broken = events({ source: 'x-111111111111.md', text: '## S\n**Event**: STAGE_COMPLETED\n**Stage**: s\n**Cost USD**: n/a\n' });
    expect(stageRollups(broken)).toEqual([]);
  });
});

describe('shardCosts (US-0209 FR1.2, NFR1)', () => {
  it('gives 261113-cost-and-models $23.39 from its last rows, not $33.22 and not the workflow total $23.86', () => {
    const [c] = shardCosts(events(shard('cost-and-models.md', 'macbookpro-95cba7b6a821.md')));
    expect(c).toMatchObject({ source: 'macbookpro-95cba7b6a821.md', host: 'macbookpro', cloneId: '95cba7b6a821' });
    expect(c.node.totals.usd).toBeCloseTo(23.39, 10);
    expect(c.node.byStage['code-generation'].totals.usd).toBe(12.54);
    expect(c.node.byAgent.main.usd).toBeCloseTo(3.45 + 2.18 + 7.9 + 2.62 + 0.35 + 0.34, 10);
  });

  it('sums a shard per host and clone, a Unit row each, and keeps two shards apart', () => {
    const costs = shardCosts(events(shard('hosta-aaaaaaaaaaaa.md'), shard('hostb-bbbbbbbbbbbb.md')));
    expect(costs.map((c) => [c.host, c.cloneId, c.node.totals.usd])).toEqual([
      ['hosta', 'aaaaaaaaaaaa', 3.5],
      ['hostb', 'bbbbbbbbbbbb', 3]
    ]);
    expect(costs[0].node.byStage['code-generation'].totals.usd).toBe(2.5);
    expect(shardCosts([])).toEqual([]);
  });
});
