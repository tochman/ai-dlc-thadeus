import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HARNESSES } from '../../src/shared/harnesses.js';
import { HOVER_DELAY_MS } from '../../src/renderer/Tooltip.jsx';

const terminal = { state: vi.fn(() => 'idle'), type: vi.fn(), sequence: vi.fn(), harness: HARNESSES.find((h) => h.id === 'claude') };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: IntentList } = await import('../../src/renderer/IntentList.jsx');

/** The shared tooltip's text after hovering `el` (US-0414). */
function hoverTip(el) {
  vi.useFakeTimers();
  try {
    fireEvent.mouseOver(el);
    act(() => vi.advanceTimersByTime(HOVER_DELAY_MS));
    const text = screen.queryAllByRole('tooltip').map((n) => n.textContent);
    fireEvent.mouseLeave(el);
    return text.join('|');
  } finally {
    vi.useRealTimers();
  }
}

// Same shape loadIntentList returns (mergeIntents + per-intent summary).
const base = { uuid: null, missingOnDisk: false, missingInIndex: false, active: false, done: 0, executed: 0, request: null };
const intents = [
  {
    ...base,
    dirName: '261112-epic29-small-k2-fixes',
    slug: 'epic29-small-k2-fixes',
    scope: 'express',
    status: 'in-flight',
    date: '2026-11-12',
    active: true,
    request: 'a 7 000 character limit for notes',
    done: 6,
    executed: 10
  },
  { ...base, dirName: '261111-orphan-notes', slug: 'orphan-notes', scope: 'workshop', status: null, date: '2026-11-11', missingInIndex: true },
  {
    ...base,
    dirName: '261110-epic02-finish',
    slug: 'epic02-finish',
    scope: 'feature',
    status: 'complete',
    date: '2026-11-10',
    request: 'teams and departments'
  }
];

const rowSlugs = () => screen.getAllByTestId('intent-list-row').map((r) => r.querySelector('.intent-slug').textContent);

afterEach(cleanup);

