// US-0414 FR2.2: the cost label's ⓘ, its warning tag and the token figures are plain text with a tooltip, so they take
// focus and show it on focus as well as on hover.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CostLabel, CostTable } from '../../src/renderer/CostTab.jsx';

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
