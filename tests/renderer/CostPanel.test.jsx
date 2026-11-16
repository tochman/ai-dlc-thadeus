import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CostPanel from '../../src/renderer/CostPanel.jsx';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import ledger from '../fixtures/ledger/usage-ledger.json';

// Same shape the project:cost channel returns: {available, ...summarizeLedger(ledger, intents)}.
const intents = [
  {
    dirName: '261112-epic29-small-k2-fixes',
    uuid: '01a1d000-0000-7000-8000-000000000003',
    slug: 'epic29-small-k2-fixes',
    scope: 'express',
    date: '2026-11-12'
  },
  { dirName: '261110-epic02-finish', uuid: '01a1c625-50f3-7f83-9755-b096bf4025e6', slug: 'epic02-finish', scope: 'feature', date: '2026-11-10' }
];
const cost = { available: true, ...summarizeLedger(ledger, intents) };
const models = { source: 'agent-files', agents: [{ agent: 'developer', model: 'opus', effort: null }] };

afterEach(cleanup);

/** The shared tooltip's text while `el` has focus (US-0414). */
function focusTip(el) {
  fireEvent.focus(el);
  const text = screen.queryByRole('tooltip')?.textContent ?? '';
  fireEvent.blur(el);
  return text;
}

describe('CostPanel', () => {
  it('labels the total as an estimate, marks it incomplete and shows "pris saknas" for a model without price (FR6.1, FR6.2)', () => {
    render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));

    expect(screen.getByText('Uppskattad kostnad (API-pris)')).toBeTruthy();
    expect(screen.getByText('Ofullständig')).toBeTruthy();
    const haikuRow = within(screen.getByTestId('cost-panel-models')).getByText('claude-haiku-5-5').closest('tr');
    expect(within(haikuRow).getByText('pris saknas')).toBeTruthy();
    expect(focusTip(screen.getByTestId('model-mismatch'))).toBe('Konfigurerad för opus'); // developer ran on sonnet
  });

  it('makes the plain-text tooltips focusable and shows them on focus (US-0414 FR2.2)', () => {
    const { container } = render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    const big = container.querySelector('.cost-big-usd');
    expect(big.tabIndex).toBe(0);
    expect(focusTip(big)).toBe('Uppskattad kostnad (API-pris)');
    expect(screen.getByTestId('model-mismatch').tabIndex).toBe(0);
    expect(focusTip(screen.getByTestId('cost-panel-legacy'))).toBe('Körningar under record:<space>/legacy, från före intent-id. Ingår i totalen.');
    expect(container.querySelector('[title]')).toBeNull();
  });

  it('shows the legacy row and explains a missing ledger without breaking (FR3.4, FR1.5)', () => {
    const { rerender } = render(<CostPanel cost={cost} models={models} />);
    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    expect(screen.getByTestId('cost-panel-legacy').textContent).toMatch(/^Äldre körningar \(utan intent-id\): \$0\.50/);

    rerender(<CostPanel cost={{ available: false, reason: 'aidlc/.aidlc-sessions/usage-ledger.json finns inte.' }} models={models} />);
    expect(screen.getByText(/usage-ledger.json finns inte/)).toBeTruthy();
    expect(screen.queryByTestId('cost-panel-legacy')).toBeNull();
  });

  it('names the machines under the total, this one marked, and tags a partial total with its tooltip (US-0209 FR4.1, FR4.2)', () => {
    const machines = [
      { host: 'hosta', local: true },
      { host: 'hostb', local: false }
    ];
    const { rerender, container } = render(<CostPanel cost={{ ...cost, project: { ...cost.project, machines, partial: true } }} models={models} />);
    expect(screen.getByTestId('cost-machines').firstChild.textContent).toBe('Räknat från: hosta (den här datorn), hostb');
    expect(screen.getByTestId('cost-partial').textContent).toBe('Delvis');
    expect(focusTip(screen.getByTestId('cost-partial'))).toMatch(/stage-raderna i audit-loggen/); // shared tooltip (US-0414)
    expect(focusTip(container.querySelector('.cost-big-usd'))).toBe('Uppskattad kostnad (API-pris)'); // still an estimate (FR4.3)

    rerender(<CostPanel cost={{ ...cost, project: { ...cost.project, machines, partial: false } }} models={models} />);
    expect(screen.queryByTestId('cost-partial')).toBeNull();
    rerender(<CostPanel cost={cost} models={models} />);
    expect(screen.queryByTestId('cost-machines')).toBeNull(); // no machines from main: no line
  });
});
