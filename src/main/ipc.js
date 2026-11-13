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
  loadIntentList,
  loadPendingQuestions
} from './projectService.js';
import { notifyQuestions } from './notify.js';
import { summarizeLedger } from './parsers/ledger.js';
import { getConfiguredModels } from './models.js';
import { fetchRemote, getGitStatus, getRemoteChanges, listConflicts, showRemoteFile } from './git.js';
import { getSetupInfo, runSetup } from './setup.js';
import { detectHarnesses } from './harness.js';
import { getProjectSettings, getSettings, setProjectSettings, setSettings } from './settings.js';
import { watchFiles, watchForAidlc, watchIntents } from './watcher.js';
import { featureWatchPaths, loadFeatures, loadStoryLinks } from './features.js';
import { killAllSessions, killProjectSessions, killSession, resizeSession, spawnSession, writeSession } from './pty.js';
import { AIDLC_DOCS_URL, applyMenu, parseMenuState, setMenuState } from './menu.js';
import { currentLanguage, setLanguageFromSettings } from './i18n.js';
import { t } from '../shared/i18n.js';

const OPEN_IN_EDITOR_EXT = new Set(['.md', '.json', '.txt', '.yaml', '.yml']);
// projectId -> { root, space, watcher, setupWatcher, featuresWatcher, featuresKey, sender, models, setupInfo, harnesses }
const projects = new Map();

