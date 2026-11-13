import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: {}, BrowserWindow: {}, Menu: {}, shell: {} }));
const { buildMenuTemplate, parseMenuState } = await import('../../src/main/menu.js');

const ALL_ON = { hasProject: true, isAidlc: true, showFeatures: true };

function build(options = {}) {
  const send = vi.fn();
  const actions = { toggleFullscreen: vi.fn(), reportIssue: vi.fn() };
  const template = buildMenuTemplate({ isMac: true, isPackaged: true, state: ALL_ON, fullscreen: false, send, actions, ...options });
  return { template, send, actions };
}

const items = (template) => template.flatMap((m) => [m, ...(m.submenu ?? [])]);
const byLabel = (template, label) => items(template).find((i) => i.label === label);
const roles = (template) => items(template).map((i) => i.role).filter(Boolean);

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
    const none = build({ state: { hasProject: false, isAidlc: false, showFeatures: false } }).template;
    for (const label of ['Stäng projekt', 'Projektinställningar…', 'Intents', 'Kostnad', 'Github', 'Claude', 'Shell', 'Starta om flik']) {
      expect(byLabel(none, label).enabled, label).toBe(false);
    }
    expect(byLabel(none, 'Features').visible).toBe(false);
    expect(byLabel(none, 'Öppna projekt…').enabled).not.toBe(false); // always available
    expect(byLabel(none, 'Helskärm').enabled).not.toBe(false);

    const plain = build({ state: { hasProject: true, isAidlc: false, showFeatures: true } }).template;
    expect(byLabel(plain, 'Kostnad').enabled).toBe(false);
    expect(byLabel(plain, 'Github').enabled).toBe(false);
    expect(byLabel(plain, 'Stäng projekt').enabled).toBe(true);
    expect(byLabel(plain, 'Features').visible).toBe(true);

    // menu:state accepts exactly three booleans (NFR1).
    expect(parseMenuState(ALL_ON)).toEqual(ALL_ON);
    expect(parseMenuState({ ...ALL_ON, extra: 'x' })).toEqual(ALL_ON);
    expect(parseMenuState({ hasProject: 'yes', isAidlc: true, showFeatures: true })).toBeNull();
    expect(parseMenuState(null)).toBeNull();
    expect(parseMenuState([true, true, true])).toBeNull();
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
    expect(byLabel(mac, 'Om T.H.A.D.E.U.S.').role).toBe('about');
    expect(byLabel(mac, 'Göm T.H.A.D.E.U.S.').role).toBe('hide'); // US-0406 FR2.4
    expect(byLabel(mac, 'Avsluta T.H.A.D.E.U.S.').role).toBe('quit');
    expect(byLabel(mac, 'Fönster').role).toBe('windowMenu');

    const linux = build({ isMac: false }).template;
    expect(linux.map((m) => m.label)).toEqual(['Arkiv', 'Redigera', 'Visa', 'Terminal', 'Hjälp']);
    expect(byLabel(linux, 'Helskärm').accelerator).toBe('F11');
    const arkiv = byLabel(linux, 'Arkiv').submenu.map((i) => i.label).filter(Boolean);
    expect(arkiv).toEqual(['Öppna projekt…', 'Stäng projekt', 'Projektinställningar…', 'Inställningar…', 'Avsluta']);
    expect(byLabel(linux, 'Avsluta').accelerator).toBe('Ctrl+Q');
    expect(roles(linux)).toEqual(expect.arrayContaining(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']));
  });
});
