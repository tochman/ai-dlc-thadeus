// IPC surface for the renderer. Every handler validates its projectId and routes
// file paths through projectAccess, so nothing outside an opened root is reachable.
import { BrowserWindow, app, dialog, ipcMain, net, shell } from 'electron';
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
  loadAuditEvents,
  loadCost,
  loadCrossMachineCost,
  loadVelocity,
  loadIntentDetail,
  loadIntentList,
  loadHandoffInputs,
  loadPendingQuestions,
  loadWorkingAgents
} from './projectService.js';
import os from 'node:os';
import { readTranscriptContext } from './contextSize.js';
import { loadTokenHistory } from './tokenHistory.js';
import { HANDOFF_DEFAULTS, createHandoffController } from './sessionHandoff.js';
import { loadAgentProgress, loadSpeckitProgress } from './agentProgress.js';
import { notifyEvent, notifyQuestions } from './notify.js';
import { agentName, summarizeLedger } from './parsers/ledger.js';
import { getConfiguredModels } from './models.js';
import { loadRates } from './modelRates.js';
import { readReadings, readingOf, recordReading } from './tokenReadings.js';
import { USAGE_DIR, snapshotOf, writeSnapshot } from './usageSnapshot.js';
import { CONFIG_WATCH_PATHS, checkHarness, getAidlcConfig } from './aidlcConfig.js';
import { applyPlanEdit, deletePlan, listPlans, planStages, previewPlanEdit, savePlan } from './plans.js';
import { apply as applyConfigChange, applyGuardLock, preview as previewConfigChange, previewGuardLock } from './aidlcWrite.js';
import { applyCostRules, costRulesStatus, previewCostRules } from './costRules.js';
import { applyModelChange, checkDrift, estimateCost, ledgerRows, modelOptions, previewModelChange, pricesFromLedger } from './modelChoice.js';
import { createProfileTracker, runProfile, savedProfileNames } from './modelProfiles.js';
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
  showRemoteFile,
  storyMarkerHistory
} from './git.js';
import { detectPlatform } from './platforms/detect.js';
import { listComments, listPulls, listReviews } from './platforms/index.js';
import { clearBitbucket, hasBitbucket, loadBitbucket, saveBitbucket } from './credentials.js';
import { collisions, loadMachines, loadOpenQuestions, matchPull, possibleCollisions, storyComments } from './teamActivity.js';
import { readRuleStatus } from './releases.js';
import { createScheduler, noteAppWrite, planAction, reapplyLost, recordContent, recordTree, resolvePlanning, runCycle, waitingList } from './planningSync.js';
import { addThadeus } from './planningRecord.js';
import { syncCycle, watchThadeus } from './thadeusSync.js';
import { storyIdsIn } from './parsers/features.js';
import { runFixed } from './exec.js';
import { park, readParkStatus, unpark, withParkStatus } from './intentPark.js';
import { NAMES_PATH, setIntentName } from './intentNames.js';
import { DELIVERY_DEFAULT } from './parsers/releases.js';
import { getSetupInfo, runSetup } from './setup.js';
import { getSpeckitSetupInfo, runSpeckitSetup } from './speckitSetup.js';
import { chooseFramework, frameworkScan } from './frameworkChoice.js';
import { detectHarnesses } from './harness.js';
import { TOOL_IDS, getTools, setToolPaths, validateTool } from './tools.js';
import { checkProgram, errorText as checkError, programCommand, projectCommand, projectPlan } from './aidlcUpdate.js';
import { setupHarness } from '../shared/harnesses.js';
import { PLANNING_BRANCH_DEFAULT, PLANNING_PUSH_DEFAULT, getProjectSettings, getSettings, setProjectSettings, setSettings, settingsNow } from './settings.js';
import { watchFiles, watchForAidlc, watchIntents, watchOpenFiles } from './watcher.js';
import { listTree, readForEdit, writeFileSafe } from './fileWrite.js';
import { featureWatchPaths, loadFeatures, loadPlanningFeatures, loadStoryLinks } from './features.js';
import { SPECKIT_WATCH_PATHS, loadSpeckitFeatures } from './speckitFeatures.js';
import { loadSpeckitRules } from './speckitRules.js'; // US-1404
import { switchFramework, switchPreview, switchTarget } from './frameworkSwitch.js'; // US-1407
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
import { APP_REPO_URL } from '../shared/appName.js';

// US-0213 FR1.1, US-0215 FR2.1: Claude Code transcripts are read only under this folder.
const CLAUDE_PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const OPEN_IN_EDITOR_EXT = new Set(['.md', '.json', '.txt', '.yaml', '.yml']);
// The Om section's links, by a fixed key: the renderer never names a URL (NFR1, US-0405 FR5.1).
const REPO_URL = APP_REPO_URL; // US-0027
const EXTERNAL_URLS = {
  repo: REPO_URL,
  features: `${REPO_URL}/tree/main/docs/features`,
  docs: AIDLC_DOCS_URL
};
// projectId -> { root, framework, space, watcher, setupWatcher, speckitWatcher, featuresWatcher, featuresKey, configWatcher, sender,
//   models, setupInfo, harnesses, modelOptions, guardLock }
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

/**
 * US-0211 FR1, NFR2: the current rate table for `project:cost`, loaded once per call (cached in modelRates.js until a
 * file changes). Null when it cannot be loaded, so the recorded figures still show.
 */
