// Characterisation tests of the IPC surface (US-0506 Step 3a, K17): today's behaviour of each handler, with
// electron, node-pty and every service ipc.js wires mocked. Later steps extend the mocks, never the behaviour pinned here.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '../../src/shared/i18n.js';

const m = vi.hoisted(() => {
  const handlers = new Map();
  const win = { setFullScreen: vi.fn(), isFullScreen: vi.fn(() => false), close: vi.fn() };
  const watcher = () => ({ close: vi.fn(async () => {}) });
  return {
    handlers,
    win,
    watcher,
    electron: {
      ipcMain: { handle: vi.fn((ch, fn) => handlers.set(ch, fn)), on: vi.fn() },
      BrowserWindow: { fromWebContents: vi.fn(() => win), getAllWindows: vi.fn(() => []) },
      // userData is only read; no channel folder is made while no project's hooks are current (US-0506 u4 C5).
      app: { getVersion: vi.fn(() => '9.9.9'), quit: vi.fn(), getPath: vi.fn(() => '/nonexistent/thadeus-ipc-test') },
      dialog: { showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: ['/picked'] })) },
      shell: { showItemInFolder: vi.fn(), openPath: vi.fn(async () => ''), openExternal: vi.fn(async () => {}) },
      net: { isOnline: vi.fn(() => true) }
    },
    updater: {
      check: vi.fn(async () => ({ status: 'none' })),
      download: vi.fn(async () => 'dl'),
      install: vi.fn(async () => 'inst'),
      relaunch: vi.fn(async () => 'rel'),
      skip: vi.fn(async (v) => `skip ${v}`),
      downloadedFile: vi.fn(() => null)
    },
    svc: {
      openRoot: vi.fn(async (dir) => dir),
      readText: vi.fn(async () => 'text'),
      resolveInRoot: vi.fn(async (root, rel) => `${root}/${rel}`),
      detectProject: vi.fn(async () => ({ framework: 'aidlc', isAidlc: true, activeSpace: 'default' })),
      intentsDir: vi.fn((space) => `aidlc/spaces/${space}/intents`),
      listSpaces: vi.fn(async () => ['default']),
      loadCost: vi.fn(async () => ({ available: false })),
      loadIntentDetail: vi.fn(async () => ({ detail: true })),
      loadIntentList: vi.fn(async () => ({ intents: [] })),
      setIntentName: vi.fn(async () => ({ ok: true, name: 'tidy-up' })), // US-0508
      watchThadeus: vi.fn(() => ({ close: vi.fn(async () => {}) })), // US-0508: the .thadeus watcher's callback is driven by hand
      // US-0209: the merged summary; null when there is no ledger and no cost row.
      loadCrossMachineCost: vi.fn(async (_root, _space, _intents, ledger) => ({
        summary: ledger ? { project: { total: { usd: 3 } }, perIntent: {} } : null,
        local: { host: 'hosta', cloneId: 'aaaaaaaaaaaa' }
      })),
      loadVelocity: vi.fn(async () => ({ velocity: true })), // US-0303
      // US-0211: the current rate table with its sources and notes.
      loadRates: vi.fn(async () => ({ rates: { 'opus-5-5': { input: 1 } }, sources: { 'opus-5-5': 'app' }, notes: [], asOf: '2026-11-17' })),
      storyMarkerHistory: vi.fn(async () => null),
      snapshotOf: vi.fn((ledger, clone) => ({ schemaVersion: 1, ...clone, intents: {} })),
      writeSnapshot: vi.fn(async () => true),
      loadPendingQuestions: vi.fn(async () => []),
      loadWorkingAgents: vi.fn(async () => []),
      notifyQuestions: vi.fn(),
      notifyEvent: vi.fn(),
      settingsNow: vi.fn(() => ({ replyAlerts: 'line' })),
      agentName: vi.fn((n) => n),
      summarizeLedger: vi.fn(() => ({ project: { total: { usd: 3 }, byAgent: [{ name: 'dev', usd: 2 }], agentModels: {}, byModel: [] }, perIntent: [] })),
      getConfiguredModels: vi.fn(async () => ({ models: [] })),
      checkHarness: vi.fn((h) => {
        if (h !== 'claude') throw new Error(`bad harness ${h}`);
      }),
      getAidlcConfig: vi.fn(async () => ({ config: 1 })),
      applyPlanEdit: vi.fn(async () => ({ ok: true })),
      deletePlan: vi.fn(async () => ({ ok: true })),
      listPlans: vi.fn(async () => []),
      planStages: vi.fn(async () => ['s']),
      previewPlanEdit: vi.fn(async () => ({ before: 'b', file: 'f', diff: 'd' })),
      savePlan: vi.fn(async () => ({ ok: true })),
      applyConfigChange: vi.fn(async () => ({ ok: true })),
      applyGuardLock: vi.fn(async () => ({ ok: true })),
      previewConfigChange: vi.fn(async () => ({ diff: 'd' })),
      previewGuardLock: vi.fn(async () => ({ before: 'b', file: 'f', diff: 'd' })),
      costRulesStatus: vi.fn(async () => ({ spaces: [], on: false, lines: {} })),
      previewCostRules: vi.fn(async () => ({ changes: [{ space: 's', file: 'f', before: 'b', next: 'n', diff: 'd' }], errors: [], warnings: [] })),
      applyCostRules: vi.fn(async () => ({ ok: true, files: ['f'], output: 'o' })),
      applyModelChange: vi.fn(async () => ({ ok: true })),
      checkDrift: vi.fn(async () => ({ drift: false })),
      estimateCost: vi.fn(() => ({ usd: 1 })),
      ledgerRows: vi.fn(() => []),
      modelOptions: vi.fn(async () => ({ editable: true, models: ['m'] })),
      previewModelChange: vi.fn(async () => ({ diff: 'd' })),
      pricesFromLedger: vi.fn(() => ({})),
      runProfile: vi.fn(async () => ({ ok: true, results: [{ ok: true, command: 'aidlc config models --from strong', output: 'done' }] })),
      fetchRemote: vi.fn(async () => 'fetched'),
      getGitStatus: vi.fn(async () => 'status'),
      getRemoteChanges: vi.fn(async () => 'changes'),
      listConflicts: vi.fn(async () => []),
      listReleaseTags: vi.fn(async () => []),
      showRemoteFile: vi.fn(async () => 'remote'),
      setStoryRelease: vi.fn(async () => ({ ok: true })),
      planAction: vi.fn(async () => ({ ok: true, inPlace: true })),
      runCycle: vi.fn(async () => ({ reapplied: 0, pending: 0, pushed: true })),
      reapplyLost: vi.fn(async () => ({ reapplied: 0 })),
      // US-0608: the record's other ways in, and the waiting list.
      recordContent: vi.fn(async () => null),
      recordTree: vi.fn(async () => ({ recorded: 0 })),
      resolvePlanning: vi.fn(async () => ({ ok: true })),
      noteAppWrite: vi.fn(),
      waitingList: vi.fn(async () => ({ target: 'origin/main', entries: [] })),
      readRuleStatus: vi.fn(async () => 'current'),
      getSetupInfo: vi.fn(async () => ({ info: 1 })),
      runSetup: vi.fn(async () => ({ ok: true })),
      getSpeckitSetupInfo: vi.fn(async (root, { harness }) => ({ root, harness })),
      runSpeckitSetup: vi.fn(async () => ({ ok: true, output: 'ok' })),
      frameworkScan: vi.fn(async () => ({ proposal: null })), // US-1406
      chooseFramework: vi.fn(async () => ({ ok: true, file: null, next: 'setupAidlc' })),
      detectHarnesses: vi.fn(async () => [{ id: 'claude', installed: true }]),
      getTools: vi.fn(async () => [{ id: 'aidlc', path: '/bin/aidlc' }]),
      setToolPaths: vi.fn(),
      validateTool: vi.fn(async () => ({ version: '1' })),
      getProjectSettings: vi.fn(async () => ({ featureDocs: 'show', featuresPath: 'docs/FEATURES.md' })),
      getSettings: vi.fn(async () => ({ toolPaths: {} })),
      setProjectSettings: vi.fn(async (_root, p) => p),
      setSettings: vi.fn(async (p) => ({ toolPaths: {}, ...p })),
      watchFiles: vi.fn(() => watcher()),
      watchForAidlc: vi.fn(() => watcher()),
      watchIntents: vi.fn(() => watcher()),
      watchOpenFiles: vi.fn(() => watcher()),
      listTree: vi.fn(async () => ['a']),
      readForEdit: vi.fn(async () => ({ content: 'c' })),
      writeFileSafe: vi.fn(async () => ({ ok: true })),
      featureWatchPaths: vi.fn(() => ['docs/FEATURES.md']),
      loadSpeckitFeatures: vi.fn(async () => ({ version: { found: '1.4.3', supported: true }, features: [], active: null, errors: [] })),
      // US-1411: the archive marks, and main's own check of the feature.
      listedFeatures: vi.fn(async () => ({ dirs: ['001-a', '002-b'], active: '001-a' })),
      addMark: vi.fn(async () => {}),
      removeMark: vi.fn(async () => {}),
      loadSpeckitRules: vi.fn(async () => ({
        constitution: { path: '.specify/memory/constitution.md', exists: false },
        extensions: [],
        skipped: 0,
        hooksChecked: true,
        errors: []
      })),
      loadFeatures: vi.fn(async () => ({ epics: [] })),
      loadStoryLinks: vi.fn(async () => ({})),
      loadDelivered: vi.fn(async () => ({ stories: {}, hand: {} })), // US-1303
      setHandLink: vi.fn(async () => ({})),
      killAllSessions: vi.fn(),
      killProjectSessions: vi.fn(),
      killSession: vi.fn(),
      resizeSession: vi.fn(),
      spawnSession: vi.fn(async () => 'pty-1'),
      agentCommandFound: vi.fn(async () => true),
      writeSession: vi.fn(),
      applyMenu: vi.fn(),
      parseMenuState: vi.fn((raw) => (raw && typeof raw === 'object' ? raw : null)),
      setMenuState: vi.fn(),
      currentLanguage: vi.fn(() => 'sv'),
      setLanguageFromSettings: vi.fn(() => 'sv'),
      // US-1201: git's new read-only calls, the platforms, the Bitbucket credentials and the shard reads.
      originUrl: vi.fn(async () => 'git@github.com:tochman/ai-dlc-thadeus.git'),
      behindCount: vi.fn(async () => 3),
      changedFiles: vi.fn(async () => ['src/a.js']),
      predictConflicts: vi.fn(async () => ['src/a.js']),
      remoteStoryBranches: vi.fn(async () => [{ branch: 'origin/feat/US-0209', story: 'US-0209', ahead: 2 }]),
      listPulls: vi.fn(async () => [
        { number: 58, title: 'feat(US-0209): cost', branch: 'feat/US-0209', author: 'a', url: 'u58', files: ['src/a.js'] },
        { number: 59, title: 'US-1201', branch: 'feat/US-1201', author: 'b', url: 'u59', files: ['src/a.js', 'src/b.js'] }
      ]),
      listComments: vi.fn(async () => [{ author: 'anna', body: 'Nice', time: '2026-11-16T10:00:00Z', url: null }]),
      listReviews: vi.fn(async () => []),
      listMergedPulls: vi.fn(async () => []), // US-1304
      listReleases: vi.fn(async () => []),
      saveBitbucket: vi.fn(async () => {}),
      clearBitbucket: vi.fn(async () => {}),
      hasBitbucket: vi.fn(async () => true),
      loadBitbucket: vi.fn(async () => ({ username: 'u', appPassword: 'p' })),
      loadMachines: vi.fn(async (_root, _space, intents) => intents.map((i) => ({ ...i, machines: [{ host: 'mac', cloneId: 'a' }] }))),
      loadOpenQuestions: vi.fn(async () => [{ text: 'Q2. Open?', file: 'q.md', time: null }]),
      loadAuditEvents: vi.fn(async () => []),
      inflightCount: vi.fn(async () => 0),
      writeProjectFile: vi.fn(async () => ({ ok: true, file: '.thadeus/project.json', replaced: false })), // US-1407: U2's write
      // US-0513: the archive run and its commit, each tested on its own.
      archiveIntents: vi.fn(async () => ({ ok: true, archived: [], refused: [], files: [] })),
      unarchiveIntent: vi.fn(async () => ({ ok: true, files: ['f'] })),
      beforeArchive: vi.fn(async () => ({ branch: 'main', dirtyIndex: false })),
      commitArchive: vi.fn(async () => ({ state: 'waiting' })),
      hasAgentSession: vi.fn(() => false)
    }
  };
});
const platformError = (code) => Object.assign(new Error(`GitHub: ${code}`), { name: 'PlatformError', code, platform: 'GitHub' });

