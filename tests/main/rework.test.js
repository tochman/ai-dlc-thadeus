// US-1301: rework cost. Audit fixtures in the parsed shape (`mergeAudits`: event, timeMs, fields).
import { describe, expect, it, vi } from 'vitest';
import { costOfWindow, loadRework, overviewRework, reworkOf, stageAttempts, thrownAway } from '../../src/main/rework.js';

const T0 = Date.parse('2026-11-20T10:00:00Z');
const at = (min) => T0 + min * 60_000;
const ev = (event, min, fields = {}) => ({ event, timeMs: at(min), fields });
const start = (stage, min, unit) => ev('STAGE_STARTED', min, unit ? { Stage: stage, Unit: unit } : { Stage: stage });
const approve = (stage, min) => [ev('GATE_APPROVED', min, { Stage: stage }), ev('STAGE_COMPLETED', min, { Stage: stage })];
const jump = (min, Direction, Source, Target) => ev('STAGE_JUMPED', min, { Direction, Source, Target });
const brief = (list) => list.map((a) => [a.stage, (a.from - T0) / 60_000, (a.to - T0) / 60_000, a.reason ?? null]);

describe('stageAttempts (US-1301 FR1)', () => {
  it('splits the audit into attempts with their stage and unit', () => {
    const events = [
      ev('WORKFLOW_STARTED', 0),
      start('requirements-analysis', 0),
      ev('STAGE_AWAITING_APPROVAL', 5, { Stage: 'requirements-analysis' }),
      ...approve('requirements-analysis', 6),
      start('code-generation', 7, 'u1-api'),
      ...approve('code-generation', 10),
      start('build-and-test', 11, 'stage-level'),
      ev('WORKFLOW_COMPLETED', 14)
    ];
    const attempts = stageAttempts(events);
    expect(brief(attempts)).toEqual([
      ['requirements-analysis', 0, 6, null],
      ['code-generation', 7, 10, null],
      ['build-and-test', 11, 14, null]
    ]);
    expect(attempts.map((a) => a.unit)).toEqual([null, 'u1-api', null]); // "stage-level" names no unit
    expect(attempts[0].closedBy).toBe('GATE_APPROVED');
  });

  it('an unpark reopens the parked stage, and one still open runs to the last event', () => {
    const events = [start('code-generation', 0), ev('WORKFLOW_PARKED', 3, { Stage: 'code-generation' }), ev('WORKFLOW_UNPARKED', 10), ev('HUMAN_TURN', 12)];
    expect(brief(stageAttempts(events))).toEqual([
      ['code-generation', 0, 3, null],
      ['code-generation', 10, 12, null]
    ]);
  });

  it('skips archive events and events without a time', () => {
    const events = [
      start('code-generation', 0),
      ev('STAGE_COMPLETED', 2, { Stage: 'code-generation' }),
      ev('WORKFLOW_ARCHIVED', 30),
      { event: 'STAGE_STARTED', timeMs: NaN, fields: {} }
    ];
    expect(brief(stageAttempts(events))).toEqual([['code-generation', 0, 2, null]]);
  });
});

describe('thrownAway (US-1301 FR2)', () => {
  const run = (events) => brief(thrownAway(stageAttempts(events), events));

  it('a rejected attempt is rework; the revision after it is not (FR2.1)', () => {
    const events = [
      start('refined-mockups', 0),
      ev('GATE_REJECTED', 5, { Stage: 'refined-mockups' }),
      ev('STAGE_REVISING', 6, { Stage: 'refined-mockups' }),
      ...approve('refined-mockups', 9)
    ];
    expect(run(events)).toEqual([['refined-mockups', 0, 5, 'rejected']]);
  });

  it('a loop-back from build-and-test throws away code generation and build and test since their approval (FR2.2)', () => {
    const events = [
      ...approve('requirements-analysis', 0),
      start('code-generation', 1),
      ev('GATE_REJECTED', 3, { Stage: 'code-generation' }),
      ev('STAGE_REVISING', 4, { Stage: 'code-generation' }),
      ...approve('code-generation', 5),
      start('build-and-test', 6),
      jump(8, 'BACKWARD', 'build-and-test', 'code-generation'),
      start('code-generation', 9),
      ...approve('code-generation', 12),
      start('build-and-test', 13),
      ...approve('build-and-test', 15)
    ];
    expect(run(events)).toEqual([
      ['code-generation', 1, 3, 'rejected'], // one reason, the first that applies
      ['code-generation', 4, 5, 'loopBack'],
      ['build-and-test', 6, 8, 'loopBack']
    ]);
  });

  it('any other backward jump throws away every stage from the target to the source (FR2.3)', () => {
    const events = [
      start('requirements-analysis', 0),
      ...approve('requirements-analysis', 1),
      start('functional-design', 2),
      ...approve('functional-design', 3),
      start('nfr-requirements', 4),
      ...approve('nfr-requirements', 5),
      start('code-generation', 6),
      jump(9, 'BACKWARD', 'code-generation', 'functional-design'),
      start('functional-design', 10)
    ];
    expect(run(events)).toEqual([
      ['functional-design', 2, 3, 'jumpedBack'],
      ['nfr-requirements', 4, 5, 'jumpedBack'],
      ['code-generation', 6, 9, 'jumpedBack']
    ]);
  });

  it('a redo throws away the stage’s last attempt (FR2.4)', () => {
    const events = [
      start('code-generation', 0),
      jump(5, 'REDO', 'code-generation', 'code-generation'),
      start('code-generation', 6),
      ...approve('code-generation', 9)
    ];
    expect(run(events)).toEqual([['code-generation', 0, 5, 'redone']]);
  });

  it('parked and unparked work is not rework', () => {
    const events = [
      start('code-generation', 0),
      ev('WORKFLOW_PARKED', 3, { Stage: 'code-generation' }),
      ev('WORKFLOW_UNPARKED', 10),
      ...approve('code-generation', 12)
    ];
    expect(run(events)).toEqual([]);
  });
});

