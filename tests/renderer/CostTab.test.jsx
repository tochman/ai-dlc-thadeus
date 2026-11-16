// US-0209 FR4.1–FR4.3: the intent's cost tab names the machines its cost came from and tags a partial total.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import CostTab from '../../src/renderer/CostTab.jsx';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import i18n from '../../src/shared/i18n.js';
import ledger from '../fixtures/ledger/usage-ledger.json';

const intent = { dirName: '261110-epic02-finish', uuid: '01a1c625-50f3-7f83-9755-b096bf4025e6', slug: 'epic02-finish', scope: 'feature', date: '2026-11-10' };
const base = summarizeLedger(ledger, [intent]).perIntent[intent.dirName];
const machines = [
  { host: 'hosta', local: true, source: 'ledger', usd: 4 },
  { host: 'hostb', local: false, source: 'audit', usd: 3 }
];
const pipeline = { phases: [] };
const renderTab = (intentCost) => render(<CostTab cost={{ available: true }} intentCost={intentCost} pipeline={pipeline} models={null} />);

afterEach(cleanup);

describe('CostTab machines line (US-0209)', () => {
  it('names each machine with this one marked, and tags the total partial with a tooltip (FR4.1, FR4.2)', () => {
    renderTab({ ...base, machines, partial: true });
    expect(screen.getByTestId('cost-machines').firstChild.textContent).toBe('Räknat från: hosta (den här datorn), hostb');
    expect(screen.getByTestId('cost-partial').title).toMatch(/annan dator utan snapshot/);
    expect(screen.getByText('Uppskattad kostnad (API-pris)')).toBeTruthy(); // still labelled an estimate (FR4.3)
  });

  it('shows no partial tag for a whole total, and no line when main sent no machines', () => {
    const { rerender } = renderTab({ ...base, machines, partial: false });
    expect(screen.getByTestId('cost-machines')).toBeTruthy();
    expect(screen.queryByTestId('cost-partial')).toBeNull();
    rerender(<CostTab cost={{ available: true }} intentCost={base} pipeline={pipeline} models={null} />);
    expect(screen.queryByTestId('cost-machines')).toBeNull();
  });

  it('reads in English too (FR4.3)', async () => {
    await i18n.changeLanguage('en');
    try {
      renderTab({ ...base, machines, partial: true });
      expect(screen.getByTestId('cost-machines').firstChild.textContent).toBe('Counted from: hosta (this machine), hostb');
      expect(screen.getByTestId('cost-partial').textContent).toBe('Partial');
    } finally {
      await i18n.changeLanguage('sv');
    }
  });
});
