import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18n from '../../src/shared/i18n.js';
import SettingsView, { saveLanguage } from '../../src/renderer/SettingsView.jsx';

// The view reads the saved settings itself, so the stub keeps them and lets a save change them, as settings.js does.
function stubBridge({ settings = {}, tools = [], appInfo, saveError = null } = {}) {
  const state = { toolPaths: {}, defaultProjectFolder: null, ...settings };
  const bridge = {
    getSettings: vi.fn(async () => ({ ...state, toolPaths: { ...state.toolPaths } })),
    setSettings: vi.fn(async (partial) => Object.assign(state, partial)),
    getLanguage: vi.fn(async () => 'sv'),
    getTools: vi.fn(async () => tools.map((row) => (state.toolPaths[row.id] ? { ...row, path: state.toolPaths[row.id], source: 'saved' } : row))),
    pickTool: vi.fn(async () => '/opt/claude'),
    saveTool: vi.fn(async (id, file) => {
      if (saveError) throw new Error(`Error invoking remote method 'tools:save': Error: ${saveError}`);
      state.toolPaths = { ...state.toolPaths, [id]: file };
      return { ok: true, version: '2.1.0' };
    }),
    resetTool: vi.fn(async (id) => {
      delete state.toolPaths[id];
    }),
    pickDefaultFolder: vi.fn(async () => {
      state.defaultProjectFolder = '/repos';
      return '/repos';
    }),
    clearDefaultFolder: vi.fn(async () => {
      state.defaultProjectFolder = null;
    }),
    getAppInfo: vi.fn(async () => appInfo ?? { version: '0.2.3', aidlc: { found: true, version: '0.9.1' } }),
    openExternal: vi.fn(async () => {})
  };
  window.bridge = bridge;
  return { bridge, state };
}

const TOOLS = [
  { id: 'aidlc', path: '/usr/local/bin/aidlc', source: 'auto', found: true, version: '0.9.1' },
  { id: 'claude', path: '/usr/local/bin/claude', source: 'auto', found: true, version: '2.1.0' },
  { id: 'shell', path: '/bin/zsh', source: 'auto', found: true, version: 'zsh 5.9' }
];

function renderView(props = {}) {
  const handlers = {
    onClose: vi.fn(),
    onAnimations: vi.fn(async () => {}),
    onFullscreen: vi.fn(async () => {}),
    onLanguage: vi.fn(async () => {}),
    onAlertSettings: vi.fn(async () => {}),
    onRemoveRecent: vi.fn(async () => {}),
    onProjectSettings: vi.fn(),
    ...props
  };
  render(
    <SettingsView
      animations="full"
      questionAlerts="popup-notify"
      notificationSound
      recentProjects={['/p/aidlc-dash-a', '/p/visinv']}
      projects={[{ projectId: 'p1', name: 'aidlc-dash-a' }]}
      {...handlers}
    />
  );
  return handlers;
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('sv');
});

