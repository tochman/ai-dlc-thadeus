// US-1303 FR6, FR6.3, NFR2, NFR3: a story, epic or release figure next to its status, and its detail.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CostBadge, CostDetail } from '../../src/renderer/StoryCost.jsx';
import { rollUp } from '../../src/main/parsers/storyCost.js';

afterEach(cleanup);

const row = (name, usd, totalTokens) => ({ name, usd, totalTokens });
function cost(usd, { complete = true, rework = null } = {}) {
  const tokens = { input: 1000, output: 200, cacheWrite: 300, cacheRead: 5000 };
  return {
    total: { usd, tokens, totalTokens: 6500 },
    byStage: [row('code-generation', usd, 6500)],
    byAgent: [row('developer', usd, 6500)],
    byModel: [row('claude-opus-5-5', usd, 6500)],
    complete,
    rework
  };
}
const rework = { total: { usd: 1, tokens: 1000 }, share: 0.25, estimate: false, byStage: { 'code-generation': { usd: 1, tokens: 1000 } } };
const figureOf = (input, id = 'US-1303') => rollUp(input).stories[id];

describe('CostBadge (US-1303 FR6.1, FR6.3)', () => {
  it('shows the figure in dollars', () => {
    render(<CostBadge figure={figureOf({ delivered: { a: ['US-1303'] }, perIntent: { a: cost(4) } })} />);
    expect(screen.getByTestId('story-cost-badge').textContent).toBe('$4.00');
  });

  it('shows nothing without a figure (0 with no linked intent)', () => {
    const { container } = render(<CostBadge figure={undefined} />);
    expect(container.textContent).toBe('');
  });

  it('says a shared figure is shared with N stories, and marks an incomplete one', () => {
    render(<CostBadge figure={figureOf({ delivered: { a: ['US-1301', 'US-1302', 'US-1303'] }, perIntent: { a: cost(9, { complete: false }) } })} />);
    expect(screen.getByTestId('story-cost-badge').textContent).toBe('$3.00* · delad med 3 storys');
  });
});

describe('CostDetail (US-1303 FR6.2, FR6.3, FR4, NFR2)', () => {
  it('shows the total, the tokens and the rework share', () => {
    render(<CostDetail figure={figureOf({ delivered: { a: ['US-1303'] }, perIntent: { a: cost(4, { rework }) } })} />);
    const d = screen.getByTestId('story-cost-detail');
    expect(d.textContent).toMatch(/\$4\.00/);
    expect(d.textContent).toMatch(/input 1,0 k · output 200 · cache write 300 · cache read 5,0 k/);
    expect(screen.getByTestId('story-cost-rework').textContent).toBe('Omarbete: $1.00 · 25 % av kostnaden');
    expect(screen.queryByTestId('story-cost-incomplete')).toBeNull();
  });

  it('says a figure with an unpriced model is incomplete', () => {
    render(<CostDetail figure={figureOf({ delivered: { a: ['US-1303'] }, perIntent: { a: cost(4, { complete: false }) } })} />);
    expect(screen.getByTestId('story-cost-incomplete').textContent).toBe('Ofullständig: en modell saknar pris');
  });

  it('folds out the split by stage, agent and model, stage rows with their rework', () => {
    render(<CostDetail figure={figureOf({ delivered: { a: ['US-1303'] }, perIntent: { a: cost(4, { rework }) } })} />);
    expect(screen.queryByTestId('story-cost-split')).toBeNull();
    fireEvent.click(screen.getByTestId('story-cost-split-toggle'));
    const split = screen.getByTestId('story-cost-split');
    const stage = within(split).getByText('code-generation').closest('tr');
    expect(stage.textContent).toMatch(/\$4\.00.*\$1\.00/);
    expect(within(split).getByText('developer')).toBeTruthy();
    expect(within(split).getByText('opus-5-5')).toBeTruthy();
  });

  it('names its intents: shared, no cost recorded, rework not known', () => {
    const fig = figureOf({ delivered: { a: ['US-1303', 'US-1304'], b: ['US-1303'] }, perIntent: { a: cost(4, { rework }), b: null } });
    render(<CostDetail figure={fig} />);
    const rows = screen.getAllByTestId('story-cost-intent').map((el) => el.textContent);
    expect(rows).toEqual(['a · delad med 2 storys', 'b · ingen kostnad registrerad · omarbete okänt']);
  });
});
