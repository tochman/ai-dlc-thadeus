// US-0414 FR2.2: the cost label's ⓘ, its warning tag and the token figures are plain text with a tooltip, so they take
// focus and show it on focus as well as on hover.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CostTab, { CostLabel, CostTable } from '../../src/renderer/CostTab.jsx';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import i18n from '../../src/shared/i18n.js';
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
    render(<CostTab cost={{ available: true, rates: { sources: {}, notes } }} intentCost={{ ...intentCost, ...extra }} pipeline={{ phases: [] }} models={null} />);

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
