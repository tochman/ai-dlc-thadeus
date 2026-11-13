import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { registerIpc, shutdown } from './ipc.js';
import { applyMenu } from './menu.js';
import { getSettings, setSettings } from './settings.js';
import { APP_NAME } from '../shared/appName.js';

// The folder is still called aidlc-dash so settings and open projects survive renames (US-0406 FR4.1).
app.setPath('userData', join(app.getPath('appData'), 'aidlc-dash'));

// Packaged builds ship the icon via electron-builder (extraResources on Linux); dev runs use the source PNG.
const iconPath = app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(app.getAppPath(), 'build/icon.png');

// Pure, so the fullscreen rules are testable (US-0404 F-01).
export function windowOptions(settings, platform) {
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
      webSecurity: true
    }
  };
}

async function createWindow() {
  const settings = await getSettings(); // never rejects; falls back to the defaults
  const win = new BrowserWindow(windowOptions(settings, process.platform));

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
  win.on('enter-full-screen', onFullscreen(true));
  win.on('leave-full-screen', onFullscreen(false));

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return win;
}

app.whenReady().then(() => {
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

app.on('before-quit', () => {
  shutdown().catch((err) => console.error('Nedstängning misslyckades:', err));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