vi.mock('electron', () => m.electron);
vi.mock('node-pty', () => ({ spawn: vi.fn() }));
vi.mock('../../src/main/projectAccess.js', () => ({
  openRoot: m.svc.openRoot,
  readText: m.svc.readText,
  resolveInRoot: m.svc.resolveInRoot,
  readJsonSafe: async () => ({ ok: false, missing: true }) // US-0513: no stored token readings
}));
vi.mock('../../src/main/projectService.js', () => ({
  INFLIGHT_PATH: 'aidlc/.aidlc-subagent-inflight',
  LEDGER_PATH: 'aidlc/ledger.jsonl',
  detectProject: m.svc.detectProject,
  intentsDir: m.svc.intentsDir,
  listSpaces: m.svc.listSpaces,
  loadCost: m.svc.loadCost,
  loadIntentDetail: m.svc.loadIntentDetail,
  loadIntentList: m.svc.loadIntentList,
  loadCrossMachineCost: m.svc.loadCrossMachineCost,
  loadVelocity: m.svc.loadVelocity,
  loadPendingQuestions: m.svc.loadPendingQuestions,
  loadWorkingAgents: m.svc.loadWorkingAgents,
  loadAuditEvents: m.svc.loadAuditEvents, // US-1410: agents:progress's AI-DLC path
  inflightCount: m.svc.inflightCount,
  workingAgents: () => [],
  assertName: (name, what) => {
    if (typeof name !== 'string' || !/^[^/\\]+$/.test(name) || name.startsWith('.')) throw new Error(`Ogiltigt ${what}: ${name}`);
  },
  inProgress: (i) => i.status !== 'complete'
}));
vi.mock('../../src/main/platforms/index.js', () => ({
  listPulls: m.svc.listPulls,
  listComments: m.svc.listComments,
  listReviews: m.svc.listReviews,
  listMergedPulls: m.svc.listMergedPulls,
  listReleases: m.svc.listReleases
}));
vi.mock('../../src/main/credentials.js', () => ({
  saveBitbucket: m.svc.saveBitbucket,
  clearBitbucket: m.svc.clearBitbucket,
  hasBitbucket: m.svc.hasBitbucket,
  loadBitbucket: m.svc.loadBitbucket
}));
vi.mock('../../src/main/teamActivity.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadMachines: m.svc.loadMachines,
  loadOpenQuestions: m.svc.loadOpenQuestions
}));
vi.mock('../../src/main/usageSnapshot.js', () => ({ USAGE_DIR: '.thadeus/usage', snapshotOf: m.svc.snapshotOf, writeSnapshot: m.svc.writeSnapshot }));
vi.mock('../../src/main/notify.js', () => ({ notifyQuestions: m.svc.notifyQuestions, notifyEvent: m.svc.notifyEvent }));
vi.mock('../../src/main/parsers/ledger.js', () => ({ agentName: m.svc.agentName, summarizeLedger: m.svc.summarizeLedger }));
vi.mock('../../src/main/models.js', () => ({ getConfiguredModels: m.svc.getConfiguredModels }));
vi.mock('../../src/main/modelRates.js', () => ({ loadRates: m.svc.loadRates }));
vi.mock('../../src/main/aidlcConfig.js', () => ({
  CONFIG_WATCH_PATHS: ['aidlc.settings.json'],
  checkHarness: m.svc.checkHarness,
  getAidlcConfig: m.svc.getAidlcConfig
}));
vi.mock('../../src/main/plans.js', () => ({
  applyPlanEdit: m.svc.applyPlanEdit,
  deletePlan: m.svc.deletePlan,
  listPlans: m.svc.listPlans,
  planStages: m.svc.planStages,
  previewPlanEdit: m.svc.previewPlanEdit,
  savePlan: m.svc.savePlan
}));
vi.mock('../../src/main/aidlcWrite.js', () => ({
  apply: m.svc.applyConfigChange,
  applyGuardLock: m.svc.applyGuardLock,
  preview: m.svc.previewConfigChange,
  previewGuardLock: m.svc.previewGuardLock
}));
vi.mock('../../src/main/costRules.js', () => ({
  applyCostRules: m.svc.applyCostRules,
  costRulesStatus: m.svc.costRulesStatus,
  previewCostRules: m.svc.previewCostRules
}));
vi.mock('../../src/main/modelChoice.js', () => ({
  PROFILE_NAME: /^[a-z0-9][a-z0-9-]*$/,
  applyModelChange: m.svc.applyModelChange,
  checkDrift: m.svc.checkDrift,
  estimateCost: m.svc.estimateCost,
  ledgerRows: m.svc.ledgerRows,
  modelOptions: m.svc.modelOptions,
  previewModelChange: m.svc.previewModelChange,
  pricesFromLedger: m.svc.pricesFromLedger
}));
// US-0210: the real tracker and names; only running a profile is faked.
vi.mock('../../src/main/modelProfiles.js', async (importOriginal) => ({ ...(await importOriginal()), runProfile: m.svc.runProfile }));
vi.mock('../../src/main/updater.js', () => ({ createUpdater: () => m.updater }));
vi.mock('../../src/main/git.js', () => ({
  fetchRemote: m.svc.fetchRemote,
  getGitStatus: m.svc.getGitStatus,
  getRemoteChanges: m.svc.getRemoteChanges,
  listConflicts: m.svc.listConflicts,
  listReleaseTags: m.svc.listReleaseTags,
  showRemoteFile: m.svc.showRemoteFile,
  originUrl: m.svc.originUrl,
  behindCount: m.svc.behindCount,
  changedFiles: m.svc.changedFiles,
  predictConflicts: m.svc.predictConflicts,
  remoteStoryBranches: m.svc.remoteStoryBranches,
  storyMarkerHistory: m.svc.storyMarkerHistory
}));
vi.mock('../../src/main/setup.js', () => ({ getSetupInfo: m.svc.getSetupInfo, runSetup: m.svc.runSetup }));
vi.mock('../../src/main/speckitSetup.js', () => ({ getSpeckitSetupInfo: m.svc.getSpeckitSetupInfo, runSpeckitSetup: m.svc.runSpeckitSetup }));
vi.mock('../../src/main/frameworkChoice.js', () => ({ frameworkScan: m.svc.frameworkScan, chooseFramework: m.svc.chooseFramework }));
vi.mock('../../src/main/harness.js', () => ({ detectHarnesses: m.svc.detectHarnesses }));
vi.mock('../../src/main/tools.js', () => ({
  TOOL_IDS: ['aidlc', 'claude', 'git'],
  getTools: m.svc.getTools,
  setToolPaths: m.svc.setToolPaths,
  validateTool: m.svc.validateTool
}));
vi.mock('../../src/main/settings.js', () => ({
  PLANNING_BRANCH_DEFAULT: 'docs/planning',
  PLANNING_PUSH_DEFAULT: 10,
  getProjectSettings: m.svc.getProjectSettings,
  getSettings: m.svc.getSettings,
  setProjectSettings: m.svc.setProjectSettings,
  setSettings: m.svc.setSettings,
  settingsNow: m.svc.settingsNow
}));
// US-0506 u5: the real store, with its deps and its onAdded subscribers captured.
vi.mock('../../src/main/agentEvents.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    createAgentEventStore: (deps) => {
      m.storeDeps = deps;
      const store = real.createAgentEventStore(deps);
      m.store = store; // US-0513: its activity rows are faked below
      const onAdded = store.onAdded;
      store.onAdded = (fn) => {
        m.onAdded = fn;
        return onAdded(fn);
      };
      return store;
    }
  };
});
vi.mock('../../src/main/watcher.js', () => ({
  watchFiles: m.svc.watchFiles,
  watchForAidlc: m.svc.watchForAidlc,
  watchIntents: m.svc.watchIntents,
  watchOpenFiles: m.svc.watchOpenFiles
}));
vi.mock('../../src/main/fileWrite.js', () => ({ listTree: m.svc.listTree, readForEdit: m.svc.readForEdit, writeFileSafe: m.svc.writeFileSafe }));
vi.mock('../../src/main/features.js', () => ({
  featureWatchPaths: m.svc.featureWatchPaths,
  loadFeatures: m.svc.loadFeatures,
  // ponytail: US-0036 reads the planning through loadPlanningFeatures; here it is the loadFeatures stub, so the existing checks hold.
  loadPlanningFeatures: (ctx) => m.svc.loadFeatures(ctx.root, ctx.featuresPath),
  loadStoryLinks: m.svc.loadStoryLinks
}));
vi.mock('../../src/main/storyLinks.js', () => ({ loadDelivered: m.svc.loadDelivered, setHandLink: m.svc.setHandLink }));
vi.mock('../../src/main/releases.js', () => ({ setStoryRelease: m.svc.setStoryRelease, readRuleStatus: m.svc.readRuleStatus }));
vi.mock('../../src/main/speckitFeatures.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadSpeckitFeatures: m.svc.loadSpeckitFeatures,
  listedFeatures: m.svc.listedFeatures
}));
vi.mock('../../src/main/speckitArchive.js', async (importOriginal) => ({ ...(await importOriginal()), addMark: m.svc.addMark, removeMark: m.svc.removeMark }));
vi.mock('../../src/main/speckitRules.js', () => ({ loadSpeckitRules: m.svc.loadSpeckitRules }));
vi.mock('../../src/main/projectFile.js', async (importOriginal) => ({ ...(await importOriginal()), writeProjectFile: m.svc.writeProjectFile }));
// US-0606/US-0607: the planning sync runs real git; here only its calls are checked, with the real scheduler.
vi.mock('../../src/main/planningSync.js', async (importOriginal) => ({
  createScheduler: (await importOriginal()).createScheduler,
  planAction: m.svc.planAction,
  reapplyLost: m.svc.reapplyLost,
  runCycle: m.svc.runCycle,
  recordContent: m.svc.recordContent,
  recordTree: m.svc.recordTree,
  resolvePlanning: m.svc.resolvePlanning,
  noteAppWrite: m.svc.noteAppWrite,
  waitingList: m.svc.waitingList
}));
// US-0506 u3: the real agent wiring, with a spy on terminalInput so pty:write's order can be checked.
vi.mock('../../src/main/agentIpc.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    createAgentIpc: (deps) => {
      const wiring = real.createAgentIpc(deps);
      m.agentWiring = wiring;
      wiring.terminalInput = vi.fn(wiring.terminalInput);
      return wiring;
    }
  };
});
vi.mock('../../src/main/intentArchive.js', () => ({ archiveIntents: m.svc.archiveIntents, unarchiveIntent: m.svc.unarchiveIntent }));
vi.mock('../../src/main/archiveCommit.js', () => ({ beforeArchive: m.svc.beforeArchive, commitArchive: m.svc.commitArchive }));
vi.mock('../../src/main/pty.js', () => ({
  agentCommandFound: m.svc.agentCommandFound,
  hasAgentSession: m.svc.hasAgentSession,
  killAllSessions: m.svc.killAllSessions,
  killProjectSessions: m.svc.killProjectSessions,
  killSession: m.svc.killSession,
  resizeSession: m.svc.resizeSession,
  spawnSession: m.svc.spawnSession,
  tapOutput: vi.fn(() => () => {}),
  writeSession: m.svc.writeSession
}));
vi.mock('../../src/main/menu.js', () => ({
  AIDLC_DOCS_URL: 'https://docs.example/aidlc',
  applyMenu: m.svc.applyMenu,
  parseMenuState: m.svc.parseMenuState,
  setMenuState: m.svc.setMenuState
}));
vi.mock('../../src/main/i18n.js', () => ({ currentLanguage: m.svc.currentLanguage, setLanguageFromSettings: m.svc.setLanguageFromSettings }));
vi.mock('../../src/main/intentNames.js', () => ({ NAMES_PATH: '.thadeus/intent-names.json', setIntentName: m.svc.setIntentName }));
vi.mock('../../src/main/thadeusSync.js', async (importOriginal) => ({ ...(await importOriginal()), watchThadeus: m.svc.watchThadeus }));

// US-0804: the real check, so an unknown id meets its real refusal; a test answers for a known one.
vi.mock('../../src/main/signIn.js', async (importOriginal) => {
  m.svc.checkSignIn = vi.fn((await importOriginal()).checkSignIn);
  return { checkSignIn: m.svc.checkSignIn };
});

const ipc = await import('../../src/main/ipc.js');
ipc.registerIpc();

const { svc, electron } = m;
const flush = () => new Promise((r) => setTimeout(r, 0));
const makeSender = () => ({ isDestroyed: vi.fn(() => false), send: vi.fn() });
const call = (channel, ...args) => m.handlers.get(channel)(...args);

