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
const { default: TokenDetail, chartTipLeft } = await import('../../src/renderer/TokenDetail.jsx');
const { HOVER_DELAY_MS } = await import('../../src/renderer/Tooltip.jsx');
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

// US-0507: the token detail also asks for the agent progress rows.
const bridge = (readings, progress = []) => ({ getTokenReadings: vi.fn(async () => readings), getAgentProgress: vi.fn(async () => progress) });

function detailProps(readings = READINGS, status = 'in-flight', extra = {}) {
  window.bridge = bridge(readings);
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
    window.bridge = bridge(READINGS);
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

  it('US-0022: the intent header has its own Tokens button, which opens the detail and gets focus back', async () => {
    window.bridge = bridge(READINGS);
    render(<IntentDetail projectId="p1" detail={detail} intent={intentOf('in-flight')} activeDirName={DIR} cost={cost()} models={null} />);
    const head = () => screen.getByTestId('intent-detail-tokens');
    expect(head().tagName).toBe('BUTTON');
    expect(head().textContent).toBe('Tokens');
    fireEvent.click(head());
    expect(await screen.findByTestId('token-detail')).toBeTruthy();
    fireEvent.click(screen.getByTestId('token-detail-back'));
    await waitFor(() => expect(document.activeElement).toBe(head()));
  });

  it('a finished intent opens it from its own small button', async () => {
    window.bridge = bridge([]);
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
    window.bridge = bridge(READINGS);
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
    window.bridge = bridge([]);
    render(<TokenDetail {...detailProps([])} cost={{ available: true, ...summarizeLedger(ledger, []) }} />);
    await act(async () => {});
    for (const id of ['stage', 'agent', 'model']) {
      expect(screen.getByTestId(`token-detail-split-${id}`).textContent).toContain('Det finns ingen post i kostnadsloggen för den här intenten än.');
    }
  });
});

