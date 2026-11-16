// The token detail view (EPIC-02 US-0208): opening it from the small view, the live and recorded summary, the
// charts with their text labels, the Diagram / Table and Tokens / $ switches, the empty states and the tooltip.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
// jsdom has no layout: give the over-time chart a fixed width.
vi.mock('@visx/responsive', () => ({ ParentSize: ({ children }) => children({ width: 800, height: 260 }) }));
const { default: TokenDetail } = await import('../../src/renderer/TokenDetail.jsx');
const { default: IntentDetail } = await import('../../src/renderer/IntentDetail.jsx');

const ledger = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const UUID = '01a1c625-50f3-7f83-9755-b096bf4025e6';
const DIR = '261113-live';
const intentOf = (status) => ({ dirName: DIR, uuid: UUID, slug: 'live', scope: 'feature', status, date: null });
const cost = () => ({ available: true, ...summarizeLedger(ledger, [intentOf('in-flight')]) });
const reading = (s, n) => ({
  at: 1_000_000 + s * 1000,
  input: 300 * n,
  output: 150 * n,
  cacheWrite5m: 20 * n,
  cacheWrite1h: 10 * n,
  cacheRead: 500 * n,
  usd: 0.4 * n
});
const READINGS = [reading(0, 1), reading(40, 4), reading(80, 7), reading(140, 10)]; // 30–60 s apart
const STAGES = ['functional-design', 'code-generation'];

function detailProps(readings = READINGS, status = 'in-flight', extra = {}) {
  window.bridge = { getTokenReadings: vi.fn(async () => readings) };
  return { projectId: 'p1', dirName: DIR, intent: intentOf(status), cost: cost(), live: status === 'in-flight', stageOrder: STAGES, onBack: vi.fn(), ...extra };
}
async function renderDetail(...args) {
  const props = detailProps(...args);
  const view = render(<TokenDetail {...props} />);
  await waitFor(() => expect(window.bridge.getTokenReadings).toHaveBeenCalledWith('p1', DIR));
  await act(async () => {});
  return { ...view, props };
}

beforeEach(() => document.documentElement.setAttribute('data-motion', 'full'));
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('opening and closing (US-0208 FR1)', () => {
  const detail = {
    dirName: DIR,
    state: { currentStage: null },
    pipeline: { phases: [{ name: 'construction', stages: STAGES.map((slug) => ({ slug, status: 'done' })) }], done: 2, executed: 2 },
    files: [],
    warnings: [],
    events: [],
    graph: null,
    units: {}
  };

  it('click or Enter on the small view opens the detail in place of the main panel; Back and Esc return focus to it', async () => {
    window.bridge = { getTokenReadings: vi.fn(async () => READINGS) };
    render(<IntentDetail projectId="p1" detail={detail} intent={intentOf('in-flight')} activeDirName={DIR} cost={cost()} models={null} />);
    const small = () => screen.getByTestId('token-view');
    expect(small().getAttribute('role')).toBe('button');

    fireEvent.click(small());
    const heading = await screen.findByRole('heading', { level: 2, name: 'Tokens · live' });
    expect(document.activeElement).toBe(heading);
    expect(screen.queryByTestId('intent-detail-tab-pipeline')).toBeNull();
    fireEvent.click(screen.getByTestId('token-detail-back'));
    await waitFor(() => expect(document.activeElement).toBe(small()));
    expect(screen.getByTestId('intent-detail-tab-pipeline')).toBeTruthy();

    fireEvent.keyDown(small(), { key: 'Enter' });
    fireEvent.keyDown(await screen.findByRole('heading', { level: 2 }), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(small()));
    fireEvent.keyDown(small(), { key: ' ' });
    expect(await screen.findByTestId('token-detail')).toBeTruthy();
  });

  it('a finished intent opens it from its own small button', async () => {
    window.bridge = { getTokenReadings: vi.fn(async () => []) };
    render(<IntentDetail projectId="p1" detail={detail} intent={intentOf('complete')} activeDirName={null} cost={cost()} models={null} />);
    expect(screen.queryByTestId('token-view')).toBeNull();
    fireEvent.click(screen.getByTestId('token-view-open'));
    expect(await screen.findByTestId('token-detail')).toBeTruthy();
    fireEvent.click(screen.getByTestId('token-detail-back'));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('token-view-open')));
  });
});

