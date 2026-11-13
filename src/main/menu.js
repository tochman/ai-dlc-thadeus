// The app's own menu (EPIC-04 US-0404 FR2). Labels are the left arm's names. Everything that concerns the
// content is sent to the renderer as `menu:command` and runs the same function as the arm's button (FR2.4).
import { app, BrowserWindow, Menu, shell } from 'electron';
import { APP_FULL_NAME, APP_NAME, APP_TAGLINE, APP_VENDOR } from '../shared/appName.js';

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
  const appSettings = { label: 'Inställningar…', accelerator: 'CmdOrCtrl+,', click: cmd('appSettings') };

  const template = [];
  if (isMac) {
    template.push({
      label: APP_NAME,
      submenu: [
        { role: 'about', label: `Om ${APP_NAME}` },
        sep,
        appSettings,
        sep,
        { role: 'hide', label: `Göm ${APP_NAME}` },
        { role: 'hideOthers', label: 'Göm övriga' },
        { role: 'unhide', label: 'Visa alla' },
        sep,
        { role: 'quit', label: `Avsluta ${APP_NAME}` }
      ]
    });
  }
  template.push(
    {
      label: 'Arkiv',
      submenu: [
        { label: 'Öppna projekt…', accelerator: 'CmdOrCtrl+O', click: cmd('openProject') },
        // Closes the active project, never the window (FR2.6).
        { label: 'Stäng projekt', accelerator: 'CmdOrCtrl+W', enabled: hasProject, click: cmd('closeProject') },
        { label: 'Projektinställningar…', enabled: hasProject, click: cmd('projectSettings') },
        ...(isMac ? [] : [sep, appSettings, sep, { role: 'quit', label: 'Avsluta', accelerator: 'Ctrl+Q' }])
      ]
    },
    {
      // Without these roles copy and paste stop working in fields and the terminal on macOS.
      label: 'Redigera',
      submenu: [
        { role: 'undo', label: 'Ångra' },
        { role: 'redo', label: 'Gör om' },
        sep,
        { role: 'cut', label: 'Klipp ut' },
        { role: 'copy', label: 'Kopiera' },
        { role: 'paste', label: 'Klistra in' },
        { role: 'selectAll', label: 'Markera allt' }
      ]
    },
    {
      label: 'Visa',
      submenu: [
        { label: 'Intents', enabled: hasProject, click: cmd('view', { view: 'intents' }) },
        { label: 'Features', visible: showFeatures, enabled: showFeatures, click: cmd('view', { view: 'features' }) },
        { label: 'Kostnad', enabled: isAidlc, click: cmd('panel', { panel: 'cost' }) },
        { label: 'Github', enabled: isAidlc, click: cmd('panel', { panel: 'github' }) },
        sep,
        {
          label: 'Helskärm',
          type: 'checkbox',
          checked: fullscreen === true,
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => actions.toggleFullscreen()
        },
        sep,
        { role: 'zoomIn', label: 'Zooma in' },
        { role: 'zoomOut', label: 'Zooma ut' },
        { role: 'resetZoom', label: 'Återställ zoom' }
      ]
    },
    {
      label: 'Terminal',
      submenu: [
        { label: 'Claude', enabled: hasProject, click: cmd('terminal', { action: 'claude' }) },
        { label: 'Shell', enabled: hasProject, click: cmd('terminal', { action: 'shell' }) },
        { label: 'Starta om flik', enabled: hasProject, click: cmd('terminal', { action: 'restart' }) }
      ]
    }
  );
  if (isMac) {
    template.push({
      label: 'Fönster',
      role: 'windowMenu',
      submenu: [{ role: 'minimize', label: 'Minimera' }, { role: 'zoom', label: 'Zooma' }, sep, { role: 'front', label: 'Lägg alla främst' }]
    });
  }
  template.push({
    label: 'Hjälp',
    role: 'help',
    submenu: [
      { label: 'AI-DLC-dokumentation', click: cmd('docs') },
      { label: 'Rapportera problem', click: () => actions.reportIssue() }
    ]
  });
  // Reload and DevTools only while developing; the packaged app has neither (FR2.2).
  if (!isPackaged) {
    template.push({
      label: 'Utveckling',
      submenu: [
        { role: 'reload', label: 'Ladda om' },
        { role: 'forceReload', label: 'Tvinga omladdning' },
        { role: 'toggleDevTools', label: 'Utvecklarverktyg' }
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
