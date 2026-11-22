// EPIC-04 US-0408 (About from the menu) in the US-0417 LCARS dialog frame: the brand corner, the title bar with
// Close as its last pill, readout blocks in the arm, readout rows for version and platform, and a Licences pill.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('AboutDialog (EPIC-04 US-0408, US-0417)', () => {
  it('shows the brand corner, the name, full name and tagline, and the version in its readout rows', async () => {
    openDialog();
    const dialog = screen.getByTestId('about-dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
    const brand = within(dialog).getByTestId('lcars-dialog-brand');
    expect(brand.textContent).toBe('T.H.A.D.E.U.S.');
    expect(within(dialog).getAllByRole('img', { name: 'Auctum' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Om' })).toBeTruthy(); // the title heads the bar
    expect(screen.getByTestId('about-dialog-fullname').textContent).toBe('Transformative Human-AI Development Environment for Ubiquitous Systems');
    expect(screen.getByTestId('about-dialog-tagline').textContent).toBe('AI-driven software development, under human direction.');
    await waitFor(() => expect(screen.getByTestId('about-dialog-version').textContent).toBe('v0.2.3'));
    expect(screen.getByTestId('about-dialog-platform').textContent).toBe('macOS');
    expect(screen.getByTestId('about-dialog-version').closest('dl')).toBeTruthy(); // a readout row
    expect(window.bridge.getAppInfo).toHaveBeenCalledTimes(1);
  });

  it('takes its arm readouts from the version and platform (NFR3)', async () => {
    expect(codeLabels('0.2.4', 'linux')).toEqual(['00-02', '04', 'LIN', '000204']);
    expect(codeLabels(null, null)).toEqual(['00-00', '00', '–', '000000']);
    openDialog();
    await waitFor(() => expect(screen.getByText('000203')).toBeTruthy());
    const readouts = screen.getAllByTestId('lcars-dialog-readout');
    expect(readouts.map((r) => r.lastChild.textContent)).toEqual(['00-02', '03', 'DAR', '000203']);
  });

  it('closes with the Close pill at the end of the title bar and gives focus back', async () => {
    const opener = openDialog();
    const close = screen.getByTestId('about-dialog-close');
    expect(close.textContent).toBe('Stäng');
    expect(close.className).toMatch(/lcars-pill/);
    expect(close.closest('[data-testid="lcars-segbar"]')).toBeTruthy();
    close.focus();
    fireEvent.click(close);
    await waitFor(() => expect(screen.queryByTestId('about-dialog-close')).toBeNull());
    expect(screen.getByTestId('about-dialog').hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes with Esc and with a click on the backdrop, but not with a click inside', async () => {
    const opener = openDialog();
    fireEvent.click(screen.getByTestId('about-dialog-fullname'));
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
    expect(screen.getByTestId('about-dialog-version').textContent).toBe('v–');
    expect(screen.getByTestId('lcars-dialog-brand')).toBeTruthy();
    warn.mockRestore();
  });

  it('opens the third-party licences from the Licences pill (US-1101 FR6.2)', async () => {
    window.bridge.openLicenses = vi.fn().mockResolvedValue('');
    openDialog();
    const button = screen.getByTestId('about-dialog-licenses');
    expect(button.textContent).toBe('Licenser');
    expect(button.className).toMatch(/lcars-pill/);
    fireEvent.click(button);
    await waitFor(() => expect(window.bridge.openLicenses).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('about-dialog-licenses-error')).toBeNull();
  });

  it('shows why the licences could not be opened, and keeps the dialog open (US-1101 FR6.2)', async () => {
    window.bridge.openLicenses = vi.fn().mockRejectedValueOnce(new Error('ipc down')).mockResolvedValueOnce('Failed to open path');
    openDialog();
    fireEvent.click(screen.getByTestId('about-dialog-licenses'));
    await waitFor(() => expect(screen.getByTestId('about-dialog-licenses-error').textContent).toBe('Licenserna kunde inte öppnas: ipc down'));
    fireEvent.click(screen.getByTestId('about-dialog-licenses')); // openPath's own error text comes back resolved
    await waitFor(() => expect(screen.getByTestId('about-dialog-licenses-error').textContent).toBe('Licenserna kunde inte öppnas: Failed to open path'));
    expect(screen.getByTestId('about-dialog-close')).toBeTruthy();
  });

  it('shows English texts after a language switch', async () => {
    await i18n.changeLanguage('en');
    openDialog();
    await waitFor(() => expect(screen.getByTestId('about-dialog-version').textContent).toBe('v0.2.3'));
    expect(screen.getByTestId('about-dialog-close').textContent).toBe('Close');
    expect(screen.getByRole('heading', { name: 'About' })).toBeTruthy();
  });
});
