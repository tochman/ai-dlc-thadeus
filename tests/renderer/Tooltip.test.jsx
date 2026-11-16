// US-0414 FR1.1–FR1.3, FR1.5, NFR1, NFR2: the shared LCARS tooltip opens on focus at once and on hover after a delay,
// closes on blur, leave and Esc, is a role=tooltip in document.body, and leaves the anchor's own name alone.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Tooltip, { HOVER_DELAY_MS } from '../../src/renderer/Tooltip.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const anchor = () => screen.getByTestId('anchor');

describe('Tooltip (US-0414 FR1)', () => {
  it('opens at once on focus, in document.body, with role=tooltip and the shared class', () => {
    const { container } = render(
      <Tooltip text="Hjälptext">
        <button data-testid="anchor">Knapp</button>
      </Tooltip>
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.focus(anchor());
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toBe('Hjälptext');
    expect(tip.classList.contains('lcars-tip')).toBe(true);
    expect(container.contains(tip)).toBe(false);
    expect(tip.parentElement).toBe(document.body);
  });

  it('points the anchor at the tip with aria-describedby only while it is open, and keeps its aria-label', () => {
    render(
      <Tooltip text="Stäng projektet">
        <button data-testid="anchor" aria-label="Stäng projektet">
          ×
        </button>
      </Tooltip>
    );
    expect(anchor().getAttribute('aria-describedby')).toBeNull();
    fireEvent.focus(anchor());
    expect(anchor().getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    expect(anchor().getAttribute('aria-label')).toBe('Stäng projektet');
    fireEvent.blur(anchor());
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(anchor().getAttribute('aria-describedby')).toBeNull();
  });

  it('opens on hover only after the delay, and closes on leave', () => {
    vi.useFakeTimers();
    render(
      <Tooltip text="Sökväg">
        <span data-testid="anchor">namn</span>
      </Tooltip>
    );
    fireEvent.mouseOver(anchor());
    act(() => vi.advanceTimersByTime(HOVER_DELAY_MS - 1));
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('tooltip').textContent).toBe('Sökväg');
    fireEvent.mouseLeave(anchor());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not open when the pointer leaves before the delay', () => {
    vi.useFakeTimers();
    render(
      <Tooltip text="Sökväg">
        <span data-testid="anchor">namn</span>
      </Tooltip>
    );
    fireEvent.mouseOver(anchor());
    fireEvent.mouseLeave(anchor());
    act(() => vi.advanceTimersByTime(HOVER_DELAY_MS * 2));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes on Esc', () => {
    render(
      <Tooltip text="Hjälptext">
        <button data-testid="anchor">Knapp</button>
      </Tooltip>
    );
    fireEvent.focus(anchor());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('makes plain text focusable with focusable (FR2.2)', () => {
    render(
      <Tooltip text="Förklaring" focusable>
        <span data-testid="anchor">ⓘ</span>
      </Tooltip>
    );
    expect(anchor().tabIndex).toBe(0);
  });

  it('shows focusText on focus and text on hover (FR2.3)', () => {
    vi.useFakeTimers();
    render(
      <Tooltip text="2026-11-16" focusText={'2026-11-16\nKostnad'}>
        <button data-testid="anchor">rad</button>
      </Tooltip>
    );
    fireEvent.focus(anchor());
    expect(screen.getByRole('tooltip').textContent).toBe('2026-11-16\nKostnad');
    fireEvent.blur(anchor());
    fireEvent.mouseOver(anchor());
    act(() => vi.advanceTimersByTime(HOVER_DELAY_MS));
    expect(screen.getByRole('tooltip').textContent).toBe('2026-11-16');
  });

  it('opens only the innermost tooltip under the pointer', () => {
    vi.useFakeTimers();
    render(
      <Tooltip text="Rad">
        <button data-testid="anchor">
          <Tooltip text="Del">
            <span data-testid="part">del</span>
          </Tooltip>
        </button>
      </Tooltip>
    );
    fireEvent.mouseOver(screen.getByTestId('part'));
    act(() => vi.advanceTimersByTime(HOVER_DELAY_MS));
    expect(screen.getAllByRole('tooltip').map((n) => n.textContent)).toEqual(['Del']);
  });

  it('renders the child unchanged when there is no text', () => {
    render(
      <Tooltip text={undefined}>
        <button data-testid="anchor">Knapp</button>
      </Tooltip>
    );
    fireEvent.focus(anchor());
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(anchor().hasAttribute('tabindex')).toBe(false);
  });

  it('places itself from the measured anchor and window (FR1.4)', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(300);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(200);
    const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return this.getAttribute('role') === 'tooltip' ? box(0, 0, 120, 30) : box(250, 20, 40, 20);
    });
    render(
      <Tooltip text="Hjälptext">
        <button data-testid="anchor">Knapp</button>
      </Tooltip>
    );
    fireEvent.focus(anchor());
    const tip = screen.getByRole('tooltip');
    expect(tip.style.top).toBe('44px');
    expect(tip.style.left).toBe('176px');
    spy.mockRestore();
  });
});
