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
    openExternal: vi.fn(async () => {}),
    // US-0504: the AI-DLC rows under the tool cards.
    getAidlcUpdateStatus: vi.fn(async () => ({ version: 'aidlc 2.11.3', status: 'current', latest: '2.11.3', reason: null, command: 'aidlc update' })),
    getAidlcProjectPlans: vi.fn(async () => []),
    // US-1201 AC-1: main keeps the Bitbucket credentials and only says whether they are set.
    bitbucket: {
      status: vi.fn(async () => ({ set: state.bitbucketSet === true })),
      save: vi.fn(async () => {
        state.bitbucketSet = true;
        return { set: true };
      }),
      clear: vi.fn(async () => {
        state.bitbucketSet = false;
        return { set: false };
      })
    }
  };
  window.bridge = bridge;
  return { bridge, state };
}

const TOOLS = [
  { id: 'aidlc', path: '/usr/local/bin/aidlc', source: 'auto', found: true, version: '0.9.1' },
  { id: 'claude', path: '/usr/local/bin/claude', source: 'auto', found: true, version: '2.1.0' },
  { id: 'shell', path: '/bin/zsh', source: 'auto', found: true, version: 'zsh 5.9' }
];

const renderSettings = (props) => renderView(props);
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
      recentProjects={['/p/aidlc-dash-a', '/p/demo-app']}
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
    renderView();

    const view = screen.getByRole('region', { name: 'Inställningar' });
    expect(within(view).queryByRole('heading', { level: 2, name: 'Inställningar' })).toBeNull(); // the header names it (US-0012)
    await waitFor(() => expect(document.activeElement).toBe(view)); // keyboard works without a click (NFR1)

    // US-0410: one tab at a time, so each section is rendered on its own tab.
    for (const [id, name] of [
      ['tools', 'Verktyg'],
      ['appearance', 'Utseende'],
      ['project', 'Projekt'],
      ['about', 'Om']
    ]) {
      cleanup();
      renderView({ tab: id });
      expect(within(screen.getByTestId(`settings-view-${id}`)).getByRole('heading', { level: 2 }).textContent).toBe(name);
    }

    // The five, each with exactly the choices it has today (Appearance, then Notifications since US-0410).
    cleanup();
    const { onAnimations, onFullscreen, onLanguage } = renderView({ tab: 'appearance' });
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

    cleanup();
    const { onAlertSettings } = renderView({ tab: 'notifications' });
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
    expect(within(row).getByText('Kontrollerar…')).toBeTruthy(); // the version is still being read (US-0416: on the chip)
    await waitFor(() => expect(bridge.getTools).toHaveBeenCalledTimes(1));

    cleanup();
    stubBridge({ tools: TOOLS });
    renderView();
    const filled = await screen.findByTestId('settings-tool-aidlc');
    await waitFor(() => expect(within(filled).getByText('0.9.1')).toBeTruthy());
    expect(within(filled).getByText('/usr/local/bin/aidlc')).toBeTruthy();
    expect(within(filled).getByText('Aktuell')).toBeTruthy(); // US-0416: the CLI's chip carries its update check
    expect(within(screen.getByTestId('settings-tool-claude')).getByText('Hittad')).toBeTruthy();
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
    cleanup();
    renderView({ tab: 'appearance' });
    expect(screen.getByRole('combobox', { name: 'Språk / Language' })).toBe(screen.getByTestId('settings-language'));
    cleanup();
    renderView({ tab: 'project' });
    expect(screen.getByRole('button', { name: 'Ta bort /p/aidlc-dash-a' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Projektinställningar: aidlc-dash-a' })).toBeTruthy();
  });

  it("picks and clears the default folder, removes a recent project and opens a project's settings (FR4.1–FR4.3)", async () => {
    const { bridge, state } = stubBridge({ tools: TOOLS });
    const { onRemoveRecent, onProjectSettings } = renderView({ tab: 'project' });

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
    expect(onRemoveRecent).toHaveBeenCalledWith('/p/demo-app');

    fireEvent.click(screen.getByTestId('settings-project-settings-p1'));
    expect(onProjectSettings).toHaveBeenCalledWith('p1');
  });

  it('saves the planning push interval in whole minutes, 10 when unset, and refuses one outside 1–120 (US-0607 FR3.1, FR4.3)', async () => {
    const { bridge } = stubBridge();
    renderView({ tab: 'project' });
    const field = await screen.findByTestId('settings-planning-interval');
    expect(field.value).toBe('10');
    fireEvent.change(field, { target: { value: '25' } });
    await waitFor(() => expect(bridge.setSettings).toHaveBeenCalledWith({ planningPushMinutes: 25 }));
    fireEvent.change(field, { target: { value: '500' } });
    expect(screen.getByRole('alert').textContent).toMatch(/1 och 120/);
    expect(bridge.setSettings).toHaveBeenCalledTimes(1);
  });

  it('shows the app version, the AI-DLC version or its reason, and opens the two fixed links (FR5.1)', async () => {
    const { bridge } = stubBridge({ appInfo: { version: '0.2.3', aidlc: { found: false, error: 'hittades inte i PATH' } } });
    renderView({ tab: 'about' });
    await waitFor(() => expect(screen.getByTestId('settings-app-version').textContent).toBe('App-version 0.2.3'));
    expect(screen.getByTestId('settings-aidlc-version').textContent).toBe('AI-DLC hittades inte: hittades inte i PATH');

    fireEvent.click(screen.getByTestId('settings-open-repo'));
    await waitFor(() => expect(bridge.openExternal).toHaveBeenCalledWith('repo'));
    fireEvent.click(screen.getByTestId('settings-open-features'));
    await waitFor(() => expect(bridge.openExternal).toHaveBeenCalledWith('features'));

    cleanup();
    stubBridge({ appInfo: { version: '0.2.3', aidlc: { found: true, version: '0.9.1' } } });
    renderView({ tab: 'about' });
    await waitFor(() => expect(screen.getByTestId('settings-aidlc-version').textContent).toBe('AI-DLC 0.9.1'));
  });

  it('closes with its button and with Escape, giving the content frame back (FR1.1)', async () => {
    stubBridge({ tools: TOOLS });
    const { onClose } = renderView();
    expect(screen.queryByTestId('settings-view-close')).toBeNull(); // no Close button (US-0012)
    fireEvent.keyDown(screen.getByTestId('settings-view'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// US-0410: one tab at a time in an LCARS frame, and a card per tool.
const TOOLS5 = [
  ...TOOLS.slice(0, 2),
  { id: 'opencode', path: '/opt/homebrew/bin/opencode', source: 'auto', found: true, version: '0.15.2' },
  { id: 'gh', path: null, source: 'auto', found: false, version: null, error: 'gh hittades inte i PATH' },
  TOOLS[2]
];

describe('The fallback PATH note on a tool card (US-0035 AC1.1.5)', () => {
  it('shows the note on a row found on the fallback PATH', async () => {
    stubBridge({ tools: [{ ...TOOLS[0], pathFallback: true }, TOOLS[1], TOOLS[2]] });
    renderView();
    const note = await screen.findByTestId('settings-tool-fallback-aidlc');
    expect(note.textContent).toBe('Inloggningsskalets PATH kunde inte läsas; appens egen PATH användes.');
    expect(note.hasAttribute('title')).toBe(false);
  });

  it('shows no note on a row without it', async () => {
    stubBridge({ tools: TOOLS });
    renderView();
    await waitFor(() => expect(within(screen.getByTestId('settings-tool-claude')).getByText('2.1.0')).toBeTruthy());
    expect(screen.queryByTestId(/^settings-tool-fallback-/)).toBeNull();
  });
});

describe('Settings in LCARS tabs (US-0410)', () => {
  it('shows only the chosen tab: Notifications holds the alerts, replies and sound, and Appearance is gone (FR2.1–FR2.3)', () => {
    stubBridge({ tools: TOOLS5 });
    renderView({ tab: 'notifications' });
    expect(screen.getByTestId('settings-view-notifications')).toBeTruthy();
    for (const id of ['tools', 'appearance', 'project', 'about']) expect(screen.queryByTestId(`settings-view-${id}`)).toBeNull();
    expect(screen.getByTestId('app-settings-alerts-popup-notify')).toBeTruthy();
    expect(screen.getByTestId('app-settings-replies-dialog-notify')).toBeTruthy();
    expect(screen.getByTestId('app-settings-sound-on')).toBeTruthy();
    expect(screen.queryByTestId('app-settings-animations-full')).toBeNull();
    expect(screen.queryByTestId('settings-language')).toBeNull();
  });

  it('opens on Tools when no tab is given, and puts each panel in the shared frame with its name in the header (FR3.1, FR6.1)', () => {
    stubBridge({ tools: TOOLS5 });
    renderView();
    const tools = screen.getByTestId('settings-view-tools');
    expect(tools.classList.contains('lcars-card')).toBe(true);
    expect(tools.classList.contains('settings-frame')).toBe(true);
    expect(within(tools.querySelector('.lcars-card-head')).getByRole('heading', { level: 2 }).textContent).toBe('Verktyg');
    cleanup();
    renderView({ tab: 'notifications' });
    expect(within(screen.getByTestId('settings-view-notifications')).getByRole('heading', { level: 2 }).textContent).toBe('Notiser');
  });

  it('shows a row for each of the five tools, and a missing one says not found and what it is needed for (FR4.1, FR4.3, US-0416)', async () => {
    stubBridge({ tools: TOOLS5 });
    renderView();
    for (const id of ['aidlc', 'claude', 'opencode', 'gh', 'shell']) {
      expect(screen.getByTestId(`settings-tool-${id}`).classList.contains('tool-row')).toBe(true);
    }
    const gh = screen.getByTestId('settings-tool-gh');
    await waitFor(() => expect(within(gh).getByText('hittades inte i PATH')).toBeTruthy());
    expect(within(gh).getByText('GitHub CLI (gh)')).toBeTruthy();
    expect(within(gh).getByText(/som reserv när appens uppdateringar/)).toBeTruthy();
    expect(within(gh).getByTestId('settings-tool-pick-gh')).toBeTruthy();
    // A found tool does not carry the needed-for line.
    await waitFor(() => expect(within(screen.getByTestId('settings-tool-opencode')).getByText('0.15.2')).toBeTruthy());
    expect(within(screen.getByTestId('settings-tool-opencode')).queryByText(/Behövs för/)).toBeNull();
  });

  it('saves the Bitbucket username and app password through main and never shows the password again (US-1201 AC-1)', async () => {
    const { bridge } = stubBridge({ tools: TOOLS5 });
    renderView();
    const card = screen.getByTestId('settings-bitbucket');
    await waitFor(() => expect(within(card).getByTestId('settings-bitbucket-status').textContent).toBe('Inte sparat'));
    fireEvent.click(within(card).getByTestId('settings-bitbucket-signin')); // US-0416: the form opens from its row
    const password = within(card).getByTestId('settings-bitbucket-password');
    expect(password.getAttribute('type')).toBe('password');
    fireEvent.change(within(card).getByTestId('settings-bitbucket-username'), { target: { value: 'thomas' } });
    fireEvent.change(password, { target: { value: 'S3cret-pw' } });
    fireEvent.click(within(card).getByTestId('settings-bitbucket-save'));
    await waitFor(() => expect(within(card).getByTestId('settings-bitbucket-status').textContent).toBe('Sparat i nyckelringen'));
    expect(bridge.bitbucket.save).toHaveBeenCalledWith('thomas', 'S3cret-pw');
    expect(password.value).toBe('');
    expect(document.body.innerHTML).not.toContain('S3cret-pw');

    fireEvent.click(within(card).getByTestId('settings-bitbucket-clear'));
    await waitFor(() => expect(within(card).getByTestId('settings-bitbucket-status').textContent).toBe('Inte sparat'));
    expect(bridge.bitbucket.clear).toHaveBeenCalled();
  });

  it('shows a refused Bitbucket save on the card and keeps nothing it was given (US-1201 AC-1)', async () => {
    const { bridge } = stubBridge({ tools: TOOLS5 });
    bridge.bitbucket.save.mockRejectedValueOnce(new Error("Error invoking remote method 'credentials:bitbucket': Error: Datorns nyckelring kan inte kryptera"));
    renderView();
    const card = screen.getByTestId('settings-bitbucket');
    fireEvent.click(within(card).getByTestId('settings-bitbucket-signin'));
    fireEvent.change(within(card).getByTestId('settings-bitbucket-username'), { target: { value: 'thomas' } });
    fireEvent.change(within(card).getByTestId('settings-bitbucket-password'), { target: { value: 'pw' } });
    fireEvent.click(within(card).getByTestId('settings-bitbucket-save'));
    expect((await within(card).findByRole('alert')).textContent).toBe('Datorns nyckelring kan inte kryptera');
    expect(within(card).getByTestId('settings-bitbucket-password').value).toBe('');
  });

  it('carries the sweep and cascade on Full, and no motion classes on Reduced or Off (FR3.2, FR3.3, NFR2)', () => {
    stubBridge({ tools: TOOLS5 });
    renderView({ tab: 'appearance', animations: 'full' });
    const full = screen.getByTestId('settings-view-appearance').classList;
    expect(full.contains('settings-frame--sweep') && full.contains('settings-cascade')).toBe(true);
    for (const mode of ['reduced', 'off']) {
      cleanup();
      renderView({ tab: 'appearance', animations: mode });
      const cl = screen.getByTestId('settings-view-appearance').classList;
      expect(cl.contains('settings-frame--sweep') || cl.contains('settings-cascade')).toBe(false);
    }
  });
});

// US-0416: Settings › Tools grouped by purpose, one row per tool with a state chip and its actions as pills.
describe('Settings › Tools as one grouped LCARS view (US-0416)', () => {
  const NEWER = { version: 'aidlc 2.11.3', status: 'newer', latest: '2.11.4', reason: null, command: 'aidlc update' };
  const PLAN = {
    harness: 'claude',
    label: 'Claude Code',
    command: 'plan-command',
    counts: { create: 1, update: 1, merge: 0, remove: 0 },
    files: [
      { path: 'agents/one.md', action: 'update' },
      { path: 'knowledge/new.md', action: 'create' }
    ],
    conflicts: []
  };
  const ALL = [
    { id: 'aidlc', path: '/Users/anna/.local/bin/aidlc', source: 'auto', found: true, version: '2.11.3' },
    { id: 'claude', path: '/opt/homebrew/bin/claude', source: 'auto', found: true, version: '2.8.1' },
    { id: 'opencode', path: '/Users/anna/.opencode/bin/opencode', source: 'saved', found: true, version: '1.4.0' },
    { id: 'gh', path: '/opt/homebrew/bin/gh', source: 'auto', found: true, version: '2.83.0' },
    { id: 'glab', path: null, source: 'auto', found: false, version: null },
    { id: 'shell', path: '/bin/zsh', source: 'auto', found: true, version: 'zsh 5.9' }
  ];
  const terminal = () => ({ type: vi.fn(async () => true), anyBusy: vi.fn(() => false) });
  function setup({ status = NEWER, plans = [PLAN], props = {} } = {}) {
    const stub = stubBridge({ tools: ALL });
    stub.bridge.getAidlcUpdateStatus.mockResolvedValue(status);
    stub.bridge.getAidlcProjectPlans.mockResolvedValue(plans);
    const term = terminal();
    renderView({ activeProjectId: 'p1', terminal: term, ...props });
    return { ...stub, term };
  }
  it('groups the tools into AI-DLC, Coding agents, Git hosts and System, and shows AI-DLC once', async () => {
    setup();
    const groups = ['aidlc', 'agents', 'git', 'system'].map((id) => screen.getByTestId(`settings-tools-group-${id}`));
    expect(groups.map((g) => within(g).getByRole('heading', { level: 3 }).textContent)).toEqual(['AI-DLC', 'Kodagenter', 'Git-värdar', 'System']);
    const [aidlc, agents, git, system] = groups;
    expect(within(aidlc).getByTestId('settings-tool-aidlc')).toBeTruthy();
    expect(await within(aidlc).findByTestId('aidlc-update-plan-claude')).toBeTruthy();
    expect(within(agents).getByTestId('settings-tool-claude')).toBeTruthy();
    expect(within(agents).getByTestId('settings-tool-opencode')).toBeTruthy();
    expect(within(git).getByTestId('settings-tool-gh')).toBeTruthy();
    expect(within(git).getByTestId('settings-tool-glab')).toBeTruthy();
    expect(within(git).getByTestId('settings-bitbucket')).toBeTruthy();
    expect(within(system).getByTestId('settings-tool-shell')).toBeTruthy();
    expect(screen.getAllByText('AI-DLC CLI')).toHaveLength(1);
    expect(screen.queryByTestId('aidlc-update-program')).toBeNull();
  });
  it("folds the project's changed AI-DLC files to a count and opens them on request", async () => {
    setup();
    const plan = await screen.findByTestId('aidlc-update-plan-claude');
    expect(within(plan).queryByText('knowledge/new.md')).toBeNull();
    const toggle = within(plan).getByTestId('aidlc-update-plan-files');
    expect(toggle.textContent).toBe('Visa filer (2)');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(within(plan).getByText('knowledge/new.md')).toBeTruthy();
  });
  it('gives each row a chip and strip: found, chosen by hand, missing with what to do, newer', async () => {
    setup();
    const chip = (id) => screen.getByTestId(`settings-tool-chip-${id}`);
    const kind = (id) => chip(id).getAttribute('data-kind');
    await waitFor(() => expect(kind('claude')).toBe('found'));
    expect(chip('claude').textContent).toBe('Hittad');
    expect(kind('opencode')).toBe('hand');
    expect(chip('opencode').textContent).toBe('Vald för hand');
    const glab = screen.getByTestId('settings-tool-glab');
    expect(kind('glab')).toBe('missing');
    expect(chip('glab').textContent).toBe('Saknas');
    expect(glab.classList.contains('tool-row--missing')).toBe(true);
    expect(within(glab).getByText(/Behövs för att läsa merge requests/).textContent).toMatch('Installera det, eller välj dess sökväg.');
    expect(within(screen.getByTestId('settings-tool-claude')).queryByText(/Behövs för/)).toBeNull();
    const cli = screen.getByTestId('settings-tool-aidlc');
    await waitFor(() => expect(cli.classList.contains('tool-row--newer')).toBe(true));
    expect(screen.getByTestId('settings-tools-group-git').querySelector('.tools-gh--missing')).toBeTruthy();
    expect(within(cli).getByTestId('settings-tool-chip-aidlc').textContent).toBe('Nyare finns: v2.11.4');
  });
  it('shows a path shortened on one line, in full on hover, and copies the full path on click', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    setup();
    const path = await within(screen.getByTestId('settings-tool-opencode')).findByTestId('tool-row-path');
    await waitFor(() => expect(path.textContent).toBe('~/.opencode/bin/opencode'));
    fireEvent.focus(path); // the shared tooltip, as on hover (US-0414)
    expect(screen.getByRole('tooltip').textContent).toBe('/Users/anna/.opencode/bin/opencode');
    fireEvent.click(path);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('/Users/anna/.opencode/bin/opencode'));
  });

  it('opens the existing Bitbucket form from the Sign in pill on its row', async () => {
    const { bridge } = setup();
    const row = screen.getByTestId('settings-bitbucket');
    expect(within(row).queryByTestId('settings-bitbucket-username')).toBeNull();
    fireEvent.click(within(row).getByTestId('settings-bitbucket-signin'));
    fireEvent.change(within(row).getByTestId('settings-bitbucket-username'), { target: { value: 'thomas' } });
    fireEvent.change(within(row).getByTestId('settings-bitbucket-password'), { target: { value: 'pw' } });
    fireEvent.click(within(row).getByTestId('settings-bitbucket-save'));
    await waitFor(() => expect(bridge.bitbucket.save).toHaveBeenCalledWith('thomas', 'pw'));
  });
  it('keeps Choose, Update and Rescan on the same bridge calls, and Check for updates calls onCheckUpdates and checks AI-DLC again', async () => {
    const onCheckUpdates = vi.fn();
    const { bridge, term } = setup({ props: { onCheckUpdates } });
    fireEvent.click(await screen.findByTestId('settings-tool-pick-glab'));
    await waitFor(() => expect(bridge.pickTool).toHaveBeenCalledWith('glab'));
    fireEvent.click(await screen.findByTestId('aidlc-update-program-update'));
    expect(term.type).toHaveBeenCalledWith('shell', 'aidlc update', { submit: false });
    fireEvent.click(within(await screen.findByTestId('aidlc-update-plan-claude')).getByTestId('aidlc-update-plan-update'));
    expect(term.type).toHaveBeenCalledWith('shell', 'plan-command', { submit: false });
    const scans = bridge.getTools.mock.calls.length;
    fireEvent.click(screen.getByTestId('settings-tools-rescan'));
    await waitFor(() => expect(bridge.getTools.mock.calls.length).toBe(scans + 1));
    fireEvent.click(screen.getByTestId('settings-tools-check-updates'));
    expect(onCheckUpdates).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(bridge.getAidlcUpdateStatus).toHaveBeenLastCalledWith(true));
  });

  it('checks AI-DLC again from Check for updates when the shell passes no onCheckUpdates', async () => {
    const { bridge } = setup();
    await screen.findByTestId('aidlc-update-plan-claude');
    fireEvent.click(screen.getByTestId('settings-tools-check-updates'));
    await waitFor(() => expect(bridge.getAidlcUpdateStatus).toHaveBeenLastCalledWith(true));
  });
  it('still shows the wait notice in the AI-DLC group while a workflow runs (US-0041)', async () => {
    const term = terminal();
    term.anyBusy.mockReturnValue(true);
    setup({ props: { terminal: term, lastIntentChangeAt: { name: 'demo-intent', stage: null, at: null } } });
    const group = screen.getByTestId('settings-tools-group-aidlc');
    expect((await within(group).findByRole('status')).textContent).toMatch(/^Vänta tills AI-DLC/);
    expect((await screen.findByTestId('aidlc-update-program-update')).disabled).toBe(true);
  });

  it('runs the shared entrance on entry with full motion only', () => {
    document.documentElement.dataset.motion = 'full';
    setup();
    expect(screen.getByTestId('settings-tools').classList.contains('is-entering')).toBe(true);
    cleanup();
    document.documentElement.dataset.motion = 'off';
    setup();
    expect(screen.getByTestId('settings-tools').classList.contains('is-entering')).toBe(false);
    delete document.documentElement.dataset.motion;
  });
});

// US-0506 u5 D1, D9, M9: the reply alerts row.
describe('Meddelanden från agenten (US-0506 u5)', () => {
  const legends = () => [...document.querySelectorAll('legend')].map((l) => l.textContent);
  const renderView = (props = {}) => renderSettings({ tab: 'notifications', ...props }); // on its tab since US-0410

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
