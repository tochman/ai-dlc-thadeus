import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HARNESSES } from '../../src/shared/harnesses.js';
import { t } from '../../src/shared/i18n.js';
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

const option = (id, value) => [...screen.getByTestId(id).options].find((o) => o.value === value);
const pickStatus = (value) => fireEvent.change(screen.getByTestId('intent-list-status-filter'), { target: { value } });
const search = (value) => fireEvent.change(screen.getByTestId('intent-list-search'), { target: { value } });
const slugsShown = () => screen.queryAllByTestId('intent-list-row').map((r) => r.querySelector('.intent-slug').textContent);

describe('IntentList archived intents (US-0513 FR3)', () => {
  const open = Array.from({ length: 4 }, (_, n) => ({ ...base, dirName: `open-${n}`, slug: `open-${n}`, scope: 'feature', status: 'complete' }));
  const old = Array.from({ length: 60 }, (_, n) => ({
    ...base,
    dirName: `old-${n}`,
    slug: `old-${String(n).padStart(2, '0')}`,
    scope: n % 2 ? 'bugfix' : 'feature',
    status: 'archived'
  }));
  const ui = (list) => <IntentList intents={list} selected={null} onSelect={vi.fn()} />;

  it('leaves them out of the list, its count and every other status choice (AC3.1.1)', () => {
    render(ui([...open, ...old]));
    expect(slugsShown()).toEqual(open.map((i) => i.slug));
    expect(screen.getByTestId('list-drawer-open').getAttribute('aria-label')).toBe(t('fold.showN', { n: 4 }));
    expect([...screen.getByTestId('intent-list-status-filter').options].map((o) => o.textContent)).toEqual([
      t('intents.allStatuses'),
      'complete',
      t('intents.archive.filter', { n: 60 })
    ]);
    pickStatus('complete');
    expect(slugsShown()).toHaveLength(4);
  });

  it('the choice "Archived (60)" shows only those; search, plan and sort work inside it (AC3.1.2)', () => {
    render(ui([...open, ...old]));
    pickStatus('archived');
    expect(slugsShown()).toHaveLength(60);
    search('old-1');
    expect(slugsShown()).toHaveLength(10);
    fireEvent.change(screen.getByTestId('intent-list-scope-filter'), { target: { value: 'bugfix' } });
    expect(slugsShown()).toEqual(['old-11', 'old-13', 'old-15', 'old-17', 'old-19']);
    fireEvent.change(screen.getByTestId('intent-list-sort'), { target: { value: 'name' } });
    expect(slugsShown()[0]).toBe('old-11');
  });

  it('has no such choice with none archived, and goes back to all statuses when the last one is unarchived (AC3.1.3)', () => {
    const { rerender } = render(ui([...open, old[0]]));
    pickStatus('archived');
    expect(slugsShown()).toEqual(['old-00']);
    rerender(ui([...open, { ...old[0], status: 'complete' }])); // AC3.1.4: the list and its count follow at once
    expect(screen.getByTestId('intent-list-status-filter').value).toBe('');
    expect(option('intent-list-status-filter', 'archived')).toBeUndefined();
    expect(slugsShown()).toHaveLength(5);
    rerender(ui([...open, old[0]]));
    expect(slugsShown()).toHaveLength(4); // the filter really went back, it does not return to the archived ones
  });

  it('goes back to all statuses when archiving empties the status that was chosen', () => {
    const running = { ...base, dirName: 'r', slug: 'running', status: 'in-flight' };
    const { rerender } = render(ui([running, ...open]));
    pickStatus('complete');
    rerender(ui([running, ...open.map((i) => ({ ...i, status: 'archived' }))]));
    expect(screen.getByTestId('intent-list-status-filter').value).toBe('');
    expect(slugsShown()).toEqual(['running']);
  });

  it('says so when every intent is archived, and names the choice (AC3.1.5)', () => {
    render(ui(old));
    expect(screen.getByTestId('intent-list-empty').textContent).toBe(t('intents.archive.allArchived', { n: 60 }));
    search('nothing like this');
    pickStatus('archived');
    expect(screen.getByTestId('intent-list-empty').textContent).toBe(t('intents.noMatch'));
  });
});