// US-0211 AC1.4.1, FR3.2: token detail and intent detail show the recorded figure with the current-price one beside it.
describe('current prices (US-0211)', () => {
  const RATES = { 'opus-5-5': { input: 1, output: 1, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 1, source: 'app' } };
  const repriced = () => ({ available: true, ...summarizeLedger(ledger, [intentOf('in-flight')], RATES) });

  it('token detail shows "recorded · at current prices" as its cost, and in each split row tooltip', async () => {
    window.bridge = bridge(READINGS);
    render(<TokenDetail {...detailProps()} cost={repriced()} />);
    await act(async () => {});
    expect(screen.getByTestId('token-detail-cost').textContent).toMatch(/^registrerat \$4\.00 · till dagens priser \$0\.0\d$/);
    vi.useFakeTimers();
    try {
      const row = screen.getByTestId('token-detail-split-model').querySelector('.token-detail-row');
      fireEvent.mouseOver(row);
      act(() => vi.advanceTimersByTime(HOVER_DELAY_MS));
      expect(screen.getByRole('tooltip').textContent).toMatch(/registrerat \$2\.50 · till dagens priser \$0\.0\d/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('intent detail shows the pair in its cost readout', () => {
    window.bridge = bridge(READINGS);
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
    render(<IntentDetail projectId="p1" detail={detail} intent={intentOf('complete')} activeDirName={null} cost={repriced()} models={null} />);
    expect(screen.getByTestId('intent-detail-cost').textContent).toMatch(/^registrerat \$4\.00 · till dagens priser \$/);
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

  it('the chart tooltip takes the shared LCARS look and stays inside the chart on both sides (US-0414 FR3.2)', async () => {
    await renderDetail();
    act(() => screen.getByTestId('token-detail-over-time').focus());
    expect(screen.getByTestId('token-detail-tooltip').classList.contains('lcars-tip')).toBe(true);
    expect(chartTipLeft(-40, 800)).toBe(0);
    expect(chartTipLeft(100, 800)).toBe(112);
    expect(chartTipLeft(700, 800)).toBe(580);
    expect(chartTipLeft(100, 150)).toBe(0); // narrower than the tip: pinned to the left edge
  });

  it('a split-bar row shows the shared tooltip on focus and on hover (US-0414 FR3.1)', async () => {
    await renderDetail();
    const row = screen.getByTestId('token-detail-split-stage').querySelector('.token-detail-row');
    expect(row.querySelector('.token-detail-row-tip')).toBeNull();
    fireEvent.focus(row);
    const tip = screen.getByRole('tooltip');
    expect(tip.classList.contains('lcars-tip')).toBe(true);
    expect(tip.textContent).toMatch(/^Input .* · \$2\.50$/);
    expect(row.getAttribute('aria-describedby')).toBe(tip.id);
    fireEvent.blur(row);
    expect(screen.queryByRole('tooltip')).toBeNull();

    vi.useFakeTimers();
    try {
      fireEvent.mouseOver(row);
      act(() => vi.advanceTimersByTime(HOVER_DELAY_MS));
      expect(screen.getByRole('tooltip').textContent).toContain('$2.50');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('agent progress (US-0507)', () => {
  const build = (unit, minutes, steps, extra = {}) => ({
    kind: 'build',
    key: `build:${unit}`,
    unit,
    agent: null,
    stage: 'code-generation',
    minutes,
    status: 'running',
    endedMs: null,
    steps,
    commit: null,
    unreadable: null,
    ...extra
  });
  const review = (key, agent, stage, extra) => ({
    kind: 'review',
    key,
    unit: null,
    agent,
    stage,
    minutes: 2,
    status: 'requested',
    endedMs: null,
    verdict: null,
    severities: null,
    unreadable: null,
    ...extra
  });
  const PROGRESS = [
    build('u2-permissions', 12, { done: 6, total: 27 }, { commit: 'feat(u2-permissions): step 6' }),
    build('u3-replies', 3, { done: 16, total: 42 }),
    build('u1-questions', 40, { done: 27, total: 27 }, { status: 'done', endedMs: 1 }),
    build('u4-gone', 0, null, { unreadable: '.aidlc/worktrees/bolt-2a09832c_u4-gone' }),
    review('review:1', 'architecture-reviewer', 'code-generation', { status: 'done', endedMs: 1, verdict: 'NOT-READY', severities: { Major: 2, Minor: 1 } }),
    review('review:2', 'product-lead', 'functional-design')
  ];
  async function renderProgress(progress, extra) {
    const props = { ...detailProps(), ...extra };
    window.bridge = bridge(READINGS, progress);
    const view = render(<TokenDetail {...props} />);
    await waitFor(() => expect(window.bridge.getAgentProgress).toHaveBeenCalledWith('p1', DIR));
    await act(async () => {});
    return { ...view, props };
  }

  it('says in one sentence that nothing runs, in a section that is always there (FR1.1, FR1.4)', async () => {
    await renderProgress([]);
    const section = screen.getByTestId('agent-progress');
    expect(within(section).getByRole('heading', { level: 3 }).textContent).toBe('Agenternas framsteg');
    expect(within(section).getByTestId('agent-progress-empty').textContent).toBe('Inga agenter arbetar i den här intenten just nu.');
    expect(within(section).queryAllByTestId('agent-progress-row')).toHaveLength(0);
  });

  it('shows one focusable row per piece of work with its name, stage, minutes and status in text (FR1.3, FR2, FR3, FR5.3, NFR4)', async () => {
    await renderProgress(PROGRESS);
    const rows = screen.getAllByTestId('agent-progress-row');
    expect(rows).toHaveLength(6);
    for (const row of rows) expect(row.getAttribute('tabindex')).toBe('0');
    const text = rows.map((r) => r.textContent);
    for (const part of ['u2-permissions', 'Code Generation', '12 min', '6 av 27 steg', 'Senaste commit: feat(u2-permissions): step 6'])
      expect(text[0]).toContain(part);
    expect(text[2]).toContain('27 av 27 steg, klart');
    expect(text[3]).toContain('Kunde inte läsa .aidlc/worktrees/bolt-2a09832c_u4-gone');
    expect(text[3]).not.toMatch(/\d+ av \d+ steg/);
    expect(text[4]).toContain('architecture-reviewer');
    expect(text[4]).toContain('NOT-READY, 2 Major, 1 Minor');
    expect(text[5]).toContain('Functional Design');
    expect(text[5]).toContain('granskning begärd');
  });

  it('sums the builds up in one sentence with the numbers from the rows (FR4.1, FR4.2)', async () => {
    await renderProgress(PROGRESS);
    expect(screen.getByTestId('agent-progress-summary').textContent).toBe(
      'Byggena går framåt: u2-permissions har 6 av 27 steg klara, u3-replies har 16 av 42 steg klara och u1-questions har 27 av 27 steg klara.'
    );
  });

  it('counts the work when no build has steps, and asks again when the intent detail changes (FR4.1, FR5.1)', async () => {
    const { rerender, props } = await renderProgress([PROGRESS[5]], { refreshKey: 1 });
    expect(screen.getByTestId('agent-progress-summary').textContent).toBe('1 agent arbetar.');
    rerender(<TokenDetail {...props} refreshKey={2} />);
    await waitFor(() => expect(window.bridge.getAgentProgress).toHaveBeenCalledTimes(2));
  });
});
