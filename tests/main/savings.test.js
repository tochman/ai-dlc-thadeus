// US-1302: savings hints. Plain fixtures: a ledger summary's perIntent (byStage rows with raw byModel), attempts with
// times, a rate table with opus, sonnet and haiku rows.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import ledger from '../fixtures/ledger/usage-ledger.json';
import {
  DISMISSED_PATH,
  cacheShareHints,
  cheaperFamily,
  lighterModelHints,
  loadSavings,
  modelFamilies,
  readDismissed,
  savingsHints,
  sessionCalls,
  setDismissed,
  sortHints,
  turnsHints
} from '../../src/main/savings.js';

const rate = (input, output) => ({ input, output, cacheWrite5m: input * 1.25, cacheWrite1h: input * 2, cacheRead: input / 10 });
const RATES = { 'opus-5-5': rate(5, 25), 'sonnet-5-5': rate(2, 10), 'haiku-5-5': rate(0.5, 2.5) };
const T0 = Date.parse('2026-11-20T10:00:00Z');
const min = (m) => T0 + m * 60_000;

/** `n` attempts of `stage`, `rejected` of them closed by a rejection, each 10 minutes long, from minute `from`. */
const runs = (stage, n, { rejected = 0, from = 0 } = {}) =>
  Array.from({ length: n }, (_, i) => ({
    stage,
    unit: null,
    from: min(from + i * 10),
    to: min(from + i * 10 + 9),
    closedBy: i < rejected ? 'GATE_REJECTED' : 'GATE_APPROVED'
  }));
const tok = (input, output) => ({ tokens: { input, output, cacheCreate5m: 0, cacheCreate1h: 0, cacheRead: 0 } });
const stageRow = (name, byModel, agents = ['developer']) => ({ name, byModel, agents });
const share = (s) => ({ total: { tokens: { input: 100 - s * 100, output: 0, cacheWrite: 0, cacheRead: s * 100 } }, byStage: [], agentModels: {} });

/** One intent with an opus stage (100 output per run), and two sonnet stages setting the median (1000). */
function project({ opusRuns = 3, rejected = 0, opusOutput = 100, model = 'claude-opus-5-5', agents = ['developer'], status = 'complete' } = {}) {
  const intents = [{ dirName: '261120-a', status }];
  const perIntent = {
    '261120-a': {
      total: { tokens: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 } },
      byStage: [
        stageRow('requirements-analysis', { [model]: tok(1e6, opusOutput * opusRuns) }, agents),
        stageRow('code-generation', { 'claude-sonnet-5-5': tok(1e6, 3000) }),
        stageRow('build-and-test', { 'claude-sonnet-5-5': tok(1e6, 6000) })
      ],
      agentModels: { developer: [model, 'claude-sonnet-5-5'] }
    }
  };
  const attempts = [
    ...runs('requirements-analysis', opusRuns, { rejected }),
    ...runs('code-generation', 3, { from: 200 }),
    ...runs('build-and-test', 3, { from: 300 })
  ];
  return { intents, perIntent, attemptsByIntent: { '261120-a': attempts }, rates: RATES };
}

describe('model families (US-1302 FR2.5)', () => {
  it('orders the table’s families by output price and names the next cheaper one', () => {
    expect(modelFamilies(RATES).map((f) => f.family)).toEqual(['opus', 'sonnet', 'haiku']);
    expect(cheaperFamily('claude-opus-5-5', RATES)).toEqual({ family: 'sonnet', model: 'sonnet-5-5' });
    expect(cheaperFamily('claude-sonnet-5-5', RATES)).toEqual({ family: 'haiku', model: 'haiku-5-5' });
    expect(cheaperFamily('claude-haiku-5-5', RATES)).toBeNull();
    expect(cheaperFamily('gpt-9', RATES)).toBeNull();
  });
});

