// The token detail view's chart numbers (EPIC-02 US-0208 FR3): elapsed labels, the stacked kinds over time, the rate
// between readings, and the top-12 splits. Pure, so they are tested without visx or the DOM.
import { describe, expect, it } from 'vitest';
import { STACK_KINDS, elapsedLabel, rateSeries, splitRows, stackSeries } from '../../src/renderer/tokenChart.js';

const MIN = 60_000;
const reading = (at, n) => ({ at, input: n, output: 2 * n, cacheWrite5m: 3 * n, cacheWrite1h: 4 * n, cacheRead: 5 * n, usd: n / 100 });
const row = (name, usd, total) => ({
  name,
  usd,
  missingPrice: false,
  totalTokens: total,
  tokens: { input: total / 2, output: total / 4, cacheWrite: total / 8, cacheRead: total / 8 }
});

describe('elapsedLabel (US-0208 FR3.1)', () => {
  it('formats h:mm, also past 24 hours', () => {
    expect([0, 51 * MIN, 102 * MIN + 59_000, 25 * 60 * MIN + 5 * MIN].map(elapsedLabel)).toEqual(['0:00', '0:51', '1:42', '25:05']);
    expect(elapsedLabel(-5)).toBe('0:00');
  });
});

describe('stackSeries and rateSeries (US-0208 FR3.1, FR3.2)', () => {
  const readings = [reading(1000, 10), reading(1000 + MIN, 20), reading(1000 + 3 * MIN, 30)];

  it('stacks the five kinds, cache read at the bottom and input on top, over elapsed time', () => {
    const layers = stackSeries(readings);
    expect(layers.map((l) => l.kind)).toEqual(STACK_KINDS);
    expect(STACK_KINDS).toEqual(['cacheRead', 'cacheWrite5m', 'cacheWrite1h', 'output', 'input']);
    expect(layers[0].points.map((p) => p.t)).toEqual([0, MIN, 3 * MIN]);
    expect(layers[0].points[1]).toEqual({ t: MIN, y0: 0, y1: 100 }); // cache read 5 × 20
    expect(layers[1].points[1]).toEqual({ t: MIN, y0: 100, y1: 160 }); // + cache write 5 m 3 × 20
    expect(layers.at(-1).points[1].y1).toBe(300); // every kind: 15 × 20
    expect(stackSeries([])).toEqual(STACK_KINDS.map((kind) => ({ kind, points: [] })));
  });

  it('gives tokens per minute between readings, and nothing for fewer than two', () => {
    // 150 -> 300 tokens over 1 min, then 300 -> 450 over 2 min.
    expect(rateSeries(readings)).toEqual([
      { t: MIN, rate: 150 },
      { t: 3 * MIN, rate: 75 }
    ]);
    expect(rateSeries(readings.slice(0, 1))).toEqual([]);
    expect(rateSeries([])).toEqual([]);
    expect(rateSeries([reading(0, 20), reading(MIN, 10)])).toEqual([{ t: MIN, rate: 0 }]); // a lower total is no negative rate
  });
});

describe('splitRows (US-0208 FR3.3)', () => {
  const agents = Array.from({ length: 14 }, (_, i) => row(`agent-${i}`, 14 - i, (14 - i) * 1000));

  it('keeps the top 12 largest first and sums the rest as other, in tokens by kind', () => {
    const rows = splitRows([...agents].reverse(), 'tokens');
    expect(rows).toHaveLength(13);
    expect(rows[0]).toMatchObject({ name: 'agent-0', value: 14_000, other: false });
    expect(rows[0].parts).toEqual([
      { kind: 'input', value: 7000 },
      { kind: 'output', value: 3500 },
      { kind: 'cacheWrite', value: 1750 },
      { kind: 'cacheRead', value: 1750 }
    ]);
    expect(rows.at(-1)).toMatchObject({ other: true, value: 3000, usd: 3 }); // agent-12 + agent-13
  });

  it('measures in dollars as one part, and keeps the given order when asked (stages)', () => {
    const rows = splitRows(agents.slice(0, 3), 'usd');
    expect(rows.map((r) => [r.name, r.value, r.parts])).toEqual([
      ['agent-0', 14, [{ kind: 'usd', value: 14 }]],
      ['agent-1', 13, [{ kind: 'usd', value: 13 }]],
      ['agent-2', 12, [{ kind: 'usd', value: 12 }]]
    ]);
    const stages = [row('requirements', 1, 10), row('code-generation', 5, 50)];
    expect(splitRows(stages, 'tokens', { keepOrder: true }).map((r) => r.name)).toEqual(['requirements', 'code-generation']);
    expect(splitRows([], 'tokens')).toEqual([]);
  });
});
