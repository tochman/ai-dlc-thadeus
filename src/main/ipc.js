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
import { fetchRemote, getGitStatus, getRemoteChanges, listConflicts, showRemoteFile } from './git.js';
import { buildSetupCommand, getSetupInfo } from './setup.js';
import { getProjectSettings, getSettings, setProjectSettings, setSettings } from './settings.js';
import { watchFiles, watchForAidlc, watchIntents } from './watcher.js';
import { featureWatchPaths, loadFeatures, loadStoryLinks } from './features.js';
import { killAllSessions, killProjectSessions, killSession, resizeSession, spawnSession, writeSession } from './pty.js';

const OPEN_IN_EDITOR_EXT = new Set(['.md', '.json', '.txt', '.yaml', '.yml']);
// projectId -> { root, space, watcher, setupWatcher, featuresWatcher, featuresKey, sender, models, setupInfo }
const projects = new Map();

function project(projectId) {
  const p = projects.get(projectId);
  if (!p) throw new Error(`Okänt projekt: ${projectId}`);
  return p;
}

async function closeWatcher(p) {
  const w = p.watcher;
  const s = p.setupWatcher;
  const f = p.featuresWatcher;
  p.watcher = null;
  p.setupWatcher = null;
  p.featuresWatcher = null;
  p.featuresKey = null;
  await Promise.all([w?.close(), s?.close(), f?.close()]);
}

const sendFeaturesChanged = (projectId, p) => {
  if (!p.sender.isDestroyed()) p.sender.send('features:changed', { projectId });
};

/**
 * Watches the feature docs unless the project setting is "hide" (EPIC-06 FR2.7). Restarted when the path
 * or the linked epic folders change. Never throws: a failure only stops live updates of the Features view.
 */
async function syncFeaturesWatch(projectId) {
  const p = projects.get(projectId);
  if (!p) return;
  try {
    const settings = await getProjectSettings(p.root);
    const paths = settings.featureDocs === 'hide' ? null : featureWatchPaths(settings.featuresPath, await loadFeatures(p.root, settings.featuresPath));
    const key = paths ? paths.join('\n') : null;
    if (key === p.featuresKey || !projects.has(projectId)) return;
    const old = p.featuresWatcher;
    p.featuresWatcher = null;
    p.featuresKey = key;
    await old?.close();
    if (!paths) return;
    p.featuresWatcher = watchFiles({
      root: p.root,
      paths,
      onChange: () => {
        sendFeaturesChanged(projectId, p);
        syncFeaturesWatch(projectId); // a new epic folder in the overview is picked up
      },
      onError: (err) => console.error(`Bevakning av feature-dokument misslyckades för ${p.root}:`, err)
    });
  } catch (err) {
    console.error(`Bevakning av feature-dokument kunde inte startas för ${p.root}:`, err);
  }
}

/** A folder without AI-DLC is watched until a space appears, then it is detected again (FR4.6). */
function watchForSetup(projectId) {
  const p = project(projectId);
  p.setupWatcher = watchForAidlc({
    root: p.root,
    onFound: async () => {
      try {
        const detection = await detectProject(p.root);
        if (!detection.isAidlc || !projects.has(projectId)) return;
        await p.setupWatcher?.close();
        p.setupWatcher = null;
        await watchSpace(projectId, detection.activeSpace);
        if (!p.sender.isDestroyed()) p.sender.send('project:detected', { projectId, detection });
      } catch (err) {
        console.error(`Omdetektering misslyckades för ${p.root}:`, err);
      }
    },
    onError: (err) => console.error(`Bevakning efter AI-DLC misslyckades för ${p.root}:`, err)
  });
}

/** (Re)starts the watcher when the renderer looks at a different space. */
async function watchSpace(projectId, space) {
  const p = project(projectId);
  if (p.watcher && p.space === space) return;
  const w = p.watcher;
  p.watcher = null;
  await w?.close();
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
    projects.set(projectId, { root, space: null, watcher: null, setupWatcher: null, sender: event.sender });
    if (detection.isAidlc) await watchSpace(projectId, detection.activeSpace);
    else watchForSetup(projectId);
    syncFeaturesWatch(projectId); // not awaited: opening a project never waits on the feature docs
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
  // Read-only git (US-0502). The ref and path are checked in git.js against the branch's own upstream.
  'git:status': async (_event, projectId) => getGitStatus(project(projectId).root),
  'git:fetch': async (_event, projectId) => fetchRemote(project(projectId).root),
  'git:remoteChanges': async (_event, projectId, ref, space) =>
    getRemoteChanges(project(projectId).root, String(ref), { space: String(space ?? 'default') }),
  'git:showRemote': async (_event, projectId, ref, rel) => showRemoteFile(project(projectId).root, String(ref), String(rel)),
  'git:conflicts': async (_event, projectId) => listConflicts(project(projectId).root),
  // Setup (US-0503): the command is only built here, never run; plugins must be ones setup:info read.
  'setup:info': async (_event, projectId) => {
    const p = project(projectId);
    p.setupInfo = await getSetupInfo(p.root);
    return p.setupInfo;
  },
  'setup:command': async (_event, projectId, options) => buildSetupCommand(options, project(projectId).setupInfo?.plugins ?? []),
  'settings:get': async () => getSettings(),
  'settings:set': async (_event, partial) => setSettings(partial),
  // Feature docs (EPIC-06). The root is always looked up here; the renderer never names one.
  'features:load': async (_event, projectId) => {
    const p = project(projectId);
    return loadFeatures(p.root, (await getProjectSettings(p.root)).featuresPath);
  },
  'features:storyLinks': async (_event, projectId, space) => {
    const p = project(projectId);
    if (!space) return {};
    const { intents } = await loadIntentList(p.root, String(space), []); // cached list
    return loadStoryLinks(p.root, String(space), intents.filter((i) => !i.missingOnDisk).map((i) => i.dirName));
  },
  'projectSettings:get': async (_event, projectId) => getProjectSettings(project(projectId).root),
  'projectSettings:set': async (_event, projectId, partial) => {
    const p = project(projectId);
    const next = await setProjectSettings(p.root, { featureDocs: partial?.featureDocs, featuresPath: partial?.featuresPath });
    await syncFeaturesWatch(projectId);
    sendFeaturesChanged(projectId, p); // the open view reloads with the new setting
    return next;
  },
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