async function costRates(root) {
  try {
    return await loadRates(root, { ratesPath: (await getProjectSettings(root)).ratesPath ?? '' });
  } catch (err) {
    console.error('Kunde inte läsa pristabellen:', err.message);
    return null;
  }
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
  const k = p.speckitWatcher;
  const th = p.thadeusWatcher;
  p.thadeusWatcher = null;
  p.watcher = null;
  p.setupWatcher = null;
  p.speckitWatcher = null;
  p.featuresWatcher = null;
  p.featuresKey = null;
  p.configWatcher = null;
  p.editorWatcher = null;
  p.headWatcher = null;
  // US-0506 u4 SCD31: the hooks watcher, previews and isCurrent keys go with the project.
  await Promise.all([w?.close(), s?.close(), f?.close(), c?.close(), e?.close(), h?.close(), k?.close(), th?.close(), installer?.closeProject(p.id)]);
}

/**
 * US-1402 BR6.7: a Spec Kit project's specs/** and its feature and version files, pushed as `speckit:changed` (C5).
 * The paths never change, so a new feature folder is seen without a restart. A failure only stops live updates.
 */
function watchSpeckit(projectId) {
  const p = project(projectId);
  if (p.speckitWatcher) return;
  try {
    p.speckitWatcher = watchFiles({
      root: p.root,
      paths: SPECKIT_WATCH_PATHS,
      onChange: (paths) => {
        if (!p.sender.isDestroyed()) p.sender.send('speckit:changed', { projectId, paths });
      },
      onError: (err) => console.error(`Bevakning av Spec Kit-filerna misslyckades för ${p.root}:`, err)
    });
  } catch (err) {
    console.error(`Bevakning av Spec Kit-filerna kunde inte startas för ${p.root}:`, err);
  }
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
        recordSeen(projectId); // US-0608 FR2.1: a write from a terminal session is recorded as soon as it is seen
        syncFeaturesWatch(projectId); // a new epic folder in the overview is picked up
      },
      onError: (err) => console.error(`Bevakning av feature-dokument misslyckades för ${p.root}:`, err)
    });
  } catch (err) {
    console.error(`Bevakning av feature-dokument kunde inte startas för ${p.root}:`, err);
  }
}

/**
 * A folder with no framework is watched until a space or `.specify/` appears, then it is detected again (FR4.6).
 * US-1401 BR1.9: it acts when the framework changed, and only an AI-DLC project gets the space watcher.
 */
function watchForSetup(projectId) {
  const p = project(projectId);
  p.setupWatcher = watchForAidlc({
    root: p.root,
    onFound: async () => {
      try {
        await applyDetection(projectId);
      } catch (err) {
        console.error(`Omdetektering misslyckades för ${p.root}:`, err);
      }
    },
    onError: (err) => console.error(`Bevakning efter AI-DLC misslyckades för ${p.root}:`, err)
  });
}

/**
 * US-1401 BR1.9, US-1406 NFR7.1, US-1407 NFR7.4: the one owner of following a new Detection, for the setup watcher,
 * a saved first-open choice and a switch alike. With no `detection` it detects the project again and does nothing
 * while there is no framework. Only the old framework's watcher closes (and a setup watcher); the hooks, head,
 * config, editor and `.thadeus` watchers stay. The push goes out before this returns.
 */
async function applyDetection(projectId, detection = null) {
  const p = project(projectId);
  detection ??= await detectProject(p.root);
  if (detection.framework === null || !projects.has(projectId)) return;
  const setup = p.setupWatcher;
  p.setupWatcher = null;
  await setup?.close();
  p.framework = detection.framework;
  if (detection.framework === 'aidlc') {
    const kit = p.speckitWatcher;
    p.speckitWatcher = null;
    await kit?.close();
    await watchSpace(projectId, detection.activeSpace);
  } else if (detection.framework === 'speckit') {
    const intents = p.watcher;
    p.watcher = null;
    p.space = null;
    p.questions = null; // the old intents' questions leave the popup
    await intents?.close();
    watchSpeckit(projectId);
  }
  if (!p.sender.isDestroyed()) p.sender.send('project:detected', { projectId, detection });
}

