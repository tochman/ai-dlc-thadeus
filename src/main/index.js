import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { guardClose, noteQuitting, registerIpc, shutdown, startAidlcCheck, startUpdateCheck } from './ipc.js';
import { applyMenu } from './menu.js';
import { getSettings, setSettings } from './settings.js';
import { setToolPaths } from './tools.js';
import { setLanguageFromSettings } from './i18n.js';
import { APP_NAME } from '../shared/appName.js';

// The folder is still called aidlc-dash so settings and open projects survive renames (US-0406 FR4.1).
// US-0608 FR9: the end-to-end tests set THADEUS_E2E_USER_DATA to a temp folder, whose settings open a temp project.
app.setPath('userData', process.env.THADEUS_E2E_USER_DATA || join(app.getPath('appData'), 'aidlc-dash'));

/**
 * US-0506 u1 K5 (review R-02): one app instance per user. A second start quits before registerIpc, so its start-up
 * clear of <userData>/agent-channel never runs beside a live instance; the first instance brings its window forward.
 */
export function claimSingleInstance(electronApp, focus) {
  if (!electronApp.requestSingleInstanceLock()) {
    electronApp.quit();
    return false;
  }
  electronApp.on('second-instance', focus);
  return true;
}

const primary = claimSingleInstance(app, () => {
  const [win] = BrowserWindow.getAllWindows();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

// The development timing log (US-0506 OD1): THADEUS_TIMING=1 also gives the renderer its stamp member.
const timing = process.env.THADEUS_TIMING === '1';

// Packaged builds ship the icon via electron-builder (extraResources on Linux); dev runs use the source PNG.
const iconPath = app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(app.getAppPath(), 'build/icon.png');

// Pure, so the fullscreen rules are testable (US-0404 F-01). `timing` adds the renderer flag (US-0506 OD1).
export function windowOptions(settings, platform, { timing: timed = false } = {}) {
  return {
    ...(platform === 'linux' ? { icon: iconPath } : {}),
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    // An explicit `fullscreen: false` turns full screen off entirely on macOS, so the key is only set when saved (FR1.1, FR1.3).
    fullscreenable: true,
    ...(settings?.fullscreen === true ? { fullscreen: true } : {}),
    autoHideMenuBar: true, // Linux: the menu bar shows on Alt (FR2.3)
    backgroundColor: '#05060a', // --bg in theme.css, so the window never flashes another colour (FR1.2)
    title: APP_NAME,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      ...(timed ? { additionalArguments: ['--thadeus-timing'] } : {})
    }
  };
}

async function createWindow() {
  const settings = await getSettings(); // never rejects; falls back to the defaults
  const win = new BrowserWindow(windowOptions(settings, process.platform, { timing }));

  // The renderer never navigates away or opens new windows; external links go to the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });

  // Every way into or out of fullscreen (menu, shortcut, button, the green macOS button) ends here (FR1.2, FR1.3).
  const onFullscreen = (on) => () => {
    setSettings({ fullscreen: on }).catch((err) => console.error('Kunde inte spara helskärmsläget:', err));
    if (!win.webContents.isDestroyed()) win.webContents.send('window:fullscreen', on);
    applyMenu(win); // the checkbox follows the real mode
  };
  guardClose(win); // unsaved editor changes are asked about first (EPIC-10 US-1001)
  win.on('enter-full-screen', onFullscreen(true));
  win.on('leave-full-screen', onFullscreen(false));
  // At most once a day, in the background: the window never waits on it (EPIC-04 US-0407 NFR5).
  // The AI-DLC program check runs once per app run, after the first window has loaded (US-0504 FR3, NFR2).
  win.webContents.once('did-finish-load', () => {
    startUpdateCheck(win);
    startAidlcCheck();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return win;
}

app.whenReady().then(async () => {
  if (!primary) return; // a second instance is quitting: no IPC, no channel, no window (K5)
  const settings = await getSettings(); // never rejects; falls back to the defaults
  setLanguageFromSettings(settings); // before the first menu and window (EPIC-07 FR4.2)
  setToolPaths(settings.toolPaths); // a chosen aidlc path applies from the first command (US-0405 FR2.4)
  // The packaged .app carries its .icns; in dev the Dock would otherwise show the Electron icon.
  if (process.platform === 'darwin' && !app.isPackaged) {
    try {
      app.dock.setIcon(iconPath);
    } catch (err) {
      console.error('Kunde inte sätta Dock-ikonen:', err);
    }
  }
  registerIpc();
  applyMenu(null); // replaces Electron's default menu before the window shows (FR2.1)
  const open = () =>
    createWindow()
      .then(applyMenu) // the window reference: its fullscreen mode sets the Helskärm checkbox
      .catch((err) => console.error('Fönstret kunde inte skapas:', err));
  open();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) open();
  });
});

// The windows ask about unsaved editor changes before they close, so the sessions stop only once quitting
// is certain (will-quit comes after every window has closed).
app.on('before-quit', noteQuitting);
app.on('will-quit', () => {
  shutdown().catch((err) => console.error('Nedstängning misslyckades:', err));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