function project(projectId) {
  const p = projects.get(projectId);
  if (!p) throw new Error(t('errors.unknownProject', { id: String(projectId) }));
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

// Waiting questions (US-0505). Ids seen in a project's first computation waited already when the app started
// (or the project was opened): they are listed, but give no popup or notification (FR1.4).
const startedWith = new Set();
let activeProjectId = null; // told by the renderer; main does not know which tab is shown

/** Every open project's waiting questions, newest first, each marked `early` when it waited from the start. */
function allQuestions() {
  return [...projects.values()]
    .flatMap((p) => p.questions ?? [])
    .map((q) => ({ ...q, early: startedWith.has(q.id) }))
    .sort((a, b) => b.timeMs - a.timeMs);
}

function publishQuestions() {
  const list = allQuestions();
  const senders = new Set([...projects.values()].map((p) => p.sender));
  for (const s of senders) if (!s.isDestroyed()) s.send('questions:changed', list);
}

/** Recomputes one project's questions (only `dirNames` when given), pushes the list and notifies new ones (FR1.4, FR3.1). */
async function refreshQuestions(projectId, dirNames) {
  const p = projects.get(projectId);
  if (!p?.space) return;
  const space = p.space;
  try {
    const list = await loadPendingQuestions({ root: p.root, space, projectId, name: path.basename(p.root) }, dirNames);
    if (projects.get(projectId) !== p || p.space !== space) return; // closed or switched space meanwhile
    if (!p.questions) for (const q of list) startedWith.add(q.id);
    p.questions = list;
    publishQuestions();
    const fresh = list.filter((q) => !startedWith.has(q.id));
    if (fresh.length) {
      const win = p.sender.isDestroyed() ? null : BrowserWindow.fromWebContents(p.sender);
      notifyQuestions(fresh, { settings: await getSettings(), win, activeProjectId });
    }
  } catch (err) {
    console.error(`Väntande frågor kunde inte räknas om för ${p.root}:`, err);
  }
}

/** (Re)starts the watcher when the renderer looks at a different space. */
async function watchSpace(projectId, space) {
  const p = project(projectId);
  if (p.watcher && p.space === space) return;
  const w = p.watcher;
  p.watcher = null;
  await w?.close();
  p.space = space;
  p.questions = null; // a new space starts a new baseline
  refreshQuestions(projectId); // not awaited, like the feature docs
  p.watcher = watchIntents({
    intentsDir: path.join(p.root, intentsDir(space)),
    ledgerFile: path.join(p.root, LEDGER_PATH),
    onChange: (change) => {
      if (!p.sender.isDestroyed()) p.sender.send('project:changed', { projectId, space, ...change });
      if (change.dirNames.length || change.indexChanged) refreshQuestions(projectId, change.dirNames);
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
      title: t('app.pickFolder'),
      properties: ['openDirectory']
    });
    return res.canceled ? null : res.filePaths[0] ?? null;
  },
  'project:open': async (event, dir) => {
    const root = await openRoot(dir);
    const detection = await detectProject(root);
    const projectId = randomUUID();
    // Harness detection starts now, in the background; harness:detect returns the same promise (US-0801 NFR3).
    const harnesses = detectHarnesses(root);
    projects.set(projectId, { root, space: null, watcher: null, setupWatcher: null, sender: event.sender, harnesses });
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
    if (!p.sender.isDestroyed()) p.sender.send('questions:changed', allQuestions()); // its questions leave the popup
    await closeWatcher(p);
  },
  // Waiting questions of the open projects (US-0505 FR1.4); with no project open the list is empty (NFR2).
  'questions:list': async () => allQuestions(),
  'questions:activeProject': async (_event, projectId) => {
    if (projectId !== null && typeof projectId !== 'string') throw new Error(t('errors.invalidProjectId'));
    activeProjectId = projectId && projects.has(projectId) ? projectId : null;
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
  // Cached per opened project like the models; detectHarnesses never rejects (US-0801 FR1.2, FR1.3).
  'harness:detect': async (_event, projectId) => project(projectId).harnesses,
  'project:file': async (_event, projectId, rel) => readText(project(projectId).root, rel),
  'shell:reveal': async (_event, projectId, rel) => {
    shell.showItemInFolder(await resolveInRoot(project(projectId).root, rel));
  },
  'shell:openInEditor': async (_event, projectId, rel) => {
    // openPath launches the default handler; limit it to document types so it can never run a script or app.
    if (!OPEN_IN_EDITOR_EXT.has(path.extname(String(rel)).toLowerCase())) {
      throw new Error(t('errors.fileTypeBlocked', { rel: String(rel) }));
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
  // Setup (US-0503, US-0802): setup:run only runs after a setup:info preview for the same harness, and only
  // with plugins that preview read; runSetup checks every value.
  'setup:info': async (_event, projectId, options) => {
    const p = project(projectId);
    p.setupInfo = await getSetupInfo(p.root, { harness: options?.harness });
    return p.setupInfo;
  },
  'setup:run': async (_event, projectId, choices) => {
    const p = project(projectId);
    const result = await runSetup(p.root, choices, p.setupInfo);
    if (result.ok) p.harnesses = detectHarnesses(p.root); // the new harness shows as installed at once (FR4.1)
    return result;
  },
  'settings:get': async () => getSettings(),
  // A changed language applies at once: later dialogs and notifications, and the rebuilt menu (EPIC-07 FR4.4).
  'settings:set': async (event, partial) => {
    const next = await setSettings(partial);
    const before = currentLanguage();
    if (setLanguageFromSettings(next) !== before) applyMenu(BrowserWindow.fromWebContents(event.sender));
    return next;
  },
  // The language in effect (auto already resolved); the renderer switches to it (FR4.4).
  'i18n:language': async () => currentLanguage(),
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
    const next = await setProjectSettings(p.root, {
      featureDocs: partial?.featureDocs,
      featuresPath: partial?.featuresPath,
      harness: partial?.harness
    });
    await syncFeaturesWatch(projectId);
    sendFeaturesChanged(projectId, p); // the open view reloads with the new setting
    return next;
  },
  // `harness` is only an id; pty.js refuses any id outside the fixed table (US-0801 NFR4).
  'pty:spawn': async (event, { projectId, kind, harness, cols, rows }) =>
    spawnSession({ projectId, root: project(projectId).root, kind, harness, cols, rows, sender: event.sender }),
  'pty:write': async (_event, id, data) => writeSession(id, data),
  'pty:resize': async (_event, id, cols, rows) => resizeSession(id, cols, rows),
  'pty:kill': async (_event, id) => killSession(id),
  // Fullscreen and the app menu (EPIC-04 US-0404). The new mode reaches the renderer as `window:fullscreen`.
  'window:toggleFullscreen': async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setFullScreen(!win.isFullScreen());
  },
  'window:isFullscreen': async (event) => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() === true,
  'menu:state': async (event, raw) => {
    const state = parseMenuState(raw);
    if (!state) return; // only three booleans are accepted (NFR1)
    setMenuState(state);
    applyMenu(BrowserWindow.fromWebContents(event.sender));
  },
  // A fixed https address; the renderer never names a URL (NFR1).
  'app:openDocsUrl': async () => shell.openExternal(AIDLC_DOCS_URL)
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
