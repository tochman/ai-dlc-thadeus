import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';
import TokenView from '../../src/renderer/TokenView.jsx';

// The fixture ledger as `project:cost` sends it, for an in-flight intent (EPIC-02 US-0207).
const ledger = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const UUID = '01a1c625-50f3-7f83-9755-b096bf4025e6';
const intents = [{ dirName: '261113-live', uuid: UUID, slug: 'live', scope: 'feature', date: null }];
const cost = (l = ledger) => ({ available: true, ...summarizeLedger(l, intents) });
function later(extra) {
  const next = structuredClone(ledger);
  next.workflows[`intent:${UUID}`].totals.tokens.output += extra;
  return next;
}
const points = () => screen.getByTestId('token-wave').getAttribute('points').split(' ').filter(Boolean);

afterEach(cleanup);

describe('TokenView (US-0207 FR1.3, NFR4, NFR5)', () => {
  it('shows four labelled meters with their figures and a level for an in-flight intent', () => {
    render(<TokenView cost={cost()} dirName="261113-live" live />);
    const labels = ['input', 'output', 'cacheWrite', 'cacheRead'].map((m) => screen.getByTestId(`token-meter-${m}`).querySelector('.token-meter-label').textContent);
    expect(labels).toEqual(['Input', 'Output', 'Cache write', 'Cache read']);
    expect(['input', 'output', 'cacheWrite', 'cacheRead'].map((m) => screen.getByTestId(`token-value-${m}`).textContent)).toEqual(['3,0 k', '1,5 k', '300', '5,0 k']);
    // cache read is the largest: its meter is full on the 5 000 scale, input fills 6 of 10.
    expect(screen.getByTestId('token-meter-cacheRead').querySelectorAll('.token-seg.is-lit')).toHaveLength(10);
    expect(screen.getByTestId('token-meter-input').querySelectorAll('.token-seg.is-lit')).toHaveLength(6);
    expect(screen.queryByTestId('token-view-stale')).toBeNull();
  });

  it('adds a waveform point per ledger reading, and none for an unchanged one', () => {
    const { rerender } = render(<TokenView cost={cost()} dirName="261113-live" live />);
    expect(points()).toHaveLength(1);
    rerender(<TokenView cost={cost(later(400))} dirName="261113-live" live />);
    expect(points()).toHaveLength(2);
    rerender(<TokenView cost={cost(later(900))} dirName="261113-live" live />);
    expect(points()).toHaveLength(3);
    rerender(<TokenView cost={cost(later(900))} dirName="261113-live" live />); // the same reading again
    expect(points()).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Tokenflöde, 3 avläsningar' })).toBeTruthy();
  });

  it('renders nothing for a finished intent or one without a ledger entry', () => {
    const { container, rerender } = render(<TokenView cost={cost()} dirName="261113-live" live={false} />);
    expect(container.innerHTML).toBe('');
    rerender(<TokenView cost={cost()} dirName="no-entry" live />);
    expect(container.innerHTML).toBe('');
  });

  it('a stale or missing ledger keeps the last good values and says so in one sentence (NFR5)', () => {
    const { rerender } = render(<TokenView cost={cost()} dirName="261113-live" live />);
    rerender(<TokenView cost={{ ...cost(), stale: true, warning: 'usage-ledger.json är trasig.' }} dirName="261113-live" live />);
    expect(screen.getByTestId('token-value-input').textContent).toBe('3,0 k');
    expect(screen.getByTestId('token-view-stale').textContent).toBe('usage-ledger.json är trasig. Visar senaste giltiga värden.');
    rerender(<TokenView cost={{ available: false, reason: 'usage-ledger.json saknas.' }} dirName="261113-live" live />);
    expect(screen.getByTestId('token-value-cacheRead').textContent).toBe('5,0 k');
    expect(screen.getByTestId('token-view-stale').textContent).toBe('usage-ledger.json saknas. Visar senaste giltiga värden.');
  });
});
