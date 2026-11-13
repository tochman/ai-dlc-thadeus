import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
const { RequestText } = await import('../../src/renderer/IntentDetail.jsx');

// jsdom has no layout: fake the clamped paragraph's heights (two lines visible, `full` px of content).
function fakeHeights(full) {
  const proto = HTMLElement.prototype;
  const saved = ['scrollHeight', 'clientHeight'].map((p) => [p, Object.getOwnPropertyDescriptor(proto, p)]);
  Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => full });
  Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => 42 });
  return () => saved.forEach(([p, d]) => (d ? Object.defineProperty(proto, p, d) : delete proto[p]));
}

let restore = () => {};
afterEach(() => {
  cleanup();
  restore();
});

describe('IntentDetail description (F-01)', () => {
  it('"Visa mer" toggles aria-expanded and the clamp on a long description', () => {
    restore = fakeHeights(126);
    render(<RequestText text={'rad\n'.repeat(6)} />);
    const toggle = screen.getByTestId('intent-detail-description-toggle');
    const text = screen.getByTestId('intent-detail-description');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toBe('Visa mer');
    expect(text.classList.contains('is-clamped')).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Visa mindre');
    expect(text.classList.contains('is-clamped')).toBe(false);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows no toggle when the description fits in two lines', () => {
    restore = fakeHeights(42);
    render(<RequestText text="Kort beställning" />);
    expect(screen.queryByTestId('intent-detail-description-toggle')).toBeNull();
  });
});
