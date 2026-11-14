import { beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadIntentList } from '../../src/main/projectService.js';
import { compareModels, summarizeLedger } from '../../src/main/parsers/ledger.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
let ledger;
let intents;
let summary;

beforeAll(async () => {
  ledger = JSON.parse(await fs.readFile(path.join(FIXTURES, 'ledger/usage-ledger.json'), 'utf8'));
  // Real intent shape from the fixture project (intents.json uuids + disk-only folder).
  ({ intents } = await loadIntentList(await openRoot(path.join(FIXTURES, 'project')), 'default'));
  summary = summarizeLedger(ledger, intents);
});

describe('summarizeLedger', () => {
  it('links intent:<uuid> to the intent and gives null when the ledger has no entry (FR1.1, FR1.3, FR1.4)', () => {
    const epic02 = summary.perIntent['261110-epic02-finish'];
    expect(epic02.total).toEqual({
      usd: 4,
      tokens: { input: 3000, output: 1500, cacheWrite: 300, cacheRead: 5000 },
      totalTokens: 9800,
      missingPrice: false
    });
    expect(epic02.byStage.map((r) => [r.name, r.usd])).toEqual([
      ['functional-design', 2.5],
      ['code-generation', 1.5]
    ]);
    expect(epic02.stageModels['code-generation']).toEqual(['sonnet-5-5']);
    expect(summary.perIntent['261105-ghost-intent']).toBeNull(); // uuid in intents.json, no ledger entry
    expect(summary.perIntent['261111-orphan-notes']).toBeNull(); // no uuid at all
  });

  it('counts the legacy record in the project total and reports it as its own row (FR3.1, FR3.4)', () => {
    expect(summary.project.total.usd).toBe(5.5);
    expect(summary.project.legacy.usd).toBe(0.5);
    expect(summary.project.legacy.tokens.input).toBe(500);
    expect(summary.project.byAgent[0]).toMatchObject({ name: 'aidlc-architect-agent', usd: 2.5 });
  });

  it('marks tokens without a price as missingPrice and the totals as incomplete (FR6.2)', () => {
    const haiku = summary.project.byModel.find((r) => r.name === 'claude-haiku-5-5');
    expect(haiku).toMatchObject({ usd: 0, missingPrice: true });
    expect(summary.project.complete).toBe(false);
    expect(summary.perIntent['261112-epic29-small-k2-fixes'].complete).toBe(false);
    expect(summary.perIntent['261110-epic02-finish'].complete).toBe(true);
  });

  it('gives total and average per scope and a timeline sorted by date prefix (FR3.2, FR3.3)', () => {
    expect(summary.byScope.feature).toMatchObject({ usd: 4, count: 1, avg: 4, missingPrice: false });
    expect(summary.byScope.express).toMatchObject({ usd: 1, count: 1, avg: 1, missingPrice: true });
    expect(summary.byScope.bugfix).toBeUndefined(); // ghost intent has no cost entry
    expect(summary.timeline.map((t) => [t.dirName, t.usd])).toEqual([
      ['261110-epic02-finish', 4],
      ['261112-epic29-small-k2-fixes', 1]
    ]);
  });

  it('flags an agent whose actual model differs and resolves inherit to the session model (FR4.3–FR4.5)', () => {
    const configured = {
      agents: [
        { agent: 'architect', model: 'inherit', effort: null },
        { agent: 'developer', model: 'opus', effort: 'high' },
        { agent: 'quality', model: 'haiku', effort: null }
      ]
    };
    const rows = compareModels(configured, summary.project.agentModels);
    const byAgent = Object.fromEntries(rows.map((r) => [r.agent, r]));
    expect(rows[0].agent).toBe('main');
    expect(byAgent.architect).toMatchObject({ inherit: true, expected: 'opus-5-5', actual: ['opus-5-5'], mismatch: false });
    expect(byAgent.developer).toMatchObject({ expected: 'opus', actual: ['sonnet-5-5'], mismatch: true });
    // Shared stage with main: the models besides the session's are the other agent's.
    expect(byAgent.quality).toMatchObject({ actual: ['claude-haiku-5-5'], mismatch: false });

    const intentRows = compareModels(configured, summary.perIntent['261110-epic02-finish'].agentModels, { onlyParticipants: true });
    expect(intentRows.map((r) => r.agent)).toEqual(['architect', 'developer']);
  });
});
