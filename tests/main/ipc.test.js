// Characterisation tests of the IPC surface (US-0506 Step 3a, K17): today's behaviour of each handler, with
// electron, node-pty and every service ipc.js wires mocked. Later steps extend the mocks, never the behaviour pinned here.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
      loadFeatures: vi.fn(async () => ({ epics: [] })),
      loadStoryLinks: vi.fn(async () => ({})),
      killAllSessions: vi.fn(),
      killProjectSessions: vi.fn(),
      killSession: vi.fn(),
      resizeSession: vi.fn(),
      spawnSession: vi.fn(async () => 'pty-1'),
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
      saveBitbucket: vi.fn(async () => {}),
      clearBitbucket: vi.fn(async () => {}),
      hasBitbucket: vi.fn(async () => true),
      loadBitbucket: vi.fn(async () => ({ username: 'u', appPassword: 'p' })),
      loadMachines: vi.fn(async (_root, _space, intents) => intents.map((i) => ({ ...i, machines: [{ host: 'mac', cloneId: 'a' }] }))),
      loadOpenQuestions: vi.fn(async () => [{ text: 'Q2. Open?', file: 'q.md', time: null }])
    }
  };
});
const platformError = (code) => Object.assign(new Error(`GitHub: ${code}`), { name: 'PlatformError', code, platform: 'GitHub' });

vi.mock('electron', () => m.electron);
vi.mock('node-pty', () => ({ spawn: vi.fn() }));
vi.mock('../../src/main/projectAccess.js', () => ({ openRoot: m.svc.openRoot, readText: m.svc.readText, resolveInRoot: m.svc.resolveInRoot }));
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
  assertName: (name, what) => {
    if (typeof name !== 'string' || !/^[^/\\]+$/.test(name) || name.startsWith('.')) throw new Error(`Ogiltigt ${what}: ${name}`);
  },
  inProgress: (i) => i.status !== 'complete'
}));
vi.mock('../../src/main/platforms/index.js', () => ({ listPulls: m.svc.listPulls, listComments: m.svc.listComments, listReviews: m.svc.listReviews }));
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
  loadStoryLinks: m.svc.loadStoryLinks
}));
vi.mock('../../src/main/releases.js', () => ({ setStoryRelease: m.svc.setStoryRelease, readRuleStatus: m.svc.readRuleStatus }));
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
vi.mock('../../src/main/pty.js', () => ({
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

describe('files, shell and git', () => {
  it('reads, edits and lists files in the project root', async () => {
    const { projectId } = await openProject('/work/files');
    expect(await call('project:file', {}, projectId, 'a.md')).toBe('text');
    expect(await call('file:read', {}, projectId, 'a.md')).toEqual({ content: 'c' });
    await call('file:write', {}, projectId, 'a.md', 'new', { mtimeMs: 1, hash: 'h' });
    expect(svc.writeFileSafe).toHaveBeenCalledWith('/work/files', 'a.md', 'new', { expectMtime: 1, expectHash: 'h' });
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
    expect(res.pull).toEqual({ number: 58, title: 'feat(US-0209): cost', url: 'u58' });
    expect(res.rows.map((r) => r.source)).toEqual(['pull', 'question']);
    expect(res.error).toBeNull();
    expect(svc.listComments).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'github' }), 58, expect.any(Object));

    svc.loadIntentDetail.mockResolvedValueOnce({ dirName: '261116-a', files: [], events: [] });
    svc.loadStoryLinks.mockResolvedValueOnce({ 'US-0209': ['261116-a'] });
    svc.listComments.mockRejectedValueOnce(platformError('timeout'));
    const failed = await call('team:comments', {}, projectId, 'default', '261116-a');
    expect(failed.error).toMatchObject({ code: 'timeout' });
    expect(failed.rows.map((r) => r.source)).toEqual(['question']);
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
    expect(await call('project:velocity', {}, projectId, 'default')).toEqual({ velocity: true });
    expect(svc.loadIntentList).toHaveBeenLastCalledWith('/work/velocity', 'default', []);
    expect(svc.storyMarkerHistory).toHaveBeenLastCalledWith('/work/velocity', 'docs/features');
    expect(svc.loadVelocity).toHaveBeenLastCalledWith('/work/velocity', 'default', [{ dirName: 'a' }], features, {
      tags,
      history: 'LOG',
      featuresDir: 'docs/features'
    });
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

describe('shutdown', () => {
  it('kills every session and closes every watcher', async () => {
    const { projectId } = await openProject('/work/end');
    await ipc.shutdown();
    expect(svc.killAllSessions).toHaveBeenCalled();
    await expect(call('project:spaces', {}, projectId)).rejects.toThrow(/Okänt projekt/);
  });
});