describe('lighterModelHints (US-1302 FR1, FR2, FR5)', () => {
  it('suggests the next cheaper family for a top-tier stage with low output, with the saving per run and in total', () => {
    const [hint, ...rest] = lighterModelHints(project());
    expect(rest).toEqual([]);
    expect(hint).toMatchObject({ id: 'model:requirements-analysis', kind: 'model', stage: 'requirements-analysis', agent: 'developer', links: ['models'] });
    expect(hint.working.to).toBe('sonnet-5-5');
    // opus: 1e6 in × 5 + 300 out × 25 = 5.0075; at sonnet 2 + 0.003 = 2.003
    expect(hint.saving.total).toBeCloseTo(3.0045, 6);
    expect(hint.saving.perRun).toBeCloseTo(1.0015, 6);
  });

  it('gives no hint with 2 runs, with 2 rejections in 10, or with output per run above the median', () => {
    expect(lighterModelHints(project({ opusRuns: 2 }))).toEqual([]);
    expect(lighterModelHints(project({ opusRuns: 10, rejected: 2 }))).toEqual([]);
    expect(lighterModelHints(project({ opusRuns: 10, rejected: 1 }))).toHaveLength(1); // 1 in 10 still counts
    expect(lighterModelHints(project({ opusOutput: 5000 }))).toEqual([]);
  });

  it('a Sonnet stage gets Haiku only when no dearer family in the table ran in the project', () => {
    const p = project({ model: 'claude-sonnet-5-5' }); // the whole project ran on sonnet
    const [hint] = lighterModelHints(p);
    expect(hint).toMatchObject({ stage: 'requirements-analysis', working: { to: 'haiku-5-5' } });
    p.perIntent['261120-a'].byStage[2].byModel = { 'claude-opus-5-5': tok(1e6, 6000) }; // build-and-test ran on opus
    expect(lighterModelHints(p)).toEqual([]);
  });

  it('a dearer family the project never ran on does not hide the hint', () => {
    expect(lighterModelHints({ ...project(), rates: { ...RATES, 'fable-5-2': rate(8, 40) } })).toHaveLength(1);
  });

  it('a model with no rate gives saving null, never 0 (NFR2)', () => {
    const [hint] = lighterModelHints(project({ model: 'claude-opus-9-9' }));
    expect(hint.saving).toBeNull();
    expect(hint.working.prices.from).toBeNull();
  });

  it('names the agent only when the ledger attributes the model to it', () => {
    expect(lighterModelHints(project({ agents: ['developer', 'architect'] }))[0].agent).toBeNull();
    expect(lighterModelHints(project({ agents: ['main'] }))[0].agent).toBeNull();
  });

  it('carries its working: the figures, the thresholds and the prices (FR5)', () => {
    const { working } = lighterModelHints(project())[0];
    expect(working.figures).toEqual({ runs: 3, rejections: 0, outputPerRun: 100, medianOutputPerRun: 1000 });
    expect(working.thresholds).toEqual({ minRuns: 3, maxRejectedShare: 0.1 });
    expect(working.prices.from).toEqual({ model: 'opus-5-5', input: 5, output: 25 });
    expect(working.prices.to).toEqual({ model: 'sonnet-5-5', input: 2, output: 10 });
  });

  it('a stage run only in archived intents feeds the baseline but gets no hint (FR1)', () => {
    expect(lighterModelHints(project({ status: 'archived' }))).toEqual([]);
  });
});

describe('cacheShareHints (US-1302 FR1, FR3, FR5)', () => {
  const run = (shares, statuses = {}) =>
    cacheShareHints({
      intents: Object.keys(shares).map((dirName) => ({ dirName, status: statuses[dirName] ?? 'complete' })),
      perIntent: Object.fromEntries(Object.entries(shares).map(([d, s]) => [d, share(s)]))
    });

  it('hints an intent 20 points below the median share and none at 19', () => {
    const [hint, ...rest] = run({ a: 0.8, b: 0.8, c: 0.8, d: 0.6 });
    expect(rest).toEqual([]);
    expect(hint).toMatchObject({ id: 'cache:d', kind: 'cache', intent: 'd', saving: null, links: [] });
    expect(hint.working.figures.share).toBeCloseTo(0.6);
    expect(hint.working.figures.medianShare).toBeCloseTo(0.8);
    expect(hint.working.thresholds).toEqual({ pointsBelow: 20 });
    expect(run({ a: 0.8, b: 0.8, c: 0.8, d: 0.61 })).toEqual([]);
  });

  it('archived intents count in the median but get no hint (FR1)', () => {
    const hints = run({ a: 0.5, b: 0.9, c: 0.9, d: 0.1 }, { b: 'archived', c: 'archived', d: 'archived' });
    expect(hints.map((h) => h.intent)).toEqual(['a']); // 0.7 with the archived ones (0.5 without); d is archived
  });

  it('an intent without tokens or without a ledger entry is left out', () => {
    expect(cacheShareHints({ intents: [{ dirName: 'x' }, { dirName: 'y' }], perIntent: { x: null, y: { total: { tokens: {} } } } })).toEqual([]);
  });
});

