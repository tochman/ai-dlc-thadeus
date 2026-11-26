// US-0414 FR2.2: the cost label's ⓘ, its warning tag and the token figures are plain text with a tooltip, so they take
// focus and show it on focus as well as on hover.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CostTab, { CostLabel, CostTable } from '../../src/renderer/CostTab.jsx';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import i18n from '../../src/shared/i18n.js';
import { formatTokens } from '../../src/renderer/format.js';
import ledger from '../fixtures/ledger/usage-ledger.json';

afterEach(cleanup);

function focusTip(el) {
  fireEvent.focus(el);
  const text = screen.queryByRole('tooltip')?.textContent ?? '';
  fireEvent.blur(el);
  return text;
}

describe('CostTab tooltips (US-0414 FR2.2)', () => {
  it('the ⓘ and the incomplete tag are focusable, keep their name and show their text on focus', () => {
    render(<CostLabel complete={false} />);
    const info = screen.getByRole('img');
    expect(info.tabIndex).toBe(0);
    expect(info.getAttribute('aria-label')).toMatch(/^Beräknad av AI-DLC/);
    expect(focusTip(info)).toMatch(/^Beräknad av AI-DLC från förbrukade tokens/);
    const tag = screen.getByText('Ofullständig');
    expect(tag.tabIndex).toBe(0);
    expect(focusTip(tag)).toBe('Minst en modell har tokens men inget pris i ledgern');
  });

  it('the token figure in a cost row shows the breakdown on focus', () => {
    const tokens = { input: 1000, output: 200, cacheWrite: 0, cacheRead: 0 };
    const rows = [{ name: 'developer', usd: 1, totalTokens: 1200, tokens, missingPrice: false }];
    const { container } = render(<CostTable title="Per agent" rows={rows} totalUsd={1} testId="t" />);
    const cell = container.querySelector('tbody td:last-child');
    expect(cell.tabIndex).toBe(0);
    expect(focusTip(cell)).not.toBe('');
    expect(container.querySelector('[title]')).toBeNull();
  });
});

// US-0211 US1.2, US1.4: the recorded figure first, the current-price one beside it, where each price came from and why.
describe('CostTab current prices (US-0211)', () => {
  const RATES = {
    'opus-5-5': { input: 1, output: 1, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 1, source: 'project' },
    'haiku-5-5': { input: 1, output: 1, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 1, source: 'app' }
  };
  const intent = { dirName: '261112-b', uuid: '01a1d000-0000-7000-8000-000000000003', slug: 'b', scope: 'express', date: '2026-11-12' };
  const intentCost = summarizeLedger(ledger, [intent], RATES).perIntent[intent.dirName];
  const machines = [{ host: 'hostb', local: false, source: 'audit', usd: 3, currentUsd: 1.5 }];
  const notes = [
    { kind: 'overrideMissing', path: 'rates/gone.json' },
    { kind: 'overrideInvalid', path: 'rates/bad.json' }
  ];
  const renderTab = (extra = {}) =>
    render(
      <CostTab cost={{ available: true, rates: { sources: {}, notes } }} intentCost={{ ...intentCost, ...extra }} pipeline={{ phases: [] }} models={null} />
    );

  it('shows the total and each machine as "recorded · at current prices" (AC1.4.1, FR3.2)', () => {
    renderTab({ machines });
    expect(screen.getByTestId('cost-tab-total').textContent).toMatch(/^registrerat \$1\.00 · till dagens priser \$\d+\.\d\d$/);
    expect(screen.getByTestId('cost-machines').firstChild.textContent).toBe('Räknat från: hostb registrerat $3.00 · till dagens priser $1.50');
  });

  it('names the source of each model price, and the price missing as such (AC1.2.1, AC1.3.3)', () => {
    renderTab();
    const table = screen.getByTestId('cost-tab-models');
    expect(within(table).getByText('Pris från')).toBeTruthy();
    expect(within(within(table).getByText('opus-5-5').closest('tr')).getByText('projektfilen')).toBeTruthy();
    expect(within(within(table).getByText('claude-haiku-5-5').closest('tr')).getByText('appens tabell')).toBeTruthy();
    expect(within(screen.getByTestId('cost-tab-agents')).queryByText('Pris från')).toBeNull(); // agents keep the recorded figure
  });

  it('says why an override was skipped, that haiku-5-5 is at its higher tier, and that audit cache writes are 5m (AC1.1.4, AC1.2.2, AC1.2.3)', () => {
    renderTab({ machines });
    const text = screen.getByTestId('cost-notes').textContent;
    expect(text).toMatch(/rates\/gone\.json finns inte/);
    expect(text).toMatch(/rates\/bad\.json är inte giltig JSON/);
    expect(text).toMatch(/haiku-5-5 prissätts med den högre nivån/);
    expect(text).toMatch(/prissätts som 5 minuter/);
  });

  it('shows no notes and no source column without a rate table (recorded figures only)', () => {
    const plain = summarizeLedger(ledger, [intent]).perIntent[intent.dirName];
    render(<CostTab cost={{ available: true }} intentCost={plain} pipeline={{ phases: [] }} models={null} />);
    expect(screen.queryByTestId('cost-notes')).toBeNull();
    expect(screen.queryByText('Pris från')).toBeNull();
    expect(screen.getByTestId('cost-tab-total').textContent).toBe('$1.00');
  });

  it('reads in English too (AC1.4.4)', async () => {
    await i18n.changeLanguage('en');
    try {
      renderTab({ machines });
      expect(screen.getByTestId('cost-tab-total').textContent).toMatch(/^recorded \$1\.00 · at current prices /);
      expect(screen.getByText('Price from')).toBeTruthy();
      expect(screen.getByTestId('cost-notes').textContent).toMatch(/higher prompt-size tier/);
    } finally {
      await i18n.changeLanguage('sv');
    }
  });
});

