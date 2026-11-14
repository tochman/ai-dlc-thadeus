// Characterisation tests of the start-up wiring in src/main/index.js (US-0506 Step 3a, K17), with electron mocked.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => {
  const appOn = {};
  const wins = [];
  class FakeWindow {
    constructor(options) {
      this.options = options;
      this.on = vi.fn((e, f) => (this.events[e] = f));
      this.events = {};
      this.loadURL = vi.fn();
      this.loadFile = vi.fn();
      const wc = {
        handlers: {},
        isDestroyed: vi.fn(() => false),
        send: vi.fn(),
        getURL: vi.fn(() => 'app://index'),
        setWindowOpenHandler: vi.fn((f) => (wc.openHandler = f)),
        on: vi.fn((e, f) => (wc.handlers[e] = f)),
        once: vi.fn((e, f) => (wc.handlers[e] = f))
      };
      this.webContents = wc;
      wins.push(this);
    }
  }
  FakeWindow.getAllWindows = vi.fn(() => wins);
  let ready;
  const readyPromise = new Promise((r) => (ready = r));
  return {
    appOn,
    wins,
    ready: () => ready(),
    readyPromise,
    electron: {
      app: {
        setPath: vi.fn(),
        getPath: vi.fn(() => '/appdata'),
        getAppPath: vi.fn(() => '/app'),
        isPackaged: false,
        whenReady: vi.fn(() => readyPromise),
        on: vi.fn((e, f) => (appOn[e] = f)),
        quit: vi.fn(),
        requestSingleInstanceLock: vi.fn(() => true),
        dock: { setIcon: vi.fn() }
      },
      BrowserWindow: FakeWindow,
      shell: { openExternal: vi.fn() }
    },
    ipc: { registerIpc: vi.fn(), shutdown: vi.fn(async () => {}), guardClose: vi.fn(), noteQuitting: vi.fn(), startUpdateCheck: vi.fn() },
    menu: { applyMenu: vi.fn() },
    settings: { getSettings: vi.fn(async () => ({ toolPaths: { aidlc: '/a' } })), setSettings: vi.fn(async () => {}) },
    tools: { setToolPaths: vi.fn() },
    i18n: { setLanguageFromSettings: vi.fn() }
  };
});

vi.mock('electron', () => m.electron);
vi.mock('../../src/main/ipc.js', () => m.ipc);
vi.mock('../../src/main/menu.js', () => m.menu);
vi.mock('../../src/main/settings.js', () => m.settings);
vi.mock('../../src/main/tools.js', () => m.tools);
vi.mock('../../src/main/i18n.js', () => m.i18n);

const flush = () => new Promise((r) => setTimeout(r, 0));
const { electron } = m;

beforeAll(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  delete process.env.ELECTRON_RENDERER_URL;
  await import('../../src/main/index.js');
  m.ready();
  await flush();
  await flush();
  // Mock calls are cleared before each test, so the start-up calls are copied here.
  for (const [name, fn] of Object.entries(startFns())) startCalls[name] = [...fn.mock.calls];
});

const startCalls = {};
const startFns = () => ({
  setPath: electron.app.setPath,
  setLanguageFromSettings: m.i18n.setLanguageFromSettings,
  setToolPaths: m.tools.setToolPaths,
  registerIpc: m.ipc.registerIpc,
  applyMenu: m.menu.applyMenu,
  guardClose: m.ipc.guardClose,
  setIcon: electron.app.dock.setIcon,
  loadFile: m.wins[0].loadFile
});

afterAll(() => vi.restoreAllMocks());

describe('start-up (src/main/index.js)', () => {
  it('keeps settings in the aidlc-dash folder under appData', () => {
    expect(startCalls.setPath).toEqual([['userData', '/appdata/aidlc-dash']]);
  });

  it('applies language and tool paths, registers IPC and the menu, then opens one window', () => {
    expect(startCalls.setLanguageFromSettings).toEqual([[{ toolPaths: { aidlc: '/a' } }]]);
    expect(startCalls.setToolPaths).toEqual([[{ aidlc: '/a' }]]);
    expect(startCalls.registerIpc).toHaveLength(1);
    expect(m.wins).toHaveLength(1);
    expect(startCalls.applyMenu).toEqual([[null], [m.wins[0]]]);
    expect(startCalls.guardClose).toEqual([[m.wins[0]]]);
    expect(startCalls.loadFile).toHaveLength(1);
  });

  it('sets the Dock icon only on macOS in development', () => {
    expect(startCalls.setIcon).toEqual(process.platform === 'darwin' ? [['/app/build/icon.png']] : []);
  });

  it('opens only http(s) links in the OS browser and never a new window', () => {
    const { openHandler } = m.wins[0].webContents;
    expect(openHandler({ url: 'https://example.com' })).toEqual({ action: 'deny' });
    expect(electron.shell.openExternal).toHaveBeenCalledWith('https://example.com');
    electron.shell.openExternal.mockClear();
    expect(openHandler({ url: 'file:///etc/passwd' })).toEqual({ action: 'deny' });
    expect(electron.shell.openExternal).not.toHaveBeenCalled();
  });

  it('blocks navigation away from the loaded page', () => {
    const nav = m.wins[0].webContents.handlers['will-navigate'];
    const away = { preventDefault: vi.fn() };
    nav(away, 'https://evil.example');
    expect(away.preventDefault).toHaveBeenCalled();
    const same = { preventDefault: vi.fn() };
    nav(same, 'app://index');
    expect(same.preventDefault).not.toHaveBeenCalled();
  });

  it('saves and announces the fullscreen mode on enter and leave', () => {
    const win = m.wins[0];
    win.events['enter-full-screen']();
    expect(m.settings.setSettings).toHaveBeenCalledWith({ fullscreen: true });
    expect(win.webContents.send).toHaveBeenCalledWith('window:fullscreen', true);
    win.events['leave-full-screen']();
    expect(m.settings.setSettings).toHaveBeenCalledWith({ fullscreen: false });
  });

  it('starts the update check when the page has loaded', () => {
    m.wins[0].webContents.handlers['did-finish-load']();
    expect(m.ipc.startUpdateCheck).toHaveBeenCalledWith(m.wins[0]);
  });

  it('opens a new window on activate only when none is open', async () => {
    m.appOn.activate();
    await flush();
    expect(m.wins).toHaveLength(1);
    m.wins.length = 0;
    m.appOn.activate();
    await flush();
    expect(m.wins).toHaveLength(1);
  });

  it('notes quitting before quit, shuts down on will-quit, and quits on window-all-closed off macOS', () => {
    expect(m.appOn['before-quit']).toBe(m.ipc.noteQuitting);
    m.appOn['will-quit']();
    expect(m.ipc.shutdown).toHaveBeenCalled();
    m.appOn['window-all-closed']();
    if (process.platform === 'darwin') expect(electron.app.quit).not.toHaveBeenCalled();
    else expect(electron.app.quit).toHaveBeenCalled();
  });
});
