// IPC surface for the renderer. Every handler validates its projectId and routes
// file paths through projectAccess, so nothing outside an opened root is reachable.
import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { openRoot, readText, resolveInRoot } from './projectAccess.js';
import {
  INFLIGHT_PATH,
  LEDGER_PATH,
  assertName,
  detectProject,
  inProgress,
  intentsDir,
  listSpaces,
  loadCost,
  loadCrossMachineCost,
  loadIntentDetail,
  loadIntentList,
  loadPendingQuestions,
  loadWorkingAgents
} from './projectService.js';
import { loadAgentProgress } from './agentProgress.js';
import { notifyEvent, notifyQuestions } from './notify.js';
import { agentName, summarizeLedger } from './parsers/ledger.js';
import { getConfiguredModels } from './models.js';
import { readReadings, readingOf, recordReading } from './tokenReadings.js';
import { USAGE_DIR, snapshotOf, writeSnapshot } from './usageSnapshot.js';
import { CONFIG_WATCH_PATHS, checkHarness, getAidlcConfig } from './aidlcConfig.js';
import { applyPlanEdit, deletePlan, listPlans, planStages, previewPlanEdit, savePlan } from './plans.js';
import { apply as applyConfigChange, applyGuardLock, preview as previewConfigChange, previewGuardLock } from './aidlcWrite.js';
import { applyModelChange, checkDrift, estimateCost, ledgerRows, modelOptions, previewModelChange, pricesFromLedger } from './modelChoice.js';
import { createUpdater } from './updater.js';
import {
  behindCount,
  changedFiles,
  fetchRemote,
  getGitStatus,
  getRemoteChanges,
  listConflicts,
  listReleaseTags,
  originUrl,
  predictConflicts,
  remoteStoryBranches,
  showRemoteFile
} from './git.js';
import { detectPlatform } from './platforms/detect.js';
import { listComments, listPulls, listReviews } from './platforms/index.js';
import { clearBitbucket, hasBitbucket, loadBitbucket, saveBitbucket } from './credentials.js';
import { collisions, loadMachines, loadOpenQuestions, matchPull, possibleCollisions, storyComments } from './teamActivity.js';
import { createRelease, deleteRelease, readRuleStatus, setStoryRelease } from './releases.js';
import { DELIVERY_DEFAULT } from './parsers/releases.js';
import { getSetupInfo, runSetup } from './setup.js';
import { detectHarnesses } from './harness.js';
import { TOOL_IDS, getTools, setToolPaths, validateTool } from './tools.js';
import { checkProgram, errorText as checkError, programCommand, projectCommand, projectPlan } from './aidlcUpdate.js';
import { setupHarness } from '../shared/harnesses.js';
import { getProjectSettings, getSettings, setProjectSettings, setSettings, settingsNow } from './settings.js';
import { watchFiles, watchForAidlc, watchIntents, watchOpenFiles } from './watcher.js';
import { listTree, readForEdit, writeFileSafe } from './fileWrite.js';
import { featureWatchPaths, loadFeatures, loadStoryLinks } from './features.js';
import { killAllSessions, killProjectSessions, killSession, resizeSession, spawnSession, tapOutput, writeSession } from './pty.js';
import { createAgentChannel } from './agentChannel.js';
import { createHookInstaller, hooksHandlers, statusPusher } from './agentHooks.js';
import { adapters } from './agentAdapters.js';
import { createAgentEventStore } from './agentEvents.js';
import { createAgentIpc } from './agentIpc.js';
import { createTimingLog } from './agentTiming.js';
import { auditContext, auditEvent } from './questions.js';
import { AIDLC_DOCS_URL, applyMenu, parseMenuState, setMenuState } from './menu.js';
import { currentLanguage, setLanguageFromSettings } from './i18n.js';
import { t } from '../shared/i18n.js';

const OPEN_IN_EDITOR_EXT = new Set(['.md', '.json', '.txt', '.yaml', '.yml']);
// The Om section's links, by a fixed key: the renderer never names a URL (NFR1, US-0405 FR5.1).
const REPO_URL = 'https://github.com/tochman/aidlc-dash';
const EXTERNAL_URLS = {
  repo: REPO_URL,
  features: `${REPO_URL}/tree/main/docs/features`,
  docs: AIDLC_DOCS_URL
};
// projectId -> { root, space, watcher, setupWatcher, featuresWatcher, featuresKey, configWatcher, sender, models, setupInfo,
//   harnesses, modelOptions, guardLock }
const projects = new Map();

// The app updater (EPIC-04 US-0407); download progress reaches every window as `update:state`.
const updater = createUpdater({
  app,
  getSettings,
  setSettings,
  send: (state) => {
    for (const w of BrowserWindow.getAllWindows()) if (!w.webContents.isDestroyed()) w.webContents.send('update:state', state);
  }
});

// The AI-DLC program check (US-0504 FR3): once after the first window has loaded, again on "Check for updates".
let aidlcStatus = null;
/** US-0504 FR3, NFR2: starts the program check (or returns the one running); checkProgram never rejects. */
export function startAidlcCheck({ force = false } = {}) {
  if (!aidlcStatus || force) aidlcStatus = checkProgram();
  return aidlcStatus;
}