// US-1301 FR4, NFR2, NFR3: the Rework section of the intent's cost tab.
describe('CostTab rework (US-1301)', () => {
  const intent = { dirName: '261112-b', uuid: '01a1d000-0000-7000-8000-000000000003', slug: 'b', scope: 'express', date: '2026-11-12' };
  const intentCost = summarizeLedger(ledger, [intent]).perIntent[intent.dirName];
  const rework = {
    total: { tokens: 1200, usd: 0.5 },
    share: 0.25,
    estimate: true,
    why: null,
    attempts: [
      { stage: 'code-generation', unit: null, reason: 'rejected', tokens: 1000, usd: 0.4, estimate: false, why: null },
      {
        stage: 'build-and-test',
        unit: 'u1-api',
        reason: 'loopBack',
        tokens: 200,
        usd: 0.1,
        estimate: true,
        why: { key: 'noReadingsBefore', date: '2026-11-15' }
      }
    ]
  };
  const renderTab = (r) => render(<CostTab cost={{ available: true }} intentCost={intentCost} pipeline={{ phases: [] }} models={null} rework={r} />);

  it('shows the total, its share of the intent’s cost and one row per thrown-away attempt (FR4)', () => {
    renderTab(rework);
    expect(screen.getByTestId('cost-rework-total').textContent).toBe(`$0.50 · ${formatTokens(1200)} tokens · 25 % av intentens kostnad`);
    const rows = within(screen.getByTestId('cost-rework-rows')).getAllByRole('row').slice(1);
    expect(rows.map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent))).toEqual([
      ['code-generation', 'Grinden avvisades; revideringen tog vid', formatTokens(1000), '$0.40', ''],
      ['build-and-test (u1-api)', 'Build and Test loopade tillbaka', '200', '$0.10', 'Uppskattning']
    ]);
  });

  it('marks an estimate with its reason on focus', () => {
    renderTab(rework);
    const mark = screen.getByTestId('cost-rework-estimate');
    expect(mark.tabIndex).toBe(0);
    fireEvent.focus(mark);
    expect(screen.getByRole('tooltip').textContent).toBe('Inga avläsningar före 2026-11-15');
  });

  it('says there is no rework in one line, and shows nothing before it is read', () => {
    const { rerender } = renderTab({ total: { tokens: 0, usd: 0 }, share: 0, estimate: false, why: null, attempts: [] });
    expect(screen.getByTestId('cost-rework-none').textContent).toBe('Inget omarbete: inget försök kastades.');
    expect(screen.queryByTestId('cost-rework-rows')).toBeNull();
    rerender(<CostTab cost={{ available: true }} intentCost={intentCost} pipeline={{ phases: [] }} models={null} rework={null} />);
    expect(screen.queryByTestId('cost-rework')).toBeNull();
  });

  it('every reason names its cause, never a person (NFR2)', () => {
    const reasons = ['rejected', 'loopBack', 'jumpedBack', 'redone', 'archived'];
    renderTab({
      ...rework,
      attempts: reasons.map((reason) => ({ stage: reason === 'archived' ? null : 's', unit: null, reason, tokens: 1, usd: 0, estimate: false, why: null }))
    });
    const texts = within(screen.getByTestId('cost-rework-rows'))
      .getAllByRole('row')
      .slice(1)
      .map((r) => r.querySelectorAll('td')[1].textContent);
    expect(texts).toEqual([
      'Grinden avvisades; revideringen tog vid',
      'Build and Test loopade tillbaka',
      'Hopp bakåt i arbetsflödet',
      'Steget gjordes om',
      'Arkiverad innan den blev klar'
    ]);
  });
});

