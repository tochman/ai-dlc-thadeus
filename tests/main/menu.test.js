import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../src/shared/i18n.js';

vi.mock('electron', () => ({ app: {}, BrowserWindow: {}, Menu: {}, shell: {} }));
const { buildMenuTemplate, parseMenuState } = await import('../../src/main/menu.js');

afterEach(() => i18n.changeLanguage('sv'));

const ALL_ON = { hasProject: true, framework: 'aidlc', showFeatures: true };

function build(options = {}) {
  const send = vi.fn();
  const actions = { toggleFullscreen: vi.fn(), reportIssue: vi.fn() };
  const template = buildMenuTemplate({ isMac: true, isPackaged: true, state: ALL_ON, fullscreen: false, send, actions, ...options });
  return { template, send, actions };
}

const items = (template) => template.flatMap((m) => [m, ...(m.submenu ?? [])]);
const byLabel = (template, label) => items(template).find((i) => i.label === label);
const roles = (template) =>
  items(template)
    .map((i) => i.role)
    .filter(Boolean);

describe('app menu (EPIC-04 US-0404)', () => {
  it('has no Reload, DevTools or Utveckling when packaged, and has them in dev (FR2.2)', () => {
    const packaged = build({ isPackaged: true }).template;
    expect(byLabel(packaged, 'Utveckling')).toBeUndefined();
    expect(roles(packaged)).not.toContain('reload');
    expect(roles(packaged)).not.toContain('toggleDevTools');
    expect(roles(packaged)).not.toContain('forceReload');

    const dev = build({ isPackaged: false }).template;
    expect(byLabel(dev, 'Utveckling')).toBeTruthy();
    expect(roles(dev)).toEqual(expect.arrayContaining(['reload', 'toggleDevTools']));
  });

  it('turns project items off without a project and Kostnad/Github off outside AI-DLC (FR2.5)', () => {
    const none = build({ state: { hasProject: false, framework: null, showFeatures: false } }).template;
    for (const label of ['Stäng projekt', 'Projektinställningar…', 'Intents', 'Kostnad', 'Version control', 'Agent', 'Shell', 'Starta om flik']) {
      expect(byLabel(none, label).enabled, label).toBe(false);
    }
    expect(byLabel(none, 'Features').visible).toBe(false);
    expect(byLabel(none, 'Öppna projekt…').enabled).not.toBe(false); // always available
    expect(byLabel(none, 'Helskärm').enabled).not.toBe(false);

    const plain = build({ state: { hasProject: true, framework: null, showFeatures: true } }).template;
    expect(byLabel(plain, 'Kostnad').enabled).toBe(false);
    expect(byLabel(plain, 'Version control').enabled).toBe(false);
    expect(byLabel(plain, 'Stäng projekt').enabled).toBe(true);
    expect(byLabel(plain, 'Features').visible).toBe(true);

    // menu:state accepts two booleans and the framework (NFR1, US-1401 BR1.8).
    expect(parseMenuState(ALL_ON)).toEqual(ALL_ON);
    expect(parseMenuState({ ...ALL_ON, extra: 'x' })).toEqual(ALL_ON);
    expect(parseMenuState({ hasProject: 'yes', framework: 'aidlc', showFeatures: true })).toBeNull();
    expect(parseMenuState(null)).toBeNull();
    expect(parseMenuState([true, true, true])).toBeNull();
  });

  it('US-1401 BR1.8: carries the framework, and shows Kostnad and Github only for AI-DLC (AC1.1.2, AC1.1.5)', () => {
    const speckit = build({ state: { hasProject: true, framework: 'speckit', showFeatures: false } }).template;
    expect(byLabel(speckit, 'Kostnad').enabled).toBe(false);
    expect(byLabel(speckit, 'Version control').enabled).toBe(false);
    expect(byLabel(speckit, 'Intents').enabled).toBe(true); // goes to the framework's first view
    expect(byLabel(build().template, 'Kostnad').enabled).toBe(true);

    const state = { hasProject: true, framework: 'speckit', showFeatures: false };
    expect(parseMenuState(state)).toEqual(state);
    expect(parseMenuState({ ...state, framework: null })).toEqual({ ...state, framework: null });
    expect(parseMenuState({ ...state, framework: 'other' })).toBeNull();
    expect(parseMenuState({ hasProject: true, isAidlc: true, showFeatures: true })).toBeNull(); // the old shape
  });

  it('closes the project, not the window, on CmdOrCtrl+W, and sends content commands to the renderer (FR2.4, FR2.6)', () => {
    const { template, send, actions } = build();
    const close = byLabel(template, 'Stäng projekt');
    expect(close.accelerator).toBe('CmdOrCtrl+W');
    expect(roles(template)).not.toContain('close');
    close.click();
    expect(send).toHaveBeenLastCalledWith({ command: 'closeProject' });

    byLabel(template, 'Features').click();
    expect(send).toHaveBeenLastCalledWith({ command: 'view', view: 'features' });
    byLabel(template, 'Kostnad').click();
    expect(send).toHaveBeenLastCalledWith({ command: 'panel', panel: 'cost' });
    byLabel(template, 'Starta om flik').click();
    expect(send).toHaveBeenLastCalledWith({ command: 'terminal', action: 'restart' });
    byLabel(template, 'Agent').click(); // the neutral agent tab (US-0801 FR3.1)
    expect(send).toHaveBeenLastCalledWith({ command: 'terminal', action: 'agent' });
    byLabel(template, 'AI-DLC-dokumentation').click();
    expect(send).toHaveBeenLastCalledWith({ command: 'docs' });

    byLabel(template, 'Rapportera problem').click();
    expect(actions.reportIssue).toHaveBeenCalledTimes(1);
    const fullscreen = byLabel(template, 'Helskärm');
    expect(fullscreen).toMatchObject({ type: 'checkbox', checked: false, accelerator: 'Ctrl+Cmd+F' });
    fullscreen.click();
    expect(actions.toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(byLabel(build({ fullscreen: true }).template, 'Helskärm').checked).toBe(true);
  });

  it('has the app and Fönster menus on macOS only; Linux gets F11, Inställningar and Avsluta under Arkiv (FR2.1, FR1.1)', () => {
    const mac = build({ isMac: true }).template;
    expect(mac.map((m) => m.label)).toEqual(['T.H.A.D.E.U.S.', 'Arkiv', 'Redigera', 'Visa', 'Terminal', 'Fönster', 'Hjälp']);
    expect(byLabel(mac, 'T.H.A.D.E.U.S.').submenu[0].label).toBe('Om T.H.A.D.E.U.S.');
    expect(byLabel(mac, 'Göm T.H.A.D.E.U.S.').role).toBe('hide'); // US-0406 FR2.4
    expect(byLabel(mac, 'Avsluta T.H.A.D.E.U.S.').role).toBe('quit');
    expect(byLabel(mac, 'Fönster').role).toBe('windowMenu');

    const linux = build({ isMac: false }).template;
    expect(linux.map((m) => m.label)).toEqual(['Arkiv', 'Redigera', 'Visa', 'Terminal', 'Hjälp']);
    expect(byLabel(linux, 'Helskärm').accelerator).toBe('F11');
    const arkiv = byLabel(linux, 'Arkiv')
      .submenu.map((i) => i.label)
      .filter(Boolean);
    expect(arkiv).toEqual(['Öppna projekt…', 'Stäng projekt', 'Projektinställningar…', 'Inställningar…', 'Avsluta']);
    expect(byLabel(linux, 'Avsluta').accelerator).toBe('Ctrl+Q');
    expect(roles(linux)).toEqual(expect.arrayContaining(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']));
  });

  it('has "Sök efter uppdatering…" under Hjälp on both platforms, sending checkUpdate (EPIC-04 US-0407)', async () => {
    for (const isMac of [true, false]) {
      const { template, send } = build({ isMac });
      const item = byLabel(template, 'Sök efter uppdatering…');
      expect(byLabel(template, 'Hjälp').submenu).toContain(item);
      expect(item.enabled).not.toBe(false); // works without a project
      item.click();
      expect(send).toHaveBeenLastCalledWith({ command: 'checkUpdate' });
    }
    await i18n.changeLanguage('en');
    expect(byLabel(build().template, 'Check for update…')).toBeTruthy();
  });

  it('has the app\'s own "Om T.H.A.D.E.U.S." in the app menu on macOS and in Hjälp on Linux, sending about (EPIC-04 US-0408)', () => {
    const mac = build({ isMac: true });
    const macAbout = byLabel(mac.template, 'Om T.H.A.D.E.U.S.');
    expect(byLabel(mac.template, 'T.H.A.D.E.U.S.').submenu).toContain(macAbout);
    expect(byLabel(mac.template, 'Hjälp').submenu).not.toContain(macAbout); // once per platform
    macAbout.click();
    expect(mac.send).toHaveBeenLastCalledWith({ command: 'about' });

    const linux = build({ isMac: false, state: { hasProject: false, framework: null, showFeatures: false } });
    const linuxAbout = byLabel(linux.template, 'Om T.H.A.D.E.U.S.');
    expect(byLabel(linux.template, 'Hjälp').submenu).toContain(linuxAbout);
    expect(linuxAbout.enabled).not.toBe(false); // works without a project
    linuxAbout.click();
    expect(linux.send).toHaveBeenLastCalledWith({ command: 'about' });

    // Electron's default About panel is gone on both platforms.
    for (const template of [mac.template, linux.template, build({ isPackaged: false }).template]) {
      expect(roles(template)).not.toContain('about');
    }
  });

  it('is built in the current language, so a rebuild after a switch shows English (EPIC-07 US-0701 FR1.2, FR4.4)', async () => {
    await i18n.changeLanguage('en');
    const mac = build({ isMac: true, isPackaged: false }).template;
    expect(mac.map((m) => m.label)).toEqual(['T.H.A.D.E.U.S.', 'File', 'Edit', 'View', 'Terminal', 'Window', 'Help', 'Develop']);
    expect(byLabel(mac, 'About T.H.A.D.E.U.S.')).toBeTruthy();
    expect(byLabel(build({ isMac: false }).template, 'Help').submenu.map((i) => i.label)).toContain('About T.H.A.D.E.U.S.');
    expect(byLabel(mac, 'Open project…').accelerator).toBe('CmdOrCtrl+O');
    byLabel(mac, 'Close project').click();
    const file = byLabel(build({ isMac: false }).template, 'File')
      .submenu.map((i) => i.label)
      .filter(Boolean);
    expect(file).toEqual(['Open project…', 'Close project', 'Project settings…', 'Settings…', 'Quit']);
    expect(
      items(mac)
        .filter((i) => i.label)
        .every((i) => !/[åäöÅÄÖ]/.test(i.label))
    ).toBe(true);

    await i18n.changeLanguage('sv');
    expect(build().template.map((m) => m.label)).toContain('Arkiv');
  });
});