/** US-1407 BR8.1, BR8.5, BR8.6: one switch; `to` is checked against the framework the project is on now. */
async function switchOnce(projectId, to) {
  const p = project(projectId);
  switchTarget(p.framework, to);
  const res = await switchFramework(p.root, to);
  if (res.ok && res.detection) await applyDetection(projectId, res.detection);
  return res;
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
    handoff?.refreshBoundary(projectId).catch((err) => console.warn('[handoff] boundary failed:', err.message)); // US-0213 FR2.2
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
let handoff = null; // US-0213
let agentStore = null;

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
    record: (root, entry) => addThadeus(app.getPath('userData'), root, entry), // US-0609 FR3.3: the install ends in a commit
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
  agentStore = store;
  // US-0506 u5 D5, PD50: one notification decision per accepted event, in the store's own turn.
  store.onAdded((ev) => {
    const p = projects.get(ev.projectId);
    const win = p && !p.sender.isDestroyed() ? BrowserWindow.fromWebContents(p.sender) : null;
    notifyEvent(ev, { settings: settingsNow(), win, activeProjectId, projectName: p ? path.basename(p.root) : '', timing });
  });
  agent = createAgentIpc({ channel, store, timing, hooksCurrent, senders: () => new Set([...projects.values()].map((p) => p.sender)) });
  // US-0213: the session handoff. Transcripts are read only under ~/.claude/projects (FR1.1); nothing is written in the
  // project, only compact.txt in the app's own session folder (NFR1).
  handoff = createHandoffController({
    store,
    readContext: (file) => readTranscriptContext(file, CLAUDE_PROJECTS),
    ratesOf: async (projectId) => (await costRates(project(projectId).root))?.rates ?? {},
    settingsOf: async (projectId) => ({ ...HANDOFF_DEFAULTS, ...(await getProjectSettings(project(projectId).root)).handoff }),
    inputsOf: async (projectId) => {
      const p = projects.get(projectId);
      return p?.space ? loadHandoffInputs(p.root, p.space) : [];
    },
    writeInstruction: (sessionId, text) => channel.writeInstruction(sessionId, text)
  });
  store.onSignal((note) => handoff.onSignal(note));
  // US-0214 FR2.3: the activity rows of a project, pushed to every window within 2 s of a change.
  store.onActivity((change) => {
    for (const p of projects.values()) if (!p.sender.isDestroyed()) p.sender.send('agent:activity', change);
  });
  return agent;
}

/** US-0213 NFR4: the handoff page's calls; the renderer names an event id and one fixed choice only. */
const HANDOFF_CHOICES = new Set(['compact', 'fresh', 'clear', 'clearResume']);
const handoffId = (id) => {
  if (typeof id !== 'string' || !id || id.length > 64) throw new Error(t('agentDialog.errors.unknownEvent'));
  return id;
};
const handoffChoice = (c) => {
  if (!HANDOFF_CHOICES.has(c)) throw new Error(t('errors.invalidValue', { what: 'choice', value: String(c) }));
  return c;
};
const handoffHandlers = {
  'handoff:commands': async (_event, id, choice) => handoff?.commandsFor(handoffId(id), handoffChoice(choice)) ?? null,
  'handoff:park': async (_event, id) => handoff?.park(handoffId(id)) ?? null, // US-0039 FR2.1, FR2.2
  'handoff:idle': async (_event, id) => handoff?.idle(handoffId(id)) ?? false,
  'handoff:waitReady': async (_event, id) => handoff?.waitReady(handoffId(id)) ?? false,
  'handoff:waiting': async (_event, id, on) => agentStore?.setHandoff(handoffId(id), on === true ? 'waiting' : 'shown'),
  'handoff:sent': async (_event, id, choice) => handoff?.sent(handoffId(id), handoffChoice(choice))
};

// Model profile switch (US-0210). Per project a tracker over the intent list; the intents open when the space is
// first watched are its baseline and never ask (FR2.4). The renderer shows the question and answers with its harness.

/** US-0210 FR2.1, FR3.1: on an intents.json change, asks for the critical profile or for the switch back. */
async function checkProfiles(projectId) {
  const p = projects.get(projectId);
  if (!p?.profileTracker) return;
  const tracker = p.profileTracker;
  try {
    await p.profileBaseline;
    const [intents, { modelProfiles }] = await Promise.all([spaceIntents(p), getProjectSettings(p.root)]);
    if (p.profileTracker !== tracker || !modelProfiles) return; // switched space meanwhile, or nothing set up
    const next = tracker.update(intents, modelProfiles);
    if (!next || p.sender.isDestroyed()) return;
    // A switch back without "Ask before switching back" is still answered by the renderer, which holds the harness (FR5.1).
    const ask = next.ask
      ? { kind: 'critical', intent: next.ask.dirName, confirm: true }
      : { kind: 'back', intent: null, confirm: modelProfiles.askBeforeBack === true };
    p.sender.send('modelProfile:ask', { projectId, ...ask });
  } catch (err) {
    console.error(`Modellprofilen kunde inte kontrolleras för ${p.root}:`, err);
  }
}

/**
 * US-0510 FR4.1: reads `aidlc engine status` for the active intent, keeps it with its read time for project:intents,
 * and tells the renderer to reload the list (the active intent may have changed too). Never throws.
 */
async function refreshParkStatus(projectId) {
  const p = projects.get(projectId);
  if (!p) return;
  p.parkStatus = await readParkStatus(p.root);
  if (projects.get(projectId) === p) sendListChanged(projectId, p);
}