describe('turnsHints (US-1302 FR4, FR5)', () => {
  /** Intents `i0`… each with one code-generation run (10 minutes, a day apart) and `turns[n]` calls inside it. */
  function history(turns, { noTranscript = [], statuses = {} } = {}) {
    const dirs = turns.map((_, n) => `i${n}`);
    const attemptsByIntent = Object.fromEntries(dirs.map((d, n) => [d, runs('code-generation', 1, { from: n * 1440 })]));
    const callsByIntent = Object.fromEntries(
      dirs
        .filter((d) => !noTranscript.includes(d))
        .map((d, n) => [d, [...Array.from({ length: turns[n] }, (_, k) => ({ at: min(n * 1440 + 1 + k / 10) })), { at: min(n * 1440 + 30) }]])
    );
    return { intents: dirs.map((dirName) => ({ dirName, status: statuses[dirName] ?? 'complete' })), attemptsByIntent, callsByIntent };
  }

  it('counts only the calls inside the run’s window and hints a run at twice the median after 5 earlier runs', () => {
    const [hint, ...rest] = turnsHints(history([4, 4, 4, 4, 4, 8]));
    expect(rest).toEqual([]);
    expect(hint).toMatchObject({ id: 'turns:i5:code-generation', kind: 'turns', intent: 'i5', stage: 'code-generation', saving: null });
    expect(hint.links).toEqual(['costRules', 'handoff']);
    expect(hint.working.figures).toEqual({ turns: 8, medianTurns: 4, earlierRuns: 5 }); // the call at minute 30 is outside
    expect(hint.working.thresholds).toEqual({ factor: 2, minEarlierRuns: 5 });
  });

  it('gives none after only 4 earlier runs, below twice the median, or without transcripts', () => {
    expect(turnsHints(history([4, 4, 4, 4, 8]))).toEqual([]);
    expect(turnsHints(history([4, 4, 4, 4, 4, 7]))).toEqual([]);
    expect(turnsHints(history([4, 4, 4, 4, 4, 8], { noTranscript: ['i5'] }))).toEqual([]);
  });

  it('an archived run feeds the median but gets no hint (FR1)', () => {
    expect(turnsHints(history([4, 4, 4, 4, 4, 8], { statuses: { i5: 'archived' } }))).toEqual([]);
  });
});

describe('savingsHints and sortHints (US-1302 FR7)', () => {
  it('puts the largest saving first and the hints without a money figure after, in their order', () => {
    const h = (id, total) => ({ id, saving: total == null ? null : { total } });
    expect(sortHints([h('a', null), h('b', 1), h('c', 3), h('d', null)]).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('gathers every kind', () => {
    const p = project();
    const hints = savingsHints({ ...p, callsByIntent: {} });
    expect(hints.map((x) => x.kind)).toEqual(['model']);
  });
});

describe('dismissals in .thadeus/savings-dismissed.json (US-1302 FR6, NFR1)', () => {
  let root;
  beforeEach(async () => {
    root = await openRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'savings-')));
  });
  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('reads none from a missing file, sets one with its time and clears it again', async () => {
    expect(await readDismissed(root)).toEqual({});
    const now = new Date('2026-11-26T12:00:00Z');
    expect(await setDismissed(root, 'model:requirements-analysis', true, now)).toEqual({ 'model:requirements-analysis': now.toISOString() });
    expect(JSON.parse(await fs.readFile(path.join(root, DISMISSED_PATH), 'utf8'))).toEqual({ 'model:requirements-analysis': now.toISOString() });
    expect(await setDismissed(root, 'model:requirements-analysis', false)).toEqual({});
    expect(await readDismissed(root)).toEqual({});
  });

  it('reads a broken file as empty and logs it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.mkdir(path.join(root, '.thadeus'));
    await fs.writeFile(path.join(root, DISMISSED_PATH), '{ "model:x": ');
    expect(await readDismissed(root)).toEqual({});
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('refuses an id that is not a hint id, and a .thadeus that leads out of the root', async () => {
    await expect(setDismissed(root, '../x', true)).rejects.toThrow();
    await expect(setDismissed(root, 42, true)).rejects.toThrow();
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'savings-out-'));
    await fs.symlink(outside, path.join(root, '.thadeus'));
    await expect(setDismissed(root, 'cache:a', true)).rejects.toThrow();
    expect(await fs.readdir(outside)).toEqual([]);
    await fs.rm(outside, { recursive: true, force: true });
  });
});