/** Opens a project through the real handler and returns its id and sender. */
async function openProject(dir = '/proj', detection = { framework: 'aidlc', isAidlc: true, activeSpace: 'default' }) {
  svc.detectProject.mockResolvedValueOnce(detection);
  const sender = makeSender();
  const event = { sender };
  const res = await call('project:open', event, dir);
  await flush();
  return { ...res, sender, event };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(async () => {
  await ipc.shutdown();
});

describe('registerIpc', () => {
  it('registers every channel once on ipcMain', () => {
    expect(m.handlers.size).toBeGreaterThan(60);
    expect(m.handlers.has('project:open')).toBe(true);
    expect(m.handlers.has('pty:spawn')).toBe(true);
  });

  it('logs a failing handler with its channel and rethrows the error', async () => {
    await expect(call('project:spaces', {}, 'nope')).rejects.toThrow('Okänt projekt: nope');
    expect(console.error).toHaveBeenCalledWith('[ipc] project:spaces misslyckades:', 'Okänt projekt: nope');
  });
});

describe('projects', () => {
  it('opens an AI-DLC project: watches its space, feature docs and config, and returns its id and name', async () => {
    const { projectId, name, root, detection } = await openProject('/work/demo');
    expect(typeof projectId).toBe('string');
    expect(name).toBe('demo');
    expect(root).toBe('/work/demo');
    expect(detection.isAidlc).toBe(true);
    expect(svc.watchIntents).toHaveBeenCalledWith(expect.objectContaining({ intentsDir: '/work/demo/aidlc/spaces/default/intents' }));
    expect(svc.watchFiles).toHaveBeenCalledWith(
      expect.objectContaining({ root: '/work/demo', paths: ['aidlc.settings.json', 'aidlc/.aidlc-subagent-inflight'] })
    );
    expect(svc.watchFiles).toHaveBeenCalledWith(expect.objectContaining({ paths: ['docs/FEATURES.md'] }));
  });

  it('watches a folder without AI-DLC until a space appears, then reports the detection', async () => {
    const { projectId, sender } = await openProject('/work/plain', { framework: null, isAidlc: false });
    const { onFound } = svc.watchForAidlc.mock.calls.at(-1)[0];
    const detection = { framework: 'aidlc', isAidlc: true, activeSpace: 'team' };
    svc.detectProject.mockResolvedValueOnce(detection);
    await onFound();
    expect(sender.send).toHaveBeenCalledWith('project:detected', { projectId, detection });
    expect(svc.watchIntents).toHaveBeenLastCalledWith(expect.objectContaining({ intentsDir: '/work/plain/aidlc/spaces/team/intents' }));
  });

  it('US-1401 BR1.9: opens a Spec Kit project with its Detection and without the AI-DLC watchers (AC1.1.2)', async () => {
    const intentWatches = svc.watchIntents.mock.calls.length;
    const setupWatches = svc.watchForAidlc.mock.calls.length;
    const detection = { framework: 'speckit', isAidlc: false, views: ['specs'], activeSpace: null, spaces: [] };
    const res = await openProject('/work/kit', detection);
    expect(res.detection).toBe(detection); // the open return is the Detection itself (C1)
    expect(svc.watchIntents.mock.calls.length).toBe(intentWatches);
    expect(svc.watchForAidlc.mock.calls.length).toBe(setupWatches);
  });

  it('US-1401 BR1.9: pushes project:detected when .specify/ appears, without watching a space', async () => {
    const { projectId, sender } = await openProject('/work/plain3', { framework: null, isAidlc: false });
    const { onFound } = svc.watchForAidlc.mock.calls.at(-1)[0];
    const intentWatches = svc.watchIntents.mock.calls.length;
    const detection = { framework: 'speckit', isAidlc: false, activeSpace: null, spaces: [] };
    svc.detectProject.mockResolvedValueOnce(detection);
    await onFound();
    expect(sender.send).toHaveBeenCalledWith('project:detected', { projectId, detection });
    expect(svc.watchIntents.mock.calls.length).toBe(intentWatches);
  });

  it('US-1401 BR1.9: keeps watching when the framework did not change', async () => {
    const { sender } = await openProject('/work/plain4', { framework: null, isAidlc: false });
    const { onFound } = svc.watchForAidlc.mock.calls.at(-1)[0];
    svc.detectProject.mockResolvedValueOnce({ framework: null, isAidlc: false });
    await onFound();
    expect(sender.send).not.toHaveBeenCalledWith('project:detected', expect.anything());
  });

  it('logs a failing re-detection and keeps watching', async () => {
    await openProject('/work/plain2', { framework: null, isAidlc: false });
    const { onFound, onError } = svc.watchForAidlc.mock.calls.at(-1)[0];
    svc.detectProject.mockRejectedValueOnce(new Error('boom'));
    await onFound();
    onError(new Error('w'));
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('sends project:changed on an intent change and refreshes questions for changed folders', async () => {
    const { projectId, sender } = await openProject('/work/watch');
    const { onChange, onError } = svc.watchIntents.mock.calls.at(-1)[0];
    onChange({ dirNames: ['261114-x'], indexChanged: false });
    await flush();
    expect(sender.send).toHaveBeenCalledWith('project:changed', { projectId, space: 'default', dirNames: ['261114-x'], indexChanged: false });
    expect(svc.loadPendingQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ root: '/work/watch', projectId }), ['261114-x']);
    onError(new Error('gone'));
    expect(sender.send).toHaveBeenCalledWith('project:watchError', { projectId, message: 'gone' });
  });

  it('closes a project: kills its sessions, pushes the question list and closes its watchers', async () => {
    const { projectId, sender } = await openProject('/work/close');
    await call('project:close', {}, projectId);
    expect(svc.killProjectSessions).toHaveBeenCalledWith(projectId);
    expect(sender.send).toHaveBeenCalledWith('questions:changed', expect.any(Array));
    await expect(call('project:spaces', {}, projectId)).rejects.toThrow(/Okänt projekt/);
    await expect(call('project:close', {}, projectId)).resolves.toBeUndefined();
  });

  it('picks a folder from the saved default, or returns null when cancelled', async () => {
    svc.getSettings.mockResolvedValueOnce({ defaultProjectFolder: '/home' });
    expect(await call('project:pick', { sender: {} })).toBe('/picked');
    expect(electron.dialog.showOpenDialog.mock.calls.at(-1)[1]).toMatchObject({ defaultPath: '/home', properties: ['openDirectory'] });
    electron.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    expect(await call('project:pick', { sender: {} })).toBeNull();
  });

  it('lists spaces, intents (only the named folders) and one intent', async () => {
    const { projectId } = await openProject('/work/list');
    expect(await call('project:spaces', {}, projectId)).toEqual(['default']);
    await call('project:intents', {}, projectId, 'default', ['a', 1]);
    expect(svc.loadIntentList).toHaveBeenLastCalledWith('/work/list', 'default', ['a', '1']);
    await call('project:intents', {}, projectId, 'default', 'x');
    expect(svc.loadIntentList).toHaveBeenLastCalledWith('/work/list', 'default', undefined);
    expect(await call('project:intent', {}, projectId, 'default', 'd')).toEqual({ detail: true });
  });

  it('switching space restarts the intents watcher', async () => {
    const { projectId } = await openProject('/work/space');
    const before = svc.watchIntents.mock.calls.length;
    await call('project:intents', {}, projectId, 'other');
    expect(svc.watchIntents.mock.calls.length).toBe(before + 1);
    expect(svc.watchIntents.mock.calls.at(-1)[0].intentsDir).toBe('/work/space/aidlc/spaces/other/intents');
  });

  it('returns cost unchanged when no ledger exists, and summarised with intents when it does', async () => {
    const { projectId } = await openProject('/work/cost');
    expect(await call('project:cost', {}, projectId, 'default')).toEqual({ available: false });
    svc.loadCost.mockResolvedValueOnce({ available: true, ledger: [1], extra: 'x' });
    const cost = await call('project:cost', {}, projectId, 'default');
    expect(cost).toMatchObject({ available: true, extra: 'x', project: expect.any(Object) });
    expect(cost.ledger).toBeUndefined();
  });

  it('answers available from the audit rows alone when there is no ledger, and writes no snapshot (US-0209 FR1.4)', async () => {
    const { projectId } = await openProject('/work/fresh');
    svc.writeSnapshot.mockClear();
    svc.loadCost.mockResolvedValueOnce({ available: false, reason: 'no ledger' });
    svc.loadCrossMachineCost.mockResolvedValueOnce({ summary: { project: { total: { usd: 2 }, partial: true }, perIntent: {} }, local: null });
    const cost = await call('project:cost', {}, projectId, 'default');
    expect(cost).toEqual({ available: true, project: { total: { usd: 2 }, partial: true }, perIntent: {}, rates: expect.any(Object) });
    expect(svc.writeSnapshot).not.toHaveBeenCalled();
  });

  it("writes this machine's snapshot from the ledger it read, and watches .thadeus/usage/ (US-0209 FR3.1, FR5.1)", async () => {
    const { projectId } = await openProject('/work/snap');
    expect(svc.watchIntents.mock.calls.at(-1)[0].usageDir).toBe('/work/snap/.thadeus/usage');
    const ledger = { workflows: {} };
    svc.loadCost.mockResolvedValueOnce({ available: true, ledger });
    await call('project:cost', {}, projectId, 'default');
    expect(svc.loadCrossMachineCost).toHaveBeenLastCalledWith('/work/snap', 'default', [], ledger, { 'opus-5-5': { input: 1 } });
    expect(svc.snapshotOf).toHaveBeenLastCalledWith(ledger, { host: 'hosta', cloneId: 'aaaaaaaaaaaa' });
    expect(svc.writeSnapshot).toHaveBeenLastCalledWith('/work/snap', expect.objectContaining({ cloneId: 'aaaaaaaaaaaa' }));
  });

  it('loads the rates once per call with the project rates path, and returns their sources and notes (US-0211 FR1.2, FR1.5, FR1.6)', async () => {
    const { projectId } = await openProject('/work/rates');
    svc.loadRates.mockClear();
    svc.getProjectSettings.mockResolvedValueOnce({ featureDocs: 'show', ratesPath: 'rates.json' });
    svc.loadRates.mockResolvedValueOnce({ rates: {}, sources: { 'opus-5-5': 'project' }, notes: [{ kind: 'overrideMissing', path: 'rates.json' }], asOf: 'x' });
    svc.loadCost.mockResolvedValueOnce({ available: true, ledger: { workflows: {} } });
    const cost = await call('project:cost', {}, projectId, 'default');
    expect(svc.loadRates).toHaveBeenCalledTimes(1);
    expect(svc.loadRates).toHaveBeenCalledWith('/work/rates', { ratesPath: 'rates.json' });
    expect(cost.rates).toEqual({ sources: { 'opus-5-5': 'project' }, notes: [{ kind: 'overrideMissing', path: 'rates.json' }], asOf: 'x' });
  });

  it('still answers with the recorded cost when the rates cannot be loaded (US-0211, NFR3 of US-0209)', async () => {
    const { projectId } = await openProject('/work/norates');
    svc.loadRates.mockRejectedValueOnce(new Error('boom'));
    svc.loadCost.mockResolvedValueOnce({ available: true, ledger: { workflows: {} } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cost = await call('project:cost', {}, projectId, 'default');
    expect(cost).toMatchObject({ available: true, project: expect.any(Object) });
    expect(cost.rates).toBeNull();
    expect(svc.loadCrossMachineCost.mock.calls.at(-1)[4]).toBeNull();
  });

  it('caches the configured models and the harness detection per project', async () => {
    const { projectId } = await openProject('/work/models');
    await call('project:models', {}, projectId);
    await call('project:models', {}, projectId);
    expect(svc.getConfiguredModels).toHaveBeenCalledTimes(1);
    expect(await call('harness:detect', {}, projectId)).toEqual([{ id: 'claude', installed: true }]);
  });
});

describe('questions', () => {
  it("lists open projects' questions newest first and marks the ones that waited from the start as early", async () => {
    svc.loadPendingQuestions.mockResolvedValueOnce([{ id: 'q-old', timeMs: 1 }]);
    const { projectId } = await openProject('/work/q');
    svc.loadPendingQuestions.mockResolvedValueOnce([
      { id: 'q-old', timeMs: 1 },
      { id: 'q-new', timeMs: 5 }
    ]);
    svc.getSettings.mockClear();
    const { onChange } = svc.watchIntents.mock.calls.at(-1)[0];
    onChange({ dirNames: [], indexChanged: true });
    await flush();
    await flush();
    const list = (await call('questions:list', {})).filter((q) => q.id.startsWith('q-'));
    expect(list.map((q) => [q.id, q.early])).toEqual([
      ['q-new', false],
      ['q-old', true]
    ]);
    expect(svc.notifyQuestions).toHaveBeenCalledWith([{ id: 'q-new', timeMs: 5 }], expect.objectContaining({ activeProjectId: null }));
    // US-0506 u5 PD51: the settings copy, not an awaited read
    expect(svc.notifyQuestions.mock.calls.at(-1)[1].settings).toEqual({ replyAlerts: 'line' });
    expect(svc.getSettings).not.toHaveBeenCalled();
    await call('project:close', {}, projectId);
  });

  it('logs a failing question computation', async () => {
    svc.loadPendingQuestions.mockRejectedValueOnce(new Error('bad audit'));
    await openProject('/work/qfail');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('/work/qfail'), expect.any(Error));
  });

  it('accepts an open project id or null as the active project, and refuses other types', async () => {
    const { projectId } = await openProject('/work/active');
    await expect(call('questions:activeProject', {}, projectId)).resolves.toBeUndefined();
    await expect(call('questions:activeProject', {}, null)).resolves.toBeUndefined();
    await expect(call('questions:activeProject', {}, 42)).rejects.toThrow();
  });
});

describe('AI-DLC configuration and plans', () => {
  it('reads the config for an installed harness with the active intent, and refuses other harnesses', async () => {
    const { projectId } = await openProject('/work/cfg');
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ active: true, dirName: 'd1', scope: 'feature' }] });
    expect(await call('config:get', {}, projectId, 'claude')).toEqual({ config: 1, activeDir: 'd1' });
    expect(svc.getAidlcConfig).toHaveBeenLastCalledWith('/work/cfg', { harness: 'claude', activeScope: 'feature' });
    await expect(call('config:get', {}, projectId, 'evil')).rejects.toThrow('bad harness evil');
  });

  it('lists working agents of the active intent, and none without one', async () => {
    const { projectId } = await openProject('/work/agents');
    expect(await call('agents:working', {}, projectId)).toEqual([]);
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ active: true, dirName: 'd1', slug: 'slug' }] });
    svc.loadWorkingAgents.mockResolvedValueOnce([{ agent: 'dev' }]);
    expect(await call('agents:working', {}, projectId)).toEqual([{ agent: 'dev', intent: 'slug' }]);
    svc.loadIntentList.mockRejectedValueOnce(new Error('unreadable'));
    expect(await call('agents:working', {}, projectId)).toEqual([]);
  });

  it('previews and applies a config change, announcing it only when applied', async () => {
    const { projectId, sender } = await openProject('/work/change');
    expect(await call('config:preview', {}, projectId, { key: 'k' })).toEqual({ diff: 'd' });
    await call('config:apply', {}, projectId, { key: 'k' });
    expect(sender.send).toHaveBeenCalledWith('config:changed', { projectId });
    sender.send.mockClear();
    svc.applyConfigChange.mockResolvedValueOnce({ ok: false });
    await call('config:apply', {}, projectId, { key: 'k' });
    expect(sender.send).not.toHaveBeenCalledWith('config:changed', { projectId });
  });

  it('applies a guard lock exactly as previewed, and only after a preview', async () => {
    const { projectId } = await openProject('/work/lock');
    await expect(call('config:guardLockApply', {}, projectId)).rejects.toThrow();
    expect(await call('config:guardLockPreview', {}, projectId, { layer: 'team', mode: 'strict' })).toEqual({ file: 'f', diff: 'd' });
    await call('config:guardLockApply', {}, projectId);
    expect(svc.applyGuardLock).toHaveBeenCalledWith('/work/lock', { space: 'default', layer: 'team', mode: 'strict' }, 'b');
  });

  it('applies the cost rules exactly as previewed, only after a preview, and keeps the texts in main (US-0212 FR5.2)', async () => {
    const { projectId } = await openProject('/work/cost-rules');
    expect(await call('costRules:status', {}, projectId)).toEqual({ spaces: [], on: false, lines: {} });
    await expect(call('costRules:apply', {}, projectId)).rejects.toThrow();
    const shown = await call('costRules:preview', {}, projectId, { on: 'yes', lines: { project: ['x'] }, extra: 1 });
    expect(shown).toEqual({ changes: [{ space: 's', file: 'f', diff: 'd' }], errors: [], warnings: [] });
    expect(svc.previewCostRules).toHaveBeenCalledWith('/work/cost-rules', { on: false, lines: { project: ['x'] } });
    expect(await call('costRules:apply', {}, projectId)).toEqual({ ok: true, files: ['f'], output: 'o' });
    expect(svc.applyCostRules).toHaveBeenCalledWith('/work/cost-rules', [{ space: 's', file: 'f', before: 'b', next: 'n', diff: 'd' }]);
    await expect(call('costRules:apply', {}, projectId)).rejects.toThrow(); // used up
  });

  it('lists, stages, saves, edits and deletes plans', async () => {
    const { projectId } = await openProject('/work/plans');
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ active: true, dirName: 'd', scope: 'feature' }] });
    expect(await call('plans:list', {}, projectId, 'claude')).toEqual({ plans: [], active: { dirName: 'd', slug: null, plan: null, scope: 'feature' } });
    expect(await call('plans:stages', {}, projectId, 'claude', 'p')).toEqual(['s']);
    expect(await call('plans:save', {}, projectId, 'p')).toEqual({ ok: true });
    await expect(call('plans:applyEdit', {}, projectId)).rejects.toThrow();
    await call('plans:previewEdit', {}, projectId, 'p', { description: 'x', depth: 'standard', keywords: [], other: 'dropped' });
    await call('plans:applyEdit', {}, projectId);
    expect(svc.applyPlanEdit).toHaveBeenCalledWith('/work/plans', 'p', { description: 'x', depth: 'standard', keywords: [] }, 'b');
    expect(await call('plans:delete', {}, projectId, 'p')).toEqual({ ok: true });
  });
});

describe('models', () => {
  it('returns options with usage from the ledger', async () => {
    const { projectId } = await openProject('/work/m1');
    svc.loadCost.mockResolvedValueOnce({ available: true, ledger: [] });
    const res = await call('models:options', {}, projectId, 'claude');
    expect(res).toMatchObject({ editable: true, usage: { totalUsd: 3, usdByAgent: { dev: 2 } } });
    svc.loadCost.mockRejectedValueOnce(new Error('ledger'));
    expect((await call('models:options', {}, projectId, 'claude')).usage).toBeNull();
  });

  it('previews a change with its estimate, and with a null estimate when that fails', async () => {
    const { projectId } = await openProject('/work/m2');
    svc.loadCost.mockResolvedValueOnce({ available: true, ledger: [] });
    expect(await call('models:preview', {}, projectId, { harness: 'claude', agent: 'dev', model: 'm' })).toEqual({ diff: 'd', estimate: { usd: 1 } });
    svc.loadCost.mockRejectedValueOnce(new Error('x'));
    expect((await call('models:preview', {}, projectId, { harness: 'claude', model: 'm' })).estimate).toBeNull();
  });

  it('refuses a harness whose models cannot be edited', async () => {
    const { projectId } = await openProject('/work/m3');
    svc.modelOptions.mockResolvedValueOnce({ editable: false, reason: 'read-only' });
    await expect(call('models:apply', {}, projectId, { harness: 'claude' })).rejects.toThrow('read-only');
  });

  it('applies a change and announces it, and checks drift', async () => {
    const { projectId, sender } = await openProject('/work/m4');
    expect(await call('models:apply', {}, projectId, { harness: 'claude' })).toEqual({ ok: true });
    expect(sender.send).toHaveBeenCalledWith('config:changed', { projectId });
    expect(await call('models:check', {}, projectId, 'claude')).toEqual({ drift: false });
  });
});

// US-0210: the profile switch. The settings hold the profiles; runProfile is faked.
describe('model profile switch (US-0210)', () => {
  const PROFILES = { criticalPlans: ['feature'], critical: { from: 'strong', models: {} }, economy: { models: {} }, askBeforeBack: false, active: null };
  const withProfiles = (mp = PROFILES) => svc.getProjectSettings.mockResolvedValueOnce({ featureDocs: 'show', modelProfiles: mp });

  it('asks once in the renderer when a new critical intent appears, and not for intents open at start (FR2.1, FR2.4)', async () => {
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: 'old', plan: 'feature', status: 'in-flight' }] });
    const { projectId, sender } = await openProject('/work/ask');
    const { onChange } = svc.watchIntents.mock.calls.at(-1)[0];
    svc.loadIntentList.mockResolvedValueOnce({
      intents: [
        { dirName: 'old', plan: 'feature', status: 'in-flight' },
        { dirName: 'new', plan: 'feature', status: 'in-flight' }
      ]
    });
    withProfiles();
    onChange({ dirNames: [], indexChanged: true });
    await flush();
    expect(sender.send).toHaveBeenCalledWith('modelProfile:ask', { projectId, kind: 'critical', intent: 'new', confirm: true });
    expect(sender.send.mock.calls.filter(([ch]) => ch === 'modelProfile:ask')).toHaveLength(1);
  });

  it('Yes runs the critical profile, saves it as active and announces the change (FR2.2, FR4.1, FR4.2)', async () => {
    const { projectId, sender } = await openProject('/work/yes');
    withProfiles();
    const res = await call('modelProfile:answer', {}, projectId, 'critical', true, 'claude');
    expect(svc.runProfile).toHaveBeenLastCalledWith('/work/yes', PROFILES.critical, 'claude', ['m']);
    expect(res).toMatchObject({ ok: true, active: 'critical', results: [{ output: 'done' }] });
    expect(svc.setProjectSettings).toHaveBeenLastCalledWith('/work/yes', { modelProfiles: { active: 'critical' } });
    expect(sender.send).toHaveBeenCalledWith('config:changed', { projectId });
  });

  it('a failed command keeps the active profile (FR4.3, AC1.3.6)', async () => {
    const { projectId } = await openProject('/work/fail');
    withProfiles({ ...PROFILES, active: 'critical' });
    svc.runProfile.mockResolvedValueOnce({ ok: false, results: [{ ok: false, command: 'aidlc config models --from cheap', error: 'refused' }] });
    svc.setProjectSettings.mockClear();
    const res = await call('modelProfile:answer', {}, projectId, 'back', true, 'claude');
    expect(svc.runProfile).toHaveBeenLastCalledWith('/work/fail', PROFILES.economy, 'claude', ['m']);
    expect(res).toMatchObject({ ok: false, results: [{ error: 'refused' }] });
    expect(svc.setProjectSettings).not.toHaveBeenCalled();
  });

  it('a harness without a model table gives its message and runs nothing (FR5.2); No runs nothing (FR2.3)', async () => {
    const { projectId } = await openProject('/work/notable');
    svc.runProfile.mockClear();
    svc.modelOptions.mockResolvedValueOnce({ editable: false, reason: 'Kiro har ingen modelltabell' });
    expect(await call('modelProfile:answer', {}, projectId, 'critical', true, 'claude')).toEqual({
      ok: false,
      results: [],
      error: 'Kiro har ingen modelltabell'
    });
    expect(await call('modelProfile:answer', {}, projectId, 'critical', false, 'claude')).toEqual({ ok: true, results: [], skipped: true });
    expect(svc.runProfile).not.toHaveBeenCalled();
    await expect(call('modelProfile:answer', {}, projectId, 'turbo', true, 'claude')).rejects.toThrow();
  });

  it('lists the saved AI-DLC profile names, the agents and the model table (FR1.2, FR1.3)', async () => {
    const { projectId } = await openProject('/work/saved');
    svc.modelOptions.mockResolvedValueOnce({ editable: true, models: ['opus'], configured: [{ agent: 'developer' }], savedProfiles: { strong: {} } });
    expect(await call('modelProfile:saved', {}, projectId, 'claude')).toEqual({ editable: true, names: ['strong'], models: ['opus'], agents: ['developer'] });
  });
});

