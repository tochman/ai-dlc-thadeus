// IPC surface for the renderer. Every handler validates its projectId and routes
// file paths through projectAccess, so nothing outside an opened root is reachable.
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { openRoot, readText, resolveInRoot } from './projectAccess.js';
import {
  LEDGER_PATH,
  detectProject,
  intentsDir,
  listSpaces,
  loadCost,
  loadIntentDetail,
  loadIntentList
} from './projectService.js';
import { summarizeLedger } from './parsers/ledger.js';
import { getConfiguredModels } from './models.js';
import { getSettings, setSettings } from './settings.js';
import { watchIntents } from './watcher.js';
import { killAllSessions, killProjectSessions, killSession, resizeSession, spawnSession, writeSession } from './pty.js';

const OPEN_IN_EDITOR_EXT = new Set(['.md', '.json', '.txt', '.yaml', '.yml']);
const projects = new Map(); // projectId -> { root, space, watcher, sender, models }

function project(projectId) {
  const p = projects.get(projectId);
  if (!p) throw new Error(`Okänt projekt: ${projectId}`);
  return p;
}

async function closeWatcher(p) {
  const w = p.watcher;
  p.watcher = null;
  if (w) await w.close();
}

/** (Re)starts the watcher when the renderer looks at a different space. */
async function watchSpace(projectId, space) {
  const p = project(projectId);
  if (p.watcher && p.space === space) return;
  await closeWatcher(p);
  p.space = space;
  p.watcher = watchIntents({
    intentsDir: path.join(p.root, intentsDir(space)),
    ledgerFile: path.join(p.root, LEDGER_PATH),
    onChange: (change) => {
      if (!p.sender.isDestroyed()) p.sender.send('project:changed', { projectId, space, ...change });
    },
    onError: (err) => {
      console.error(`Filbevakning misslyckades för ${p.root}:`, err);
      if (!p.sender.isDestroyed()) p.sender.send('project:watchError', { projectId, message: err.message });
    }
  });
}

const handlers = {
  'project:pick': async (event) => {
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Öppna projektmapp',
      properties: ['openDirectory']
    });
    return res.canceled ? null : res.filePaths[0] ?? null;
  },
  'project:open': async (event, dir) => {
    const root = await openRoot(dir);
    const detection = await detectProject(root);
    const projectId = randomUUID();
    projects.set(projectId, { root, space: null, watcher: null, sender: event.sender });
    if (detection.isAidlc) await watchSpace(projectId, detection.activeSpace);
    return { projectId, root, name: path.basename(root), detection };
  },
  'project:close': async (_event, projectId) => {
    const p = projects.get(projectId);
    if (!p) return;
    projects.delete(projectId);
    killProjectSessions(projectId);
    await closeWatcher(p);
  },
  'project:spaces': async (_event, projectId) => listSpaces(project(projectId).root),
  'project:intents': async (_event, projectId, space, onlyDirs) => {
    const p = project(projectId);
    await watchSpace(projectId, space);
    return loadIntentList(p.root, space, Array.isArray(onlyDirs) ? onlyDirs.map(String) : undefined);
  },
  'project:intent': async (_event, projectId, space, dirName) => loadIntentDetail(project(projectId).root, space, dirName),
  'project:cost': async (_event, projectId, space) => {
    const p = project(projectId);
    const cost = await loadCost(p.root);
    if (!cost.available) return cost;
    const { intents } = await loadIntentList(p.root, space, []); // cached list; only new folders are read
    const { ledger, ...rest } = cost;
    return { ...rest, ...summarizeLedger(ledger, intents) };
  },
  // Cached per opened project (a reopen gets a new projectId); getConfiguredModels never rejects.
  'project:models': async (_event, projectId) => {
    const p = project(projectId);
    p.models ??= getConfiguredModels(p.root);
    return p.models;
  },
  'project:file': async (_event, projectId, rel) => readText(project(projectId).root, rel),
  'shell:reveal': async (_event, projectId, rel) => {
    shell.showItemInFolder(await resolveInRoot(project(projectId).root, rel));
  },
  'shell:openInEditor': async (_event, projectId, rel) => {
    // openPath launches the default handler; limit it to document types so it can never run a script or app.
    if (!OPEN_IN_EDITOR_EXT.has(path.extname(String(rel)).toLowerCase())) {
      throw new Error(`Filtypen öppnas inte från appen: ${rel}`);
    }
    const err = await shell.openPath(await resolveInRoot(project(projectId).root, rel));
    if (err) throw new Error(err);
  },
  'settings:get': async () => getSettings(),
  'settings:set': async (_event, partial) => setSettings(partial),
  'pty:spawn': async (event, { projectId, kind, cols, rows }) =>
    spawnSession({ projectId, root: project(projectId).root, kind, cols, rows, sender: event.sender }),
  'pty:write': async (_event, id, data) => writeSession(id, data),
  'pty:resize': async (_event, id, cols, rows) => resizeSession(id, cols, rows),
  'pty:kill': async (_event, id) => killSession(id)
};

export function registerIpc() {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (...args) => {
      try {
        return await handler(...args);
      } catch (err) {
        console.error(`[ipc] ${channel} misslyckades:`, err.message);
        throw err; // surfaces to the renderer as a rejected promise
      }
    });
  }
}

export async function shutdown() {
  killAllSessions();
  await Promise.all([...projects.values()].map(closeWatcher));
  projects.clear();
}