describe('the project:savings handler body (US-1302 NFR4)', () => {
  it('the ledger summary’s stage rows carry their raw tokens per model and their agents', () => {
    const intents = [{ dirName: '261110-epic02-finish', uuid: '01a1c625-50f3-7f83-9755-b096bf4025e6', slug: 'epic02-finish' }];
    const row = summarizeLedger(ledger, intents).perIntent['261110-epic02-finish'].byStage[0];
    const model = Object.keys(row.byModel)[0];
    expect(row.byModel[model].tokens).toHaveProperty('cacheCreate5m');
    expect(row.agents.length).toBeGreaterThan(0);
    expect(row.agents.every((a) => !a.startsWith('aidlc-'))).toBe(true);
  });

  it('sessionCalls reads the ledger’s transcripts for the intent, only inside the projects folder', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'savings-projects-'));
    const file = path.join(dir, 's1.jsonl');
    const line = (id, at) =>
      JSON.stringify({ type: 'assistant', timestamp: new Date(at).toISOString(), message: { id, model: 'claude-opus-5-5', usage: { input_tokens: 1 } } });
    await fs.writeFile(file, `${line('m1', min(1))}\n${line('m2', min(2))}\n`);
    const wf = { sessions: { [`transcript:${file}`]: {}, 'transcript:/etc/passwd': {}, 'other:x': {} } };
    const calls = await sessionCalls({ ledger: { workflows: { 'intent:u1': wf } }, uuid: 'u1', projectsDir: dir });
    expect(calls.map((c) => c.at)).toEqual([min(1), min(2)]);
    expect(await sessionCalls({ ledger: null, uuid: 'u1', projectsDir: dir })).toEqual([]);
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('gives the hints and the dismissed ids; a failing transcript read is logged and counts as none', async () => {
    const p = project();
    const events = { '261120-a': [] };
    const readDismissedStub = vi.fn(async () => ({ 'cache:x': '2026-11-26T12:00:00.000Z' }));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loadCalls = vi.fn(async () => {
      throw new Error('boom');
    });
    const r = await loadSavings({
      root: '/r',
      intents: p.intents,
      perIntent: p.perIntent,
      eventsByIntent: events,
      rates: RATES,
      loadCalls,
      readDismissed: readDismissedStub
    });
    expect(r.dismissed).toEqual(['cache:x']);
    expect(r.hints).toEqual([]); // no audit events: no runs, so no stage qualifies
    expect(loadCalls).toHaveBeenCalledWith(p.intents[0]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('counts the runs from the audit events', async () => {
    const p = project();
    const ev = (event, m, Stage) => ({ event, timeMs: min(m), fields: { Stage } });
    const stages = ['requirements-analysis', 'code-generation', 'build-and-test'];
    const events = stages.flatMap((s, n) => [0, 10, 20].flatMap((m) => [ev('STAGE_STARTED', n * 100 + m, s), ev('GATE_APPROVED', n * 100 + m + 5, s)]));
    const r = await loadSavings({
      root: '/r',
      intents: p.intents,
      perIntent: p.perIntent,
      eventsByIntent: { '261120-a': events },
      rates: RATES,
      loadCalls: async () => [],
      readDismissed: async () => ({})
    });
    expect(r.hints.map((h) => h.id)).toEqual(['model:requirements-analysis']);
  });
});