describe('updater', () => {
  it('passes check, download, install, relaunch and skip through', async () => {
    await call('update:check', {}, { force: true });
    expect(m.updater.check).toHaveBeenLastCalledWith({ force: true });
    await call('update:check', {});
    expect(m.updater.check).toHaveBeenLastCalledWith({ force: false });
    expect(await call('update:download', {})).toBe('dl');
    expect(await call('update:install', {})).toBe('inst');
    expect(await call('update:relaunch', {})).toBe('rel');
    expect(await call('update:skip', {}, '1.0.0')).toBe('skip 1.0.0');
  });

  it('reveals the downloaded file, and refuses when nothing is downloaded', async () => {
    await expect(call('update:reveal', {})).rejects.toThrow('Inget har hämtats än.');
    m.updater.downloadedFile.mockReturnValueOnce('/dl/app.dmg');
    await call('update:reveal', {});
    expect(electron.shell.showItemInFolder).toHaveBeenCalledWith('/dl/app.dmg');
  });

  it('startUpdateCheck sends an offered update to the window', async () => {
    const send = vi.fn();
    m.updater.check.mockResolvedValueOnce({ status: 'available' });
    ipc.startUpdateCheck({ webContents: { isDestroyed: () => false, send } });
    await flush();
    expect(send).toHaveBeenCalledWith('update:state', { status: 'available' });
  });
});

// US-1402 FR6, BR6.7 (contract C5): the Spec Kit features and their watcher.
describe('Spec Kit features', () => {
  const KIT = { framework: 'speckit', isAidlc: false, views: ['specs'], activeSpace: null, spaces: [] };
  const speckitWatch = (root) => svc.watchFiles.mock.calls.find(([o]) => o.root === root && o.paths.includes('specs/**'))?.[0];

  it("speckit:features returns the reader's result for the project's root, and file:read passes the framework", async () => {
    const { projectId } = await openProject('/work/kit-read', KIT);
    const result = { version: { found: '1.5.0', supported: false }, features: [{ dir: '001-a' }], active: '001-a', errors: [] };
    svc.loadSpeckitFeatures.mockResolvedValueOnce(result);
    expect(await call('speckit:features', {}, projectId)).toBe(result);
    expect(svc.loadSpeckitFeatures).toHaveBeenLastCalledWith('/work/kit-read');
    await call('file:read', {}, projectId, 'specs/001-a/spec.md');
    expect(svc.readForEdit).toHaveBeenLastCalledWith('/work/kit-read', 'specs/001-a/spec.md', { framework: 'speckit' });
  });

  // US-1404 FR7 (contract C6): the rules, for a Spec Kit project only.
  it("speckit:rules returns the reader's result for a Spec Kit project, and rejects for another framework", async () => {
    const { projectId } = await openProject('/work/kit-rules', KIT);
    const result = { constitution: { path: '.specify/memory/constitution.md', exists: true }, extensions: [], skipped: 0, hooksChecked: true, errors: [] };
    svc.loadSpeckitRules.mockResolvedValueOnce(result);
    expect(await call('speckit:rules', {}, projectId)).toBe(result);
    expect(svc.loadSpeckitRules).toHaveBeenLastCalledWith('/work/kit-rules');
    const other = await openProject('/work/kit-rules-other');
    svc.loadSpeckitRules.mockClear();
    await expect(call('speckit:rules', {}, other.projectId)).rejects.toThrow();
    expect(svc.loadSpeckitRules).not.toHaveBeenCalled();
  });

  it('watches specs/**, the .specify files and the extension folders of a Spec Kit project, pushes speckit:changed, and closes it with the project', async () => {
    const { projectId, sender } = await openProject('/work/kit-watch', KIT);
    const opts = speckitWatch('/work/kit-watch');
    expect(opts.paths).toEqual([
      'specs/**',
      '.specify/feature.json',
      '.specify/init-options.json',
      '.specify/memory/constitution.md',
      '.specify/extensions.yml',
      '.specify/extensions/**',
      '.thadeus/archived/**'
    ]);
    opts.onChange(['specs/001-a/tasks.md']);
    expect(sender.send).toHaveBeenCalledWith('speckit:changed', { projectId, paths: ['specs/001-a/tasks.md'] });
    const w = svc.watchFiles.mock.results[svc.watchFiles.mock.calls.findIndex(([o]) => o === opts)].value;
    await call('project:close', {}, projectId);
    expect(w.close).toHaveBeenCalled();
  });

  it('gives an AI-DLC project no Spec Kit watcher, and starts one when a plain folder turns out to be Spec Kit', async () => {
    await openProject('/work/kit-none');
    expect(speckitWatch('/work/kit-none')).toBeUndefined();
    await openProject('/work/kit-later', { framework: null, isAidlc: false });
    svc.detectProject.mockResolvedValueOnce(KIT);
    await svc.watchForAidlc.mock.calls.at(-1)[0].onFound();
    expect(speckitWatch('/work/kit-later')).toBeDefined();
  });
});

