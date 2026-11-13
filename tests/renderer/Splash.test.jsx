import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import Splash, { SPLASH_FADE_MS, SPLASH_MAX_MS, SPLASH_MIN_MS } from '../../src/renderer/Splash.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const advance = (ms) => act(() => vi.advanceTimersByTime(ms));

describe('Splash', () => {
  it('shows the Auctum mark, the name, the spelled-out name and the tagline (US-0406 FR2.2)', () => {
    render(<Splash ready={false} />);
    expect(screen.getByRole('img', { name: 'Auctum' })).toBeTruthy();
    expect(screen.getByText('T.H.A.D.E.U.S.')).toBeTruthy();
    expect(screen.getByText('Transformative Human-AI Development Environment for Ubiquitous Systems')).toBeTruthy();
    expect(screen.getByText('AI-driven software development, under human direction.')).toBeTruthy();
    // Screen readers get it once, as one sentence; the lettering is aria-hidden.
    expect(
      screen.getByText(
        'T.H.A.D.E.U.S. — Transformative Human-AI Development Environment for Ubiquitous Systems. AI-driven software development, under human direction.'
      ).className
    ).toBe('sr-only');
  });

  it('stays for the minimum time even when ready at once, then disappears', () => {
    render(<Splash ready />);
    advance(SPLASH_MIN_MS - 1);
    expect(screen.queryByTestId('splash')).not.toBeNull();
    advance(1);
    expect(screen.getByTestId('splash').className).toContain('is-leaving');
    advance(SPLASH_FADE_MS);
    expect(screen.queryByTestId('splash')).toBeNull();
  });

  it('waits for ready after the minimum time', () => {
    const { rerender } = render(<Splash ready={false} />);
    advance(SPLASH_MIN_MS + SPLASH_FADE_MS + 100);
    expect(screen.queryByTestId('splash')).not.toBeNull();
    rerender(<Splash ready />);
    advance(SPLASH_FADE_MS);
    expect(screen.queryByTestId('splash')).toBeNull();
  });

  it('gives up after the maximum time if ready never comes', () => {
    render(<Splash ready={false} />);
    advance(SPLASH_MAX_MS);
    advance(SPLASH_FADE_MS);
    expect(screen.queryByTestId('splash')).toBeNull();
  });
});
