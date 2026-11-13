import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import IntentList from '../../src/renderer/IntentList.jsx';

// Same shape loadIntentList returns (mergeIntents + per-intent summary).
const base = { uuid: null, missingOnDisk: false, missingInIndex: false, active: false, done: 0, executed: 0, request: null };
const intents = [
  { ...base, dirName: '261112-epic29-small-k2-fixes', slug: 'epic29-small-k2-fixes', scope: 'express', status: 'in-flight', date: '2026-11-12', active: true, request: 'K2-regeln om 7 000 kronor', done: 6, executed: 10 },
  { ...base, dirName: '261111-orphan-notes', slug: 'orphan-notes', scope: 'workshop', status: null, date: '2026-11-11', missingInIndex: true },
  { ...base, dirName: '261110-epic02-finish', slug: 'epic02-finish', scope: 'feature', status: 'complete', date: '2026-11-10', request: 'team och avdelningar' }
];

const rowSlugs = () => screen.getAllByTestId('intent-list-row').map((r) => r.querySelector('.intent-slug').textContent);

afterEach(cleanup);

describe('IntentList', () => {
  it('filters by free text on slug and request, and by status (FR2.4)', () => {
    render(<IntentList intents={intents} selected={null} onSelect={vi.fn()} />);
    expect(rowSlugs()).toEqual(['epic29-small-k2-fixes', 'orphan-notes', 'epic02-finish']);

    fireEvent.change(screen.getByTestId('intent-list-search'), { target: { value: 'avdelningar' } });
    expect(rowSlugs()).toEqual(['epic02-finish']);

    fireEvent.change(screen.getByTestId('intent-list-search'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('intent-list-status-filter'), { target: { value: 'in-flight' } });
    expect(rowSlugs()).toEqual(['epic29-small-k2-fixes']);
  });

  it('shows status, active and missing-in-index as text, not colour alone (FR9.3, FR2.3, FR2.5)', () => {
    const onSelect = vi.fn();
    render(<IntentList intents={intents} selected={null} onSelect={onSelect} />);
    expect(screen.getAllByTestId('intent-list-row-status').map((s) => s.textContent)).toEqual([
      'in-flight',
      'okänd status',
      'complete'
    ]);
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
    expect(cells[1].title).toMatch(/Ingen post i usage-ledger.json/);
    expect(cells[0].title).toBe('Uppskattad kostnad (API-pris)');

    rerender(<IntentList intents={intents} selected={null} onSelect={vi.fn()} cost={{ available: false, reason: 'saknas' }} />);
    expect(screen.queryAllByTestId('intent-list-row-cost')).toEqual([]);
  });
});