// US-1411 FR1.4, FR2.2, FR2.3, NFR1: archive and unarchive a Spec Kit feature; main checks the folder itself.
describe('Spec Kit archive', () => {
  const KIT = { framework: 'speckit', isAidlc: false, views: ['specs'], activeSpace: null, spaces: [] };
  const CHANNELS = { 'speckit:archive': 'addMark', 'speckit:unarchive': 'removeMark' };
  beforeEach(() => {
    for (const fn of [svc.listedFeatures, svc.addMark, svc.removeMark]) fn.mockClear();
  });

  it('marks a listed feature that is not active, and unmarks a listed one, by the project’s own root', async () => {
    const { projectId } = await openProject('/work/kit-archive', KIT);
    expect(await call('speckit:archive', {}, projectId, '002-b', '/etc')).toEqual({ ok: true });
    expect(svc.listedFeatures).toHaveBeenLastCalledWith('/work/kit-archive');
    expect(svc.addMark.mock.calls).toEqual([['/work/kit-archive', '002-b']]);
    expect(svc.removeMark).not.toHaveBeenCalled();
    expect(await call('speckit:unarchive', {}, projectId, '002-b')).toEqual({ ok: true });
    expect(svc.removeMark.mock.calls).toEqual([['/work/kit-archive', '002-b']]);
  });

  it('refuses a folder that is not listed, a path out, and anything but a string, before it becomes a path', async () => {
    const { projectId } = await openProject('/work/kit-archive-bad', KIT);
    for (const channel of Object.keys(CHANNELS)) {
      for (const dir of ['009-gone', '../x', '/etc', '', undefined, null, 1, ['002-b'], { dir: '002-b' }]) {
        expect(await call(channel, {}, projectId, dir)).toEqual({ ok: false, error: expect.stringMatching(/\S/) });
      }
    }
    expect(svc.addMark).not.toHaveBeenCalled();
    expect(svc.removeMark).not.toHaveBeenCalled();
  });

  it('refuses to archive the feature that is active now; unarchiving it is allowed', async () => {
    const { projectId } = await openProject('/work/kit-archive-active', KIT);
    expect(await call('speckit:archive', {}, projectId, '001-a')).toEqual({ ok: false, error: t('speckit.archive.active') });
    expect(svc.addMark).not.toHaveBeenCalled();
    expect(await call('speckit:unarchive', {}, projectId, '001-a')).toEqual({ ok: true });
  });

  it('writes nothing in a project that does not follow Spec Kit, and rejects an unknown project', async () => {
    const { projectId } = await openProject('/work/kit-archive-other');
    for (const channel of Object.keys(CHANNELS)) {
      expect(await call(channel, {}, projectId, '002-b')).toEqual({ ok: false, error: t('speckit.archive.notSpeckit') });
      await expect(call(channel, {}, 'nope', '002-b')).rejects.toThrow('Okänt projekt: nope');
    }
    expect(svc.listedFeatures).not.toHaveBeenCalled();
    expect(svc.addMark).not.toHaveBeenCalled();
    expect(svc.removeMark).not.toHaveBeenCalled();
  });

  it('answers a failed read or write with its reason', async () => {
    const { projectId } = await openProject('/work/kit-archive-fail', KIT);
    for (const [channel, fn] of Object.entries(CHANNELS)) {
      svc[fn].mockRejectedValueOnce(Object.assign(new Error('EACCES: no'), { code: 'EACCES' }));
      const failed = { file: '.thadeus/archived/002-b.json', reason: 'EACCES' };
      expect(await call(channel, {}, projectId, '002-b')).toEqual({ ok: false, error: t('projectFile.errors.writeFailed', failed) });
      svc.listedFeatures.mockRejectedValueOnce(new Error('disk gone'));
      expect(await call(channel, {}, projectId, '002-b')).toEqual({ ok: false, error: expect.stringContaining('disk gone') });
    }
  });

  it('speckit:features removes the active feature’s mark once, and still answers when that fails (FR2.3)', async () => {
    const { projectId } = await openProject('/work/kit-archive-mark', KIT);
    const result = { features: [], active: '001-a', activeMarked: true, errors: [] };
    svc.loadSpeckitFeatures.mockResolvedValueOnce(result);
    expect(await call('speckit:features', {}, projectId)).toBe(result);
    expect(svc.removeMark.mock.calls).toEqual([['/work/kit-archive-mark', '001-a']]);
    svc.loadSpeckitFeatures.mockResolvedValueOnce({ ...result, activeMarked: false });
    await call('speckit:features', {}, projectId);
    expect(svc.removeMark).toHaveBeenCalledTimes(1);
    console.error.mockClear();
    svc.removeMark.mockRejectedValueOnce(new Error('read-only'));
    svc.loadSpeckitFeatures.mockResolvedValueOnce(result);
    expect(await call('speckit:features', {}, projectId)).toBe(result);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('speckit:features removes no mark in a project that does not follow Spec Kit', async () => {
    const { projectId } = await openProject('/work/kit-archive-mark-other');
    svc.loadSpeckitFeatures.mockResolvedValueOnce({ features: [], active: '001-a', activeMarked: true, errors: [] });
    await call('speckit:features', {}, projectId);
    expect(svc.removeMark).not.toHaveBeenCalled();
  });
});

// US-1410 BR10.1, BR10.8, NFR3.1, NFR3.2 (contract C9): agents:progress for Spec Kit, in the fixed branch order.
describe('agents:progress', () => {
  const KIT = { framework: 'speckit', isAidlc: false, views: ['specs'], activeSpace: null, spaces: [] };
  const C9 = { source: 'none', waiting: null, feature: null };

  it('resolves C9 for a Spec Kit project with no AI-DLC space, and ignores a dir name there', async () => {
    const { projectId } = await openProject('/work/kit-progress', KIT);
    expect(await call('agents:progress', {}, projectId)).toEqual(C9);
    expect(await call('agents:progress', {}, projectId, '261119-x')).toEqual(C9);
    expect(svc.loadAuditEvents).not.toHaveBeenCalled();
    expect(svc.loadSpeckitFeatures).toHaveBeenLastCalledWith('/work/kit-progress');
  });

  it("gives the active feature's tasks with source tasks", async () => {
    const { projectId } = await openProject('/work/kit-feature', KIT);
    svc.loadSpeckitFeatures.mockResolvedValueOnce({ features: [{ dir: '001-a', name: 'a', tasks: { done: 2, total: 5 } }], active: '001-a', errors: [] });
    expect(await call('agents:progress', {}, projectId)).toEqual({ source: 'tasks', waiting: null, feature: { name: 'a', done: 2, total: 5 } });
  });

  it("keeps an AI-DLC project's per-intent rows, rejects '../x', and gives C9 with no dir name", async () => {
    const { projectId } = await openProject('/work/ai-progress');
    expect(await call('agents:progress', {}, projectId, '261119-x')).toEqual([]);
    expect(svc.loadAuditEvents).toHaveBeenLastCalledWith('/work/ai-progress', 'aidlc/spaces/default/intents/261119-x');
    await expect(call('agents:progress', {}, projectId, '../x')).rejects.toThrow(/Ogiltigt intent/);
    expect(await call('agents:progress', {}, projectId)).toEqual(C9);
  });

  it('rejects an unknown project', async () => {
    await expect(call('agents:progress', {}, 'nope')).rejects.toThrow(/Okänt projekt/);
  });

  it('writes nothing in a real Spec Kit folder (BR10.8, NFR3.1)', async () => {
    const { promises: fsp } = await import('node:fs');
    const os = await import('node:os');
    const nodePath = await import('node:path');
    const { spyWrites } = await import('./fsWriteSpy.js');
    const real = await vi.importActual('../../src/main/speckitFeatures.js');
    const root = await fsp.mkdtemp(nodePath.join(os.tmpdir(), 'ipc-progress-'));
    try {
      await fsp.mkdir(nodePath.join(root, '.specify'), { recursive: true });
      await fsp.mkdir(nodePath.join(root, 'specs/001-a'), { recursive: true });
      await fsp.writeFile(nodePath.join(root, '.specify/feature.json'), JSON.stringify({ feature_directory: 'specs/001-a' }));
      await fsp.writeFile(nodePath.join(root, 'specs/001-a/tasks.md'), '## Phase 1: Setup\n- [x] T001 one\n- [ ] T002 two\n');
      const { projectId } = await openProject(root, KIT);
      svc.loadSpeckitFeatures.mockImplementationOnce(real.loadSpeckitFeatures);
      const writes = spyWrites();
      try {
        expect(await call('agents:progress', {}, projectId)).toEqual({ source: 'tasks', waiting: null, feature: { name: 'a', done: 1, total: 2 } });
        expect(writes.calls()).toEqual([]);
      } finally {
        writes.restore();
      }
    } finally {
      await fsp.rm(root, { recursive: true, force: true });
    }
  });
});

describe('US-1406 the framework choice (C4, NFR3.3, NFR7.1)', () => {
  const ASK = { framework: null, source: 'ask', isAidlc: false };
  const setupWatcher = () => svc.watchForAidlc.mock.results.at(-1).value;

  it('project:frameworkScan resolves the project by id, ignores extra arguments and refuses an unknown id', async () => {
    const { projectId } = await openProject('/work/fc-scan', ASK);
    svc.frameworkScan.mockResolvedValueOnce({ proposal: 'aidlc' });
    expect(await call('project:frameworkScan', {}, projectId, '/etc')).toEqual({ proposal: 'aidlc' });
    expect(svc.frameworkScan).toHaveBeenLastCalledWith('/work/fc-scan');
    await expect(call('project:frameworkScan', {}, 'nope')).rejects.toThrow('Okänt projekt: nope');
  });

  it('project:chooseFramework refuses an unknown id without calling the choice', async () => {
    const calls = svc.chooseFramework.mock.calls.length;
    await expect(call('project:chooseFramework', {}, 'nope', 'aidlc')).rejects.toThrow('Okänt projekt: nope');
    expect(svc.chooseFramework.mock.calls.length).toBe(calls);
  });

  it('a found choice switches the project at once: framework, watchers and the project:detected push', async () => {
    const { projectId, sender } = await openProject('/work/fc-aidlc', ASK);
    const watcher = setupWatcher();
    const detection = { framework: 'aidlc', source: 'file', isAidlc: true, activeSpace: 'team' };
    svc.chooseFramework.mockResolvedValueOnce({ ok: true, file: '.thadeus/project.json', next: 'none' });
    svc.detectProject.mockResolvedValueOnce(detection);
    const started = Date.now();
    expect(await call('project:chooseFramework', {}, projectId, 'aidlc', '/evil')).toEqual({ ok: true, file: '.thadeus/project.json', next: 'none' });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(svc.chooseFramework).toHaveBeenLastCalledWith('/work/fc-aidlc', 'aidlc');
    expect(sender.send).toHaveBeenCalledWith('project:detected', { projectId, detection });
    expect(watcher.close).toHaveBeenCalled();
    expect(svc.watchIntents).toHaveBeenLastCalledWith(expect.objectContaining({ intentsDir: '/work/fc-aidlc/aidlc/spaces/team/intents' }));
    await call('file:read', {}, projectId, 'a.md');
    expect(svc.readForEdit).toHaveBeenLastCalledWith('/work/fc-aidlc', 'a.md', { framework: 'aidlc' });
  });

  it('a found Spec Kit choice starts the Spec Kit watcher, not a space watcher', async () => {
    const { projectId, sender } = await openProject('/work/fc-kit', ASK);
    const intentWatches = svc.watchIntents.mock.calls.length;
    const detection = { framework: 'speckit', source: 'file', isAidlc: false, activeSpace: null, spaces: [] };
    svc.chooseFramework.mockResolvedValueOnce({ ok: true, file: '.thadeus/project.json', next: 'none' });
    svc.detectProject.mockResolvedValueOnce(detection);
    await call('project:chooseFramework', {}, projectId, 'speckit');
    expect(sender.send).toHaveBeenCalledWith('project:detected', { projectId, detection });
    expect(svc.watchFiles).toHaveBeenCalledWith(expect.objectContaining({ root: '/work/fc-kit', paths: expect.arrayContaining(['specs/**']) }));
    expect(svc.watchIntents.mock.calls.length).toBe(intentWatches);
  });

  it('a not-found choice changes nothing: no detection, no push, the setup watcher kept', async () => {
    const { projectId, sender } = await openProject('/work/fc-missing', ASK);
    const watcher = setupWatcher();
    const detections = svc.detectProject.mock.calls.length;
    svc.chooseFramework.mockResolvedValueOnce({ ok: true, file: null, next: 'setupSpeckit' });
    expect(await call('project:chooseFramework', {}, projectId, 'speckit')).toEqual({ ok: true, file: null, next: 'setupSpeckit' });
    expect(svc.detectProject.mock.calls.length).toBe(detections);
    expect(sender.send).not.toHaveBeenCalledWith('project:detected', expect.anything());
    expect(watcher.close).not.toHaveBeenCalled();
  });
});

describe('files, shell and git', () => {
  it('reads, edits and lists files in the project root', async () => {
    const { projectId } = await openProject('/work/files');
    expect(await call('project:file', {}, projectId, 'a.md')).toBe('text');
    expect(await call('file:read', {}, projectId, 'a.md')).toEqual({ content: 'c' });
    expect(svc.readForEdit).toHaveBeenLastCalledWith('/work/files', 'a.md', { framework: 'aidlc' }); // US-1402 NFR3.2
    await call('file:write', {}, projectId, 'a.md', 'new', { mtimeMs: 1, hash: 'h' });
    expect(svc.writeFileSafe).toHaveBeenCalledWith('/work/files', 'a.md', 'new', { expectMtime: 1, expectHash: 'h', framework: 'aidlc' });
    expect(await call('project:listTree', {}, projectId)).toEqual(['a']);
  });

  it('watches .git/HEAD and sends git:headChanged when the branch switches, also outside the app (US-0015)', async () => {
    const { projectId, sender } = await openProject('/work/head');
    const head = svc.watchOpenFiles.mock.calls.find(([o]) => o.files?.[0] === '/work/head/.git/HEAD');
    expect(head).toBeTruthy();
    head[0].onChange('/work/head/.git/HEAD');
    expect(sender.send).toHaveBeenCalledWith('git:headChanged', { projectId });
    head[0].onError(new Error('x')); // only the live label stops
  });

  it('watches open editor files and sends file:changed with the relative path', async () => {
    const { projectId, sender } = await openProject('/work/edit');
    await call('file:watch', {}, projectId, ['a.md']);
    const { onChange, onError } = svc.watchOpenFiles.mock.calls.at(-1)[0];
    onChange('/work/edit/a.md');
    onChange('/elsewhere');
    expect(sender.send).toHaveBeenCalledWith('file:changed', { projectId, rel: 'a.md' });
    expect(sender.send).toHaveBeenCalledTimes(sender.send.mock.calls.filter((c) => c[0] !== 'file:changed').length + 1);
    onError(new Error('x'));
    const count = svc.watchOpenFiles.mock.calls.length;
    await call('file:watch', {}, projectId, 'not-an-array');
    expect(svc.watchOpenFiles.mock.calls.length).toBe(count);
  });

  it('reveals a file and opens only document types in the editor', async () => {
    const { projectId } = await openProject('/work/shell');
    await call('shell:reveal', {}, projectId, 'x.md');
    expect(electron.shell.showItemInFolder).toHaveBeenCalledWith('/work/shell/x.md');
    await call('shell:openInEditor', {}, projectId, 'notes.MD');
    expect(electron.shell.openPath).toHaveBeenCalledWith('/work/shell/notes.MD');
    await expect(call('shell:openInEditor', {}, projectId, 'run.sh')).rejects.toThrow('run.sh');
    electron.shell.openPath.mockResolvedValueOnce('no handler');
    await expect(call('shell:openInEditor', {}, projectId, 'a.json')).rejects.toThrow('no handler');
  });

  it('passes the git calls through with their arguments as strings', async () => {
    const { projectId } = await openProject('/work/git');
    expect(await call('git:status', {}, projectId)).toBe('status');
    expect(await call('git:fetch', {}, projectId)).toBe('fetched');
    await call('git:remoteChanges', {}, projectId, 'origin/main');
    expect(svc.getRemoteChanges).toHaveBeenLastCalledWith('/work/git', 'origin/main', { space: 'default' });
    expect(await call('git:showRemote', {}, projectId, 'origin/main', 'a')).toBe('remote');
    expect(await call('git:conflicts', {}, projectId)).toEqual([]);
  });
});

describe('team collaboration (US-1201 AC-1–AC-4)', () => {
  it("team:platform names the origin remote's platform, and null for an unknown host", async () => {
    const { projectId } = await openProject('/work/team-platform');
    expect(await call('team:platform', {}, projectId)).toEqual({ id: 'github', name: 'GitHub', host: 'github.com', path: 'tochman/ai-dlc-thadeus' });
    svc.originUrl.mockResolvedValueOnce('https://code.example.com/x/y.git');
    const other = await openProject('/work/team-unknown');
    expect(await call('team:platform', {}, other.projectId)).toBeNull();
  });

  it('team:pulls gives the pull requests, and a platform failure as a value instead of a rejection', async () => {
    const { projectId } = await openProject('/work/team-pulls');
    const ok = await call('team:pulls', {}, projectId);
    expect(ok).toMatchObject({ ok: true, platform: { id: 'github' } });
    expect(ok.pulls.map((p) => p.number)).toEqual([58, 59]);
    expect(svc.listPulls).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'github' }), expect.objectContaining({ credentials: svc.loadBitbucket }));
    svc.listPulls.mockRejectedValueOnce(platformError('not-logged-in'));
    expect(await call('team:pulls', {}, projectId)).toEqual({
      ok: false,
      platform: expect.objectContaining({ id: 'github' }),
      error: { code: 'not-logged-in', message: 'GitHub: not-logged-in' }
    });
  });

  it('team:collisions says how far behind main the branch is, and which pull requests share files and would conflict', async () => {
    svc.getGitStatus.mockResolvedValueOnce({ isRepo: true, branch: 'feat/US-1201' });
    const { projectId } = await openProject('/work/team-collide');
    const fetches = svc.fetchRemote.mock.calls.length;
    const res = await call('team:collisions', {}, projectId);
    expect(res).toMatchObject({ isRepo: true, branch: 'feat/US-1201', base: 'origin/main', behind: 3, error: null });
    expect(res.collisions).toEqual([{ number: 58, title: 'feat(US-0209): cost', branch: 'feat/US-0209', shared: ['src/a.js'], conflicts: ['src/a.js'] }]);
    expect(svc.predictConflicts).toHaveBeenLastCalledWith('/work/team-collide', 'HEAD', 'origin/feat/US-0209');
    expect(svc.fetchRemote.mock.calls.length).toBe(fetches); // never fetches by itself (AC-2)

    svc.getGitStatus.mockResolvedValueOnce({ isRepo: true, branch: 'feat/US-1201' });
    svc.listPulls.mockRejectedValueOnce(platformError('timeout'));
    const offline = await call('team:collisions', {}, projectId);
    expect(offline).toMatchObject({ behind: 3, collisions: [], error: { code: 'timeout' } });
    svc.getGitStatus.mockResolvedValueOnce({ isRepo: false });
    expect(await call('team:collisions', {}, projectId)).toEqual({ isRepo: false });
  });

  it('team:refresh runs git fetch, and only when it is called', async () => {
    const { projectId } = await openProject('/work/team-refresh');
    const fetches = svc.fetchRemote.mock.calls.length;
    await call('team:machines', {}, projectId, 'default');
    expect(svc.fetchRemote.mock.calls.length).toBe(fetches);
    await call('team:refresh', {}, projectId);
    expect(svc.fetchRemote).toHaveBeenLastCalledWith('/work/team-refresh');
    expect(svc.fetchRemote.mock.calls.length).toBe(fetches + 1);
  });

  it('team:machines gives the machines per intent, the story branches and the possible collisions', async () => {
    const { projectId } = await openProject('/work/team-machines');
    svc.loadIntentList.mockResolvedValueOnce({
      intents: [
        { dirName: '261116-a', slug: 'a', status: 'in-flight' },
        { dirName: '261116-b', slug: 'b', status: 'in-flight' },
        { dirName: '261116-gone', missingOnDisk: true }
      ]
    });
    svc.loadStoryLinks.mockResolvedValueOnce({ 'US-0209': ['261116-a'] });
    svc.remoteStoryBranches.mockResolvedValueOnce([
      { branch: 'origin/feat/US-0209', story: 'US-0209', ahead: 2 },
      { branch: 'origin/fix/US-0209', story: 'US-0209', ahead: 1 }
    ]);
    const res = await call('team:machines', {}, projectId, 'default');
    expect(res.intents.map((i) => [i.dirName, i.stories, i.inProgress])).toEqual([
      ['261116-a', ['US-0209'], true],
      ['261116-b', [], true]
    ]);
    expect(res.flags).toEqual([{ story: 'US-0209', kind: 'branches', where: ['origin/feat/US-0209', 'origin/fix/US-0209'] }]);
    await expect(call('team:machines', {}, projectId, '../x')).rejects.toThrow();
  });

  it("team:comments joins the story's pull request comments with the intent's AI-DLC rows", async () => {
    const { projectId } = await openProject('/work/team-comments');
    svc.loadIntentDetail.mockResolvedValueOnce({ dirName: '261116-a', files: [], events: [] });
    svc.loadStoryLinks.mockResolvedValueOnce({ 'US-0209': ['261116-a'] });
    const res = await call('team:comments', {}, projectId, 'default', '261116-a');
    expect(res.pull).toEqual({ number: 58, title: 'feat(US-0209): cost', url: 'u58', reviewers: [] });
    expect(res.stories).toEqual(['US-0209']);
    expect(res.threads.map((x) => x.comments.length)).toEqual([1]);
    expect(res.needs.map((n) => n.kind)).toEqual(['question']);
    expect(res.error).toBeNull();
    expect(svc.listComments).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'github' }), 58, expect.any(Object));

    svc.loadIntentDetail.mockResolvedValueOnce({ dirName: '261116-a', files: [], events: [] });
    svc.loadStoryLinks.mockResolvedValueOnce({ 'US-0209': ['261116-a'] });
    svc.listComments.mockRejectedValueOnce(platformError('timeout'));
    const failed = await call('team:comments', {}, projectId, 'default', '261116-a');
    expect(failed.error).toMatchObject({ code: 'timeout' });
    expect(failed.threads).toEqual([]);
    expect(failed.needs.map((n) => n.kind)).toEqual(['question']);
  });

  it('credentials:bitbucket saves, clears and tells whether it is set, and never sends the password back', async () => {
    const saved = await call('credentials:bitbucket', {}, { action: 'save', username: 'thomas', appPassword: 'pw-123' });
    expect(saved).toEqual({ set: true });
    expect(JSON.stringify(saved)).not.toContain('pw-123');
    expect(svc.saveBitbucket).toHaveBeenCalledWith({ username: 'thomas', appPassword: 'pw-123' });
    svc.hasBitbucket.mockResolvedValueOnce(false);
    expect(await call('credentials:bitbucket', {}, { action: 'clear' })).toEqual({ set: false });
    expect(svc.clearBitbucket).toHaveBeenCalled();
    expect(await call('credentials:bitbucket', {}, { action: 'status' })).toEqual({ set: true });
    await expect(call('credentials:bitbucket', {}, { action: 'read' })).rejects.toThrow();
  });

  it('team:mergeNote gives test-results.md and the "Efter merge med main" section, and writes nothing', async () => {
    const { projectId } = await openProject('/work/team-note');
    const writes = svc.writeFileSafe.mock.calls.length;
    const note = await call('team:mergeNote', {}, projectId, 'default', '261116-a');
    expect(note.rel).toBe('aidlc/spaces/default/intents/261116-a/construction/build-and-test/test-results.md');
    expect(note.section).toMatch(/## Efter merge med main/);
    expect(svc.writeFileSafe.mock.calls.length).toBe(writes);
    await expect(call('team:mergeNote', {}, projectId, 'default', '../../etc')).rejects.toThrow();
    svc.resolveInRoot.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    await expect(call('team:mergeNote', {}, projectId, 'default', '261116-b')).rejects.toThrow(/test-results\.md/);
  });
});

describe('setup, settings and tools', () => {
  it('runs setup with the previewed info and re-detects harnesses after success', async () => {
    const { projectId } = await openProject('/work/setup');
    await call('setup:info', {}, projectId, { harness: 'claude' });
    const before = svc.detectHarnesses.mock.calls.length;
    await call('setup:run', {}, projectId, { harness: 'claude' });
    expect(svc.runSetup).toHaveBeenLastCalledWith('/work/setup', { harness: 'claude' }, { info: 1 });
    expect(svc.detectHarnesses.mock.calls.length).toBe(before + 1);
  });

  // US-1405 FR3, BR3.3: the preview is kept per project, and speckit:setup hands that very preview to the run.
  it('speckit:setupPreview stores the preview per project; speckit:setup runs with it, and without one gets none', async () => {
    const a = (await openProject('/work/speckit-a')).projectId;
    const b = (await openProject('/work/speckit-b')).projectId;
    expect(await call('speckit:setupPreview', {}, a, 'claude')).toEqual({ root: '/work/speckit-a', harness: 'claude' });
    expect(svc.getSpeckitSetupInfo).toHaveBeenLastCalledWith('/work/speckit-a', { harness: 'claude' });
    expect(await call('speckit:setup', {}, a, 'claude')).toEqual({ ok: true, output: 'ok' });
    expect(svc.runSpeckitSetup).toHaveBeenLastCalledWith('/work/speckit-a', { harness: 'claude' }, { root: '/work/speckit-a', harness: 'claude' });
    await call('speckit:setup', {}, b, 'claude'); // b never had a preview: the run gets none and refuses (unit-tested)
    expect(svc.runSpeckitSetup).toHaveBeenLastCalledWith('/work/speckit-b', { harness: 'claude' }, undefined);
    await call('speckit:setupPreview', {}, b); // no pick: null harness, the project's only one is taken in the module
    expect(svc.getSpeckitSetupInfo).toHaveBeenLastCalledWith('/work/speckit-b', { harness: null });
  });

  it('speckit:setup re-detects harnesses after success only', async () => {
    const { projectId } = await openProject('/work/speckit-c');
    await call('speckit:setupPreview', {}, projectId, 'opencode');
    const before = svc.detectHarnesses.mock.calls.length;
    await call('speckit:setup', {}, projectId, 'opencode');
    expect(svc.detectHarnesses.mock.calls.length).toBe(before + 1);
    svc.runSpeckitSetup.mockResolvedValueOnce({ ok: false, error: { code: 'failed', message: 'x' }, output: '' });
    await call('speckit:setup', {}, projectId, 'opencode');
    expect(svc.detectHarnesses.mock.calls.length).toBe(before + 1);
  });

  it('reads and writes settings, rebuilding the menu when the language changes', async () => {
    await call('settings:get', {});
    expect(svc.setToolPaths).toHaveBeenCalled();
    svc.currentLanguage.mockReturnValueOnce('sv');
    svc.setLanguageFromSettings.mockReturnValueOnce('en');
    await call('settings:set', { sender: {} }, { language: 'en' });
    expect(svc.applyMenu).toHaveBeenCalledWith(m.win);
  });

  it('picks, saves and resets tool paths, refusing unknown tool ids', async () => {
    expect(await call('tools:info', {})).toEqual([{ id: 'aidlc', path: '/bin/aidlc' }]);
    expect(await call('tools:pick', { sender: {} }, 'aidlc')).toBe('/picked');
    electron.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    expect(await call('tools:pick', { sender: {} }, 'aidlc')).toBeNull();
    await expect(call('tools:pick', { sender: {} }, 'rm')).rejects.toThrow();
    expect(await call('tools:save', {}, 'aidlc', '/x/aidlc')).toEqual({ id: 'aidlc', path: '/x/aidlc', version: '1' });
    svc.getSettings.mockResolvedValueOnce({ toolPaths: { aidlc: '/x', git: '/g' } });
    svc.setSettings.mockImplementationOnce(async (p) => p);
    expect(await call('tools:reset', {}, 'aidlc')).toEqual({ git: '/g' });
    await expect(call('tools:reset', {}, 'rm')).rejects.toThrow();
  });

  it('checks a sign-in by tool id only, and runs nothing for an unknown one (US-0804 NFR1)', async () => {
    const answer = { state: 'in', account: 'octo-dana', reason: null };
    svc.checkSignIn.mockResolvedValueOnce(answer);
    expect(await call('signIn:check', { sender: {} }, 'gh', { timeout: 1 }, '/bin/rm')).toEqual(answer);
    expect(svc.checkSignIn.mock.calls.at(-1)).toEqual(['gh']);
    svc.spawnSession.mockClear();
    for (const id of ['glab', 'rm -rf ~', undefined])
      await expect(call('signIn:check', { sender: {} }, id)).rejects.toThrow(t('errors.unknownTool', { id: String(id) }));
    expect(svc.spawnSession).not.toHaveBeenCalled();
  });

  it('picks and clears the default project folder', async () => {
    expect(await call('settings:pickDefaultFolder', { sender: {} })).toBe('/picked');
    electron.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    expect(await call('settings:pickDefaultFolder', { sender: {} })).toBeNull();
    expect(await call('settings:clearDefaultFolder', {})).toBeNull();
  });

  it('gives app info and opens only the fixed external addresses', async () => {
    expect(await call('app:info', {})).toEqual({ version: '9.9.9', aidlc: { id: 'aidlc', path: '/bin/aidlc' } });
    await call('app:openExternal', {}, 'repo');
    expect(electron.shell.openExternal).toHaveBeenLastCalledWith('https://github.com/tochman/ai-dlc-thadeus');
    await expect(call('app:openExternal', {}, 'https://evil.example')).rejects.toThrow();
    await expect(call('app:openExternal', {}, 'toString')).rejects.toThrow();
    await call('app:openDocsUrl', {});
    expect(electron.shell.openExternal).toHaveBeenLastCalledWith('https://docs.example/aidlc');
    expect(await call('i18n:language', {})).toBe('sv');
  });

  it.each([
    ['aidlc', 'https://github.com/awslabs/aidlc-workflows'],
    ['claude', 'https://code.claude.com/docs/en/setup'],
    ['opencode', 'https://opencode.ai/docs'],
    ['specify', 'https://github.com/github/spec-kit'],
    ['gh', 'https://cli.github.com']
  ])("opens %s's install page by its key (US-0805 FR4.1, NFR1)", async (id, page) => {
    await call('app:openExternal', {}, `install-${id}`);
    expect(electron.shell.openExternal).toHaveBeenLastCalledWith(page);
  });

  it('refuses an install page that is not in the table, and an address (US-0805 NFR1)', async () => {
    electron.shell.openExternal.mockClear();
    for (const key of ['install-glab', 'install-', 'https://cli.github.com', { id: 'gh' }]) await expect(call('app:openExternal', {}, key)).rejects.toThrow();
    expect(electron.shell.openExternal).not.toHaveBeenCalled();
  });
});