// US-1302 FR7: the intent's cost tab shows the hints for that intent: its own, and the stage hints of stages it ran.
describe('CostTab savings hints (US-1302 FR7)', () => {
  const intent = { dirName: '261112-b', uuid: '01a1d000-0000-7000-8000-000000000003', slug: 'b', scope: 'express', date: '2026-11-12' };
  const intentCost = summarizeLedger(ledger, [intent]).perIntent[intent.dirName];
  const ran = intentCost.byStage[0].name;
  const figures = { turns: 8, medianTurns: 4, share: 0.4, medianShare: 0.8 };
  const hint = (id, kind, extra) => ({
    id,
    kind,
    intent: null,
    stage: null,
    agent: null,
    saving: null,
    working: { figures, thresholds: {}, prices: null, to: 'sonnet-5-5' },
    links: [],
    ...extra
  });
  const hints = [
    hint(`model:${ran}`, 'model', { stage: ran }),
    hint('model:never-ran-here', 'model', { stage: 'never-ran-here' }),
    hint(`turns:${intent.dirName}:code-generation`, 'turns', { intent: intent.dirName, stage: 'code-generation' }),
    hint('cache:261120-other', 'cache', { intent: '261120-other' })
  ];
  afterEach(() => {
    delete window.bridge;
  });

  it('shows only this intent’s hints', async () => {
    window.bridge = { getSavings: vi.fn(async () => ({ hints, dismissed: [] })), dismissSaving: vi.fn() };
    render(
      <CostTab
        cost={{ available: true }}
        intentCost={intentCost}
        pipeline={{ phases: [] }}
        models={null}
        projectId="p1"
        space="default"
        dirName={intent.dirName}
      />
    );
    await screen.findAllByTestId('cost-savings-hint');
    expect(screen.getAllByTestId('cost-savings-hint').map((li) => li.dataset.hint)).toEqual([`model:${ran}`, `turns:${intent.dirName}:code-generation`]);
  });

  it('says so in one line when the intent has none', async () => {
    window.bridge = { getSavings: vi.fn(async () => ({ hints: hints.slice(1, 2), dismissed: [] })), dismissSaving: vi.fn() };
    render(
      <CostTab
        cost={{ available: true }}
        intentCost={intentCost}
        pipeline={{ phases: [] }}
        models={null}
        projectId="p1"
        space="default"
        dirName={intent.dirName}
      />
    );
    expect(await screen.findByTestId('cost-savings-none')).toBeTruthy();
  });
});
