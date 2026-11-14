import { describe, it, expect, vi } from 'vitest';

// index.js runs app setup on import; stub what it touches so only windowOptions is exercised.
vi.mock('electron', () => ({
  app: {
    setPath: () => {},
    getPath: () => '/tmp',
    getAppPath: () => '/app',
    isPackaged: false,
    whenReady: () => new Promise(() => {}),
    on: () => {}
  },
  BrowserWindow: {},
  shell: {}
}));
vi.mock('../../src/main/ipc.js', () => ({ registerIpc: () => {}, shutdown: async () => {}, guardClose: () => {}, noteQuitting: () => {} }));
vi.mock('../../src/main/menu.js', () => ({ applyMenu: () => {} }));
vi.mock('../../src/main/settings.js', () => ({ getSettings: async () => ({}), setSettings: async () => {} }));

const { windowOptions } = await import('../../src/main/index.js');
const { APP_NAME } = await import('../../src/shared/appName.js');

describe('windowOptions (US-0404 F-01)', () => {
  it('leaves out fullscreen when nothing is saved, so macOS still allows full screen (FR1.1)', () => {
    const o = windowOptions({}, 'darwin');
    expect(o.fullscreenable).toBe(true);
    expect('fullscreen' in o).toBe(false);
  });

  it('does not pass fullscreen: false when the saved mode is false or invalid', () => {
    for (const s of [{ fullscreen: false }, { fullscreen: 'true' }, null]) {
      const o = windowOptions(s, 'darwin');
      expect('fullscreen' in o).toBe(false);
      expect(o.fullscreenable).toBe(true);
    }
  });

  it('opens in full screen when it was saved (FR1.3)', () => {
    const o = windowOptions({ fullscreen: true }, 'darwin');
    expect(o.fullscreen).toBe(true);
    expect(o.fullscreenable).toBe(true);
  });

  it('takes the window title from the name module (US-0406 FR2.3)', () => {
    expect(windowOptions({}, 'darwin').title).toBe(APP_NAME);
  });

  it('adds the window icon only on Linux', () => {
    expect(windowOptions({}, 'linux').icon).toBeTruthy();
    expect('icon' in windowOptions({}, 'darwin')).toBe(false);
  });
});