/** Tells the renderer to reload the intent list (US-0510 FR4.1, US-0508 FR1.7). */
function sendListChanged(projectId, p) {
  if (!p.sender.isDestroyed()) p.sender.send('project:changed', { projectId, space: p.space, dirNames: [], indexChanged: true, costChanged: false });
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
  const tracker = createProfileTracker(); // US-0210 FR2.4: a new space starts a new baseline too
  p.profileTracker = tracker;
  p.profileBaseline = spaceIntents(p)
    .then((intents) => tracker.baseline(intents))
    .catch((err) => console.error(`Modellprofilens utgångsläge kunde inte läsas för ${p.root}:`, err));
  p.watcher = watchIntents({
    intentsDir: path.join(p.root, intentsDir(space)),
    ledgerFile: path.join(p.root, LEDGER_PATH),
    usageDir: path.join(p.root, USAGE_DIR), // other machines' cost snapshots, pulled with git (US-0209 FR5.1)
    worktreesDir: path.join(p.root, '.aidlc', 'worktrees'), // Unit plans written in a build's worktree (US-0507 FR5.1)
    onChange: (change) => {
      p.intentChangedAt = Date.now(); // an AI-DLC write: the planning push waits while work runs (US-0607 FR3.1)
      if (!p.sender.isDestroyed()) p.sender.send('project:changed', { projectId, space, ...change });
      if (change.dirNames.length || change.indexChanged) refreshQuestions(projectId, change.dirNames);
      if (change.indexChanged) checkProfiles(projectId); // US-0210: not awaited, like the questions
    },
    onError: (err) => {
      console.error(`Filbevakning misslyckades för ${p.root}:`, err);
      if (!p.sender.isDestroyed()) p.sender.send('project:watchError', { projectId, message: err.message });
    }
  });
}

// Release planning sync (US-0606, US-0607). One scheduler for the app; a minute tick runs each open project's cycle
// when it is due (FR3.1). Paths and branches come from main's own settings, never from the renderer.
const PLANNING_TICK_MS = 60 * 1000;
const WORKING_MS = 5 * 60 * 1000;
let planningTimer = null;

/** US-0607 NFR3: gh through runFixed (no shell), the chosen gh path when one is saved (US-0410 FR4.2). */
const runGh = (args, { cwd }) => runFixed(settingsNow().toolPaths?.gh ?? 'gh', args, { cwd, timeout: 30000 });

/** No release list (hidden docs or continuous deployment), so no planning sync either. */
const planningOff = (settings) => settings.featureDocs === 'hide' || settings.delivery === 'continuous';

/** US-0608 FR3.1: the story ids the active intent's description names; [] when there is none or it cannot be read. */
async function intentStoryIds(p) {
  const intent = await activeIntent(p);
  if (!intent?.dirName) return [];
  try {
    return storyIdsIn(await readText(p.root, `aidlc/spaces/${p.space}/intents/${intent.dirName}/project-description.json`));
  } catch (err) {
    console.warn(`Intentens beskrivning kunde inte läsas för ${p.root}:`, err.message);
    return [];
  }
}

async function planningCtx(projectId) {
  const p = project(projectId);
  const settings = await getProjectSettings(p.root);
  return {
    root: p.root,
    userData: app.getPath('userData'),
    featuresPath: settings.featuresPath,
    planningBranch: settings.planningBranch ?? PLANNING_BRANCH_DEFAULT,
    ownStoryIds: await intentStoryIds(p),
    gh: runGh,
    online: () => net.isOnline(),
    // US-0608 FR6.1: the grouped commit was made; the list hears of it and an idle app pushes it.
    onCommitted: async (res) => {
      sendFeaturesChanged(projectId, p);
      await sendPlanningChanged(projectId, res);
      planning.kick(projectId);
    }
  };
}

/** US-0608 FR7.2: the release list's waiting list, sent after every cycle and change; never throws. */
async function sendPlanningChanged(projectId, result) {
  try {
    const p = project(projectId);
    const status = await planningStatus(projectId, result);
    if (!p.sender.isDestroyed()) p.sender.send('features:planningChanged', { projectId, status });
    return status;
  } catch (err) {
    console.warn('Planeringens lista kunde inte skickas:', err.message);
    return null;
  }
}

/** US-0608 FR2.1, FR3: records (and on a story branch splits) what the docs watcher saw; never throws. */
async function recordSeen(projectId) {
  try {
    const p = projects.get(projectId);
    if (!p || planningOff(await getProjectSettings(p.root))) return;
    const res = await recordTree(await planningCtx(projectId));
    if (res?.recorded) await sendPlanningChanged(projectId, null);
  } catch (err) {
    console.warn('Planeringsändringen kunde inte registreras:', err.message);
  }
}

/**
 * US-0607 FR3.1: busy while a question waits or an AI-DLC file changed in the last 5 minutes.
 * ponytail: "an agent is running" is read from AI-DLC writes, as the renderer's workflowBusy does without a terminal; a
 * busy agent tab that writes nothing for 5 minutes counts as idle. Ask the renderer if that ever pushes too early.
 */
const appBusy = () => allQuestions().length > 0 || [...projects.values()].some((p) => p.intentChangedAt && Date.now() - p.intentChangedAt < WORKING_MS);

const planning = createScheduler({
  run: async (projectId, opts) => {
    const p = project(projectId);
    if (planningOff(await getProjectSettings(p.root))) return {}; // no release list here
    let res;
    try {
      // US-0608 FR7.1: Push now commits what waits at once, without the 30-second window.
      res = await runCycle({ ...(await planningCtx(projectId)), ...(opts?.force ? { windowMs: 0 } : {}) });
    } catch (err) {
      res = { error: { kind: 'git', reason: err.message } };
    }
    if (res.reapplied || res.pushed || res.moved) sendFeaturesChanged(projectId, p); // US-0036 FR2.2: a fetch moved the read ref
    await sendPlanningChanged(projectId, res); // FR7.2: after every cycle, a failed one too
    return res;
  },
  idle: () => net.isOnline() && !appBusy(),
  intervalMs: () => (settingsNow().planningPushMinutes ?? PLANNING_PUSH_DEFAULT) * 60 * 1000
});

