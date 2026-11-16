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

  it('shows the cost in USD, "–" with an explanation when there is no entry, and nothing without a ledger (FR1.2, FR1.4, FR1.5)', () => {
    const { rerender } = render(<IntentList intents={intents} selected={null} onSelect={vi.fn()} cost={cost} />);
    const cells = screen.getAllByTestId('intent-list-row-cost');
    expect(cells.map((c) => c.textContent)).toEqual(['$5.00', '–', '$4.00']);
    expect(hoverTip(cells[1])).toMatch(/Ingen post i usage-ledger.json/);
    expect(hoverTip(cells[0])).toBe('Uppskattad kostnad (API-pris)');

    rerender(<IntentList intents={intents} selected={null} onSelect={vi.fn()} cost={{ available: false, reason: 'saknas' }} />);
    expect(screen.queryAllByTestId('intent-list-row-cost')).toEqual([]);
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