/** The daily check once the window has loaded (US-0407); an offered update reaches the notice as `update:state`. */
export function startUpdateCheck(win) {
  updater.check().then((state) => {
    if (state.status === 'available' && !win.webContents.isDestroyed()) win.webContents.send('update:state', state);
  });
}

const sendConfigChanged = (projectId, p) => {
  if (!p.sender.isDestroyed()) p.sender.send('config:changed', { projectId });
};

/** The model choices of one installed harness, cached per project; preview and apply check against them (NFR4). */
async function harnessModelOptions(p, harness) {
  checkHarness(harness, await p.harnesses);
  p.modelOptions ??= {};
  p.modelOptions[harness] ??= modelOptions(p.root, harness);
  const options = await p.modelOptions[harness];
  if (!options.editable) throw new Error(options.reason);
  return options;
}

/** Per agent from the ledger (US-0904): the models it ran on and its cost; null without a readable ledger. */
async function modelUsage(root) {
  try {
    const cost = await loadCost(root);
    if (!cost.available) return null;
    const { project: summary } = summarizeLedger(cost.ledger, []);
    return {
      totalUsd: summary.total.usd,
      usdByAgent: Object.fromEntries(summary.byAgent.map((r) => [agentName(r.name), r.usd])),
      agentModels: summary.agentModels
    };
  } catch (err) {
    console.warn('Modellernas kostnad kunde inte läsas:', err.message);
    return null;
  }
}

/** The cost estimate for a model change on this project's ledger, or null when it cannot be made. */
async function modelEstimate(root, change) {
  const cost = await loadCost(root);
  if (!cost.available) return null;
  const { project: summary } = summarizeLedger(cost.ledger, []);
  const agents = change.agent ? [change.agent] : null; // a preset or group changes every agent
  return estimateCost(ledgerRows(summary), pricesFromLedger(summary.byModel), { agents, model: change.model });
}

function project(projectId) {
  const p = projects.get(projectId);
  if (!p) throw new Error(t('errors.unknownProject', { id: String(projectId) }));
  return p;
}

async function closeWatcher(p) {
  const w = p.watcher;
  const s = p.setupWatcher;
  const f = p.featuresWatcher;
  const c = p.configWatcher;
  const e = p.editorWatcher;
  const h = p.headWatcher;
  p.watcher = null;
  p.setupWatcher = null;
  p.featuresWatcher = null;
  p.featuresKey = null;
  p.configWatcher = null;
  p.editorWatcher = null;
  p.headWatcher = null;
  // US-0506 u4 SCD31: the hooks watcher, previews and isCurrent keys go with the project.
  await Promise.all([w?.close(), s?.close(), f?.close(), c?.close(), e?.close(), h?.close(), installer?.closeProject(p.id)]);
}

/** Watches exactly the files open in the editor; each change sends `file:changed` with its relative path (US-1001). */
async function watchEditorFiles(projectId, rels) {
  const p = project(projectId);
  const old = p.editorWatcher;
  p.editorWatcher = null;
  await old?.close();
  const files = (
    await Promise.all(
      rels.map((rel) =>
        resolveInRoot(p.root, rel).then(
          (abs) => [abs, rel],
          () => null
        )
      )
    )
  ).filter(Boolean);
  if (!files.length) return;
  const relOf = new Map(files);
  p.editorWatcher = watchOpenFiles({
    files: [...relOf.keys()],
    onChange: (abs) => {
      if (relOf.has(abs) && !p.sender.isDestroyed()) p.sender.send('file:changed', { projectId, rel: relOf.get(abs) });
    },
    onError: (err) => console.error(`Bevakning av öppna filer misslyckades för ${p.root}:`, err)
  });
}

// Closing a window or quitting asks the renderer first while an editor has unsaved changes (US-1001).
const closeAllowed = new WeakSet();
let quitting = false;
export const noteQuitting = () => {
  quitting = true;
};
/** Every close of `win` waits for the renderer's `app:closeConfirmed`, unless its renderer is gone. */
export function guardClose(win) {
  win.on('close', (event) => {
    if (closeAllowed.has(win) || win.webContents.isDestroyed()) return;
    event.preventDefault();
    win.webContents.send('app:confirmClose');
  });
  win.webContents.on('render-process-gone', () => closeAllowed.add(win));
}

/**
 * US-0015: git rewrites `.git/HEAD` on every branch switch, also one made outside the app; each change sends
 * git:headChanged, so the header reads the branch again.
 */
function watchGitHead(projectId) {
  const p = project(projectId);
  try {
    // ponytail: a project below the repo root, or a worktree (`.git` is a file), has no `.git/HEAD` here; its label stays as read.
    p.headWatcher = watchOpenFiles({
      files: [path.join(p.root, '.git', 'HEAD')],
      onChange: () => {
        if (!p.sender.isDestroyed()) p.sender.send('git:headChanged', { projectId });
      },
      onError: (err) => console.error(`Bevakning av grenen misslyckades för ${p.root}:`, err)
    });
  } catch (err) {
    console.error(`Bevakning av grenen kunde inte startas för ${p.root}:`, err); // only the live label stops
  }
}

