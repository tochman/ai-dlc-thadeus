import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CostPanel from '../../src/renderer/CostPanel.jsx';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import ledger from '../fixtures/ledger/usage-ledger.json';

// Same shape the project:cost channel returns: {available, ...summarizeLedger(ledger, intents)}.
const intents = [
  { dirName: '261112-epic29-small-k2-fixes', uuid: '01a1d000-0000-7000-8000-000000000003', slug: 'epic29-small-k2-fixes', scope: 'express', date: '2026-11-12' },
  { dirName: '261110-epic02-finish', uuid: '01a1c625-50f3-7f83-9755-b096bf4025e6', slug: 'epic02-finish', scope: 'feature', date: '2026-11-10' }
];
const cost = { available: true, ...summarizeLedger(ledger, intents) };
const models = { source: 'agent-files', agents: [{ agent: 'developer', model: 'opus', effort: null }] };

afterEach(cleanup);

describe('CostPanel', () => {
  it('labels the total as an estimate, marks it incomplete and shows "pris saknas" for a model without price (FR6.1, FR6.2)', () => {
    render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));

    expect(screen.getByText('Uppskattad kostnad (API-pris)')).toBeTruthy();
    expect(screen.getByText('Ofullständig')).toBeTruthy();
    const haikuRow = within(screen.getByTestId('cost-panel-models')).getByText('claude-haiku-5-5').closest('tr');
    expect(within(haikuRow).getByText('pris saknas')).toBeTruthy();
    expect(screen.getByTestId('model-mismatch').title).toBe('Konfigurerad för opus'); // developer ran on sonnet
  });

  it('shows the legacy row and explains a missing ledger without breaking (FR3.4, FR1.5)', () => {
    const { rerender } = render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    expect(screen.getByTestId('cost-panel-legacy').textContent).toMatch(/^Äldre körningar \(utan intent-id\): \$0\.50/);

    rerender(<CostPanel cost={{ available: false, reason: 'aidlc/.aidlc-sessions/usage-ledger.json finns inte.' }} models={models} />);
    expect(screen.getByText(/usage-ledger.json finns inte/)).toBeTruthy();
    expect(screen.queryByTestId('cost-panel-legacy')).toBeNull();
  });
});