describe('velocity (US-0303 FR3.5)', () => {
  it('project:velocity gives loadVelocity over the cached intents, the feature docs, the tags and the epic history', async () => {
    const { projectId } = await openProject('/work/velocity');
    const features = { available: true, overviewPath: 'docs/FEATURES.md', epics: [{ id: 'EPIC-03', file: 'docs/features/epic-03.md' }] };
    const tags = [{ name: 'v0.2.0', date: '2026-11-10' }];
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: 'a' }] });
    svc.loadFeatures.mockResolvedValueOnce(features);
    svc.listReleaseTags.mockResolvedValueOnce(tags);
    svc.storyMarkerHistory.mockResolvedValueOnce('LOG');
    expect(await call('project:velocity', {}, projectId, 'default')).toMatchObject({ velocity: true, delivery: expect.any(Object) });
    expect(svc.loadIntentList).toHaveBeenLastCalledWith('/work/velocity', 'default', []);
    expect(svc.storyMarkerHistory).toHaveBeenLastCalledWith('/work/velocity', 'docs/features');
    expect(svc.loadVelocity).toHaveBeenLastCalledWith('/work/velocity', 'default', [{ dirName: 'a' }], features, {
      tags,
      history: 'LOG',
      featuresDir: 'docs/features'
    });
  });

  // US-1304 FR3.4, FR5.3, FR6.2, NFR3
  const fixEpic = {
    id: 'EPIC-00',
    file: 'docs/features/epic-00-fixes.md',
    parsed: { stories: [{ id: 'US-0057', statusText: 'Released in v0.2.0', raw: '- **Fault in:** v0.1.0' }] }
  };
  const deliveryTags = [
    { name: 'v0.1.0', date: '2026-09-10' },
    { name: 'v0.2.0', date: '2026-10-15' }
  ];

  it("project:velocity adds delivery from the tags, EPIC-00's fix stories, GitHub's releases and the merged pull requests", async () => {
    const { projectId } = await openProject('/work/delivery');
    svc.loadFeatures.mockResolvedValueOnce({ available: true, overviewPath: 'docs/FEATURES.md', epics: [fixEpic] });
    svc.listReleaseTags.mockResolvedValueOnce(deliveryTags);
    svc.listReleases.mockResolvedValueOnce([{ tag: 'v0.2.0', prerelease: true }]);
    svc.listMergedPulls.mockResolvedValueOnce([{ number: 1, createdAt: '2026-09-01T10:00:00Z', mergedAt: '2026-09-02T10:00:00Z', changes: 1 }]);
    svc.loadVelocity.mockResolvedValueOnce({ stories: [{ id: 'US-0101', release: 'v0.1.0', toReleaseMs: 864e5 }] });
    const { delivery } = await call('project:velocity', {}, projectId, 'default');
    expect(delivery.readouts).toMatchObject({ leadMs: 864e5, failureRate: 1 });
    expect(delivery.releases.map((r) => [r.release, r.failed, r.prerelease, r.fixes])).toEqual([
      ['v0.1.0', true, false, ['US-0057']],
      ['v0.2.0', true, true, []]
    ]);
    expect(delivery.pulls).toMatchObject({ count: 1, medianRounds: 2 });
    expect(delivery.missing).toEqual([]);
    expect(svc.listReleases).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'github' }), expect.objectContaining({ credentials: svc.loadBitbucket }));
    expect(svc.listMergedPulls).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'github' }),
      expect.objectContaining({ credentials: svc.loadBitbucket })
    );
  });

  it('names a failing release list and pull request read as missing sources, and keeps the rest', async () => {
    const { projectId } = await openProject('/work/delivery-offline');
    svc.loadFeatures.mockResolvedValueOnce({ available: true, overviewPath: 'docs/FEATURES.md', epics: [fixEpic] });
    svc.listReleaseTags.mockResolvedValueOnce(deliveryTags);
    svc.listReleases.mockRejectedValueOnce(platformError('not-logged-in'));
    svc.listMergedPulls.mockRejectedValueOnce(platformError('timeout'));
    const { delivery } = await call('project:velocity', {}, projectId, 'default');
    expect(delivery.missing).toEqual([
      { kind: 'releases', path: 'GitHub', error: 'GitHub: not-logged-in' },
      { kind: 'pulls', path: 'GitHub', error: 'GitHub: timeout' }
    ]);
    expect(delivery.readouts.failureRate).toBe(0.5); // the Fault in line still counts (FR3.4)
    expect(delivery.pulls).toBeNull();
    svc.listReleases.mockRejectedValueOnce(platformError('unknown-platform'));
    const gitlab = await call('project:velocity', {}, projectId, 'default');
    expect(gitlab.delivery.missing).toEqual([{ kind: 'releases', path: 'GitHub', error: null }]);
  });

  it('reads no git history without epic files', async () => {
    const { projectId } = await openProject('/work/velocity-nodocs');
    svc.storyMarkerHistory.mockClear();
    svc.loadFeatures.mockResolvedValueOnce({ available: false, overviewPath: 'docs/FEATURES.md' });
    await call('project:velocity', {}, projectId, 'default');
    expect(svc.storyMarkerHistory).not.toHaveBeenCalled();
    expect(svc.loadVelocity.mock.lastCall[4]).toMatchObject({ history: null, featuresDir: null });
  });
});

describe('feature docs and project settings', () => {
  it('loads features and story links', async () => {
    const { projectId } = await openProject('/work/feat');
    svc.listReleaseTags.mockResolvedValueOnce([{ name: 'v0.2.4', date: '2026-11-14' }]);
    expect(await call('features:load', {}, projectId)).toEqual({ epics: [], tags: [{ name: 'v0.2.4', date: '2026-11-14' }] });
    expect(svc.listReleaseTags).toHaveBeenLastCalledWith('/work/feat');
    expect(await call('features:storyLinks', {}, projectId, null)).toEqual({});
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: 'a' }, { dirName: 'b', missingOnDisk: true }] });
    await call('features:storyLinks', {}, projectId, 'default');
    expect(svc.loadStoryLinks).toHaveBeenLastCalledWith('/work/feat', 'default', ['a']);
  });

  it('loads the stories each intent delivered, intents missing on disk left out (US-1303 FR1)', async () => {
    const { projectId } = await openProject('/work/delivered');
    expect(await call('features:delivered', {}, projectId, null)).toEqual({ stories: {}, hand: {} });
    expect(svc.loadDelivered).not.toHaveBeenCalled();
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: 'a' }, { dirName: 'b', missingOnDisk: true }] });
    svc.loadDelivered.mockResolvedValueOnce({ stories: { a: ['US-1303'] }, hand: {} });
    expect(await call('features:delivered', {}, projectId, 'default')).toEqual({ stories: { a: ['US-1303'] }, hand: {} });
    expect(svc.loadIntentList).toHaveBeenLastCalledWith('/work/delivered', 'default', []);
    expect(svc.loadDelivered).toHaveBeenLastCalledWith('/work/delivered', 'default', ['a']);
  });

  it('links an intent to stories by hand, only an intent of the space, and reloads the views (US-1303 FR5)', async () => {
    const { projectId, sender } = await openProject('/work/link');
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: '261126-a' }] });
    svc.setHandLink.mockResolvedValueOnce({ '261126-a': ['US-1303'] });
    expect(await call('features:setStoryLink', {}, projectId, 'default', '261126-a', ['US-1303'])).toEqual({ '261126-a': ['US-1303'] });
    expect(svc.setHandLink).toHaveBeenLastCalledWith('/work/link', '261126-a', ['US-1303']);
    expect(sender.send).toHaveBeenCalledWith('features:changed', { projectId });
    svc.setHandLink.mockClear();
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: '261126-a' }] });
    await expect(call('features:setStoryLink', {}, projectId, 'default', '../elsewhere', ['US-1303'])).rejects.toThrow();
    expect(svc.setHandLink).not.toHaveBeenCalled();
  });

  it('saves only the known project settings and stops the feature watch when hidden', async () => {
    const { projectId, sender } = await openProject('/work/ps');
    expect(await call('projectSettings:get', {}, projectId)).toMatchObject({ featureDocs: 'show' });
    svc.getProjectSettings.mockResolvedValueOnce({ featureDocs: 'hide' });
    const next = await call('projectSettings:set', {}, projectId, { featureDocs: 'hide', delivery: 'continuous', evil: 1 });
    expect(next).toEqual({ featureDocs: 'hide', featuresPath: undefined, harness: undefined, harnessTabs: undefined, delivery: 'continuous' });
    expect(sender.send).toHaveBeenCalledWith('features:changed', { projectId });
  });

  it('marks a story for a release with named fields only, and reads the rule status for the saved delivery (US-0603 FR2.3, FR5.2)', async () => {
    const { projectId, sender } = await openProject('/work/rel');
    sender.send.mockClear();
    const req = { storyId: 'US-0603', version: 'v0.2.6', epicHash: 'e', overviewHash: 'o' };
    expect(await call('features:setRelease', {}, projectId, { ...req, file: '/etc/passwd' })).toEqual({ ok: true, inPlace: true });
    // US-0607 FR1.1: the action goes through the planning record and commit, with the project's paths from main only.
    expect(svc.planAction).toHaveBeenLastCalledWith(
      expect.objectContaining({
        root: '/work/rel',
        featuresPath: 'docs/FEATURES.md',
        planningBranch: 'docs/planning',
        userData: '/nonexistent/thadeus-ipc-test'
      }),
      { kind: 'setRelease', storyIds: ['US-0603'], version: 'v0.2.6' },
      { epicHash: 'e', overviewHash: 'o' }
    );
    expect(sender.send).toHaveBeenCalledWith('features:changed', { projectId });

    sender.send.mockClear();
    svc.planAction.mockResolvedValueOnce({ conflict: 'docs/FEATURES.md', kept: true });
    expect(await call('features:setRelease', {}, projectId, req)).toEqual({ conflict: 'docs/FEATURES.md', kept: true });
    expect(sender.send).not.toHaveBeenCalledWith('features:changed', { projectId });
    expect(sender.send).toHaveBeenCalledWith('features:planningChanged', expect.objectContaining({ projectId })); // it waits (US-0608 FR1.3)

    expect(await call('features:ruleStatus', {}, projectId, 'default')).toBe('current');
    expect(svc.readRuleStatus).toHaveBeenLastCalledWith('/work/rel', 'default', 'releases'); // unset means Releases
    svc.getProjectSettings.mockResolvedValueOnce({ featuresPath: 'docs/FEATURES.md', delivery: 'continuous' });
    await call('features:ruleStatus', {}, projectId, 'default');
    expect(svc.readRuleStatus).toHaveBeenLastCalledWith('/work/rel', 'default', 'continuous');
  });

  it('creates and deletes a release through the planning record, and reports and pushes planning (US-0607 FR4.1, FR1.3)', async () => {
    const { projectId, sender } = await openProject('/work/plan');
    await call('features:createRelease', {}, projectId, 'v1.0.0');
    expect(svc.planAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ root: '/work/plan' }),
      { kind: 'createRelease', storyIds: [], version: 'v1.0.0' },
      null
    );
    await call('features:deleteRelease', {}, projectId, { version: 'v1.0.0', hash: 'h' });
    expect(svc.planAction).toHaveBeenLastCalledWith(expect.anything(), { kind: 'deleteRelease', storyIds: [], version: 'v1.0.0' }, { hash: 'h' });

    svc.reapplyLost.mockResolvedValueOnce({ reapplied: 2 });
    sender.send.mockClear();
    expect(await call('features:planningStatus', {}, projectId, true)).toEqual({
      pending: 0,
      reapplied: 2,
      noRemote: false,
      prOffer: null,
      error: null,
      target: 'origin/main',
      entries: []
    });
    expect(sender.send).toHaveBeenCalledWith('features:changed', { projectId });
    expect(svc.reapplyLost).toHaveBeenCalledTimes(1);
    await call('features:planningStatus', {}, projectId, false);
    expect(svc.reapplyLost).toHaveBeenCalledTimes(1); // only when the release list opens

    svc.runCycle.mockResolvedValueOnce({ reapplied: 0, pending: 1, error: { kind: 'offline' } });
    expect(await call('features:pushPlanning', {}, projectId)).toEqual({
      pending: 0,
      reapplied: 0,
      noRemote: false,
      prOffer: null,
      error: { kind: 'offline' },
      target: 'origin/main',
      entries: []
    });
    // US-0608 FR7.1: Push now commits what waits at once, without the 30-second window.
    expect(svc.runCycle).toHaveBeenLastCalledWith(expect.objectContaining({ root: '/work/plan', windowMs: 0 }));
  });

  // US-0608 AC1.2.1: an editor save of a feature doc is in the record before the file is written.
  it('records an editor save before writing it, and remembers the app wrote it (FR2.2, D2)', async () => {
    const { projectId } = await openProject('/work/save');
    svc.writeFileSafe.mockResolvedValueOnce({ ok: true, mtimeMs: 2, hash: 'h2' });
    await call('file:write', {}, projectId, 'docs/features/epic-01.md', 'new', { mtimeMs: 1, hash: 'h1' });
    expect(svc.recordContent).toHaveBeenLastCalledWith(expect.objectContaining({ root: '/work/save' }), 'docs/features/epic-01.md', 'new', {
      expectHash: 'h1'
    });
    expect(svc.recordContent.mock.invocationCallOrder.at(-1)).toBeLessThan(svc.writeFileSafe.mock.invocationCallOrder.at(-1));
    expect(svc.noteAppWrite).toHaveBeenLastCalledWith('/work/save', 'docs/features/epic-01.md', 'h1', 'h2');
  });

  // US-0608 FR7.2: every cycle's result reaches the release list at once, a failed one too.
  it('sends every cycle result as features:planningChanged, also a failed one, and resolves a conflict (FR7.2, FR5.3)', async () => {
    const { projectId, sender } = await openProject('/work/live');
    svc.waitingList.mockResolvedValue({ target: 'origin/main', entries: [{ id: 'e1', kind: 'content', storyIds: ['US-0101'], state: 'conflict' }] });
    sender.send.mockClear();
    svc.runCycle.mockRejectedValueOnce(new Error('git missing'));
    await call('features:pushPlanning', {}, projectId);
    expect(sender.send).toHaveBeenCalledWith('features:planningChanged', {
      projectId,
      status: expect.objectContaining({ error: { kind: 'git', reason: 'git missing' }, entries: [expect.objectContaining({ id: 'e1' })] })
    });

    sender.send.mockClear();
    expect(await call('features:resolvePlanning', {}, projectId, 'e1', 'mine')).toMatchObject({ entries: [expect.objectContaining({ id: 'e1' })] });
    expect(svc.resolvePlanning).toHaveBeenLastCalledWith(expect.objectContaining({ root: '/work/live' }), 'e1', 'mine');
    expect(sender.send).toHaveBeenCalledWith('features:planningChanged', expect.objectContaining({ projectId }));
    svc.waitingList.mockResolvedValue({ target: 'origin/main', entries: [] });
  });

  // US-0608 FR2.1: a write the docs watcher sees is recorded as soon as it is seen.
  it('records what the docs watcher sees', async () => {
    const { projectId } = await openProject('/work/seen');
    const featureCall = svc.watchFiles.mock.calls.findLast((c) => c[0].root === '/work/seen' && c[0].paths[0] === 'docs/FEATURES.md');
    svc.recordTree.mockClear();
    featureCall[0].onChange();
    await flush();
    expect(svc.recordTree).toHaveBeenCalledWith(expect.objectContaining({ root: '/work/seen', featuresPath: 'docs/FEATURES.md' }));
    expect(projectId).toBeTruthy();
  });

  it('a feature doc change sends features:changed', async () => {
    const { projectId, sender } = await openProject('/work/fc');
    const featureCall = svc.watchFiles.mock.calls.findLast((c) => c[0].root === '/work/fc' && c[0].paths[0] === 'docs/FEATURES.md');
    featureCall[0].onChange();
    featureCall[0].onError(new Error('x'));
    expect(sender.send).toHaveBeenCalledWith('features:changed', { projectId });
  });

  it('a config file change sends config:changed', async () => {
    const { projectId, sender } = await openProject('/work/cc');
    const cfg = svc.watchFiles.mock.calls.findLast((c) => c[0].root === '/work/cc' && c[0].paths[0] === 'aidlc.settings.json');
    cfg[0].onChange();
    cfg[0].onError(new Error('x'));
    expect(sender.send).toHaveBeenCalledWith('config:changed', { projectId });
  });
});