/** A cumulative reading: all tokens as input. */
const rd = (min, tokens, usd) => ({ at: at(min), input: tokens, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, usd });

describe('costOfWindow (US-1301 FR3)', () => {
  const readings = [rd(0, 0, 0), rd(2, 100, 1), rd(5, 300, 3), rd(9, 400, 4)];

  it('is the rise of the cumulative readings across the window', () => {
    expect(costOfWindow(readings, at(2), at(9))).toEqual({ tokens: 300, usd: 3, estimate: false, why: null });
    expect(costOfWindow(readings, at(3), at(6))).toMatchObject({ tokens: 200, usd: 2, estimate: false }); // the last reading at or before
  });

  it('a window the readings do not cover is an estimate with its reason', () => {
    expect(costOfWindow(readings.slice(1), at(0), at(5))).toEqual({
      tokens: 200,
      usd: 2,
      estimate: true,
      why: { key: 'noReadingsBefore', date: '2026-11-20' }
    });
    expect(costOfWindow([], at(0), at(5))).toEqual({ tokens: 0, usd: 0, estimate: true, why: { key: 'noReadings' } });
  });
});

describe('reworkOf (US-1301 FR2.5, FR3)', () => {
  const rejectedRun = [
    start('code-generation', 0),
    ev('GATE_REJECTED', 4, { Stage: 'code-generation' }),
    ev('STAGE_REVISING', 5, { Stage: 'code-generation' }),
    ...approve('code-generation', 9)
  ];
  const readings = [rd(0, 0, 0), rd(4, 200, 2), rd(9, 1000, 10)];
  const base = { events: rejectedRun, readings, source: 'recorded', archived: false, finished: true, total: { usd: 10, tokens: 1000 } };

  it('prices each thrown-away attempt and gives the share of the intent’s cost', () => {
    const r = reworkOf(base);
    expect(r.total).toEqual({ tokens: 200, usd: 2 });
    expect(r.share).toBeCloseTo(0.2);
    expect(r.estimate).toBe(false);
    expect(r.attempts).toEqual([expect.objectContaining({ stage: 'code-generation', reason: 'rejected', tokens: 200, usd: 2, estimate: false })]);
  });

  it('no rework is a zero total with no attempts', () => {
    const r = reworkOf({ ...base, events: [start('code-generation', 0), ...approve('code-generation', 9)] });
    expect(r).toMatchObject({ total: { tokens: 0, usd: 0 }, share: 0, attempts: [], estimate: false });
  });

  it('readings rebuilt from transcripts are an estimate, priced by the tokens’ share of the total', () => {
    const rebuilt = readings.map((x) => ({ ...x, usd: null }));
    const r = reworkOf({ ...base, readings: rebuilt, source: 'rebuilt' });
    expect(r.attempts[0]).toMatchObject({ tokens: 200, usd: 2, estimate: true, why: { key: 'rebuilt' } });
    expect(r.estimate).toBe(true);
  });

  it('two attempts open at once share the rise evenly and are an estimate', () => {
    const events = [
      start('code-generation', 0, 'u1-api'),
      start('code-generation', 0, 'u2-ui'),
      ev('GATE_REJECTED', 4, { Stage: 'code-generation', Unit: 'u1-api' }),
      ev('GATE_APPROVED', 4, { Stage: 'code-generation', Unit: 'u2-ui' })
    ];
    const r = reworkOf({ ...base, events, readings: [rd(0, 0, 0), rd(4, 400, 4)] });
    expect(r.attempts).toEqual([expect.objectContaining({ unit: 'u1-api', tokens: 200, usd: 2, estimate: true, why: { key: 'parallel' } })]);
  });

  it('is never larger than the intent’s total; the total wins and is marked an estimate', () => {
    const r = reworkOf({ ...base, total: { usd: 1, tokens: 100 } });
    expect(r.total).toEqual({ tokens: 100, usd: 1 });
    expect(r.share).toBe(1);
    expect(r.estimate).toBe(true);
    expect(r.why).toEqual({ key: 'capped' });
  });

  it('an intent archived before it completed counts its whole cost (FR2.5)', () => {
    const r = reworkOf({ ...base, archived: true, finished: false });
    expect(r.total).toEqual({ tokens: 1000, usd: 10 });
    expect(r.share).toBe(1);
    expect(r.attempts).toEqual([expect.objectContaining({ stage: null, reason: 'archived', tokens: 1000, usd: 10 })]);
  });

  it('an intent archived after it completed counts only its thrown-away attempts', () => {
    const r = reworkOf({ ...base, archived: true, finished: true });
    expect(r.total).toEqual({ tokens: 200, usd: 2 });
    expect(r.attempts.map((a) => a.reason)).toEqual(['rejected']);
  });
});

