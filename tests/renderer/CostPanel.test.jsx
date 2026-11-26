import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CostPanel from '../../src/renderer/CostPanel.jsx';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import ledger from '../fixtures/ledger/usage-ledger.json';

// Same shape the project:cost channel returns: {available, ...summarizeLedger(ledger, intents)}.
const intents = [
  {
    dirName: '261112-epic29-small-k2-fixes',
    uuid: '01a1d000-0000-7000-8000-000000000003',
    slug: 'epic29-small-k2-fixes',
    scope: 'express',
    date: '2026-11-12'
  },
  { dirName: '261110-epic02-finish', uuid: '01a1c625-50f3-7f83-9755-b096bf4025e6', slug: 'epic02-finish', scope: 'feature', date: '2026-11-10' }
];
const cost = { available: true, ...summarizeLedger(ledger, intents) };
const models = { source: 'agent-files', agents: [{ agent: 'developer', model: 'opus', effort: null }] };

afterEach(cleanup);

/** The shared tooltip's text while `el` has focus (US-0414). */
function focusTip(el) {
  fireEvent.focus(el);
  const text = screen.queryByRole('tooltip')?.textContent ?? '';
  fireEvent.blur(el);
  return text;
}

describe('CostPanel', () => {
  it('labels the total as an estimate, marks it incomplete and shows "pris saknas" for a model without price (FR6.1, FR6.2)', () => {
    render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));

    expect(screen.getByText('Uppskattad kostnad (API-pris)')).toBeTruthy();
    expect(screen.getByText('Ofullständig')).toBeTruthy();
    const haikuRow = within(screen.getByTestId('cost-panel-models')).getByText('claude-haiku-5-5').closest('tr');
    expect(within(haikuRow).getByText('pris saknas')).toBeTruthy();
    expect(focusTip(screen.getByTestId('model-mismatch'))).toBe('Konfigurerad för opus'); // developer ran on sonnet
  });

  // US-0050 item 7: Show opens the tables with the shared fold.
  it('opens the tables with the shared fold', () => {
    const { container } = render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    expect(container.querySelector('.cost-panel-body').classList.contains('lcars-reveal')).toBe(true);
  });

  it('makes the plain-text tooltips focusable and shows them on focus (US-0414 FR2.2)', () => {
    const { container } = render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    const big = container.querySelector('.cost-big-usd');
    expect(big.tabIndex).toBe(0);
    expect(focusTip(big)).toBe('Uppskattad kostnad (API-pris)');
    expect(screen.getByTestId('model-mismatch').tabIndex).toBe(0);
    expect(focusTip(screen.getByTestId('cost-panel-legacy'))).toBe('Körningar under record:<space>/legacy, från före intent-id. Ingår i totalen.');
    expect(container.querySelector('[title]')).toBeNull();
  });

  it('shows the legacy row and explains a missing ledger without breaking (FR3.4, FR1.5)', () => {
    const { rerender } = render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    expect(screen.getByTestId('cost-panel-legacy').textContent).toMatch(/^Äldre körningar \(utan intent-id\): \$0\.50/);

    rerender(<CostPanel cost={{ available: false, reason: 'aidlc/.aidlc-sessions/usage-ledger.json finns inte.' }} models={models} />);
    expect(screen.getByText(/usage-ledger.json finns inte/)).toBeTruthy();
    expect(screen.queryByTestId('cost-panel-legacy')).toBeNull();
  });

  it('names the machines under the total, this one marked, and tags a partial total with its tooltip (US-0209 FR4.1, FR4.2)', () => {
    const machines = [
      { host: 'hosta', local: true },
      { host: 'hostb', local: false }
    ];
    const { rerender, container } = render(<CostPanel cost={{ ...cost, project: { ...cost.project, machines, partial: true } }} models={models} />);
    expect(screen.getByTestId('cost-machines').firstChild.textContent).toBe('Räknat från: hosta (den här datorn), hostb');
    expect(screen.getByTestId('cost-partial').textContent).toBe('Delvis');
    expect(focusTip(screen.getByTestId('cost-partial'))).toMatch(/stage-raderna i audit-loggen/); // shared tooltip (US-0414)
    expect(focusTip(container.querySelector('.cost-big-usd'))).toBe('Uppskattad kostnad (API-pris)'); // still an estimate (FR4.3)

    rerender(<CostPanel cost={{ ...cost, project: { ...cost.project, machines, partial: false } }} models={models} />);
    expect(screen.queryByTestId('cost-partial')).toBeNull();
    rerender(<CostPanel cost={cost} models={models} />);
    expect(screen.queryByTestId('cost-machines')).toBeNull(); // no machines from main: no line
  });
});

