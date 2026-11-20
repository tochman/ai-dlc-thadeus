import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
const { ParkControls, RequestText } = await import('../../src/renderer/IntentDetail.jsx');

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

describe('IntentDetail park and unpark (US-0510)', () => {
  const intent = { dirName: '261120-a', slug: 'a', status: 'in-flight', active: true, parked: false, parkedStage: null };
  afterEach(() => delete window.bridge);

  it('offers Park only on the active in-flight intent that is not parked, and parks through the bridge (AC4.1.2)', async () => {
    window.bridge = { parkIntent: vi.fn(async () => ({ ok: true })) };
    const { rerender } = render(<ParkControls projectId="p1" intent={intent} activeDirName="261120-a" />);
    fireEvent.click(screen.getByTestId('intent-park'));
    expect(window.bridge.parkIntent).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(screen.getByTestId('intent-park').disabled).toBe(false));

    rerender(<ParkControls projectId="p1" intent={intent} activeDirName="261120-other" />);
    expect(screen.queryByTestId('intent-park')).toBeNull();
    rerender(<ParkControls projectId="p1" intent={{ ...intent, status: 'complete' }} activeDirName="261120-a" />);
    expect(screen.queryByTestId('intent-park')).toBeNull();
    rerender(<ParkControls projectId="p1" intent={{ ...intent, parked: true }} activeDirName="261120-a" />);
    expect(screen.queryByTestId('intent-park')).toBeNull();
  });

  it('Unpark on a parked intent calls the bridge and says it is now the active intent when switched; a refusal shows its reason (AC4.1.3, AC4.1.5)', async () => {
    window.bridge = { unparkIntent: vi.fn(async () => ({ ok: true, switched: true })) };
    const parked = { ...intent, active: false, parked: true, parkedStage: 'code-generation' };
    render(<ParkControls projectId="p1" intent={parked} activeDirName="261120-other" />);
    expect(screen.getByTestId('intent-parked').textContent).toBe('Parkerad vid Code Generation');
    fireEvent.click(screen.getByTestId('intent-unpark'));
    expect(window.bridge.unparkIntent).toHaveBeenCalledWith('p1', '261120-a');
    expect((await screen.findByTestId('intent-now-active')).textContent).toBe('a är nu den aktiva intenten.');

    window.bridge.unparkIntent.mockResolvedValueOnce({ ok: false, error: 'Not parked', switched: false });
    fireEvent.click(screen.getByTestId('intent-unpark'));
    expect((await screen.findByRole('alert')).textContent).toBe('Not parked');
    expect(screen.queryByTestId('intent-now-active')).toBeNull();
  });
});