describe('Inställningar as a view in the content frame (EPIC-04 US-0405)', () => {
  it('shows the four sections and the five appearance settings, and moves focus into the view (FR1.2, FR1.3, FR3.1)', async () => {
    stubBridge({ tools: TOOLS });
    const { onAnimations, onFullscreen, onAlertSettings, onLanguage } = renderView();

    const view = screen.getByRole('region', { name: 'Inställningar' });
    expect(within(view).getByRole('heading', { level: 2, name: 'Inställningar' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(view)); // keyboard works without a click (NFR1)

    for (const [id, name] of [
      ['tools', 'Verktyg'],
      ['appearance', 'Utseende'],
      ['project', 'Projekt'],
      ['about', 'Om']
    ]) {
      expect(within(screen.getByTestId(`settings-view-${id}`)).getByRole('heading', { level: 2 }).textContent).toBe(name);
    }

    // The five, each with exactly the choices it has today.
    expect(screen.getByTestId('app-settings-animations-full').checked).toBe(true);
    fireEvent.click(screen.getByTestId('app-settings-animations-reduced'));
    await waitFor(() => expect(onAnimations).toHaveBeenCalledWith('reduced'));

    fireEvent.click(screen.getByTestId('settings-fullscreen'));
    await waitFor(() => expect(onFullscreen).toHaveBeenCalledWith(true));

    const select = screen.getByTestId('settings-language');
    expect([...select.options].map((o) => [o.value, o.textContent])).toEqual([
      ['auto', 'Automatiskt'],
      ['sv', 'Svenska'],
      ['en', 'English']
    ]);
    fireEvent.change(select, { target: { value: 'en' } });
    await waitFor(() => expect(onLanguage).toHaveBeenCalledWith('en'));

    expect(screen.getByTestId('app-settings-alerts-popup-notify').checked).toBe(true);
    fireEvent.click(screen.getByTestId('app-settings-alerts-off'));
    await waitFor(() => expect(onAlertSettings).toHaveBeenCalledWith({ questionAlerts: 'off' }));

    expect(screen.getByTestId('app-settings-sound-on').checked).toBe(true);
    fireEvent.click(screen.getByTestId('app-settings-sound-off'));
    await waitFor(() => expect(onAlertSettings).toHaveBeenLastCalledWith({ notificationSound: false }));
  });

  it('saves the language and switches every view at once, without a reload (US-0701 FR4.4)', async () => {
    const { bridge } = stubBridge();
    bridge.getLanguage.mockResolvedValue('en');
    await saveLanguage('en');
    expect(bridge.setSettings).toHaveBeenCalledWith({ language: 'en' });
    expect(i18n.language).toBe('en');
    expect(i18n.t('settings.title')).toBe('Settings');
  });

  it('fills each tool row from the saved path first, then with its automatic path and version (FR2.1, NFR4)', async () => {
    const { bridge } = stubBridge({ settings: { toolPaths: { claude: '/opt/claude' } }, tools: TOOLS });
    bridge.getTools.mockReturnValue(new Promise(() => {})); // a slow check: the saved path shows first
    renderView();

    const row = screen.getByTestId('settings-tool-claude');
    await waitFor(() => expect(within(row).getByText('Claude Code CLI')).toBeTruthy());
    await waitFor(() => expect(row.querySelector('code').textContent).toBe('/opt/claude'));
    expect(within(row).getByText('Kontrollerar…')).toBeTruthy(); // the version is still being read
    expect(within(row).getByText('Egen sökväg')).toBeTruthy();
    await waitFor(() => expect(bridge.getTools).toHaveBeenCalledTimes(1));

    cleanup();
    stubBridge({ tools: TOOLS });
    renderView();
    const filled = await screen.findByTestId('settings-tool-aidlc');
    await waitFor(() => expect(within(filled).getByText('0.9.1')).toBeTruthy());
    expect(within(filled).getByText('/usr/local/bin/aidlc')).toBeTruthy();
    expect(within(filled).getByText('Hittad automatiskt')).toBeTruthy();
    expect(screen.getByText(/En ändrad sökväg gäller nästa gång verktyget startas/)).toBeTruthy();
  });

  it('picks a tool through the native dialog, saves only what main accepted, and resets a saved path (FR2.2–FR2.4)', async () => {
    const { bridge } = stubBridge({ tools: TOOLS });
    renderView();

    fireEvent.click(await screen.findByTestId('settings-tool-pick-claude'));
    await waitFor(() => expect(bridge.pickTool).toHaveBeenCalledWith('claude'));
    await waitFor(() => expect(bridge.saveTool).toHaveBeenCalledWith('claude', '/opt/claude'));
    await waitFor(() => expect(bridge.getTools).toHaveBeenCalledTimes(2)); // the rows refresh after the save

    // A rejected path is shown beside its row and nothing is stored.
    cleanup();
    const { bridge: rejecting } = stubBridge({ tools: TOOLS, saveError: 'Filen /opt/claude är inte körbar.' });
    renderView();
    fireEvent.click(await screen.findByTestId('settings-tool-pick-claude'));
    const error = await screen.findByTestId('settings-tool-error-claude');
    expect(error.textContent).toBe('Filen /opt/claude är inte körbar.');
    expect(screen.getByTestId('settings-tool-claude').querySelector('code').textContent).toBe('/usr/local/bin/claude');
    expect(rejecting.setSettings).not.toHaveBeenCalled();

    // "Återställ" only shows for a saved path, and drops it.
    cleanup();
    const { bridge: saved } = stubBridge({ settings: { toolPaths: { claude: '/opt/claude' } }, tools: TOOLS });
    renderView();
    const resetClaude = await screen.findByTestId('settings-tool-reset-claude');
    expect(screen.queryByTestId('settings-tool-reset-aidlc')).toBeNull();
    fireEvent.click(resetClaude);
    await waitFor(() => expect(saved.resetTool).toHaveBeenCalledWith('claude'));
  });

  it('names every file button and field for screen readers (NFR1)', async () => {
    stubBridge({ tools: TOOLS });
    renderView();
    await screen.findByTestId('settings-tool-aidlc');

    expect(screen.getByRole('button', { name: 'Välj sökväg till AI-DLC CLI' }).textContent).toBe('Välj…');
    expect(screen.getByRole('button', { name: 'Välj sökväg till Skal' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Språk / Language' })).toBe(screen.getByTestId('settings-language'));
    expect(screen.getByRole('button', { name: 'Ta bort /p/aidlc-dash-a' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Projektinställningar: aidlc-dash-a' })).toBeTruthy();
  });

  it("picks and clears the default folder, removes a recent project and opens a project's settings (FR4.1–FR4.3)", async () => {
    const { bridge, state } = stubBridge({ tools: TOOLS });
    const { onRemoveRecent, onProjectSettings } = renderView();

    expect(screen.getByTestId('settings-default-folder').textContent).toBe('Ingen mapp vald');
    expect(screen.queryByTestId('settings-default-folder-reset')).toBeNull();

    fireEvent.click(screen.getByTestId('settings-default-folder-pick'));
    await waitFor(() => expect(bridge.pickDefaultFolder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('settings-default-folder').textContent).toBe('/repos'));

    fireEvent.click(screen.getByTestId('settings-default-folder-reset'));
    await waitFor(() => expect(bridge.clearDefaultFolder).toHaveBeenCalledTimes(1));
    expect(state.defaultProjectFolder).toBeNull();
    await waitFor(() => expect(screen.getByTestId('settings-default-folder').textContent).toBe('Ingen mapp vald'));

    expect(screen.getAllByTestId('settings-recent-item')).toHaveLength(2);
    fireEvent.click(screen.getAllByTestId('settings-recent-remove')[1]);
    expect(onRemoveRecent).toHaveBeenCalledWith('/p/visinv');

    fireEvent.click(screen.getByTestId('settings-project-settings-p1'));
    expect(onProjectSettings).toHaveBeenCalledWith('p1');
  });

  it('shows the app version, the AI-DLC version or its reason, and opens the two fixed links (FR5.1)', async () => {
    const { bridge } = stubBridge({ appInfo: { version: '0.2.3', aidlc: { found: false, error: 'hittades inte i PATH' } } });
    renderView();
    await waitFor(() => expect(screen.getByTestId('settings-app-version').textContent).toBe('App-version 0.2.3'));
    expect(screen.getByTestId('settings-aidlc-version').textContent).toBe('AI-DLC hittades inte: hittades inte i PATH');

    fireEvent.click(screen.getByTestId('settings-open-repo'));
    await waitFor(() => expect(bridge.openExternal).toHaveBeenCalledWith('repo'));
    fireEvent.click(screen.getByTestId('settings-open-features'));
    await waitFor(() => expect(bridge.openExternal).toHaveBeenCalledWith('features'));

    cleanup();
    stubBridge({ appInfo: { version: '0.2.3', aidlc: { found: true, version: '0.9.1' } } });
    renderView();
    await waitFor(() => expect(screen.getByTestId('settings-aidlc-version').textContent).toBe('AI-DLC 0.9.1'));
  });

  it('closes with its button and with Escape, giving the content frame back (FR1.1)', async () => {
    stubBridge({ tools: TOOLS });
    const { onClose } = renderView();
    fireEvent.click(screen.getByTestId('settings-view-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByTestId('settings-view'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

// US-0506 u5 D1, D9, M9: the reply alerts row.
describe('Meddelanden från agenten (US-0506 u5)', () => {
  const legends = () => [...document.querySelectorAll('legend')].map((l) => l.textContent);

  it('sits between the alerts and sound fieldsets with three radios and the saved value checked', () => {
    stubBridge({ tools: TOOLS });
    renderView({ replyAlerts: 'line' });
    const all = legends();
    const at = all.indexOf('Meddelanden från agenten');
    expect(all[at - 1]).toBe('Frågor och behörighetsfrågor');
    expect(all[at + 1]).toBe('Ljud vid notis');
    expect(['dialog-notify', 'line', 'off'].map((id) => screen.getByTestId(`app-settings-replies-${id}`).checked)).toEqual([false, true, false]);
    expect(screen.getByText('Bara raden')).toBeTruthy();
  });

  it('shows the default for a missing or unknown value', () => {
    stubBridge({ tools: TOOLS });
    renderView({ replyAlerts: 'loud' });
    expect(screen.getByTestId('app-settings-replies-dialog-notify').checked).toBe(true);
    cleanup();
    renderView();
    expect(screen.getByTestId('app-settings-replies-dialog-notify').checked).toBe(true);
  });

  it('saves "Bara raden" as replyAlerts line', async () => {
    stubBridge({ tools: TOOLS });
    const { onAlertSettings } = renderView({ replyAlerts: 'dialog-notify' });
    fireEvent.click(screen.getByTestId('app-settings-replies-line'));
    await waitFor(() => expect(onAlertSettings).toHaveBeenCalledWith({ replyAlerts: 'line' }));
  });

  it('shows the alert line on a rejected save and keeps the radio on the saved value', async () => {
    stubBridge({ tools: TOOLS });
    renderView({ replyAlerts: 'dialog-notify', onAlertSettings: vi.fn(async () => Promise.reject(new Error('disk full'))) });
    fireEvent.click(screen.getByTestId('app-settings-replies-off'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/disk full/));
    expect(screen.getByTestId('app-settings-replies-dialog-notify').checked).toBe(true);
  });

  it('names the alerts row "Frågor och behörighetsfrågor" and the reply help in English too', async () => {
    stubBridge({ tools: TOOLS });
    await i18n.changeLanguage('en');
    renderView();
    expect(legends()).toEqual(expect.arrayContaining(['Questions and permission prompts', 'Messages from the agent']));
    expect(screen.getByText(/When the agent finishes its turn/)).toBeTruthy();
  });
});
