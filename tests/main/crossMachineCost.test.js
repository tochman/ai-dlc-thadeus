// US-0209 FR1.4, FR2.1–FR2.3, FR3.4, FR4.2, NFR1: one intent's cost from this machine's ledger, its own shard rows and
// the other machines' snapshots or shard rows, each machine counted once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { mergeAudits } from '../../src/main/parsers/audit.js';
import { mergeIntentCosts, shardCosts } from '../../src/main/parsers/auditCost.js';
import { loadCrossMachineCost } from '../../src/main/projectService.js';
import { loadRates } from '../../src/main/modelRates.js';

const FIX = path.join(process.cwd(), 'tests/fixtures/cost');
const read = (f) => readFileSync(path.join(FIX, f), 'utf8');
const ledger = JSON.parse(readFileSync(path.join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const UUID = '01a1c625-50f3-7f83-9755-b096bf4025e6'; // $4 in the ledger fixture
const ledgerNode = ledger.workflows[`intent:${UUID}`];
const A = { host: 'hosta', cloneId: 'aaaaaaaaaaaa' };
const shards = shardCosts(mergeAudits(['hosta-aaaaaaaaaaaa.md', 'hostb-bbbbbbbbbbbb.md'].map((f) => ({ source: f, text: read(f) })))); // A $3.50, B $3
const snapB = (usd) => ({ host: 'hostb', cloneId: 'bbbbbbbbbbbb', node: { totals: { usd, tokens: {} }, byStage: {}, byModel: {}, byAgent: {} } });
const hosts = (m) => m.machines.map((x) => [x.host, x.local, x.source]);

describe('mergeIntentCosts (US-0209 FR1.4, FR2, FR3.4, FR4.2)', () => {
  it('with no ledger, every shard counts, this machine included, and the total is partial (FR1.4, FR2.2)', () => {
    const m = mergeIntentCosts({ ledgerNode: null, local: A, shards, snapshots: [] });
    expect(m.node.totals.usd).toBeCloseTo(6.5, 10);
    expect(hosts(m)).toEqual([
      ['hosta', true, 'audit'],
      ['hostb', false, 'audit']
    ]);
    expect(m.partial).toBe(true);
  });

  it("A's ledger replaces A's shard; B's stage row is added once, nothing more (FR2.2, FR2.3, NFR1)", () => {
    const m = mergeIntentCosts({ ledgerNode, local: A, shards, snapshots: [] });
    expect(m.node.totals.usd).toBe(4 + 3);
    expect(m.extra.totals.usd).toBe(3); // what the ledger does not already hold
    expect(m.node.byModel['sonnet-5-5'].usd).toBe(1.5 + 3);
    expect(hosts(m)).toEqual([
      ['hosta', true, 'ledger'],
      ['hostb', false, 'audit']
    ]);
    expect(m.partial).toBe(true); // B has stage rows only
  });

  it("B's snapshot counts instead of its shard rows, the larger total wins, never both (FR3.4)", () => {
    const bigger = mergeIntentCosts({ ledgerNode, local: A, shards, snapshots: [snapB(4.5)] });
    expect(bigger.node.totals.usd).toBe(4 + 4.5);
    expect(hosts(bigger)[1]).toEqual(['hostb', false, 'snapshot']);
    expect(bigger.partial).toBe(false);
    const older = mergeIntentCosts({ ledgerNode, local: A, shards, snapshots: [snapB(2)] });
    expect(older.node.totals.usd).toBe(4 + 3);
    expect(hosts(older)[1]).toEqual(['hostb', false, 'audit']);
  });

  it('US-0211: gives each machine its current-price figure when a rate table is passed (FR3.2)', () => {
    const rates = { 'sonnet-5-5': { input: 0, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 1, source: 'app' } };
    const m = mergeIntentCosts({ ledgerNode, local: A, shards, snapshots: [], rates });
    const b = m.machines.find((x) => x.host === 'hostb');
    expect(b.currentUsd).toBeCloseTo(1.2, 10); // 1.2M cache reads at $1/M
    expect(mergeIntentCosts({ ledgerNode, local: A, shards, snapshots: [] }).machines[0].currentUsd).toBeUndefined();
  });

  it("US-0058 FR1: adds this machine's opencode usage as its own part, beside the ledger", () => {
    const opencode = { totals: { usd: 0.25, tokens: {} }, byStage: {}, byModel: { m: { usd: 0.25, tokens: {} } }, byAgent: {} };
    const m = mergeIntentCosts({ ledgerNode, local: A, shards: [], snapshots: [], opencode });
    expect(m.node.totals.usd).toBe(4.25);
    expect(m.extra.totals.usd).toBe(0.25);
    expect(hosts(m)).toEqual([
      ['hosta', true, 'ledger'],
      ['hosta', true, 'opencode']
    ]);
    expect(m.partial).toBe(false);
    expect(mergeIntentCosts({ ledgerNode: null, local: null, opencode }).node.totals.usd).toBe(0.25);
  });

  it('gives null when no machine has any cost, and treats every shard as another machine without a clone id', () => {
    expect(mergeIntentCosts({ ledgerNode: null, local: A, shards: [], snapshots: [] })).toBeNull();
    const m = mergeIntentCosts({ ledgerNode: null, local: null, shards, snapshots: [] });
    expect(m.machines.every((x) => !x.local)).toBe(true);
  });
});

describe('loadCrossMachineCost (US-0209 FR1.4, FR2, FR4.2)', () => {
  const TMP_BASE = path.join(process.cwd(), 'tests/.tmp');
  const intents = [
    { dirName: '261116-two-machines', uuid: UUID, slug: 'two-machines', scope: 'feature', date: '2026-11-16' },
    { dirName: '261116-no-uuid', uuid: null, slug: 'no-uuid', scope: 'express', date: '2026-11-16' },
    { dirName: '261116-empty', uuid: '0000-none', slug: 'empty', scope: 'express', date: '2026-11-16' }
  ];
  let root;
  beforeEach(async () => {
    await fs.mkdir(TMP_BASE, { recursive: true });
    root = await fs.realpath(await fs.mkdtemp(path.join(TMP_BASE, 'cross-machine-')));
    const audit = (dir) => path.join(root, 'aidlc/spaces/default/intents', dir, 'audit');
    for (const dir of ['261116-two-machines', '261116-no-uuid']) {
      await fs.mkdir(audit(dir), { recursive: true });
      for (const f of ['hosta-aaaaaaaaaaaa.md', 'hostb-bbbbbbbbbbbb.md']) await fs.writeFile(path.join(audit(dir), f), read(f));
    }
    await fs.writeFile(path.join(root, 'aidlc/.aidlc-clone-id'), 'aaaaaaaaaaaa\n');
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('merges the ledger with the other machine, per intent and in the project total, with machines and partial', async () => {
    const { summary, local } = await loadCrossMachineCost(root, 'default', intents, ledger);
    expect(local).toEqual(A);
    const two = summary.perIntent['261116-two-machines'];
    expect(two.total.usd).toBe(7);
    expect(two.machines.map((x) => [x.host, x.local, x.source])).toEqual([
      ['hosta', true, 'ledger'],
      ['hostb', false, 'audit']
    ]);
    expect(two.partial).toBe(true);
    expect(summary.perIntent['261116-no-uuid'].total.usd).toBeCloseTo(6.5, 10); // no ledger entry: both shards
    expect(summary.perIntent['261116-empty']).toBeNull();
    expect(summary.project.total.usd).toBeCloseTo(5.5 + 3 + 6.5, 10); // ledger + B's row + the no-uuid intent's rows
    expect(summary.project.machines).toEqual([
      { host: 'hosta', local: true },
      { host: 'hostb', local: false }
    ]);
    expect(summary.project.partial).toBe(true);
  });

  it("counts B's committed snapshot instead of its rows, and needs no ledger on a fresh clone (FR1.4, FR3.4)", async () => {
    const usage = path.join(root, '.thadeus/usage');
    await fs.mkdir(usage, { recursive: true });
    const snap = JSON.parse(read('hostb-bbbbbbbbbbbb.json'));
    snap.intents[UUID] = snap.intents['0000b209-0000-7000-8000-000000000001'];
    await fs.writeFile(path.join(usage, 'hostb-bbbbbbbbbbbb.json'), JSON.stringify(snap));
    const { summary } = await loadCrossMachineCost(root, 'default', intents, null);
    const two = summary.perIntent['261116-two-machines'];
    expect(two.total.usd).toBe(3.5 + 4.5); // A's rows (no ledger) + B's snapshot
    expect(two.machines.map((x) => x.source)).toEqual(['audit', 'snapshot']);
    expect(two.partial).toBe(true); // this machine has no ledger
  });

  it('US-0211: reprices every machine and the merged total from stored tokens; audit cache writes marked as 5m (AC1.3.2, AC1.5.1)', async () => {
    const rates = { 'opus-5-5': { input: 1, output: 1, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 1, source: 'app' } };
    const { summary } = await loadCrossMachineCost(root, 'default', intents, ledger, rates);
    const two = summary.perIntent['261116-two-machines'];
    expect(two.machines.every((x) => x.currentUsd === null || typeof x.currentUsd === 'number')).toBe(true);
    const sum = two.machines.reduce((n, x) => n + (x.currentUsd ?? 0), 0);
    expect(two.total.currentUsd).toBeCloseTo(sum, 10);
    expect(two.total.currentMissing).toBeGreaterThan(0); // sonnet-5-5 has no rate in this table
    expect(summary.project.auditFiveMinute).toBe(true);
  });

  it('US-0211 NFR1: loading rates and repriced costs writes nothing under aidlc/ or .claude/ (AC1.3.4)', async () => {
    await fs.mkdir(path.join(root, '.claude/tools/data'), { recursive: true });
    await fs.writeFile(path.join(root, '.claude/settings.json'), JSON.stringify({ env: { AIDLC_MODEL_RATES: 'gone.json' } }));
    await fs.writeFile(path.join(root, '.claude/tools/data/model-rates.json'), JSON.stringify({ rates: {} }));
    const snapshot = async () => {
      const out = [];
      const walk = async (dir) => {
        for (const e of await fs.readdir(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) await walk(p);
          else out.push(`${path.relative(root, p)} ${(await fs.stat(p)).mtimeMs}`);
        }
      };
      for (const d of ['aidlc', '.claude']) await walk(path.join(root, d));
      return out.sort();
    };
    const before = await snapshot();
    const rates = await loadRates(root);
    await loadCrossMachineCost(root, 'default', intents, ledger, rates.rates);
    expect(await snapshot()).toEqual(before);
  });

  describe('quality beside the cost (US-1305 FR1.7, FR2, NFR2)', () => {
    const base = (dir) => path.join(root, 'aidlc/spaces/default/intents', dir);
    const write = async (dir, rel, text) => {
      await fs.mkdir(path.dirname(path.join(base(dir), rel)), { recursive: true });
      await fs.writeFile(path.join(base(dir), rel), text);
    };
    const REVIEW = '### Findings\n\n| ID | Severity | Location | Finding | Required action | Status |\n|---|---|---|---|---|---|\n';
    const row = (id, sev, status) => `| ${id} | ${sev} | x | y | z | ${status} |\n`;
    const REJECTED = '\n## Gate\n**Timestamp**: 2026-11-16T12:00:00Z\n**Event**: GATE_REJECTED\n**Stage**: code-generation\n\n---\n';

    it('gives every intent with a cost its quality from test-results.md, review files and the audit (FR2)', async () => {
      await fs.appendFile(path.join(base('261116-two-machines'), 'audit/hosta-aaaaaaaaaaaa.md'), REJECTED);
      await write('261116-two-machines', 'construction/build-and-test/test-results.md', '## Loop-Back Log\n\n### Loop-back 1\n\n## After merge with main\n');
      await write(
        '261116-two-machines',
        'inception/requirements-analysis/reviews/review-01.md',
        REVIEW + row('R-01', 'Major', 'Fixed') + row('R-02', 'Minor', 'New')
      );
      const { summary } = await loadCrossMachineCost(root, 'default', intents, ledger);
      const q = summary.perIntent['261116-two-machines'].quality;
      expect(q.revisions).toEqual({ total: 1, byStage: { 'code-generation': 1 } });
      expect([q.loopBacks, q.failedRuns, q.postMerge]).toEqual([1, 1, 1]);
      expect(q.findings).toEqual({ bySeverity: { Major: 1, Minor: 1 }, open: 1, fixed: 1 });
      expect(q.trouble).toBe(1 + 1 + 1 + 1 + 1);
    });

    it('gives null parts, never 0, to an intent without test-results.md or review files (FR1.7)', async () => {
      const { summary } = await loadCrossMachineCost(root, 'default', intents, ledger);
      const q = summary.perIntent['261116-no-uuid'].quality;
      expect([q.loopBacks, q.failedRuns, q.postMerge, q.findings]).toEqual([null, null, null, null]);
      expect(q.trouble).toBe(0);
    });

    it('reads review files at any depth, units included, and only reviews/review-*.md (FR1.3)', async () => {
      await write('261116-no-uuid', 'construction/u1-core/code-generation/reviews/review-02.md', REVIEW + row('R-01', 'Major', 'New'));
      await write('261116-no-uuid', 'construction/u1-core/code-generation/reviews/notes.md', REVIEW + row('R-09', 'Major', 'New'));
      await write('261116-no-uuid', '.aidlc-engine/reviews/review-01.md', REVIEW + row('R-08', 'Major', 'New'));
      const { summary } = await loadCrossMachineCost(root, 'default', intents, ledger);
      expect(summary.perIntent['261116-no-uuid'].quality.findings).toEqual({ bySeverity: { Major: 1 }, open: 1, fixed: 0 });
    });

    it('names an unreadable file and counts it as missing; the cost still loads (NFR2)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await fs.mkdir(path.join(base('261116-two-machines'), 'construction/build-and-test/test-results.md'), { recursive: true });
      const { summary } = await loadCrossMachineCost(root, 'default', intents, ledger);
      const two = summary.perIntent['261116-two-machines'];
      expect(two.total.usd).toBe(7);
      expect(two.quality.loopBacks).toBeNull();
      expect(warn.mock.calls.some((c) => String(c[0]).includes('test-results.md'))).toBe(true);
    });
  });

  it('US-0058 FR1: counts opencode messages for an intent that has no ledger and no cost rows, and returns them by key', async () => {
    const dir = path.join(root, 'aidlc/spaces/default/intents/261116-empty/audit');
    await fs.mkdir(dir, { recursive: true });
    const row = (ts, event, stage) => `## E\n**Timestamp**: ${ts}\n**Event**: ${event}\n${stage ? `**Stage**: ${stage}\n` : ''}\n---\n\n`;
    await fs.writeFile(
      path.join(dir, 'hosta-aaaaaaaaaaaa.md'),
      `# AI-DLC Audit Log\n\n${row('2026-11-20T09:00:00Z', 'WORKFLOW_STARTED')}${row('2026-11-20T09:01:00Z', 'STAGE_STARTED', 'code-generation')}`
    );
    const at = Date.parse('2026-11-20T09:30:00Z');
    const messages = [{ at, agent: 'build', model: 'free-model', cost: 0, tokens: { input: 7, output: 3, cache: { read: 90 } } }];
    const { summary, opencode } = await loadCrossMachineCost(root, 'default', [intents[2]], null, null, messages);
    const empty = summary.perIntent['261116-empty'];
    expect(empty.tokens).toMatchObject({ input: 7, output: 3, cacheRead: 90 });
    expect(empty.machines.map((x) => x.source)).toEqual(['opencode']);
    expect(opencode['intent:0000-none'].totals.tokens.input).toBe(7);
  });

  it('gives no summary when there is no ledger and no cost row anywhere', async () => {
    await fs.rm(path.join(root, 'aidlc/spaces'), { recursive: true });
    expect((await loadCrossMachineCost(root, 'default', intents, null)).summary).toBeNull();
  });
});