describe('the intent:rework handler body, loadRework (US-1301 FR4)', () => {
  const events = [
    start('code-generation', 0),
    ev('GATE_REJECTED', 4, { Stage: 'code-generation' }),
    ev('STAGE_REVISING', 5, { Stage: 'code-generation' }),
    ...approve('code-generation', 9)
  ];
  const intent = { dirName: '261120-a', status: 'complete', stateStatus: 'Complete' };
  const total = { usd: 10, tokens: 1000 };

  it('prices from the history loadTokenHistory gives, rebuilt readings included [Q4]', async () => {
    const loadHistory = vi.fn(async () => ({ source: 'rebuilt', readings: [rd(0, 0, null), rd(4, 300, null), rd(9, 1000, null)] }));
    const r = await loadRework({ intent, events, total, loadHistory });
    expect(loadHistory).toHaveBeenCalledOnce();
    expect(r.attempts[0]).toMatchObject({ reason: 'rejected', tokens: 300, usd: 3, estimate: true, why: { key: 'rebuilt' } });
  });

  it('an archived intent that was not complete is all rework, and a failing history read still answers', async () => {
    const archived = { ...intent, status: 'archived', stateStatus: 'Archived', archivedFrom: 'Running' };
    const failing = vi.fn(async () => {
      throw new Error('boom');
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await loadRework({ intent: archived, events, total, loadHistory: failing })).attempts[0].reason).toBe('archived');
    const r = await loadRework({ intent, events, total, loadHistory: failing });
    expect(r.attempts[0]).toMatchObject({ reason: 'rejected', estimate: true, why: { key: 'noReadings' } });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});

describe('overviewRework (US-1301 FR5, NFR4)', () => {
  const events = [
    start('code-generation', 0),
    ev('GATE_REJECTED', 4, { Stage: 'code-generation' }),
    ev('STAGE_REVISING', 5, { Stage: 'code-generation' }),
    ...approve('code-generation', 9)
  ];
  const cost = { total: { usd: 10, totalTokens: 1000 }, byStage: [{ name: 'code-generation', usd: 8, totalTokens: 800 }] };

  it('uses the stored readings when there are any', () => {
    const r = overviewRework({ events, readings: [rd(0, 0, 0), rd(4, 200, 2), rd(9, 1000, 10)], archived: false, finished: true, cost });
    expect(r).toMatchObject({ total: { tokens: 200, usd: 2 }, estimate: false });
  });

  it('without stored readings, prices from the ledger’s stage cost split evenly over its attempts, as an estimate', () => {
    const r = overviewRework({ events, readings: [], archived: false, finished: true, cost });
    expect(r.total).toEqual({ tokens: 400, usd: 4 });
    expect(r.share).toBeCloseTo(0.4);
    expect(r).toMatchObject({ estimate: true, why: { key: 'ledger' } });
  });

  it('an intent without a ledger entry has no rework', () => {
    expect(overviewRework({ events, readings: [], archived: false, finished: true, cost: null })).toBeNull();
  });
});