/** The settings files and plan folders behind the Configuration view; each change sends config:changed (US-0901 FR6.1). */
function watchConfig(projectId) {
  const p = project(projectId);
  try {
    p.configWatcher = watchFiles({
      root: p.root,
      paths: [...CONFIG_WATCH_PATHS, INFLIGHT_PATH], // the inflight file changes "Arbetar nu"
      onChange: () => {
        if (!p.sender.isDestroyed()) p.sender.send('config:changed', { projectId });
      },
      onError: (err) => console.error(`Bevakning av AI-DLC-konfigurationen misslyckades för ${p.root}:`, err)
    });
  } catch (err) {
    console.error(`Bevakning av AI-DLC-konfigurationen kunde inte startas för ${p.root}:`, err); // only live reload stops
  }
}

/** The watched space's intents from the cached list; [] without a space. */
async function spaceIntents(p) {
  return p.space ? (await loadIntentList(p.root, p.space, [])).intents : [];
}

/** The active intent of the watched space from the cached list, or null (US-0901 FR3.3). Never throws. */
async function activeIntent(p) {
  if (!p.space) return null;
  try {
    return (await loadIntentList(p.root, p.space, [])).intents.find((i) => i.active) ?? null;
  } catch (err) {
    console.warn(`Aktiv intent kunde inte läsas för ${p.root}:`, err.message);
    return null;
  }
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
    agent?.publish(projectId); // the dialog lists these as audit events while no hook session runs (US-0506 BR2.7)
    const fresh = list.filter((q) => !startedWith.has(q.id));
    if (fresh.length) {
      const win = p.sender.isDestroyed() ? null : BrowserWindow.fromWebContents(p.sender);
      notifyQuestions(fresh, { settings: settingsNow(), win, activeProjectId }); // US-0506 u5 PD51: no await
    }
  } catch (err) {
    console.error(`Väntande frågor kunde inte räknas om för ${p.root}:`, err);
  }
}

// Agent dialogs (US-0506 u1). Built once in registerIpc, where userData is known.
// US-0506 u4 C5: an agent tab gets a channel session only when the installer finds its harness's hooks current for the
// project (isCurrent, from memory); every other tab gets no THADEUS_* variable and the dialog shows today's audit questions.
let agent = null;
let installer = null;

/** BR7.15: the harnesses a project uses: its folder markers, or an agent tab of it opened in this app run. */
async function usedHarnesses(projectId) {
  const p = projects.get(projectId);
  if (!p) return [];
  const detected = await Promise.resolve(p.harnesses).catch(() => []);
  return [...new Set([...(detected ?? []).filter((d) => d.installed).map((d) => d.id), ...p.agentTabs])];
}

function agentWiring() {
  if (agent) return agent;
  installer = createHookInstaller({
    log: (line) => console.warn(line),
    usedOf: usedHarnesses,
    // RD42: a harness that stops being current ends its running sessions; the push reaches every window (BR7.17).
    onStatus: statusPusher({ senders: () => new Set([...projects.values()].map((p) => p.sender)), demote: (root, harness) => agent.demote(root, harness) })
  });
  const hooksCurrent = installer.isCurrent;
  const userData = app.getPath('userData');
  const timing = createTimingLog({ dir: path.join(userData, 'logs'), on: process.env.THADEUS_TIMING === '1' });
  const channel = createAgentChannel({ root: path.join(userData, 'agent-channel') });
  const questionsOf = (projectId) => projects.get(projectId)?.questions ?? [];
  const store = createAgentEventStore({
    channel,
    adapters,
    pty: { write: writeSession, tapOutput },
    timing,
    contextOf: (projectId) => auditContext(questionsOf(projectId)),
    auditEventsOf: (projectId) => questionsOf(projectId).map((q) => auditEvent({ ...q, early: startedWith.has(q.id) })),
    settings: settingsNow // US-0506 u5 D2: a reply's state at arrival
  });
  // US-0506 u5 D5, PD50: one notification decision per accepted event, in the store's own turn.
  store.onAdded((ev) => {
    const p = projects.get(ev.projectId);
    const win = p && !p.sender.isDestroyed() ? BrowserWindow.fromWebContents(p.sender) : null;
    notifyEvent(ev, { settings: settingsNow(), win, activeProjectId, projectName: p ? path.basename(p.root) : '', timing });
  });
  agent = createAgentIpc({ channel, store, timing, hooksCurrent, senders: () => new Set([...projects.values()].map((p) => p.sender)) });
  return agent;
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
    usageDir: path.join(p.root, USAGE_DIR), // other machines' cost snapshots, pulled with git (US-0209 FR5.1)
    worktreesDir: path.join(p.root, '.aidlc', 'worktrees'), // Unit plans written in a build's worktree (US-0507 FR5.1)
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

// Team collaboration (US-1201). The platform of the project's origin remote is read once per opened project; null is
// plain git. Bitbucket's app password is read here in main only and never crosses the bridge (AC-1).
const PLATFORM_DEPS = { credentials: loadBitbucket };
const BASE = 'origin/main';

function platformOf(p) {
  p.platform ??= originUrl(p.root).then(detectPlatform);
  return p.platform;
}

/** US-1201 AC-1: a platform call as a value, {ok: true, value} or {ok: false, error: {code, message}}; other failures throw. */
async function asValue(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    if (err.name !== 'PlatformError') throw err;
    return { ok: false, error: { code: err.code, message: err.message } };
  }
}