// US-0211 FR3.2, AC1.4.1, AC1.4.3, AC1.5.1: the project total and scope totals as a pair, chart points with a tooltip.
describe('CostPanel current prices (US-0211)', () => {
  const RATES = { 'opus-5-5': { input: 100, output: 100, cacheWrite5m: 100, cacheWrite1h: 100, cacheRead: 100, source: 'app' } };
  const repriced = {
    available: true,
    ...summarizeLedger(ledger, intents, RATES),
    rates: { sources: {}, notes: [{ kind: 'overrideMissing', path: 'r.json' }] }
  };
  repriced.project.auditFiveMinute = true;

  it('shows the project total, the scope totals and the chart points with the current-price figure', () => {
    const { container } = render(<CostPanel cost={repriced} models={models} />);
    expect(container.querySelector('.cost-big-usd').textContent).toMatch(/^registrerat \$\d+\.\d\d · till dagens priser \$\d+\.\d\d\*?$/);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    expect(screen.getByTestId('cost-panel-total').textContent).toMatch(/· till dagens priser/);
    expect(within(screen.getByTestId('cost-panel-scopes')).getAllByText(/till dagens priser/).length).toBe(2);
    const titles = [...container.querySelectorAll('.cost-chart rect title')].map((n) => n.textContent);
    expect(titles.every((x) => /Till dagens priser: \$/.test(x))).toBe(true);
    expect(screen.getByTestId('cost-notes').textContent).toMatch(/r\.json finns inte.*prissätts som 5 minuter/);
  });

  it('keeps the recorded figures alone without a rate table', () => {
    const { container } = render(<CostPanel cost={cost} models={models} />);
    expect(container.querySelector('.cost-big-usd').textContent).not.toMatch(/dagens priser/);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    expect(screen.queryByTestId('cost-notes')).toBeNull();
  });
});

