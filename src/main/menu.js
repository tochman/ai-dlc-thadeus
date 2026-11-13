// The app's own menu (EPIC-04 US-0404 FR2). Labels are the left arm's names. Everything that concerns the
// content is sent to the renderer as `menu:command` and runs the same function as the arm's button (FR2.4).
import { app, BrowserWindow, Menu, shell } from 'electron';
import { APP_FULL_NAME, APP_NAME, APP_TAGLINE, APP_VENDOR } from '../shared/appName.js';
import { t } from '../shared/i18n.js';

// [assumption] AI-DLC's web page; the fallback when the project has no docs/README.md (FR2.1 Hjälp).
export const AIDLC_DOCS_URL = 'https://github.com/awslabs/aidlc-workflows';
export const ISSUES_URL = 'https://github.com/tochman/aidlc-dash/issues';

const STATE_KEYS = ['hasProject', 'isAidlc', 'showFeatures'];
let menuState = { hasProject: false, isAidlc: false, showFeatures: false };

/** `menu:state` from the renderer: exactly three booleans, anything else is ignored (NFR1). */
export function parseMenuState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!STATE_KEYS.every((k) => typeof raw[k] === 'boolean')) return null;
  return Object.fromEntries(STATE_KEYS.map((k) => [k, raw[k]]));
}

export function setMenuState(state) {
  menuState = state;
}

const sep = { type: 'separator' };

/**
 * Pure: the menu template for Menu.buildFromTemplate, testable without Electron.
 * @param {{isMac: boolean, isPackaged: boolean, state: {hasProject: boolean, isAidlc: boolean, showFeatures: boolean},
 *          fullscreen: boolean, send: (payload: {command: string}) => void,
 *          actions: {toggleFullscreen: () => void, reportIssue: () => void}}} options
 */
export function buildMenuTemplate({ isMac, isPackaged, state, fullscreen, send, actions }) {
  const hasProject = state?.hasProject === true;
  const isAidlc = hasProject && state?.isAidlc === true;
  const showFeatures = hasProject && state?.showFeatures === true;
  const cmd = (command, args = {}) => () => send({ command, ...args });
  const appSettings = { label: t('menu.settings'), accelerator: 'CmdOrCtrl+,', click: cmd('appSettings') };

  const template = [];
  if (isMac) {
    template.push({
      label: APP_NAME,
      submenu: [
        { role: 'about', label: t('menu.about', { app: APP_NAME }) },
        sep,
        appSettings,
        sep,
        { role: 'hide', label: t('menu.hide', { app: APP_NAME }) },
        { role: 'hideOthers', label: t('menu.hideOthers') },
        { role: 'unhide', label: t('menu.unhide') },
        sep,
        { role: 'quit', label: t('menu.quitApp', { app: APP_NAME }) }
      ]
    });
  }
  template.push(
    {
      label: t('menu.file'),
      submenu: [
        { label: t('menu.openProject'), accelerator: 'CmdOrCtrl+O', click: cmd('openProject') },
        // Closes the active project, never the window (FR2.6).
        { label: t('menu.closeProject'), accelerator: 'CmdOrCtrl+W', enabled: hasProject, click: cmd('closeProject') },
        { label: t('menu.projectSettings'), enabled: hasProject, click: cmd('projectSettings') },
        ...(isMac ? [] : [sep, appSettings, sep, { role: 'quit', label: t('menu.quit'), accelerator: 'Ctrl+Q' }])
      ]
    },
    {
      // Without these roles copy and paste stop working in fields and the terminal on macOS.
      label: t('menu.edit'),
      submenu: [
        { role: 'undo', label: t('menu.undo') },
        { role: 'redo', label: t('menu.redo') },
        sep,
        { role: 'cut', label: t('menu.cut') },
        { role: 'copy', label: t('menu.copy') },
        { role: 'paste', label: t('menu.paste') },
        { role: 'selectAll', label: t('menu.selectAll') }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.intents'), enabled: hasProject, click: cmd('view', { view: 'intents' }) },
        { label: t('menu.features'), visible: showFeatures, enabled: showFeatures, click: cmd('view', { view: 'features' }) },
        { label: t('menu.cost'), enabled: isAidlc, click: cmd('panel', { panel: 'cost' }) },
        { label: t('menu.github'), enabled: isAidlc, click: cmd('panel', { panel: 'github' }) },
        sep,
        {
          label: t('menu.fullscreen'),
          type: 'checkbox',
          checked: fullscreen === true,
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => actions.toggleFullscreen()
        },
        sep,
        { role: 'zoomIn', label: t('menu.zoomIn') },
        { role: 'zoomOut', label: t('menu.zoomOut') },
        { role: 'resetZoom', label: t('menu.resetZoom') }
      ]
    },
    {
      label: t('menu.terminal'),
      submenu: [
        { label: t('menu.claude'), enabled: hasProject, click: cmd('terminal', { action: 'claude' }) },
        { label: t('menu.shell'), enabled: hasProject, click: cmd('terminal', { action: 'shell' }) },
        { label: t('menu.restartTab'), enabled: hasProject, click: cmd('terminal', { action: 'restart' }) }
      ]
    }
  );
  if (isMac) {
    template.push({
      label: t('menu.window'),
      role: 'windowMenu',
      submenu: [{ role: 'minimize', label: t('menu.minimize') }, { role: 'zoom', label: t('menu.zoom') }, sep, { role: 'front', label: t('menu.front') }]
    });
  }
  template.push({
    label: t('menu.help'),
    role: 'help',
    submenu: [
      { label: t('menu.docs'), click: cmd('docs') },
      { label: t('menu.reportIssue'), click: () => actions.reportIssue() }
    ]
  });
  // Reload and DevTools only while developing; the packaged app has neither (FR2.2).
  if (!isPackaged) {
    template.push({
      label: t('menu.develop'),
      submenu: [
        { role: 'reload', label: t('menu.reload') },
        { role: 'forceReload', label: t('menu.forceReload') },
        { role: 'toggleDevTools', label: t('menu.devTools') }
      ]
    });
  }
  return template;
}

const targetWindow = () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;

function send(payload) {
  const w = targetWindow();
  if (w && !w.webContents.isDestroyed()) w.webContents.send('menu:command', payload);
}

const actions = {
  toggleFullscreen: () => {
    const w = targetWindow();
    if (w) w.setFullScreen(!w.isFullScreen());
  },
  reportIssue: () => shell.openExternal(ISSUES_URL).catch((err) => console.error('Kunde inte öppna webbläsaren:', err))
};

/** (Re)builds the menu from the latest renderer state and the window's real fullscreen mode. */
export function applyMenu(win) {
  // macOS About panel (US-0406 FR2.4). `version` (the build number) is left to Info.plist's CFBundleVersion.
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    copyright: `© ${APP_VENDOR}`,
    credits: `${APP_FULL_NAME} — ${APP_TAGLINE}`
  });
  const template = buildMenuTemplate({
    isMac: process.platform === 'darwin',
    isPackaged: app.isPackaged,
    state: menuState,
    fullscreen: win && !win.isDestroyed() ? win.isFullScreen() : false,
    send,
    actions
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
