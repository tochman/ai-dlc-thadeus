import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../src/shared/i18n.js';
import AboutDialog from '../../src/renderer/AboutDialog.jsx';

beforeEach(() => {
  window.bridge = { getAppInfo: vi.fn().mockResolvedValue({ version: '0.2.3', aidlc: null }) };
});
afterEach(() => {
  cleanup();
  delete window.bridge;
  return i18n.changeLanguage('sv');
});

/** A button that opens the dialog, so focus return can be checked as in the app. */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="opener" onClick={() => setOpen(true)}>
        open
      </button>
      <AboutDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function openDialog() {
  render(<Harness />);
  const opener = screen.getByTestId('opener');
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe('AboutDialog (EPIC-04 US-0408)', () => {
  it('shows the mark, the name, the full name, the tagline and the version from getAppInfo', async () => {
    openDialog();
    expect(screen.getByTestId('about-dialog').hasAttribute('open')).toBe(true);
    expect(screen.getByRole('img', { name: 'Auctum' })).toBeTruthy();
    expect(screen.getByText('T.H.A.D.E.U.S.')).toBeTruthy();
    expect(screen.getByText('Transformative Human-AI Development Environment for Ubiquitous Systems')).toBeTruthy();
    expect(screen.getByText('AI-driven software development, under human direction.')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('about-dialog-version').textContent).toBe('App-version 0.2.3'));
    expect(window.bridge.getAppInfo).toHaveBeenCalledTimes(1);
  });

  it('closes with Stäng and gives focus back to where it was', async () => {
    const opener = openDialog();
    screen.getByTestId('about-dialog-close').focus();
    fireEvent.click(screen.getByTestId('about-dialog-close'));
    await waitFor(() => expect(screen.queryByTestId('about-dialog-close')).toBeNull());
    expect(screen.getByTestId('about-dialog').hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes with Esc and with a click on the backdrop, but not with a click inside', async () => {
    const opener = openDialog();
    fireEvent.click(screen.getByText('T.H.A.D.E.U.S.'));
    expect(screen.getByTestId('about-dialog-close')).toBeTruthy(); // a click inside keeps it open

    fireEvent.keyDown(screen.getByTestId('about-dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('about-dialog-close')).toBeNull());

    fireEvent.click(opener);
    expect(screen.getByTestId('about-dialog-close')).toBeTruthy();
    fireEvent.click(screen.getByTestId('about-dialog')); // the dialog element itself is the backdrop
    await waitFor(() => expect(screen.queryByTestId('about-dialog-close')).toBeNull());
  });

  it('still opens with "–" for the version when getAppInfo fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.bridge.getAppInfo.mockRejectedValue(new Error('ipc down'));
    openDialog();
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getByTestId('about-dialog-version').textContent).toBe('App-version –');
    expect(screen.getByText('T.H.A.D.E.U.S.')).toBeTruthy();
    warn.mockRestore();
  });

  it('shows English texts after a language switch', async () => {
    await i18n.changeLanguage('en');
    openDialog();
    await waitFor(() => expect(screen.getByTestId('about-dialog-version').textContent).toBe('App version 0.2.3'));
    expect(screen.getByTestId('about-dialog-close').textContent).toBe('Close');
    expect(screen.getByRole('heading', { name: 'About T.H.A.D.E.U.S.' })).toBeTruthy();
  });
});