// US-1301 FR5: rework as a share of the project's cost, and each intent's rework as its own part of the bar.
describe('CostPanel rework (US-1301)', () => {
  const withRework = {
    ...cost,
    project: { ...cost.project, rework: { usd: 0.3, tokens: 500, share: 0.12, estimate: false } },
    timeline: cost.timeline.map((x, i) => ({ ...x, reworkUsd: i === 0 ? x.usd / 2 : 0 }))
  };

  it('shows rework as a share of the project’s total, and nothing without a figure', () => {
    const { rerender } = render(<CostPanel cost={withRework} models={models} />);
    expect(screen.getByTestId('cost-rework-share').textContent).toBe('Omarbete: $0.30 · 12 % av projektets kostnad');
    rerender(<CostPanel cost={cost} models={models} />);
    expect(screen.queryByTestId('cost-rework-share')).toBeNull();
  });

  it('draws each intent’s rework as its own part of its bar, in date order', () => {
    const { container } = render(<CostPanel cost={withRework} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    const parts = container.querySelectorAll('.cost-chart rect.cost-chart-rework');
    expect(parts.length).toBe(1);
    const bar = container.querySelector('.cost-chart rect:not(.cost-chart-rework)');
    expect(parts[0].getAttribute('x')).toBe(bar.getAttribute('x')); // the first bar, the earliest intent
    expect(Number(parts[0].getAttribute('height'))).toBeCloseTo(Number(bar.getAttribute('height')) / 2);
    expect(parts[0].querySelector('title').textContent).toMatch(/^Omarbete: \$\d+\.\d\d$/);
  });
});

// US-1302: the Savings section, fed by project:savings (hints sorted in main, largest saving first).
describe('CostPanel savings hints (US-1302 FR2.5, FR4–FR7, NFR1–NFR3)', () => {
  const working = (figures, thresholds, prices = null, extra = {}) => ({ figures, thresholds, prices, ...extra });
  const priced = {
    id: 'model:requirements-analysis',
    kind: 'model',
    intent: null,
    stage: 'requirements-analysis',
    agent: 'developer',
    saving: { total: 3, perRun: 1 },
    working: working(
      { runs: 3, rejections: 0, outputPerRun: 100, medianOutputPerRun: 1000 },
      { minRuns: 3, maxRejectedShare: 0.1 },
      { from: { model: 'opus-5-5', input: 5, output: 25 }, to: { model: 'sonnet-5-5', input: 2, output: 10 } },
      { to: 'sonnet-5-5' }
    ),
    links: ['models']
  };
  const unpriced = {
    ...priced,
    id: 'model:units-generation',
    stage: 'units-generation',
    agent: null,
    saving: null,
    working: { ...priced.working, prices: { from: null, to: priced.working.prices.to } }
  };
  const turns = {
    id: 'turns:261120-a:code-generation',
    kind: 'turns',
    intent: '261120-a',
    stage: 'code-generation',
    agent: null,
    saving: null,
    working: working({ turns: 8, medianTurns: 4, earlierRuns: 5 }, { factor: 2, minEarlierRuns: 5 }),
    links: ['costRules', 'handoff']
  };
  const cache = {
    id: 'cache:261120-b',
    kind: 'cache',
    intent: '261120-b',
    stage: null,
    agent: null,
    saving: null,
    working: working({ share: 0.4, medianShare: 0.8 }, { pointsBelow: 20 }),
    links: []
  };
  let onView;

  function renderPanel(result) {
    window.bridge = {
      getSavings: vi.fn(async () => result),
      dismissSaving: vi.fn(async (_p, id, on) => (on ? [...result.dismissed, id] : result.dismissed.filter((d) => d !== id)))
    };
    onView = vi.fn();
    return render(<CostPanel cost={cost} models={models} projectId="p1" space="default" onView={onView} />);
  }
  afterEach(() => {
    delete window.bridge;
  });
  const ids = () => screen.queryAllByTestId('cost-savings-hint').map((li) => li.dataset.hint);

  it('lists the hints in their order, each saving an estimate, "no price" where a model has none', async () => {
    renderPanel({ hints: [priced, unpriced, turns, cache], dismissed: [] });
    await screen.findAllByTestId('cost-savings-hint');
    expect(window.bridge.getSavings).toHaveBeenCalledWith('p1', 'default');
    expect(ids()).toEqual([priced.id, unpriced.id, turns.id, cache.id]);
    const [first, second] = screen.getAllByTestId('cost-savings-hint');
    expect(within(first).getByTestId('cost-savings-saving').textContent).toMatch(/Uppskattning.*\$3\.00.*\$1\.00/);
    expect(within(second).getByTestId('cost-savings-no-price').textContent).toBe('pris saknas');
    expect(within(second).queryByTestId('cost-savings-saving')).toBeNull();
  });

  it('unfolds a hint’s working: figures, thresholds and prices (FR5)', async () => {
    renderPanel({ hints: [priced], dismissed: [] });
    const hint = await screen.findByTestId('cost-savings-hint');
    expect(within(hint).queryByTestId('cost-savings-working')).toBeNull();
    fireEvent.click(within(hint).getByTestId('cost-savings-working-toggle'));
    const text = within(hint).getByTestId('cost-savings-working').textContent;
    expect(text).toMatch(/1000/);
    expect(text).toMatch(/opus-5-5/);
    expect(text).toMatch(/sonnet-5-5/);
  });

  it('dismisses a hint, lists it under "show dismissed" and brings it back (FR6)', async () => {
    renderPanel({ hints: [priced, cache], dismissed: [] });
    const [first] = await screen.findAllByTestId('cost-savings-hint');
    fireEvent.click(within(first).getByTestId('cost-savings-dismiss'));
    expect(window.bridge.dismissSaving).toHaveBeenCalledWith('p1', priced.id, true);
    await waitFor(() => expect(ids()).toEqual([cache.id]));
    fireEvent.click(screen.getByTestId('cost-savings-show-dismissed'));
    const list = screen.getByTestId('cost-savings-dismissed');
    fireEvent.click(within(list).getByTestId('cost-savings-restore'));
    expect(window.bridge.dismissSaving).toHaveBeenLastCalledWith('p1', priced.id, false);
    await waitFor(() => expect(ids()).toEqual([priced.id, cache.id]));
  });

  it('keeps hints dismissed earlier hidden, and says so in one line when there are none', async () => {
    renderPanel({ hints: [cache], dismissed: [cache.id] });
    expect((await screen.findByTestId('cost-savings-none')).textContent).toMatch(/^Inga sparförslag/);
    expect(ids()).toEqual([]);
    expect(screen.getByTestId('cost-savings-show-dismissed')).toBeTruthy();
  });

  it('each link only opens its view and changes nothing (FR2.5, FR4, NFR1)', async () => {
    renderPanel({ hints: [priced, turns], dismissed: [] });
    await screen.findAllByTestId('cost-savings-hint');
    fireEvent.click(screen.getByTestId('cost-savings-link-models'));
    fireEvent.click(screen.getByTestId('cost-savings-link-cost-rules'));
    fireEvent.click(screen.getByTestId('cost-savings-link-handoff'));
    expect(onView.mock.calls).toEqual([
      ['config', { configSection: 'aidlc', aidlcTab: 'settings' }],
      ['config', { configSection: 'costRules' }],
      ['config', { configSection: 'agent' }]
    ]);
    expect(window.bridge.dismissSaving).not.toHaveBeenCalled();
    expect(window.bridge.getSavings).toHaveBeenCalledOnce();
  });

  it('shows no section without a project id (the panel alone)', () => {
    render(<CostPanel cost={cost} models={models} />);
    expect(screen.queryByTestId('cost-savings')).toBeNull();
  });
});
