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
  it('shows the Auctum mark and the app name', () => {
    render(<Splash ready={false} />);
    expect(screen.getByRole('img', { name: 'Auctum' })).toBeTruthy();
    expect(screen.getByText('Auctum AIDLC Control')).toBeTruthy();
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