describe('terminal, window and menu', () => {
  it('spawns with the saved tool paths and passes write, resize and kill through', async () => {
    const { projectId, event } = await openProject('/work/pty');
    svc.getSettings.mockResolvedValueOnce({ toolPaths: { claude: '/c' } });
    expect(await call('pty:spawn', event, { projectId, kind: 'agent', harness: 'claude', cols: 80, rows: 24 })).toBe('pty-1');
    expect(svc.spawnSession).toHaveBeenLastCalledWith(expect.objectContaining({ root: '/work/pty', toolPaths: { claude: '/c' }, sender: event.sender }));
    await call('pty:write', {}, 'pty-1', 'x');
    await call('pty:resize', {}, 'pty-1', 100, 30);
    await call('pty:kill', {}, 'pty-1');
    expect(svc.writeSession).toHaveBeenCalledWith('pty-1', 'x');
    expect(svc.resizeSession).toHaveBeenCalledWith('pty-1', 100, 30);
    expect(svc.killSession).toHaveBeenCalledWith('pty-1');
    await expect(call('pty:spawn', event, { projectId: 'nope' })).rejects.toThrow(/Okänt projekt/);
  });

  // US-0806: the agent command comes from the project settings in main, checked once before the tab starts.
  it('pty:spawn reads the saved command in main, never from the tab, and checks its first word once (NFR1, NFR3, FR2.1)', async () => {
    const { projectId, event } = await openProject('/work/cmd');
    svc.getProjectSettings.mockResolvedValueOnce({ featureDocs: 'show', agentCommands: { codex: 'codex --full-auto', claude: 'claude --x' } });
    svc.agentCommandFound.mockClear();
    const sent = { projectId, kind: 'agent', harness: 'codex', command: 'rm -rf ~', cols: 80, rows: 24 };
    expect(await call('pty:spawn', event, sent)).toBe('pty-1');
    expect(svc.agentCommandFound).toHaveBeenCalledTimes(1);
    expect(svc.agentCommandFound).toHaveBeenCalledWith('codex', '/work/cmd');
    expect(svc.spawnSession).toHaveBeenLastCalledWith(expect.objectContaining({ harness: 'codex', command: 'codex --full-auto', root: '/work/cmd' }));
  });

  it('pty:spawn starts nothing and answers notFound when the first word is missing (FR4.1)', async () => {
    const { projectId, event } = await openProject('/work/nf');
    svc.getProjectSettings.mockResolvedValueOnce({ featureDocs: 'show', agentCommands: { kiro: '~/bin/my-cli -p x=1' } });
    svc.agentCommandFound.mockResolvedValueOnce(false);
    svc.spawnSession.mockClear();
    expect(await call('pty:spawn', event, { projectId, kind: 'agent', harness: 'kiro', cols: 80, rows: 24 })).toEqual({ notFound: '~/bin/my-cli' });
    expect(svc.spawnSession).not.toHaveBeenCalled();
  });

  it('pty:spawn checks nothing without a saved command, and never for the shell tab (FR2.2, NFR3)', async () => {
    const { projectId, event } = await openProject('/work/nc');
    svc.agentCommandFound.mockClear();
    await call('pty:spawn', event, { projectId, kind: 'agent', harness: 'claude', cols: 80, rows: 24 });
    expect(svc.spawnSession.mock.calls.at(-1)[0].command).toBeUndefined();
    svc.getProjectSettings.mockResolvedValueOnce({ featureDocs: 'show', agentCommands: { claude: 'claude --x' } });
    await call('pty:spawn', event, { projectId, kind: 'shell', cols: 80, rows: 24 });
    expect(svc.spawnSession.mock.calls.at(-1)[0].command).toBeUndefined();
    expect(svc.agentCommandFound).not.toHaveBeenCalled();
  });

  it('projectSettings:set passes the agent commands on to settings.js, which checks them (US-0806 FR3.2, NFR1)', async () => {
    const { projectId } = await openProject('/work/psc');
    await call('projectSettings:set', {}, projectId, { agentCommands: { codex: 'codex --full-auto' } });
    expect(svc.setProjectSettings).toHaveBeenLastCalledWith('/work/psc', expect.objectContaining({ agentCommands: { codex: 'codex --full-auto' } }));
  });

  it('toggles and reports fullscreen', async () => {
    await call('window:toggleFullscreen', { sender: {} });
    expect(m.win.setFullScreen).toHaveBeenCalledWith(true);
    expect(await call('window:isFullscreen', { sender: {} })).toBe(false);
  });

  it('applies a valid menu state and ignores anything else', async () => {
    await call('menu:state', { sender: {} }, { a: true });
    expect(svc.setMenuState).toHaveBeenCalledWith({ a: true });
    svc.setMenuState.mockClear();
    await call('menu:state', { sender: {} }, 'junk');
    expect(svc.setMenuState).not.toHaveBeenCalled();
  });
});