/** US-1201 AC-1: the open pull requests of the project's platform, or its failure as a value. */
async function pullsOf(p) {
  const platform = await platformOf(p);
  const res = await asValue(() => listPulls(platform, PLATFORM_DEPS));
  return res.ok ? { ok: true, platform, pulls: res.value } : { ok: false, platform, error: res.error };
}

/** US-1201 AC-2: the branch's distance to main, and the open pull requests that share files with it and would conflict. */
async function teamCollisions(p) {
  const status = await getGitStatus(p.root);
  if (!status.isRepo) return { isRepo: false };
  const [behind, own, pulls] = await Promise.all([behindCount(p.root, BASE), changedFiles(p.root, 'HEAD', BASE).catch(() => null), pullsOf(p)]);
  const found = pulls.ok ? collisions(pulls.pulls, status.branch, own) : [];
  const withConflicts = await Promise.all(
    found.map(async (c) => ({ ...c, conflicts: c.branch ? await predictConflicts(p.root, 'HEAD', `origin/${c.branch}`).catch(() => null) : null }))
  );
  return { isRepo: true, branch: status.branch, base: BASE, behind, platform: pulls.platform, collisions: withConflicts, error: pulls.ok ? null : pulls.error };
}

/** US-1201 AC-3: the machines per intent, origin's story branches and the possible collisions. */
async function teamMachines(p, space) {
  assertName(space, 'space');
  const intents = (await loadIntentList(p.root, space, [])).intents.filter((i) => !i.missingOnDisk);
  const byIntent = {};
  for (const [story, dirs] of Object.entries(
    await loadStoryLinks(
      p.root,
      space,
      intents.map((i) => i.dirName)
    )
  )) {
    for (const dir of dirs) (byIntent[dir] ??= []).push(story);
  }
  const list = await loadMachines(
    p.root,
    space,
    intents.map((i) => ({ dirName: i.dirName, slug: i.slug ?? null, stories: byIntent[i.dirName] ?? [], inProgress: inProgress(i) }))
  );
  const branches = await remoteStoryBranches(p.root, BASE).catch((err) => {
    console.warn('Storygrenarna på origin kunde inte läsas:', err.message);
    return [];
  });
  return { intents: list, branches, flags: possibleCollisions(list, branches) };
}

/** US-1201 AC-4: the story's pull request comments and reviews with the intent's AI-DLC rows; a platform failure is `error`. */
async function teamComments(p, space, dirName) {
  const detail = await loadIntentDetail(p.root, space, dirName); // checks both names
  const stories = Object.keys(await loadStoryLinks(p.root, space, [detail.dirName]));
  const [questions, pulls] = await Promise.all([loadOpenQuestions(p.root, detail.files), pullsOf(p)]);
  const match = pulls.ok ? matchPull(pulls.pulls, stories) : null;
  let error = pulls.ok ? null : pulls.error;
  let matched = [];
  if (match) {
    const [c, r] = await Promise.all([
      asValue(() => listComments(pulls.platform, match.number, PLATFORM_DEPS)),
      asValue(() => listReviews(pulls.platform, match.number, PLATFORM_DEPS))
    ]);
    error = (!c.ok && c.error) || (!r.ok && r.error) || null;
    matched = [{ ...match, comments: c.ok ? c.value : [], reviews: r.ok ? r.value : [] }];
  }
  return { ...storyComments({ stories }, matched, detail.events, questions), stories, platform: pulls.platform, error };
}

