import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../src/shared/i18n.js';
import AppSettingsDialog from '../../src/renderer/AppSettingsDialog.jsx';

function stubBridge({ resolved = 'en', fail = false } = {}) {
  window.bridge = {
    setSettings: vi.fn(async (partial) => {
      if (fail) throw new Error("Error invoking remote method 'settings:set': Error: disk full");
      return partial;
    }),
    getLanguage: vi.fn(async () => resolved)
  };
  return window.bridge;
}

const renderDialog = () => render(<AppSettingsDialog open onClose={() => {}} value="full" onChange={async () => {}} language="auto" />);

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('sv');
});

describe('Språk / Language in the app settings (EPIC-07 US-0701)', () => {
  it('offers Automatiskt, Svenska and English, with auto as the saved default (FR4.1, FR4.2)', () => {
    stubBridge();
    renderDialog();
    const select = screen.getByTestId('settings-language');
    expect(select.value).toBe('auto');
    expect([...select.options].map((o) => [o.value, o.textContent])).toEqual([
      ['auto', 'Automatiskt'],
      ['sv', 'Svenska'],
      ['en', 'English']
    ]);
    expect(screen.getByText('Språk / Language')).toBeTruthy();
  });

  it('saves English and switches the dialog to English at once, without a reload (FR4.4, FR4.5)', async () => {
    const bridge = stubBridge({ resolved: 'en' });
    renderDialog();
    expect(screen.getByRole('heading').textContent).toBe('Inställningar');

    fireEvent.change(screen.getByTestId('settings-language'), { target: { value: 'en' } });
    await waitFor(() => expect(screen.getByRole('heading').textContent).toBe('Settings'));
    expect(bridge.setSettings).toHaveBeenCalledWith({ language: 'en' });
    expect(bridge.getLanguage).toHaveBeenCalled();
    expect(screen.getByText('Animations')).toBeTruthy();
    expect(screen.getByTestId('app-settings-close').textContent).toBe('Close');
  });

  it('follows the language main resolved for auto, and shows a failed save in the dialog', async () => {
    const bridge = stubBridge({ resolved: 'sv' });
    await i18n.changeLanguage('en');
    renderDialog();
    fireEvent.change(screen.getByTestId('settings-language'), { target: { value: 'auto' } });
    await waitFor(() => expect(screen.getByRole('heading').textContent).toBe('Inställningar'));
    expect(bridge.setSettings).toHaveBeenCalledWith({ language: 'auto' });
    cleanup();

    stubBridge({ fail: true });
    renderDialog();
    fireEvent.change(screen.getByTestId('settings-language'), { target: { value: 'en' } });
    expect((await screen.findByRole('alert')).textContent).toBe('Inställningen kunde inte sparas: disk full');
    expect(i18n.language).toBe('sv'); // nothing switched when the save failed
  });
});
