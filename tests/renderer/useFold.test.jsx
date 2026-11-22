// US-0415 FR5.1, FR5.3, FR5.4 (AC5.1.3, AC5.1.4): the fold toggle shared by the list columns.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useFold } from '../../src/renderer/useFold.js';

let stored;

beforeEach(() => {
  stored = { openProjects: [], listFolded: { intents: true, features: false } };
  window.bridge = {
    getSettings: vi.fn(async () => structuredClone(stored)),
    setSettings: vi.fn(async (partial) => {
      stored = { ...stored, ...partial };
      return stored;
    })
  };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Probe({ viewId }) {
  const { folded, toggleProps } = useFold(viewId);
  return (
    <div data-testid={`probe-${viewId}`} data-folded={String(folded)}>
      <button {...toggleProps} />
    </div>
  );
}

describe('useFold (US-0415)', () => {
  it('starts with the stored state for its view, and another view does not take it (AC5.1.3)', async () => {
    render(
      <>
        <Probe viewId="intents" />
        <Probe viewId="editor" />
      </>
    );
    await waitFor(() => expect(screen.getByTestId('probe-intents').dataset.folded).toBe('true'));
    expect(screen.getByTestId('probe-editor').dataset.folded).toBe('false');
  });

  it('toggles on a click and saves listFolded with the other views kept, and keeps the state when a save fails', async () => {
    render(<Probe viewId="editor" />);
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('list-fold-toggle'));
    expect(screen.getByTestId('probe-editor').dataset.folded).toBe('true');
    await waitFor(() => expect(window.bridge.setSettings).toHaveBeenCalledWith({ listFolded: { intents: true, features: false, editor: true } }));

    window.bridge.setSettings.mockRejectedValueOnce(new Error('disk full'));
    fireEvent.click(screen.getByTestId('list-fold-toggle'));
    expect(screen.getByTestId('probe-editor').dataset.folded).toBe('false');
    await waitFor(() => expect(console.error).toHaveBeenCalled());
  });

  it('is a native button with aria-expanded and a name that follow the state, so Enter and Space work (AC5.1.4)', async () => {
    window.bridge.getSettings.mockRejectedValueOnce(new Error('unreadable')); // a failed read leaves the list open
    render(<Probe viewId="intents" />);
    const toggle = screen.getByTestId('list-fold-toggle');
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Fäll ihop listan');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Visa listan');

    // The width motion stops under reduced motion (FR5.4); CSS only, so read from the theme.
    const css = readFileSync(path.resolve(__dirname, '../../src/renderer/theme.css'), 'utf8');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.is-folded[^}]*transition: none/);
  });
});