// US-0609 FR3.1: the app's own files (`.thadeus/`, the harness hook files) get their own scheduler, with planning's
// push interval and idle rule; the cycle shares planning's record and per-project chain.
const thadeusCtx = async (projectId) => {
  const p = project(projectId);
  const settings = await getProjectSettings(p.root);
  const userData = app.getPath('userData');
  return { root: p.root, userData, planningBranch: settings.planningBranch ?? PLANNING_BRANCH_DEFAULT, gh: runGh, online: () => net.isOnline() };
};

const thadeusSyncer = createScheduler({
  run: async (projectId) => {
    const res = await syncCycle(await thadeusCtx(projectId));
    await sendPlanningChanged(projectId, null); // FR3.8: the waiting list shows what is left
    return res;
  },
  idle: () => net.isOnline() && !appBusy(),
  intervalMs: () => (settingsNow().planningPushMinutes ?? PLANNING_PUSH_DEFAULT) * 60 * 1000
});

/** US-0609 FR3.1, FR3.2: each changed app file waits in the record; an idle app syncs at once. Never throws. */
function watchThadeusFiles(projectId) {
  const p = project(projectId);
  try {
    p.thadeusWatcher = watchThadeus(p.root, async (files) => {
      if (files.some((f) => f.file === NAMES_PATH)) sendListChanged(projectId, p); // US-0508 FR1.7: a rename here or pulled in
      try {
        for (const entry of files) await addThadeus(app.getPath('userData'), p.root, entry);
        await sendPlanningChanged(projectId, null);
        thadeusSyncer.kick(projectId);
      } catch (err) {
        console.warn('.thadeus-ändringen kunde inte registreras:', err.message);
      }
    });
  } catch (err) {
    console.error(`Bevakning av .thadeus kunde inte startas för ${p.root}:`, err);
  }
}

/**
 * US-0607 FR4.1, US-0608 FR7.1: the release list's block: each change waiting with its stories, the target, and the
 * outcome of `result` (else the last cycle).
 */
async function planningStatus(projectId, result = null) {
  const { target, entries } = await waitingList(await planningCtx(projectId));
  const last = planning.status(projectId) ?? {};
  return {
    pending: entries.length,
    reapplied: result?.reapplied ?? last.reapplied ?? 0,
    noRemote: (result?.noRemote ?? last.noRemote) === true,
    prOffer: result?.prOffer ?? last.prOffer ?? null,
    error: result?.error ?? last.error ?? null,
    target,
    entries
  };
}