describe('closing windows', () => {
  function fakeWin() {
    const on = {};
    const wcOn = {};
    return {
      on: vi.fn((e, f) => (on[e] = f)),
      close: vi.fn(),
      webContents: { isDestroyed: vi.fn(() => false), send: vi.fn(), on: vi.fn((e, f) => (wcOn[e] = f)) },
      fire: (e, ev) => on[e](ev),
      fireWc: (e) => wcOn[e]()
    };
  }

  it('asks the renderer before closing, and closes after app:closeConfirmed true', async () => {
    const win = fakeWin();
    ipc.guardClose(win);
    const ev = { preventDefault: vi.fn() };
    win.fire('close', ev);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('app:confirmClose');
    electron.BrowserWindow.fromWebContents.mockReturnValueOnce(win);
    await call('app:closeConfirmed', { sender: {} }, true);
    expect(win.close).toHaveBeenCalled();
    const again = { preventDefault: vi.fn() };
    win.fire('close', again);
    expect(again.preventDefault).not.toHaveBeenCalled();
  });

  it('keeps the window on false, and quits when quitting was noted', async () => {
    const win = fakeWin();
    ipc.guardClose(win);
    await call('app:closeConfirmed', { sender: {} }, false);
    expect(win.close).not.toHaveBeenCalled();
    ipc.noteQuitting();
    electron.BrowserWindow.fromWebContents.mockReturnValueOnce(win);
    await call('app:closeConfirmed', { sender: {} }, true);
    expect(electron.app.quit).toHaveBeenCalled();
  });

  it('closes without asking once the renderer is gone', () => {
    const win = fakeWin();
    ipc.guardClose(win);
    win.fireWc('render-process-gone');
    const ev = { preventDefault: vi.fn() };
    win.fire('close', ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });
});

describe('agent dialogs wiring (US-0506 u1 LC6)', () => {
  it('registers the three agentEvents handlers and lists the audit questions of a project without hook sessions', async () => {
    for (const ch of ['agentEvents:list', 'agentEvents:answer', 'agentEvents:close']) expect(m.handlers.has(ch)).toBe(true);
    svc.loadPendingQuestions.mockResolvedValueOnce([{ id: 'aq1', projectId: 'x', intent: 'i1', stage: 's1', text: 'Fråga?', options: ['A'], timeMs: 7 }]);
    const { projectId, sender } = await openProject('/work/agent');
    await flush();
    const events = await call('agentEvents:list', {}, projectId);
    expect(events.map((e) => [e.source, e.questions[0].text, e.early])).toEqual([['audit', 'Fråga?', true]]);
    expect(sender.send).toHaveBeenCalledWith('agent-events:changed', expect.objectContaining({ projectId }));
    await expect(call('agentEvents:answer', {}, events[0].eventId, { question: { picks: [[0]], own: [null] } })).rejects.toThrow();
    expect(await call('agentEvents:close', {}, events[0].eventId)).toEqual({ state: 'dismissed' });
  });

  it('pty:write calls terminalInput before writeSession, in the same call (US-0506 u3 BR6.6, SD10)', async () => {
    svc.writeSession.mockClear();
    const write = call('pty:write', {}, 'pty-9', 'a');
    expect(m.agentWiring.terminalInput).toHaveBeenCalledWith('pty-9', 'a');
    expect(svc.writeSession).toHaveBeenCalledWith('pty-9', 'a'); // already written, before any await
    expect(m.agentWiring.terminalInput.mock.invocationCallOrder.at(-1)).toBeLessThan(svc.writeSession.mock.invocationCallOrder.at(-1));
    await write;
  });

  it('passes settingsNow to the store and notifies each added event with its window, the active project and its name (US-0506 u5)', async () => {
    expect(m.storeDeps.settings).toBe(svc.settingsNow);
    const { projectId } = await openProject('/work/notified');
    await call('questions:activeProject', {}, projectId);
    const ev = { eventId: 'h1-x', projectId, kind: 'reply' };
    m.onAdded(ev);
    expect(svc.notifyEvent).toHaveBeenCalledWith(ev, {
      settings: { replyAlerts: 'line' },
      win: m.win,
      activeProjectId: projectId,
      projectName: 'notified',
      timing: expect.objectContaining({ stamp: expect.any(Function) })
    });
    m.onAdded({ eventId: 'h2-x', projectId: 'gone', kind: 'question' });
    expect(svc.notifyEvent.mock.calls.at(-1)[1]).toMatchObject({ win: null, projectName: '' });
  });

  it('an agent tab spawns without channel variables while its hooks are not current (US-0506 u4 C5)', async () => {
    const { projectId, event } = await openProject('/work/nohooks');
    await call('pty:spawn', event, { projectId, kind: 'agent', harness: 'claude', cols: 80, rows: 24 });
    const args = svc.spawnSession.mock.calls.at(-1)[0];
    expect(args.env).toBeUndefined();
    expect(args.onExit).toBeUndefined();
  });
});

describe('intents:rename (US-0508)', () => {
  const listed = [{ dirName: '261123-rename-and-clean', slug: 'rename-and-clean', aidlcSlug: 'rename-and-clean' }];
  const changed = (projectId) => ['project:changed', { projectId, space: 'default', dirNames: [], indexChanged: true, costChanged: false }];

  it('saves the name against the space list and tells the renderer to reload it (FR1.3, FR1.5)', async () => {
    const { projectId, sender } = await openProject('/work/rename');
    svc.loadIntentList.mockResolvedValueOnce({ intents: listed });
    sender.send.mockClear();
    expect(await call('intents:rename', {}, projectId, '261123-rename-and-clean', 'tidy-up')).toEqual({ ok: true, name: 'tidy-up' });
    expect(svc.setIntentName).toHaveBeenLastCalledWith('/work/rename', '261123-rename-and-clean', 'tidy-up', { intents: listed });
    expect(sender.send).toHaveBeenCalledWith(...changed(projectId));
  });

  it('a refused name comes back with its reason and sends nothing (FR1.3)', async () => {
    const { projectId, sender } = await openProject('/work/rename-bad');
    svc.setIntentName.mockResolvedValueOnce({ ok: false, error: 'taken' });
    sender.send.mockClear();
    expect(await call('intents:rename', {}, projectId, '261123-rename-and-clean', 'other')).toEqual({ ok: false, error: 'taken' });
    expect(sender.send).not.toHaveBeenCalledWith('project:changed', expect.anything());
  });

  it('a change to intent-names.json, also one pulled from another clone, reloads the list; other .thadeus files do not (FR1.7)', async () => {
    const { projectId, sender } = await openProject('/work/rename-watch');
    const onChange = svc.watchThadeus.mock.calls.at(-1)[1];
    sender.send.mockClear();
    await onChange([{ file: '.thadeus/tokens/x.json' }]);
    expect(sender.send).not.toHaveBeenCalledWith('project:changed', expect.anything());
    await onChange([{ file: '.thadeus/intent-names.json' }]);
    expect(sender.send).toHaveBeenCalledWith(...changed(projectId));
  });
});

describe('archive and unarchive (US-0513)', () => {
  const row = (dirName, over = {}) => ({ dirName, slug: `shown-${dirName}`, aidlcSlug: `slug-${dirName}`, status: 'complete', active: false, ...over });
  const changed = (projectId) => ['project:changed', { projectId, space: 'default', dirNames: [], indexChanged: true, costChanged: false }];
  beforeEach(() => {
    for (const f of ['archiveIntents', 'unarchiveIntent', 'beforeArchive', 'commitArchive']) svc[f].mockClear();
    svc.loadIntentList.mockResolvedValue({ intents: [row('a'), row('b')] });
  });
  afterAll(() => svc.loadIntentList.mockResolvedValue({ intents: [] }));

  it('archives the names against the space list, commits what changed, and reloads the list (FR1.3, FR5.1)', async () => {
    const { projectId, sender } = await openProject('/work/archive');
    svc.archiveIntents.mockResolvedValueOnce({ ok: true, archived: ['b'], refused: [{ dirName: 'a', error: 'no' }], files: ['x'] });
    sender.send.mockClear();
    expect(await call('intents:archive', {}, projectId, ['b', 'a'], 'done')).toEqual({
      ok: true,
      archived: ['b'],
      refused: [{ dirName: 'a', error: 'no' }],
      commit: { state: 'waiting' }
    });
    const [root, dirNames, reason, opts] = svc.archiveIntents.mock.calls[0];
    expect([root, dirNames, reason, opts.space, opts.intents.length]).toEqual(['/work/archive', ['b', 'a'], 'done', 'default', 2]);
    expect(svc.beforeArchive.mock.invocationCallOrder[0]).toBeLessThan(svc.archiveIntents.mock.invocationCallOrder[0]);
    expect(svc.commitArchive).toHaveBeenCalledWith(
      expect.objectContaining({ root: '/work/archive', planningOff: false, online: expect.any(Function) }),
      { branch: 'main', dirtyIndex: false },
      { verb: 'archive', slugs: ['slug-b'], files: ['x'] } // AI-DLC's own slug of the archived one only
    );
    expect(sender.send).toHaveBeenCalledWith(...changed(projectId));
  });

  it('sends the progress to its window, and says when the planning sync is off in the project', async () => {
    const { projectId, sender } = await openProject('/work/archive-progress');
    svc.getProjectSettings.mockResolvedValue({ featureDocs: 'hide', featuresPath: 'docs/FEATURES.md' });
    svc.archiveIntents.mockImplementationOnce(async (_root, _names, _reason, { onProgress }) => {
      onProgress({ n: 1, total: 2 });
      return { ok: true, archived: ['a'], refused: [], files: ['x'] };
    });
    await call('intents:archive', {}, projectId, ['a', 'b']);
    svc.getProjectSettings.mockResolvedValue({ featureDocs: 'show', featuresPath: 'docs/FEATURES.md' });
    expect(sender.send).toHaveBeenCalledWith('intents:archiveProgress', { projectId, n: 1, total: 2 });
    expect(svc.commitArchive.mock.calls[0][0].planningOff).toBe(true);
  });

  it('main itself checks the active in-flight intent before its command, from what it sees now (FR1.5, AC1.2.3)', async () => {
    const { projectId } = await openProject('/work/archive-blocked');
    let blocked;
    svc.archiveIntents.mockImplementationOnce(async (_root, _names, _reason, opts) => {
      blocked = opts.blocked;
      return { ok: true, archived: [], refused: [], files: [] };
    });
    await call('intents:archive', {}, projectId, ['a']);
    const active = (over = {}) =>
      svc.loadIntentList.mockResolvedValue({ intents: [row('a', { status: 'in-flight', active: true, activityAt: 0, ...over }), row('b')] });
    const rows = vi.spyOn(m.store, 'activity').mockReturnValue([]);
    const why = (code) => t(`intents.archive.blocked.${code}`);

    active();
    expect(await blocked('a')).toBeNull();
    expect(svc.loadIntentList).toHaveBeenLastCalledWith('/work/archive-blocked', 'default', ['a']); // a fresh read
    active({ activityAt: Date.now() });
    expect(await blocked('a')).toBe(why('elsewhere'));
    svc.hasAgentSession.mockReturnValue(true);
    expect(await blocked('a')).toBe(why('running'));
    active({ parked: true, activityAt: Date.now() });
    expect(await blocked('a')).toBeNull(); // parked: an open session does not run it
    rows.mockReturnValue([{ state: 'idle' }, { state: 'tool' }]);
    expect(await blocked('a')).toBe(why('busy'));
    expect(await blocked('b')).toBeNull(); // a complete one is not blocked
    active({ active: false });
    expect(await blocked('a')).toBeNull(); // nor one that is not active
    rows.mockRestore();
    svc.hasAgentSession.mockReturnValue(false);
  });

  it('a question that came while the app ran blocks it while a session is open, one from the start does not', async () => {
    svc.loadPendingQuestions.mockResolvedValueOnce([{ id: 'arch-early', timeMs: 1 }]);
    const { projectId } = await openProject('/work/archive-asking');
    let blocked;
    svc.archiveIntents.mockImplementationOnce(async (_root, _names, _reason, opts) => {
      blocked = opts.blocked;
      return { ok: true, archived: [], refused: [], files: [] };
    });
    await call('intents:archive', {}, projectId, ['a']);
    svc.loadIntentList.mockResolvedValue({ intents: [row('a', { status: 'in-flight', active: true, parked: true })] });
    svc.hasAgentSession.mockReturnValue(true);
    expect(await blocked('a')).toBeNull();
    svc.loadPendingQuestions.mockResolvedValueOnce([
      { id: 'arch-early', timeMs: 1 },
      { id: 'arch-late', timeMs: 2 }
    ]);
    svc.watchIntents.mock.calls.at(-1)[0].onChange({ dirNames: ['a'], indexChanged: false });
    await flush();
    expect(await blocked('a')).toBe(t('intents.archive.blocked.asking'));
    svc.hasAgentSession.mockReturnValue(false);
    expect(await blocked('a')).toBeNull();
  });

  it('a second start in the same project is refused, and the lock is freed after a run and after a failure (AC4.1.5)', async () => {
    const { projectId } = await openProject('/work/archive-lock');
    const again = await openProject('/work/archive-lock'); // a second window on the same project
    let finish;
    svc.archiveIntents.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const first = call('intents:archive', {}, projectId, ['a']);
    await flush();
    const refused = { ok: false, error: t('intents.archive.running') };
    expect(await call('intents:archive', {}, projectId, ['b'])).toEqual(refused);
    expect(await call('intents:unarchive', {}, again.projectId, 'b')).toEqual(refused);
    finish({ ok: true, archived: ['a'], refused: [], files: ['x'] });
    expect((await first).ok).toBe(true);

    svc.archiveIntents.mockRejectedValueOnce(new Error('boom'));
    await expect(call('intents:archive', {}, projectId, ['b'])).rejects.toThrow('boom');
    expect((await call('intents:unarchive', {}, projectId, 'b')).ok).toBe(true);
  });

  it('a project closed or a space changed during the run does not break it', async () => {
    const { projectId } = await openProject('/work/archive-close');
    let finish;
    svc.archiveIntents.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const run = call('intents:archive', {}, projectId, ['a']);
    await flush();
    await call('project:close', {}, projectId);
    finish({ ok: true, archived: ['a'], refused: [], files: ['x'] });
    expect(await run).toMatchObject({ ok: true, commit: { state: 'waiting' } });
    expect(svc.commitArchive.mock.calls[0][0].root).toBe('/work/archive-close');
  });

  it('a failed commit never hides what was archived', async () => {
    const { projectId } = await openProject('/work/archive-commit');
    svc.archiveIntents.mockResolvedValueOnce({ ok: true, archived: ['a'], refused: [], files: ['x'] });
    svc.commitArchive.mockRejectedValueOnce(new Error('git is gone'));
    expect(await call('intents:archive', {}, projectId, ['a'])).toMatchObject({ archived: ['a'], commit: { state: 'refused', reason: 'git is gone' } });
  });

  it('takes names and a reason only, and runs nothing for anything else (NFR1)', async () => {
    const { projectId } = await openProject('/work/archive-input');
    for (const args of [['a'], [[]], [['a', 7]], [['a'], { text: 'x' }], [undefined]]) {
      await expect(call('intents:archive', {}, projectId, ...args)).rejects.toThrow();
    }
    await expect(call('intents:unarchive', {}, projectId, ['a'])).rejects.toThrow();
    expect(svc.archiveIntents).not.toHaveBeenCalled();
    expect(svc.unarchiveIntent).not.toHaveBeenCalled();
  });

  it('unarchives one, commits it and reloads; a refusal commits nothing (FR2.2)', async () => {
    const { projectId, sender } = await openProject('/work/unarchive');
    sender.send.mockClear();
    expect(await call('intents:unarchive', {}, projectId, 'a')).toEqual({ ok: true, commit: { state: 'waiting' } });
    expect(svc.unarchiveIntent).toHaveBeenCalledWith('/work/unarchive', 'a', expect.objectContaining({ space: 'default' }));
    expect(svc.commitArchive.mock.calls[0][2]).toEqual({ verb: 'unarchive', slugs: ['slug-a'], files: ['f'] });
    expect(sender.send).toHaveBeenCalledWith(...changed(projectId));

    svc.commitArchive.mockClear();
    svc.unarchiveIntent.mockResolvedValueOnce({ ok: false, error: 'not archived', files: [] });
    expect(await call('intents:unarchive', {}, projectId, 'a')).toEqual({ ok: false, error: 'not archived' });
    expect(svc.commitArchive).not.toHaveBeenCalled();
  });

  it('an archived intent that was not complete keeps its recorded readings only, as before it was archived (AC6.1.1)', async () => {
    const { projectId } = await openProject('/work/archive-tokens');
    svc.loadIntentList.mockResolvedValue({ intents: [row('a', { status: 'archived', stateStatus: 'Archived', archivedFrom: 'Running' })] });
    svc.loadAuditEvents.mockClear();
    expect(await call('tokens:readings', {}, projectId, 'a', 'default')).toEqual({ source: 'recorded', readings: [], wallMs: null, gap: null });
    expect(svc.loadAuditEvents).not.toHaveBeenCalled(); // nothing is rebuilt for work that may go on

    svc.loadIntentList.mockResolvedValue({ intents: [row('a', { status: 'archived', stateStatus: 'Archived', archivedFrom: 'Completed' })] });
    expect(await call('tokens:readings', {}, projectId, 'a', 'default')).toMatchObject({ source: 'none' });
    expect(svc.loadAuditEvents).toHaveBeenCalled(); // a finished one is, as a complete intent
  });
});

// US-1407 BR8.5, BR8.6, NFR3.5, NFR3.6, NFR4.5, NFR7.4, NFR7.5 (C10): the switch handlers and the watcher swap.
describe('framework switch (US-1407)', () => {
  const both = { aidlc: true, speckit: true };
  const aidlcDetection = { framework: 'aidlc', isAidlc: true, found: both, activeSpace: 'default', spaces: ['default'] };
  const speckitDetection = { framework: 'speckit', isAidlc: false, found: both, activeSpace: null, spaces: [] };

  /** The watchers started for `root`, by kind, each with its mock `close`. */
  function watchersOf(root) {
    const pick = (fn, match) =>
      fn.mock.calls
        .map((c, i) => [c[0], fn.mock.results[i].value])
        .filter(([arg]) => match(arg))
        .map(([, w]) => w);
    return {
      intents: pick(svc.watchIntents, (a) => a.intentsDir.startsWith(`${root}/`)),
      speckit: pick(svc.watchFiles, (a) => a.root === root && a.paths.includes('specs/**')),
      config: pick(svc.watchFiles, (a) => a.root === root && a.paths.includes('aidlc.settings.json')),
      head: pick(svc.watchOpenFiles, (a) => a.files?.[0] === `${root}/.git/HEAD`)
    };
  }
  const openCount = (ws) => ws.filter((w) => w.close.mock.calls.length === 0).length;

  /** Detection for the re-check, then for after the write. */
  const detectThen = (after) => svc.detectProject.mockResolvedValueOnce({ found: both }).mockResolvedValueOnce(after);

  it('rejects an unknown project id', async () => {
    await expect(call('project:switchPreview', {}, 'nope', 'speckit')).rejects.toThrow(/Okänt projekt/);
    await expect(call('project:switch', {}, 'nope', 'speckit')).rejects.toThrow(/Okänt projekt/);
  });

  it('previews from the open-project root and refuses the current framework (BR8.1)', async () => {
    const { projectId, event } = await openProject('/work/swp', aidlcDetection);
    await expect(call('project:switchPreview', event, projectId, 'aidlc')).rejects.toThrow(/\S/);
    svc.detectProject.mockResolvedValueOnce({ found: { aidlc: true, speckit: false } });
    svc.listSpaces.mockResolvedValueOnce(['default']);
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: '261101-a', slug: 'a', status: 'active' }] });
    const preview = await call('project:switchPreview', event, projectId, 'speckit', '/etc');
    expect(preview).toEqual({ setupNeeded: true, inProgress: [{ kind: 'intent', name: 'a' }], keeps: ['aidlc/'], unread: [] });
    expect(svc.detectProject).toHaveBeenLastCalledWith('/work/swp');
  });

  it('AI-DLC to Spec Kit: one write, the intents watcher closes, the Spec Kit watcher starts, the rest stay, push before reply', async () => {
    const { projectId, event, sender } = await openProject('/work/sw1', aidlcDetection);
    for (const fn of [svc.writeProjectFile, svc.runSetup, svc.runSpeckitSetup, svc.spawnSession]) fn.mockClear();
    const order = [];
    sender.send.mockImplementation((channel) => order.push(channel));
    detectThen(speckitDetection);
    const reply = await call('project:switch', event, projectId, 'speckit').then((r) => {
      order.push('reply');
      return r;
    });
    expect(reply).toEqual({ ok: true, detection: speckitDetection });
    expect(svc.writeProjectFile).toHaveBeenCalledTimes(1);
    expect(svc.writeProjectFile).toHaveBeenCalledWith('/work/sw1', 'speckit');
    expect(sender.send).toHaveBeenCalledWith('project:detected', { projectId, detection: speckitDetection });
    expect(order.indexOf('project:detected')).toBeLessThan(order.indexOf('reply'));
    const w = watchersOf('/work/sw1');
    expect(openCount(w.intents)).toBe(0);
    expect(openCount(w.speckit)).toBe(1);
    expect(openCount(w.config)).toBe(1);
    expect(openCount(w.head)).toBe(1);
    // NFR4.5: neither handler runs a program.
    for (const fn of [svc.runSetup, svc.runSpeckitSetup, svc.spawnSession]) expect(fn).not.toHaveBeenCalled();
  });

  it('Spec Kit to AI-DLC does the reverse, and a round trip ends with one watcher of each kind', async () => {
    const { projectId, event } = await openProject('/work/sw2', speckitDetection);
    detectThen(aidlcDetection);
    await call('project:switch', event, projectId, 'aidlc');
    let w = watchersOf('/work/sw2');
    expect(openCount(w.speckit)).toBe(0);
    expect(openCount(w.intents)).toBe(1);
    expect(svc.watchIntents).toHaveBeenLastCalledWith(expect.objectContaining({ intentsDir: '/work/sw2/aidlc/spaces/default/intents' }));
    detectThen(speckitDetection);
    await call('project:switch', event, projectId, 'speckit');
    detectThen(aidlcDetection);
    await call('project:switch', event, projectId, 'aidlc');
    w = watchersOf('/work/sw2');
    expect(openCount(w.intents)).toBe(1);
    expect(openCount(w.speckit)).toBe(0);
    expect(openCount(w.config)).toBe(1);
  });

  it('serialises overlapping calls: one write, then a BR8.1 refusal (NFR7.5)', async () => {
    const { projectId, event } = await openProject('/work/sw3', aidlcDetection);
    svc.writeProjectFile.mockClear();
    detectThen(speckitDetection);
    const first = call('project:switch', event, projectId, 'speckit');
    const second = call('project:switch', event, projectId, 'speckit');
    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(second).rejects.toThrow(/\S/);
    expect(svc.writeProjectFile).toHaveBeenCalledTimes(1);
    expect(openCount(watchersOf('/work/sw3').speckit)).toBe(1);
  });

  it('refuses with setupNeeded when the target folder is gone, with no write and no push (BR8.4)', async () => {
    const { projectId, event, sender } = await openProject('/work/sw5', aidlcDetection);
    svc.writeProjectFile.mockClear();
    svc.detectProject.mockResolvedValueOnce({ found: { aidlc: true, speckit: false } });
    const reply = await call('project:switch', event, projectId, 'speckit');
    expect(reply).toMatchObject({ ok: false, error: { code: 'setupNeeded' } });
    expect(svc.writeProjectFile).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalledWith('project:detected', expect.anything());
  });

  it('keeps the write when the re-detection throws: { ok: true, detection: null } and a logged error', async () => {
    const { projectId, event, sender } = await openProject('/work/sw4', aidlcDetection);
    svc.detectProject.mockResolvedValueOnce({ found: both }).mockRejectedValueOnce(new Error('gone'));
    const reply = await call('project:switch', event, projectId, 'speckit');
    expect(reply).toEqual({ ok: true, detection: null });
    expect(console.error).toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalledWith('project:detected', expect.anything());
    expect(openCount(watchersOf('/work/sw4').intents)).toBe(1);
  });
});

describe('shutdown', () => {
  it('kills every session and closes every watcher', async () => {
    const { projectId } = await openProject('/work/end');
    await ipc.shutdown();
    expect(svc.killAllSessions).toHaveBeenCalled();
    await expect(call('project:spaces', {}, projectId)).rejects.toThrow(/Okänt projekt/);
  });
});