describe('IntentList archiving several (US-0513 FR4)', () => {
  const complete = (n) => ({ ...base, dirName: `d-${n}`, slug: `done-${n}`, scope: 'feature', status: 'complete' });
  const list = [
    { ...base, dirName: 'run', slug: 'running', scope: 'feature', status: 'in-flight', active: true },
    complete(1),
    complete(2),
    { ...complete(3), scope: 'bugfix' },
    { ...complete(4), missingOnDisk: true },
    { ...complete(5), missingInIndex: true },
    { ...complete(6), status: 'archived' }
  ];
  const ui = (over = {}) => (
    <div className="project-body">
      <IntentList intents={list} selected={null} onSelect={vi.fn()} projectId="p1" space="default" activeSpace="default" {...over} />
    </div>
  );
  const click = (id) => fireEvent.click(screen.getByTestId(id));
  const checks = () => screen.queryAllByTestId('intent-list-check');
  const checkOf = (slug) => checks().find((c) => c.getAttribute('aria-label') === t('intents.archive.selectOne', { name: slug }));
  const chosen = () => screen.getByTestId('intent-list-chosen').textContent;
  let finish;
  let progress;
  beforeEach(() => {
    window.bridge = {
      archiveIntents: vi.fn(() => new Promise((resolve) => (finish = resolve))),
      onArchiveProgress: vi.fn((fn) => {
        progress = fn;
        return () => {};
      })
    };
  });
  afterEach(() => delete window.bridge);

  it('Select gives every visible complete intent a checkbox and no other; Select again ends it (AC4.1.1)', () => {
    render(ui());
    expect(checks()).toHaveLength(0);
    click('intent-list-select');
    expect(checks().map((c) => c.getAttribute('aria-label'))).toEqual(['done-1', 'done-2', 'done-3'].map((name) => t('intents.archive.selectOne', { name })));
    fireEvent.click(checkOf('done-1'));
    expect(chosen()).toBe(t('intents.archive.chosen', { n: 1 }));
    fireEvent.click(checkOf('done-1'));
    expect(chosen()).toBe(t('intents.archive.chosen', { n: 0 }));
    fireEvent.click(checkOf('done-2'));
    click('intent-list-select');
    expect(checks()).toHaveLength(0);
    click('intent-list-select');
    expect(chosen()).toBe(t('intents.archive.chosen', { n: 0 })); // a new choice starts empty
  });

  it('Select all takes the visible ones, and a choice outlives a search and a filter (AC4.1.1)', () => {
    render(ui());
    click('intent-list-select');
    search('done-1');
    click('intent-list-select-all');
    expect(chosen()).toBe(t('intents.archive.chosen', { n: 1 }));
    search('');
    fireEvent.change(screen.getByTestId('intent-list-scope-filter'), { target: { value: 'bugfix' } });
    expect(checks()).toHaveLength(1);
    fireEvent.click(checkOf('done-3'));
    expect(chosen()).toBe(t('intents.archive.chosen', { n: 2 }));
    fireEvent.change(screen.getByTestId('intent-list-scope-filter'), { target: { value: '' } });
    expect(checks().map((c) => c.checked)).toEqual([true, false, true]);
  });

  it('a chosen one that is archived meanwhile is no longer chosen', () => {
    const { rerender } = render(ui());
    click('intent-list-select');
    click('intent-list-select-all');
    rerender(ui({ intents: list.map((i) => (i.dirName === 'd-2' ? { ...i, status: 'archived' } : i)) }));
    expect(chosen()).toBe(t('intents.archive.chosen', { n: 2 }));
  });

  it('"Archive N" is unavailable with nothing chosen, and lists every chosen intent in list order, hidden ones too (AC4.1.2, AC4.1.3)', () => {
    render(ui());
    click('intent-list-select');
    expect(screen.getByTestId('intent-list-archive').disabled).toBe(true);
    for (const slug of ['done-3', 'done-1']) fireEvent.click(checkOf(slug));
    search('done-3');
    expect(screen.getByTestId('intent-list-archive').textContent).toBe(t('intents.archive.confirm', { n: 2 }));
    click('intent-list-archive');
    expect(screen.getAllByTestId('archive-dialog-name').map((n) => n.textContent)).toEqual(['done-1', 'done-3']);
    fireEvent.change(screen.getByTestId('archive-dialog-reason'), { target: { value: 'tidy' } });
    click('archive-dialog-confirm');
    expect(window.bridge.archiveIntents).toHaveBeenCalledWith('p1', ['d-1', 'd-3'], 'tidy');
  });

  it('shows the progress in the list once the dialog is closed, allows no second start, and ends Select mode with the result (AC4.1.4, AC4.1.5)', async () => {
    render(ui());
    click('intent-list-select');
    click('intent-list-select-all');
    screen.getByTestId('intent-list-archive').focus();
    click('intent-list-archive');
    click('archive-dialog-confirm');
    expect(screen.queryAllByTestId('archive-outcome-progress')).toHaveLength(1); // in the dialog only
    click('archive-dialog-close');
    act(() => progress({ projectId: 'p1', n: 2, total: 3 }));
    expect(screen.getByTestId('archive-outcome-progress').textContent).toBe(t('intents.archive.progress', { n: 2, total: 3 }));
    expect(screen.getByTestId('intent-list-archive').disabled).toBe(true);
    expect(document.activeElement).toBe(screen.getByTestId('intent-list-rows')); // the opener can no longer take focus
    click('intent-list-archive');
    expect(screen.queryByTestId('archive-dialog-confirm')).toBeNull();

    await act(async () => finish({ ok: true, archived: ['d-1', 'd-3'], refused: [{ dirName: 'd-2', error: 'claimed' }], commit: { state: 'dirtyIndex' } }));
    expect(screen.getByTestId('archive-outcome-done').textContent).toBe(t('intents.archive.done', { n: 2 }));
    expect(screen.getByTestId('archive-outcome-refused').textContent).toBe('done-2: claimed');
    expect(screen.getByTestId('archive-outcome-commit').textContent).toBe(t('intents.archive.commit.dirtyIndex'));
    expect(checks()).toHaveLength(0);
    click('intent-list-archive-close');
    expect(screen.queryByTestId('archive-outcome')).toBeNull();
  });

  it('with the dialog open the result is there, and focus goes to the list when it is closed (FR7.2)', async () => {
    render(ui());
    click('intent-list-select');
    click('intent-list-select-all');
    screen.getByTestId('intent-list-archive').focus();
    click('intent-list-archive');
    click('archive-dialog-confirm');
    await act(async () => finish({ ok: true, archived: ['d-1', 'd-2', 'd-3'], refused: [], commit: { state: 'waiting' } }));
    expect(screen.getAllByTestId('archive-outcome')).toHaveLength(1);
    click('archive-dialog-close');
    expect(screen.queryByTestId('archive-outcome')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('intent-list-rows'));
  });

  it('stays through a run that leaves no complete intent: the list reloads before the answer comes', async () => {
    const { rerender } = render(ui());
    click('intent-list-select');
    click('intent-list-select-all');
    screen.getByTestId('intent-list-archive').focus();
    click('intent-list-archive');
    click('archive-dialog-confirm');
    rerender(ui({ intents: list.map((i) => (i.status === 'complete' ? { ...i, status: 'archived' } : i)) }));
    expect(screen.getAllByTestId('archive-dialog-name')).toHaveLength(3);
    await act(async () => finish({ ok: true, archived: ['d-1', 'd-2', 'd-3'], refused: [], commit: { state: 'waiting' } }));
    expect(screen.getByTestId('archive-outcome-done')).toBeTruthy();
    expect(screen.queryByTestId('intent-list-select')).toBeNull(); // nothing left to choose
    click('archive-dialog-close');
    expect(document.activeElement).toBe(screen.getByTestId('intent-list-rows'));
  });

  it('a refused start keeps Select mode and the choice', async () => {
    render(ui());
    click('intent-list-select');
    click('intent-list-select-all');
    click('intent-list-archive');
    click('archive-dialog-confirm');
    await act(async () => finish({ ok: false, error: 'already running' }));
    expect(screen.getByTestId('archive-dialog-error').textContent).toBe('already running');
    click('archive-dialog-cancel');
    expect(chosen()).toBe(t('intents.archive.chosen', { n: 3 }));
  });

  it('is not offered in another space than AI-DLC’s active one, nor without a complete intent', () => {
    const { rerender } = render(ui({ activeSpace: 'team' }));
    expect(screen.queryByTestId('intent-list-select')).toBeNull();
    rerender(ui({ intents: [list[0]] }));
    expect(screen.queryByTestId('intent-list-select')).toBeNull();
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

// US-0050 item 1: the rows join the view's entrance (rise, stagger capped at 12); new data replays nothing.
describe('IntentList entrance (US-0050)', () => {
  it('lets each row rise with the entrance, staggered and capped at 12, and keeps the rows on an update', () => {
    const many = Array.from({ length: 15 }, (_, n) => ({ ...base, dirName: `2611${String(n).padStart(2, '0')}-i${n}`, slug: `i${n}`, status: 'complete' }));
    const { rerender, container } = render(<IntentList intents={many} selected={null} onSelect={vi.fn()} />);
    const items = () => screen.getAllByTestId('intent-list-row').map((r) => r.closest('li'));
    expect(items().every((li) => li.classList.contains('lcars-e-rise'))).toBe(true);
    expect(items()[0].style.getPropertyValue('--i')).toBe('0');
    expect(items()[14].style.getPropertyValue('--i')).toBe('12');
    const first = items()[0];
    rerender(<IntentList intents={[...many, { ...base, dirName: '261199-new', slug: 'new', status: 'in-flight' }]} selected={null} onSelect={vi.fn()} />);
    expect(items()).toContain(first); // the shown rows stay mounted, so nothing replays
    expect(container.querySelector('.is-entering')).toBeNull(); // the list never starts an entrance of its own
  });
});

// US-0050 item 8: a changed status glows once on its own row; an update with the same values glows nowhere.
describe('IntentList live change (US-0050)', () => {
  afterEach(() => delete document.documentElement.dataset.motion);

  it('glows the status that changed, only there, and nothing on an update with the same values', () => {
    document.documentElement.dataset.motion = 'full';
    const ui = (list) => <IntentList intents={list} selected={null} onSelect={vi.fn()} />;
    const { rerender, container } = render(ui(intents));
    rerender(ui(intents.map((i) => ({ ...i }))));
    expect(container.querySelector('.lcars-changed')).toBeNull();
    rerender(ui(intents.map((i) => (i.dirName === '261112-epic29-small-k2-fixes' ? { ...i, status: 'complete' } : { ...i }))));
    const glowing = [...container.querySelectorAll('.lcars-changed')];
    expect(glowing).toHaveLength(1);
    expect(glowing[0].dataset.testid).toBe('intent-list-row-status');
    expect(glowing[0].textContent).toBe('complete');
  });
});