describe('IntentList', () => {
  it('filters by free text on slug and request, and by status (FR2.4)', () => {
    render(<IntentList intents={intents} selected={null} onSelect={vi.fn()} />);
    expect(rowSlugs()).toEqual(['epic29-small-k2-fixes', 'orphan-notes', 'epic02-finish']);

    fireEvent.change(screen.getByTestId('intent-list-search'), { target: { value: 'departments' } });
    expect(rowSlugs()).toEqual(['epic02-finish']);

    fireEvent.change(screen.getByTestId('intent-list-search'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('intent-list-status-filter'), { target: { value: 'in-flight' } });
    expect(rowSlugs()).toEqual(['epic29-small-k2-fixes']);
  });

  it('shows and filters a custom plan by its own name, with the base scope on hover', () => {
    const custom = {
      ...base,
      dirName: '261113-i18n-foundation',
      slug: 'i18n-foundation',
      scope: 'bugfix',
      plan: 'i18n-express',
      status: 'in-flight',
      date: '2026-11-13'
    };
    render(<IntentList intents={[...intents, custom]} selected={null} onSelect={vi.fn()} />);
    const row = screen.getAllByTestId('intent-list-row').find((r) => r.textContent.includes('i18n-foundation'));
    const label = [...row.querySelectorAll('span')].find((s) => s.textContent === 'i18n-express');
    expect(hoverTip(label)).toContain('bugfix');
    expect(row.textContent).not.toContain('bugfix');

    fireEvent.change(screen.getByTestId('intent-list-scope-filter'), { target: { value: 'i18n-express' } });
    expect(rowSlugs()).toEqual(['i18n-foundation']);
  });

  it('shows status, active and missing-in-index as text, not colour alone (FR9.3, FR2.3, FR2.5)', () => {
    const onSelect = vi.fn();
    render(<IntentList intents={intents} selected={null} onSelect={onSelect} />);
    expect(screen.getAllByTestId('intent-list-row-status').map((s) => s.textContent)).toEqual(['in-flight', 'okänd status', 'complete']);
    expect(screen.getByText('Aktiv')).toBeTruthy();
    expect(screen.getByText('Saknas i intents.json')).toBeTruthy();
    expect(screen.getByText('6/10')).toBeTruthy();

    fireEvent.click(screen.getAllByTestId('intent-list-row')[2]);
    expect(onSelect).toHaveBeenCalledWith('261110-epic02-finish');
  });

  // perIntent shape from summarizeLedger: null means the ledger has no entry for that intent.
  const costEntry = (usd) => ({
    total: { usd, tokens: { input: 1, output: 1, cacheWrite: 0, cacheRead: 0 }, totalTokens: 2, missingPrice: false },
    complete: true
  });
  const cost = {
    available: true,
    perIntent: {
      '261112-epic29-small-k2-fixes': costEntry(5),
      '261111-orphan-notes': null,
      '261110-epic02-finish': costEntry(4)
    }
  };

  it('sorts by cost with intents without an entry last, and by name (FR1.6)', () => {
    render(<IntentList intents={intents} selected={null} onSelect={vi.fn()} cost={cost} />);
    fireEvent.change(screen.getByTestId('intent-list-sort'), { target: { value: 'cost' } });
    expect(rowSlugs()).toEqual(['epic29-small-k2-fixes', 'epic02-finish', 'orphan-notes']);

    fireEvent.change(screen.getByTestId('intent-list-sort'), { target: { value: 'name' } });
    expect(rowSlugs()).toEqual(['epic02-finish', 'epic29-small-k2-fixes', 'orphan-notes']);

    fireEvent.change(screen.getByTestId('intent-list-sort'), { target: { value: 'date' } });
    expect(rowSlugs()).toEqual(['epic29-small-k2-fixes', 'orphan-notes', 'epic02-finish']);
  });

  // Arrives newest first, as mergeIntents gives it.
  const mixed = [
    { ...base, dirName: '261122-c-done', slug: 'c-done', status: 'complete', date: '2026-11-22' },
    { ...base, dirName: '261121-b-open', slug: 'b-open', status: 'in-flight', date: '2026-11-21' },
    { ...base, dirName: '261120-d-parked', slug: 'd-parked', status: 'in-flight', parked: true, date: '2026-11-20' },
    { ...base, dirName: '261119-e-unknown', slug: 'e-unknown', status: null, date: '2026-11-19' },
    { ...base, dirName: '261118-a-active', slug: 'a-active', status: 'in-flight', active: true, date: '2026-11-18' }
  ];

  it('sorts by date with the active intent on top, then open and parked work, then the rest, each newest first (US-0040 FR4.1)', () => {
    render(<IntentList intents={mixed} selected={null} onSelect={vi.fn()} />);
    expect(rowSlugs()).toEqual(['a-active', 'b-open', 'd-parked', 'c-done', 'e-unknown']);
  });

  it('keeps the name and cost sorts free of the open-work grouping (US-0040 FR4.4)', () => {
    const costs = { available: true, perIntent: { '261122-c-done': costEntry(9), '261118-a-active': costEntry(1) } };
    render(<IntentList intents={mixed} selected={null} onSelect={vi.fn()} cost={costs} />);
    fireEvent.change(screen.getByTestId('intent-list-sort'), { target: { value: 'name' } });
    expect(rowSlugs()).toEqual(['a-active', 'b-open', 'c-done', 'd-parked', 'e-unknown']);
    fireEvent.change(screen.getByTestId('intent-list-sort'), { target: { value: 'cost' } });
    expect(rowSlugs().slice(0, 2)).toEqual(['c-done', 'a-active']);
  });

  it('shows the cost in USD, "–" with an explanation when there is no entry, and nothing without a ledger (FR1.2, FR1.4, FR1.5)', () => {
    const { rerender } = render(<IntentList intents={intents} selected={null} onSelect={vi.fn()} cost={cost} />);
    const cells = screen.getAllByTestId('intent-list-row-cost');
    expect(cells.map((c) => c.textContent)).toEqual(['$5.00', '–', '$4.00']);
    expect(hoverTip(cells[1])).toMatch(/Ingen post i usage-ledger.json/);
    expect(hoverTip(cells[0])).toBe('Uppskattad kostnad (API-pris)');

    rerender(<IntentList intents={intents} selected={null} onSelect={vi.fn()} cost={{ available: false, reason: 'saknas' }} />);
    expect(screen.queryAllByTestId('intent-list-row-cost')).toEqual([]);
  });

  it('US-0211: a row keeps the recorded figure and puts the current-price one in its tooltip when they differ (AC1.4.3)', () => {
    const repriced = {
      available: true,
      perIntent: {
        '261112-epic29-small-k2-fixes': { ...costEntry(5), total: { ...costEntry(5).total, currentUsd: 3.2 } },
        '261111-orphan-notes': null,
        '261110-epic02-finish': { ...costEntry(4), total: { ...costEntry(4).total, currentUsd: 4.001 } }
      }
    };
    render(<IntentList intents={intents} selected={null} onSelect={vi.fn()} cost={repriced} />);
    const cells = screen.getAllByTestId('intent-list-row-cost');
    expect(cells.map((c) => c.textContent)).toEqual(['$5.00', '–', '$4.00']);
    expect(hoverTip(cells[0])).toBe('Uppskattad kostnad (API-pris)\nTill dagens priser: $3.20');
    expect(hoverTip(cells[2])).toBe('Uppskattad kostnad (API-pris)'); // under $0.01 apart: no second figure
  });

  it('a row shows the combined text of its parts on focus, and each part its own on hover (US-0414 FR2.3)', () => {
    const row = { ...intents[0], plan: 'min-plan', error: 'trasig state-fil' };
    render(<IntentList intents={[row]} selected={null} onSelect={vi.fn()} cost={cost} />);
    const button = screen.getByTestId('intent-list-row');
    expect(button.hasAttribute('title')).toBe(false);
    fireEvent.focus(button);
    expect(screen.getByRole('tooltip').textContent).toBe(
      ['2026-11-12', 'Uppskattad kostnad (API-pris)', 'Egen plan som bygger på express', 'Klara av körda stages', 'trasig state-fil'].join('\n')
    );
    fireEvent.blur(button);
    expect(hoverTip(button)).toBe('2026-11-12');
    expect(hoverTip(screen.getByTestId('intent-list-row-cost'))).toBe('Uppskattad kostnad (API-pris)');
    expect(hoverTip(button.querySelector('.tag-error'))).toBe('trasig state-fil');
  });

  it('shows Fortsätt only under the selected, unfinished intent: not for the active one unless selected, never for complete', () => {
    const resumeRow = () => screen.queryByTestId('intent-resume')?.closest('li').querySelector('.intent-slug').textContent;
    const { rerender } = render(<IntentList intents={intents} selected={null} onSelect={vi.fn()} />);
    expect(screen.queryByTestId('intent-resume')).toBeNull(); // the active intent too, while not selected

    rerender(<IntentList intents={intents} selected="261112-epic29-small-k2-fixes" onSelect={vi.fn()} />);
    expect(screen.getAllByTestId('intent-resume')).toHaveLength(1);
    expect(resumeRow()).toBe('epic29-small-k2-fixes');

    rerender(<IntentList intents={intents} selected="261110-epic02-finish" onSelect={vi.fn()} />);
    expect(screen.queryByTestId('intent-resume')).toBeNull(); // finished
  });

  it('does not badge a finished intent as active even when the cursor still points at it', () => {
    const done = [{ ...intents[2], active: true }];
    render(<IntentList intents={done} selected={null} onSelect={vi.fn()} />);
    expect(screen.queryByText('Aktiv')).toBeNull();
  });
});

describe('IntentList parked mark (US-0510)', () => {
  it("a parked intent's row shows the LCARS mark with its stage (AC4.1.1)", () => {
    const list = [{ ...intents[0], parked: true, parkedStage: 'code-generation' }, intents[1], intents[2]];
    render(<IntentList intents={list} selected={null} onSelect={vi.fn()} />);
    const marks = screen.getAllByTestId('intent-parked');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('Parkerad vid Code Generation');
    expect(marks[0].closest('[data-testid="intent-list-row"]').querySelector('.intent-slug').textContent).toBe('epic29-small-k2-fixes');
  });

  it('shows no mark on intents that are not parked (AC4.1.6)', () => {
    render(<IntentList intents={[{ ...intents[0], parked: false, parkedStage: null }, intents[2]]} selected={null} onSelect={vi.fn()} />);
    expect(screen.queryByTestId('intent-parked')).toBeNull();
  });
});