describe('live view (US-0208 FR3, FR5, FR7)', () => {
  it('shows Mode Live, tokens, cost and readings, and charts with a text label for every kind', async () => {
    await renderDetail();
    const side = screen.getByTestId('token-detail-side');
    expect(within(side).getByTestId('token-detail-mode').textContent).toBe('Live');
    expect(within(side).getByTestId('token-detail-tokens').textContent).toBe('9,8 k');
    expect(within(side).getByTestId('token-detail-cost').textContent).toBe('$4.00');
    expect(within(side).getByTestId('token-detail-recorded').textContent).toBe('0:02 · 4 avläsningar');
    expect(within(side).getByTestId('token-detail-rate').textContent).toBe('2,9 k tokens/min'); // 3 × 980 over the last minute
    expect(within(side).getByTestId('token-detail-model').textContent).toBe('opus-5-5');

    const legend = screen.getByTestId('token-detail-legend');
    expect([...legend.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Input', 'Output', 'Cache write 1 h', 'Cache write 5 m', 'Cache read']);
    expect(screen.getByTestId('token-detail-over-time').querySelectorAll('.token-detail-area')).toHaveLength(5);
    expect(screen.getByRole('heading', { level: 3, name: 'Tokens över tid' })).toBeTruthy();
    const stage = screen.getByTestId('token-detail-split-stage');
    expect([...stage.querySelectorAll('.token-detail-row-name')].map((n) => n.textContent)).toEqual(['Functional Design', 'Code Generation']);
    const agents = screen.getByTestId('token-detail-split-agent');
    expect([...agents.querySelectorAll('.token-detail-row-name')].map((n) => n.textContent)).toEqual(['architect', 'developer']);
    expect(screen.getByTestId('token-detail-split-model').querySelectorAll('.token-detail-row')).toHaveLength(2);
  });

  it('asks for the readings again on each cost refresh while live', async () => {
    const { rerender, props } = await renderDetail();
    rerender(<TokenDetail {...props} cost={{ ...cost() }} />);
    await waitFor(() => expect(window.bridge.getTokenReadings).toHaveBeenCalledTimes(2));
  });
});

describe('switches (US-0208 FR4)', () => {
  it('Diagram / Table shows a real table of the readings; Tokens / $ changes a split to dollars', async () => {
    await renderDetail();
    const tableButton = screen.getByTestId('token-detail-over-time-table');
    expect(tableButton.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(tableButton);
    expect(tableButton.getAttribute('aria-pressed')).toBe('true');
    const table = screen.getByRole('table');
    expect(table.querySelectorAll('th[scope="col"]')).toHaveLength(7);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(table.querySelector('tbody tr:last-child').textContent).toContain('0:02');
    expect(table.querySelector('caption').textContent).toBe('Kumulativa tokens per sparad avläsning');

    const stage = screen.getByTestId('token-detail-split-stage');
    expect([...stage.querySelectorAll('.token-detail-row-value')].map((n) => n.textContent)).toEqual(['6,2 k', '3,7 k']);
    fireEvent.click(within(stage).getByTestId('token-detail-split-stage-usd'));
    expect([...stage.querySelectorAll('.token-detail-row-value')].map((n) => n.textContent)).toEqual(['$2.50', '$1.50']);
  });

  it('sums agents past the top 12 as Övriga', async () => {
    const many = structuredClone(ledger);
    const wf = many.workflows[`intent:${UUID}`];
    for (let i = 0; i < 13; i += 1) wf.byAgent[`agent-${i}`] = { tokens: { input: 10 + i }, usd: 0.01 };
    window.bridge = { getTokenReadings: vi.fn(async () => READINGS) };
    render(<TokenDetail {...detailProps()} cost={{ available: true, ...summarizeLedger(many, [intentOf('in-flight')]) }} />);
    const rows = screen.getByTestId('token-detail-split-agent').querySelectorAll('.token-detail-row-name');
    expect(rows).toHaveLength(13);
    expect(rows[12].textContent).toBe('Övriga');
  });
});

describe('recorded and missing data (US-0208 FR5, FR6)', () => {
  it('a finished intent without readings says why in one sentence; the splits still show', async () => {
    await renderDetail([], 'complete');
    expect(screen.getByTestId('token-detail-mode').textContent).toBe('Inspelad');
    expect(screen.getByTestId('token-detail-recorded').textContent).toBe('Inga avläsningar');
    expect(screen.getByTestId('token-detail-over-time-empty').textContent).toBe(
      'Inga avläsningar finns sparade för den här intenten; den blev klar innan de sparades.'
    );
    expect(screen.queryByTestId('token-detail-over-time')).toBeNull();
    expect(screen.getByTestId('token-detail-split-stage').querySelectorAll('.token-detail-row')).toHaveLength(2);
  });

  it('an intent without a ledger entry says so in every frame', async () => {
    window.bridge = { getTokenReadings: vi.fn(async () => []) };
    render(<TokenDetail {...detailProps([])} cost={{ available: true, ...summarizeLedger(ledger, []) }} />);
    await act(async () => {});
    for (const id of ['stage', 'agent', 'model']) {
      expect(screen.getByTestId(`token-detail-split-${id}`).textContent).toContain('Det finns ingen post i kostnadsloggen för den här intenten än.');
    }
  });
});

describe('tooltip (US-0208 FR4, NFR3)', () => {
  it('focusing the chart shows the latest reading with each kind and the cost; arrows move, Esc hides', async () => {
    await renderDetail();
    const chart = screen.getByTestId('token-detail-over-time');
    act(() => chart.focus());
    const tip = screen.getByTestId('token-detail-tooltip');
    expect(tip.textContent).toContain('0:02');
    for (const label of ['Input', 'Output', 'Cache write 5 m', 'Cache write 1 h', 'Cache read', 'Kostnad']) expect(tip.textContent).toContain(label);
    expect(tip.textContent).toContain('$4.00');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(screen.getByTestId('token-detail-tooltip').textContent).toContain('$2.80');
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(screen.queryByTestId('token-detail-tooltip')).toBeNull();
    expect(screen.getByTestId('token-detail')).toBeTruthy(); // Esc on the chart hides the tooltip, not the view
  });
});
