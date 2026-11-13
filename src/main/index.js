import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { registerIpc, shutdown } from './ipc.js';

// productName changed to "Auctum AIDLC Control"; keep the old userData folder so saved tabs survive.
app.setPath('userData', join(app.getPath('appData'), 'aidlc-dash'));

// Packaged builds ship the icon via electron-builder (extraResources on Linux); dev runs use the source PNG.
const iconPath = app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(app.getAppPath(), 'build/icon.png');

function createWindow() {
  const win = new BrowserWindow({
    ...(process.platform === 'linux' ? { icon: iconPath } : {}),
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0b0b10',
    title: 'Auctum AIDLC Control',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  // The renderer never navigates away or opens new windows; external links go to the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });

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
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  shutdown().catch((err) => console.error('Nedstängning misslyckades:', err));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