/** A planning action from the release list: recorded and applied; the commit follows the window, then the push. */
async function planningAction(projectId, action, hashes) {
  const p = project(projectId);
  const res = await planAction(await planningCtx(projectId), action, hashes);
  if (!res.conflict) sendFeaturesChanged(projectId, p); // the view reloads with the new hashes at once
  await sendPlanningChanged(projectId, null); // a refused action waits in the record too (US-0608 FR1.3)
  planning.kick(projectId); // not awaited: an idle app pushes right away (FR3.1)
  return res;
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
    projects.set(projectId, {
      id: projectId,
      root,
      framework: detection.framework,
      space: null,
      watcher: null,
      setupWatcher: null,
      sender: event.sender,
      harnesses,
      agentTabs: new Set()
    });
    // US-1401 BR1.9: the space watcher for AI-DLC, the setup watcher for no framework; US-1402 BR6.7: Spec Kit's files.
    if (detection.framework === 'aidlc') {
      await watchSpace(projectId, detection.activeSpace);
      refreshParkStatus(projectId); // US-0510 FR4.1: not awaited; opening never waits on AI-DLC
    } else if (detection.framework === 'speckit') watchSpeckit(projectId);
    else if (detection.framework === null) watchForSetup(projectId);
    syncFeaturesWatch(projectId); // not awaited: opening a project never waits on the feature docs
    watchConfig(projectId);
    watchGitHead(projectId);
    watchThadeusFiles(projectId); // US-0609 FR3.1
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
    return withParkStatus(await loadIntentList(p.root, space, Array.isArray(onlyDirs) ? onlyDirs.map(String) : undefined), p.parkStatus);
  },
  'project:intent': async (_event, projectId, space, dirName) => loadIntentDetail(project(projectId).root, space, dirName),
  // US-0510 FR4.2, FR4.3: park the active intent, or unpark one (switching to it first); the list reloads on project:changed.
  'intents:park': async (_event, projectId) => {
    const p = project(projectId);
    const res = await park(p.root);
    await refreshParkStatus(projectId);
    return res;
  },
  'intents:unpark': async (_event, projectId, dirName) => {
    const p = project(projectId);
    const { intents } = await loadIntentList(p.root, p.space, []);
    const known = intents.filter((i) => !i.missingOnDisk).map((i) => i.dirName);
    const res = await unpark(p.root, dirName, { activeDirName: intents.find((i) => i.active)?.dirName ?? null, known });
    await refreshParkStatus(projectId);
    return res;
  },
  // US-0508 FR1.3, FR1.5: an intent's display name, checked against the space's list; allowed while its work runs.
  'intents:rename': async (_event, projectId, dirName, name) => {
    const p = project(projectId);
    const { intents } = await loadIntentList(p.root, p.space, []);
    const res = await setIntentName(p.root, String(dirName), name, { intents });
    if (res.ok) sendListChanged(projectId, p);
    return res;
  },
  // US-0303 FR3.5: the project's velocity from the cached intent list, the feature docs, the release tags and the epic
  // files' git history (the folder of the first epic file; none without epic files).
  'project:velocity': async (_event, projectId, space) => {
    const p = project(projectId);
    const { intents } = await loadIntentList(p.root, space, []);
    const features = await loadFeatures(p.root, (await getProjectSettings(p.root)).featuresPath);
    const epicFile = features.available ? features.epics.find((e) => e.file)?.file : null;
    const featuresDir = epicFile ? path.posix.dirname(epicFile) : null;
    const [tags, history] = await Promise.all([listReleaseTags(p.root), featuresDir ? storyMarkerHistory(p.root, featuresDir) : null]);
    return loadVelocity(p.root, space, intents, features, { tags, history, featuresDir });
  },
  'project:cost': async (_event, projectId, space) => {
    const p = project(projectId);
    const cost = await loadCost(p.root);
    const { intents } = await loadIntentList(p.root, space, []); // cached list; only new folders are read
    const { ledger = null, ...rest } = cost;
    const rates = await costRates(p.root);
    // US-0209: every machine's cost (ledger, audit shard rows, snapshots); a fresh clone without a ledger still has one (FR1.4).
    const { summary, local } = await loadCrossMachineCost(p.root, space, intents, ledger, rates?.rates ?? null);
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
    const shown = rates ? { sources: rates.sources, notes: rates.notes, asOf: rates.asOf } : null;
    return { ...kept, available: true, ...summary, rates: shown };
  },
  // The stored readings of one intent (US-0208 FR2.1); readReadings checks the dir name before it becomes a path.
  // US-0215 FR6: with a space, `{source, readings, wallMs, gap}`; a finished intent without readings is rebuilt from its
  // transcripts (read only under ~/.claude/projects). A live or unknown intent keeps its recorded readings only.
  'tokens:readings': async (_event, projectId, dirName, space) => {
    const p = project(projectId);
    if (space == null) return readReadings(p.root, dirName); // the older caller: a bare array
    const intent = (await loadIntentList(p.root, space, [])).intents.find((i) => i.dirName === dirName); // a real intent folder, never a typed path
    if (!intent || intent.status === 'in-flight') return { source: 'recorded', readings: await readReadings(p.root, dirName), wallMs: null, gap: null };
    try {
      const [cost, events] = await Promise.all([loadCost(p.root), loadAuditEvents(p.root, `${intentsDir(space)}/${dirName}`)]);
      return await loadTokenHistory({ root: p.root, dirName, uuid: intent.uuid, ledger: cost.ledger ?? null, events, projectsDir: CLAUDE_PROJECTS });
    } catch (err) {
      console.error(`Kunde inte bygga tokenhistorik för ${dirName}:`, err.message); // NFR1: the view keeps the ledger figures
      return { source: 'none', readings: [], wallMs: null, gap: null };
    }
  },
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
  // US-1410 BR10.1, NFR3.2: a Spec Kit project (any dir name ignored), or a call with no dir name, gets contract C9 from
  // the hook events and the active feature; it builds no path from the renderer's input and never throws for the parts.
  'agents:progress': async (_event, projectId, dirName) => {
    const p = project(projectId);
    if (p.framework !== 'speckit' && typeof dirName === 'string') return loadAgentProgress(p.root, p.space, dirName);
    return loadSpeckitProgress(p.root, agentStore?.list(projectId) ?? []);
  },
  // US-0214 FR2: the project's activity rows now (main chats and their agents), from the hook events; read-only.
  'agentActivity:list': async (_event, projectId) => {
    project(projectId); // an unknown project is refused
    return agentStore?.activity(projectId) ?? [];
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
  // The cost rule pack (US-0212). The renderer sends only {on, lines}; the diffs are kept here, and apply writes
  // exactly those, only if every file is still as shown (FR5.2).
  'costRules:status': async (_event, projectId) => costRulesStatus(project(projectId).root),
  'costRules:preview': async (_event, projectId, choice) => {
    const p = project(projectId);
    const { changes, errors, warnings } = await previewCostRules(p.root, { on: choice?.on === true, lines: choice?.lines });
    p.costRules = changes;
    return { changes: changes.map(({ space, file, diff }) => ({ space, file, diff })), errors, warnings };
  },
  'costRules:apply': async (_event, projectId) => {
    const p = project(projectId);
    if (!p.costRules) throw new Error(t('errors.previewFirst'));
    const changes = p.costRules;
    p.costRules = null;
    const result = await applyCostRules(p.root, changes);
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
  // US-0210 FR1.2, FR1.3: the saved AI-DLC profile names, the agents and the model table for the profile pickers.
  'modelProfile:saved': async (_event, projectId, harness) => {
    const p = project(projectId);
    checkHarness(harness, await p.harnesses);
    const options = await modelOptions(p.root, harness);
    return {
      editable: options.editable,
      ...(options.reason ? { reason: options.reason } : {}),
      names: savedProfileNames(options.savedProfiles),
      models: options.models,
      agents: (options.configured ?? []).map((c) => c.agent)
    };
  },
  // US-0210 FR2.2, FR3.1, FR4, FR5: the answer to a modelProfile:ask, with the agent tab's harness. `active` is saved
  // only when every command ran (FR4.3); a harness without a model table runs nothing and gives its reason (FR5.2).
  'modelProfile:answer': async (_event, projectId, kind, yes, harness) => {
    const p = project(projectId);
    if (kind !== 'critical' && kind !== 'back') throw new Error(t('errors.invalidValue', { what: 'modelProfile', value: String(kind) }));
    if (yes !== true) {
      p.profileTracker?.answered(kind, false);
      return { ok: true, results: [], skipped: true };
    }
    let options;
    try {
      options = await harnessModelOptions(p, harness);
    } catch (err) {
      p.profileTracker?.answered(kind, false);
      return { ok: false, results: [], error: err.message };
    }
    const target = kind === 'critical' ? 'critical' : 'economy';
    const { modelProfiles } = await getProjectSettings(p.root);
    const res = await runProfile(p.root, modelProfiles?.[target] ?? { models: {} }, harness, options.models);
    p.profileTracker?.answered(kind, res.ok);
    if (!res.ok) return res;
    await setProjectSettings(p.root, { modelProfiles: { active: target } });
    p.models = null;
    p.modelOptions = null;
    sendConfigChanged(projectId, p);
    sendFeaturesChanged(projectId, p); // the project settings reload, so the section shows the new active profile (FR4.1)
    return { ...res, active: target };
  },
  // The app updater (EPIC-04 US-0407). The renderer names no URL, file or version to download: main keeps the
  // offered release itself, and only its own repository's assets are fetched (NFR3).
  'update:check': async (_event, options) => updater.check({ force: options?.force === true }),
  'update:download': async () => updater.download(),
  // US-0034: the password for sudo, only when the notice asked for it; anything but a string is dropped.
  'update:install': async (_event, options) => updater.install(typeof options?.password === 'string' ? { password: options.password } : {}),
  'update:relaunch': async () => updater.relaunch(),
  'update:skip': async (_event, version) => updater.skip(version),
  'update:reveal': async () => {
    const file = updater.downloadedFile();
    if (!file) throw new Error(t('update.notDownloaded'));
    shell.showItemInFolder(file);
  },
  'project:file': async (_event, projectId, rel) => readText(project(projectId).root, rel),
  // Editing files (EPIC-10 US-1001): a relative path, content and the hash it was opened with; never a root.
  // US-1402 NFR3.2: the project's framework decides whether Spec Kit's files open read-only.
  'file:read': async (_event, projectId, rel) => {
    const p = project(projectId);
    return readForEdit(p.root, rel, { framework: p.framework });
  },
  // US-1402 FR6 (contract C5): read-only, so it needs no framework check.
  'speckit:features': async (_event, projectId) => loadSpeckitFeatures(project(projectId).root),
  // US-1404 FR7 (contract C6): read-only; offered only where the section is, in a Spec Kit project (BR7.9).
  'speckit:rules': async (_event, projectId) => {
    const p = project(projectId);
    if (p.framework !== 'speckit') throw new Error(t('errors.notSpeckitProject'));
    return loadSpeckitRules(p.root);
  },
  // US-0608 FR2.2, AC1.2.1: a feature doc is in the planning record before it is written; the watcher records it too, should this fail.
  'file:write': async (_event, projectId, rel, content, expect) => {
    const p = project(projectId);
    try {
      if (!planningOff(await getProjectSettings(p.root))) await recordContent(await planningCtx(projectId), rel, content, { expectHash: expect?.hash });
    } catch (err) {
      console.warn(`Sparningen av ${rel} kunde inte registreras i planeringen:`, err.message);
    }
    const res = await writeFileSafe(p.root, rel, content, { expectMtime: expect?.mtimeMs, expectHash: expect?.hash, framework: p.framework });
    if (res?.ok && res.hash) noteAppWrite(p.root, rel, expect?.hash ?? null, res.hash); // D2: not recorded again as seen
    return res;
  },
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
  // Spec Kit setup (US-1405 FR3, C3): speckit:setup only runs after a preview for the same harness, kept per
  // project; after success the setup watcher sees `.specify/` and detects the project again (BR3.8).
  'speckit:setupPreview': async (_event, projectId, harness) => {
    const p = project(projectId);
    p.speckitSetupInfo = await getSpeckitSetupInfo(p.root, { harness: harness ?? null });
    return p.speckitSetupInfo;
  },
  'speckit:setup': async (_event, projectId, harness) => {
    const p = project(projectId);
    const result = await runSpeckitSetup(p.root, { harness }, p.speckitSetupInfo);
    if (result.ok) p.harnesses = detectHarnesses(p.root);
    return result;
  },
  // US-1407 (C10): a project id and `to` cross the bridge, never a path (NFR3.6). The preview only reads.
  'project:switchPreview': async (_event, projectId, to) => {
    const p = project(projectId);
    return switchPreview(p.root, p.framework, to);
  },
  // NFR7.5: serialised per project, so an overlapping call waits and then meets BR8.1 with no second write.
  'project:switch': async (_event, projectId, to) => {
    const p = project(projectId);
    const run = (p.switching ?? Promise.resolve()).then(() => switchOnce(projectId, to));
    p.switching = run.catch(() => {});
    return run;
  },
  // US-1406 FR4 (C4, NFR3.3): the first-open choice. The renderer sends a project id, never a path; extra arguments are
  // ignored. A written choice switches the project before the call returns (NFR7.1).
  'project:frameworkScan': async (_event, projectId) => frameworkScan(project(projectId).root),
  'project:chooseFramework': async (_event, projectId, framework) => {
    const result = await chooseFramework(project(projectId).root, framework);
    if (result.file) await applyDetection(projectId);
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
    const settings = await getProjectSettings(p.root);
    // US-0036 FR2.1: with the planning sync on, a story branch shows the target's planning; without it the checkout's.
    const load = planningOff(settings) ? loadFeatures(p.root, settings.featuresPath) : planningCtx(projectId).then(loadPlanningFeatures);
    const [features, tags] = await Promise.all([load, listReleaseTags(p.root)]);
    return { ...features, tags }; // the vX.Y.Z tags for the release picker and the Releases view (US-0603 FR2.1, FR3.2)
  },
  // A story's release marker (US-0603 FR2.2, FR2.3): named fields only; main finds the files from the overview.
  // US-0607 FR1.1, US-0606 FR2: each planning action is recorded first, then committed in place or in a worktree.
  'features:setRelease': async (_event, projectId, req) =>
    planningAction(
      projectId,
      { kind: 'setRelease', storyIds: [req?.storyId], version: req?.version ?? null },
      { epicHash: req?.epicHash, overviewHash: req?.overviewHash }
    ),
  // A release plan file in docs/releases/ (US-0605 FR1.3, FR4): a version and a read hash only, checked against the tags.
  'features:createRelease': async (_event, projectId, version) => planningAction(projectId, { kind: 'createRelease', storyIds: [], version }, null),
  'features:deleteRelease': async (_event, projectId, req) =>
    planningAction(projectId, { kind: 'deleteRelease', storyIds: [], version: req?.version }, { hash: req?.hash }),
  // US-0607 FR4.1, FR1.3: what waits to be pushed; `opened` (the release list just opened) applies lost actions again.
  'features:planningStatus': async (_event, projectId, opened) => {
    const p = project(projectId);
    const reapply = opened === true ? await reapplyLost(await planningCtx(projectId)) : null;
    if (reapply?.reapplied) sendFeaturesChanged(projectId, p);
    return planningStatus(projectId, reapply);
  },
  // US-0607 FR4.1: "Push now", whether or not the app is idle.
  'features:pushPlanning': async (_event, projectId) => {
    project(projectId);
    await planning.pushNow(projectId);
    return planningStatus(projectId);
  },
  // US-0608 FR5.3: "Use mine" or "Keep theirs" for a conflicting change; an id and a fixed word, checked in planningSync.
  'features:resolvePlanning': async (_event, projectId, id, choice) => {
    const p = project(projectId);
    await resolvePlanning(await planningCtx(projectId), String(id), String(choice));
    sendFeaturesChanged(projectId, p);
    const status = await sendPlanningChanged(projectId, null);
    planning.kick(projectId);
    return status;
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
      delivery: partial?.delivery, // Releases or Continuous deployment (US-0603 FR1.1)
      modelProfiles: partial?.modelProfiles, // US-0210 FR1.5
      planningBranch: partial?.planningBranch, // the docs branch for a protected main (US-0607 FR3.3)
      ratesPath: partial?.ratesPath, // the project's rate table (US-0211 FR1.2)
      handoff: partial?.handoff // the session handoff (US-0213 FR6.1), checked in settings.js
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
    const { handoff: h } = await getProjectSettings(root); // US-0213 FR6.3: off unless turned on
    const autoCompactWindow = h?.autoCompactWindow ? h.threshold : undefined;
    if (kind === 'agent' && !p.agentTabs.has(harness)) {
      p.agentTabs.add(harness); // BR7.15: a harness with an agent tab in this run is used
      installer?.refresh(projectId).catch((err) => console.error('[agent-hooks] status failed:', err.code ?? err.message));
    }
    return agentWiring().spawn({ projectId, root, kind, harness }, (extra) =>
      spawnSession({ projectId, root, kind, harness, cols, rows, toolPaths, sender: event.sender, autoCompactWindow, ...extra })
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
  // US-0607 FR3.1, FR1.3: the first tick runs every open project (never run is due), which also applies lost actions.
  planningTimer = setInterval(() => {
    planning.tick([...projects.keys()]);
    thadeusSyncer.tick([...projects.keys()]); // US-0609 FR3.1
  }, PLANNING_TICK_MS);
  planningTimer.unref?.();
  const { handlers: agentHandlers, listeners } = agentWiring();
  for (const [channel, listener] of Object.entries(listeners)) ipcMain.on(channel, listener); // timing only (OD1)
  for (const [channel, handler] of Object.entries({ ...handlers, ...agentHandlers, ...hooksHandlers(installer), ...handoffHandlers })) {
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
  clearInterval(planningTimer);
  await agent?.shutdown(); // every channel session closes before the ptys are killed (US-0506 RD5)
  killAllSessions();
  await Promise.all([...projects.values()].map(closeWatcher));
  projects.clear();
}