const handlers = {
  'project:pick': async (event) => {
    const { defaultProjectFolder } = await getSettings();
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: t('app.pickFolder'),
      properties: ['openDirectory'],
      // The saved default folder is where the dialog opens (US-0405 FR4.1).
      ...(defaultProjectFolder ? { defaultPath: defaultProjectFolder } : {})
    });
    return res.canceled ? null : (res.filePaths[0] ?? null);
  },
  'project:open': async (event, dir) => {
    const root = await openRoot(dir);
    const detection = await detectProject(root);
    const projectId = randomUUID();
    // Harness detection starts now, in the background; harness:detect returns the same promise (US-0801 NFR3).
    const harnesses = detectHarnesses(root);
    projects.set(projectId, { id: projectId, root, space: null, watcher: null, setupWatcher: null, sender: event.sender, harnesses, agentTabs: new Set() });
    if (detection.isAidlc) await watchSpace(projectId, detection.activeSpace);
    else watchForSetup(projectId);
    syncFeaturesWatch(projectId); // not awaited: opening a project never waits on the feature docs
    watchConfig(projectId);
    watchGitHead(projectId);
    // US-0506 u4 PD31: the hooks status is computed after the first render and pushed as agent-hooks:changed.
    agentWiring();
    installer.openProject(projectId, root).catch((err) => console.error(`[agent-hooks] status failed for ${root}:`, err.code ?? err.message));
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
    const { intents } = await loadIntentList(p.root, space, []); // cached list; only new folders are read
    const { ledger = null, ...rest } = cost;
    // US-0209: every machine's cost (ledger, audit shard rows, snapshots); a fresh clone without a ledger still has one (FR1.4).
    const { summary, local } = await loadCrossMachineCost(p.root, space, intents, ledger);
    if (!summary) return cost;
    if (ledger) {
      // US-0209 FR3.1: this machine's snapshot, written only when it changed; never awaited, like the readings below.
      if (local) writeSnapshot(p.root, snapshotOf(ledger, local)).catch((err) => console.error('Kunde inte spara kostnadssnapshot:', err.message));
      // A reading per running intent for the token detail view, from this machine's ledger only (US-0208 FR2, NFR2; US-0209 assumption).
      const own = summarizeLedger(ledger, intents);
      const now = Date.now();
      for (const i of intents) {
        const reading = i.status === 'in-flight' ? readingOf(own.perIntent[i.dirName], now) : null;
        if (reading) recordReading(p.root, i.dirName, reading).catch((err) => console.error(`Kunde inte spara tokenavläsning för ${i.dirName}:`, err.message));
      }
    }
    const kept = { ...rest };
    delete kept.reason; // no ledger but audit rows: the cost is available
    return { ...kept, available: true, ...summary };
  },
  // The stored readings of one intent (US-0208 FR2.1); readReadings checks the dir name before it becomes a path.
  'tokens:readings': async (_event, projectId, dirName) => readReadings(project(projectId).root, dirName),
  // Cached per opened project (a reopen gets a new projectId); getConfiguredModels never rejects.
  'project:models': async (_event, projectId) => {
    const p = project(projectId);
    p.models ??= getConfiguredModels(p.root);
    return p.models;
  },
  // Cached per opened project like the models; detectHarnesses never rejects (US-0801 FR1.2, FR1.3).
  'harness:detect': async (_event, projectId) => project(projectId).harnesses,
  // Read-only AI-DLC configuration (US-0901). The id must be a table harness installed here (FR4.3, NFR2);
  // getAidlcConfig never rejects, so a CLI failure comes back as a value the view shows (NFR3).
  'config:get': async (_event, projectId, harness) => {
    const p = project(projectId);
    checkHarness(harness, await p.harnesses);
    const active = await activeIntent(p);
    const config = await getAidlcConfig(p.root, { harness, activeScope: active?.scope ?? null });
    return { ...config, activeDir: active?.dirName ?? null };
  },
  // The agents working now in the active intent, for the Configuration view's "Arbetar nu"; read-only.
  'agents:working': async (_event, projectId) => {
    const p = project(projectId);
    const active = await activeIntent(p);
    if (!active) return [];
    const agents = await loadWorkingAgents(p.root, p.space, active.dirName);
    return agents.map((a) => ({ ...a, intent: active.slug ?? active.dirName }));
  },
  // The agent progress of one intent for the token detail view (US-0507); read-only, the dir name is checked before use.
  'agents:progress': async (_event, projectId, dirName) => {
    const p = project(projectId);
    return loadAgentProgress(p.root, p.space, dirName);
  },
  // Changing AI-DLC settings (EPIC-09 US-0902). The renderer sends only {kind, key, value, where}; aidlcWrite
  // checks it against the fixed tables before anything runs, and refuses any other field (NFR4).
  'config:preview': async (_event, projectId, change) => previewConfigChange(project(projectId).root, change),
  'config:apply': async (_event, projectId, change) => {
    const p = project(projectId);
    const result = await applyConfigChange(p.root, change);
    if (result.ok) {
      p.models = null; // a changed default can change the configured models too
      sendConfigChanged(projectId, p);
    }
    return result;
  },
  // Tier 2: the diff is kept here, and apply writes exactly that change, only if the file is still as shown.
  'config:guardLockPreview': async (_event, projectId, choice) => {
    const p = project(projectId);
    const request = { space: p.space ?? 'default', layer: choice?.layer, mode: choice?.mode };
    const { before, file, diff } = await previewGuardLock(p.root, request);
    p.guardLock = { ...request, before };
    return { file, diff };
  },
  'config:guardLockApply': async (_event, projectId) => {
    const p = project(projectId);
    if (!p.guardLock) throw new Error(t('errors.previewFirst'));
    const { before, ...request } = p.guardLock;
    p.guardLock = null;
    const result = await applyGuardLock(p.root, request, before);
    sendConfigChanged(projectId, p);
    return result;
  },
  // Plans (US-0903). The root is looked up here; the renderer names a harness id (checked) and a plan name
  // (checked in plans.js) only. An edit is applied exactly as previewed, and only if the file is still as shown.
  'plans:list': async (_event, projectId, harness) => {
    const p = project(projectId);
    checkHarness(harness, await p.harnesses);
    const intents = await spaceIntents(p);
    const active = intents.find((i) => i.active) ?? null;
    const plans = await listPlans(p.root, harness, active ? (active.plan ?? active.scope) : null, intents);
    return { plans, active: active && { dirName: active.dirName, slug: active.slug ?? null, plan: active.plan ?? null, scope: active.scope ?? null } };
  },
  'plans:stages': async (_event, projectId, harness, name) => {
    const p = project(projectId);
    checkHarness(harness, await p.harnesses);
    return planStages(p.root, harness, name);
  },
  'plans:save': async (_event, projectId, name) => {
    const p = project(projectId);
    const result = await savePlan(p.root, name);
    if (result.ok) sendConfigChanged(projectId, p);
    return result;
  },
  'plans:previewEdit': async (_event, projectId, name, edit) => {
    const p = project(projectId);
    const shown = { description: edit?.description, depth: edit?.depth, keywords: edit?.keywords }; // nothing else
    const { before, file, diff } = await previewPlanEdit(p.root, name, shown);
    p.planEdit = { name, edit: shown, before };
    return { file, diff };
  },
  'plans:applyEdit': async (_event, projectId) => {
    const p = project(projectId);
    if (!p.planEdit) throw new Error(t('errors.previewFirst'));
    const { name, edit, before } = p.planEdit;
    p.planEdit = null;
    const result = await applyPlanEdit(p.root, name, edit, before);
    sendConfigChanged(projectId, p);
    return result;
  },
  'plans:delete': async (_event, projectId, name) => {
    const p = project(projectId);
    const result = await deletePlan(p.root, name, await spaceIntents(p));
    sendConfigChanged(projectId, p);
    return result;
  },
  // Models and effort per agent (US-0904); the harness must be installed here and have a rule table.
  'models:options': async (_event, projectId, harness) => {
    const p = project(projectId);
    checkHarness(harness, await p.harnesses);
    p.modelOptions ??= {};
    p.modelOptions[harness] = modelOptions(p.root, harness); // fresh on every open of the section
    const [options, usage] = await Promise.all([p.modelOptions[harness], modelUsage(p.root)]);
    return { ...options, usage };
  },
  'models:preview': async (_event, projectId, change) => {
    const p = project(projectId);
    const options = await harnessModelOptions(p, change?.harness);
    const [shown, estimate] = await Promise.all([
      previewModelChange(p.root, change, options.models),
      modelEstimate(p.root, change).catch((err) => {
        console.warn('Kostnadsuppskattningen misslyckades:', err.message);
        return null;
      })
    ]);
    return { ...shown, estimate };
  },
  'models:apply': async (_event, projectId, change) => {
    const p = project(projectId);
    const options = await harnessModelOptions(p, change?.harness);
    const result = await applyModelChange(p.root, change, options.models);
    if (result.ok) {
      p.models = null;
      p.modelOptions = null;
      sendConfigChanged(projectId, p);
    }
    return result;
  },
  'models:check': async (_event, projectId, harness) => {
    const p = project(projectId);
    checkHarness(harness, await p.harnesses);
    return checkDrift(p.root, harness);
  },
  // The app updater (EPIC-04 US-0407). The renderer names no URL, file or version to download: main keeps the
  // offered release itself, and only its own repository's assets are fetched (NFR3).
  'update:check': async (_event, options) => updater.check({ force: options?.force === true }),
  'update:download': async () => updater.download(),
  'update:install': async () => updater.install(),
  'update:relaunch': async () => updater.relaunch(),
  'update:skip': async (_event, version) => updater.skip(version),
  'update:reveal': async () => {
    const file = updater.downloadedFile();
    if (!file) throw new Error(t('update.notDownloaded'));
    shell.showItemInFolder(file);
  },
  'project:file': async (_event, projectId, rel) => readText(project(projectId).root, rel),
  // Editing files (EPIC-10 US-1001): a relative path, content and the hash it was opened with; never a root.
  'file:read': async (_event, projectId, rel) => readForEdit(project(projectId).root, rel),
  'file:write': async (_event, projectId, rel, content, expect) =>
    writeFileSafe(project(projectId).root, rel, content, { expectMtime: expect?.mtimeMs, expectHash: expect?.hash }),
  'file:watch': async (_event, projectId, rels) => watchEditorFiles(projectId, Array.isArray(rels) ? rels.map(String) : []),
  'project:listTree': async (_event, projectId) => listTree(project(projectId).root),
  // The renderer's answer to app:confirmClose: true closes (or quits), false keeps the window.
  'app:closeConfirmed': async (event, ok) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (ok !== true || !win) {
      quitting = false;
      return;
    }
    closeAllowed.add(win);
    if (quitting) app.quit();
    else win.close();
  },
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
  'git:remoteChanges': async (_event, projectId, ref, space) => getRemoteChanges(project(projectId).root, String(ref), { space: String(space ?? 'default') }),
  'git:showRemote': async (_event, projectId, ref, rel) => showRemoteFile(project(projectId).root, String(ref), String(rel)),
  'git:conflicts': async (_event, projectId) => listConflicts(project(projectId).root),
  // Team collaboration (US-1201). Platform failures come back as values, so the views keep working (AC-1); nothing here
  // fetches except team:refresh, and nothing merges or pushes (AC-2).
  'team:platform': async (_event, projectId) => platformOf(project(projectId)),
  'team:pulls': async (_event, projectId) => pullsOf(project(projectId)),
  'team:refresh': async (_event, projectId) => fetchRemote(project(projectId).root),
  'team:collisions': async (_event, projectId) => teamCollisions(project(projectId)),
  'team:machines': async (_event, projectId, space) => teamMachines(project(projectId), space),
  'team:comments': async (_event, projectId, space, dirName) => teamComments(project(projectId), String(space), String(dirName)),
  // AC-2: the intent's test-results.md and the "Efter merge med main" section for the editor; the person saves it there.
  'team:mergeNote': async (_event, projectId, space, dirName) => {
    const p = project(projectId);
    assertName(space, 'space');
    assertName(dirName, 'intent');
    const rel = `${intentsDir(space)}/${dirName}/construction/build-and-test/test-results.md`;
    await resolveInRoot(p.root, rel).catch(() => {
      throw new Error(t('team.errors.noTestResults', { rel: 'construction/build-and-test/test-results.md' }));
    });
    return { rel, section: t('team.collision.mergeTemplate') };
  },
  // AC-1: the renderer sends the credentials in and only ever learns whether they are set.
  'credentials:bitbucket': async (_event, request) => {
    const action = request?.action;
    if (action === 'save') await saveBitbucket({ username: request.username, appPassword: request.appPassword });
    else if (action === 'clear') await clearBitbucket();
    else if (action !== 'status') throw new Error(t('errors.invalidValue', { what: 'action', value: String(action) }));
    return { set: await hasBitbucket() };
  },
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
  'settings:get': async () => {
    const settings = await getSettings();
    setToolPaths(settings.toolPaths); // every tool start from here on uses a chosen path (US-0405 FR2.4)
    return settings;
  },
  // A changed language applies at once: later dialogs and notifications, and the rebuilt menu (EPIC-07 FR4.4).
  'settings:set': async (event, partial) => {
    const next = await setSettings(partial);
    setToolPaths(next.toolPaths);
    const before = currentLanguage();
    if (setLanguageFromSettings(next) !== before) applyMenu(BrowserWindow.fromWebContents(event.sender));
    return next;
  },
  // The three tools with their path, source and version (US-0405 FR2.1); getTools never rejects.
  'tools:info': async () => getTools(),
  // US-0504 FR1, FR3: the program check from start-up, run again when `force` is set (the button).
  'aidlc:updateStatus': async (_event, force) => ({ ...(await startAidlcCheck({ force: force === true })), command: programCommand() }),
  // US-0504 FR2, FR5: a dry run per installed harness; one that fails comes back with its reason, never rejects the rest.
  'aidlc:projectPlans': async (_event, projectId) => {
    const p = project(projectId);
    const installed = (await Promise.resolve(p.harnesses).catch(() => [])).filter((d) => d.installed && setupHarness(d.id));
    return Promise.all(
      installed.map(async ({ id, label }) => {
        try {
          return { harness: id, label, command: projectCommand(id), ...(await projectPlan(p.root, id)) };
        } catch (err) {
          return { harness: id, label, command: projectCommand(id), error: checkError(err) };
        }
      })
    );
  },
  // The native file dialog for one tool; the renderer names only a table id (FR2.2, C1).
  'tools:pick': async (event, id) => {
    if (!TOOL_IDS.includes(id)) throw new Error(t('errors.unknownTool', { id: String(id) }));
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: t('settings.tools.pickTitle'),
      properties: ['openFile']
    });
    return res.canceled ? null : (res.filePaths[0] ?? null);
  },
  // Checked before anything is stored: a failed check throws, so the earlier path stays (FR2.3).
  'tools:save': async (_event, id, file) => {
    const checked = await validateTool(id, file);
    const current = await getSettings();
    const next = await setSettings({ toolPaths: { ...current.toolPaths, [id]: file } });
    setToolPaths(next.toolPaths);
    return { id, path: file, ...checked };
  },
  'tools:reset': async (_event, id) => {
    if (!TOOL_IDS.includes(id)) throw new Error(t('errors.unknownTool', { id: String(id) }));
    const toolPaths = { ...(await getSettings()).toolPaths };
    delete toolPaths[id]; // gone: the tool is found automatically again (FR2.2)
    const next = await setSettings({ toolPaths });
    setToolPaths(next.toolPaths);
    return next.toolPaths ?? {};
  },
  // The folder "Öppna projekt…" starts in (US-0405 FR4.1); picking it saves it.
  'settings:pickDefaultFolder': async (event) => {
    const { defaultProjectFolder } = await getSettings();
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: t('settings.defaultFolder.pickTitle'),
      properties: ['openDirectory'],
      ...(defaultProjectFolder ? { defaultPath: defaultProjectFolder } : {})
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const next = await setSettings({ defaultProjectFolder: res.filePaths[0] });
    return next.defaultProjectFolder ?? null;
  },
  'settings:clearDefaultFolder': async () => {
    const next = await setSettings({ defaultProjectFolder: null }); // invalid: sanitize leaves the key out
    return next.defaultProjectFolder ?? null;
  },
  // The Om section (US-0405 FR5.1): the app version and the AI-DLC row Verktyg already shows.
  'app:info': async () => {
    const aidlcRow = (await getTools()).find((row) => row.id === 'aidlc') ?? null;
    return { version: app.getVersion(), aidlc: aidlcRow };
  },
  // A fixed https address from the table above; anything else is refused before the browser opens (NFR1).
  'app:openExternal': async (_event, key) => {
    if (typeof key !== 'string' || !Object.hasOwn(EXTERNAL_URLS, key)) {
      throw new Error(t('errors.unknownExternal', { key: String(key) }));
    }
    await shell.openExternal(EXTERNAL_URLS[key]);
  },
  // US-1101 FR6.2: the licence list the build ships (scripts/third-party-licenses.mjs) in the OS text viewer.
  // A fixed path, no input; returns '' or openPath's own error text, which About shows.
  'app:openLicenses': async () =>
    shell.openPath(
      app.isPackaged ? path.join(process.resourcesPath, 'THIRD_PARTY_LICENSES.txt') : path.join(app.getAppPath(), 'build/THIRD_PARTY_LICENSES.txt')
    ),
  // The language in effect (auto already resolved); the renderer switches to it (FR4.4).
  'i18n:language': async () => currentLanguage(),
  // Feature docs (EPIC-06). The root is always looked up here; the renderer never names one.
  'features:load': async (_event, projectId) => {
    const p = project(projectId);
    const [features, tags] = await Promise.all([loadFeatures(p.root, (await getProjectSettings(p.root)).featuresPath), listReleaseTags(p.root)]);
    return { ...features, tags }; // the vX.Y.Z tags for the release picker and the Releases view (US-0603 FR2.1, FR3.2)
  },
  // A story's release marker (US-0603 FR2.2, FR2.3): named fields only; main finds the files from the overview.
  'features:setRelease': async (_event, projectId, req) => {
    const p = project(projectId);
    const res = await setStoryRelease(p.root, (await getProjectSettings(p.root)).featuresPath, {
      storyId: req?.storyId,
      version: req?.version ?? null,
      epicHash: req?.epicHash,
      overviewHash: req?.overviewHash
    });
    if (res.ok) sendFeaturesChanged(projectId, p); // the view reloads with the new hashes at once
    return res;
  },
  // A release plan file in docs/releases/ (US-0605 FR1.3, FR4): a version and a read hash only, checked against the tags.
  'features:createRelease': async (_event, projectId, version) => {
    const p = project(projectId);
    const res = await createRelease(p.root, (await getProjectSettings(p.root)).featuresPath, version, await listReleaseTags(p.root));
    sendFeaturesChanged(projectId, p); // FR2.2: the new release shows at once
    return res;
  },
  'features:deleteRelease': async (_event, projectId, req) => {
    const p = project(projectId);
    const res = await deleteRelease(
      p.root,
      (await getProjectSettings(p.root)).featuresPath,
      { version: req?.version, hash: req?.hash },
      await listReleaseTags(p.root)
    );
    if (res.ok) sendFeaturesChanged(projectId, p);
    return res;
  },
  // The lifecycle rule in the space's memory, for the saved delivery setting (US-0603 FR5.2, FR5.3).
  'features:ruleStatus': async (_event, projectId, space) => {
    const p = project(projectId);
    return readRuleStatus(p.root, String(space), (await getProjectSettings(p.root)).delivery ?? DELIVERY_DEFAULT);
  },
  'features:storyLinks': async (_event, projectId, space) => {
    const p = project(projectId);
    if (!space) return {};
    const { intents } = await loadIntentList(p.root, String(space), []); // cached list
    return loadStoryLinks(
      p.root,
      String(space),
      intents.filter((i) => !i.missingOnDisk).map((i) => i.dirName)
    );
  },
  'projectSettings:get': async (_event, projectId) => getProjectSettings(project(projectId).root),
  'projectSettings:set': async (_event, projectId, partial) => {
    const p = project(projectId);
    const next = await setProjectSettings(p.root, {
      featureDocs: partial?.featureDocs,
      featuresPath: partial?.featuresPath,
      harness: partial?.harness,
      harnessTabs: partial?.harnessTabs, // the agent tabs side by side (US-0803)
      delivery: partial?.delivery // Releases or Continuous deployment (US-0603 FR1.1)
    });
    await syncFeaturesWatch(projectId);
    sendFeaturesChanged(projectId, p); // the open view reloads with the new setting
    return next;
  },
  // `harness` is only an id; pty.js refuses any id outside the fixed table (US-0801 NFR4).
  // The saved tool paths come along, so both tabs start the chosen binary (US-0405 FR2.4).
  // An agent tab with current hooks also gets its channel session (US-0506 u1 RD5); agentIpc decides.
  'pty:spawn': async (event, { projectId, kind, harness, cols, rows }) => {
    const { toolPaths } = await getSettings();
    const p = project(projectId);
    const root = p.root;
    if (kind === 'agent' && !p.agentTabs.has(harness)) {
      p.agentTabs.add(harness); // BR7.15: a harness with an agent tab in this run is used
      installer?.refresh(projectId).catch((err) => console.error('[agent-hooks] status failed:', err.code ?? err.message));
    }
    return agentWiring().spawn({ projectId, root, kind, harness }, (extra) =>
      spawnSession({ projectId, root, kind, harness, cols, rows, toolPaths, sender: event.sender, ...extra })
    );
  },
  // US-0506 u3 BR6.6, SD10: the person's input moves the tab's open reply on, in the same call, before it is written.
  'pty:write': async (_event, id, data) => {
    agent?.terminalInput(id, data);
    return writeSession(id, data);
  },
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
  const { handlers: agentHandlers, listeners } = agentWiring();
  for (const [channel, listener] of Object.entries(listeners)) ipcMain.on(channel, listener); // timing only (OD1)
  for (const [channel, handler] of Object.entries({ ...handlers, ...agentHandlers, ...hooksHandlers(installer) })) {
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
  await agent?.shutdown(); // every channel session closes before the ptys are killed (US-0506 RD5)
  killAllSessions();
  await Promise.all([...projects.values()].map(closeWatcher));
  projects.clear();
}
