import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../src/shared/i18n.js';
import AboutDialog, { codeLabels } from '../../src/renderer/AboutDialog.jsx';

beforeEach(() => {
  window.bridge = { platform: 'darwin', getAppInfo: vi.fn().mockResolvedValue({ version: '0.2.3', aidlc: null }) };
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

describe('AboutDialog (EPIC-04 US-0408, US-0409)', () => {
  it('shows the mark and the name as title, and the full name, tagline and version in the bars', async () => {
    openDialog();
    expect(screen.getByTestId('about-dialog').hasAttribute('open')).toBe(true);
    expect(screen.getByRole('img', { name: 'Auctum' })).toBeTruthy();
    expect(screen.getByText('T.H.A.D.E.U.S.').className).toBe('about-lcars-title');
    expect(screen.getByTestId('about-dialog-fullname').textContent).toBe('Transformative Human-AI Development Environment for Ubiquitous Systems');
    expect(screen.getByTestId('about-dialog-tagline').textContent).toBe('AI-driven software development, under human direction.');
    await waitFor(() => expect(screen.getByTestId('about-dialog-version-bar').textContent).toBe('v0.2.3'));
    for (const id of ['about-dialog-fullname', 'about-dialog-tagline', 'about-dialog-version-bar']) {
      const bar = screen.getByTestId(id).parentElement;
      expect(bar.className).toBe('about-lcars-bar');
      expect(bar.querySelector('.about-lcars-tab')).toBeTruthy(); // the coloured end tab
    }
    expect(screen.getByTestId('about-dialog-version').textContent).toBe('App-version 0.2.3'); // the status row
    expect(screen.getByTestId('about-dialog-platform').textContent).toBe('macOS');
    expect(window.bridge.getAppInfo).toHaveBeenCalledTimes(1);
  });

  it('takes its code labels from the version and platform, not from the reference (NFR3)', async () => {
    expect(codeLabels('0.2.4', 'linux')).toEqual(['00-02', '04', 'LIN', '000204']);
    expect(codeLabels(null, null)).toEqual(['00-00', '00', '–', '000000']);
    openDialog();
    await waitFor(() => expect(screen.getByText('000203')).toBeTruthy());
    expect(screen.getByText('DAR')).toBeTruthy();
  });

  it('closes with EXIT and gives focus back to where it was', async () => {
    const opener = openDialog();
    const exit = screen.getByTestId('about-dialog-close');
    expect(exit.textContent).toBe('STÄNG');
    expect(exit.closest('.about-lcars-arm')).toBeTruthy(); // in the frame's left edge
    exit.focus();
    fireEvent.click(exit);
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
    expect(screen.getByTestId('about-dialog-version-bar').textContent).toBe('v–');
    expect(screen.getByText('T.H.A.D.E.U.S.')).toBeTruthy();
    warn.mockRestore();
  });

  it('shows English texts after a language switch', async () => {
    await i18n.changeLanguage('en');
    openDialog();
    await waitFor(() => expect(screen.getByTestId('about-dialog-version').textContent).toBe('App version 0.2.3'));
    expect(screen.getByTestId('about-dialog-close').textContent).toBe('EXIT');
    expect(screen.getByRole('heading', { name: 'About T.H.A.D.E.U.S.' })).toBeTruthy();
  });
});
