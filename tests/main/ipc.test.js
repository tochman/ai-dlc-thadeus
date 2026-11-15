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
      shell: { showItemInFolder: vi.fn(), openPath: vi.fn(async () => ''), openExternal: vi.fn(async () => {}) }
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
      detectProject: vi.fn(async () => ({ isAidlc: true, activeSpace: 'default' })),
      intentsDir: vi.fn((space) => `aidlc/spaces/${space}/intents`),
      listSpaces: vi.fn(async () => ['default']),
      loadCost: vi.fn(async () => ({ available: false })),
      loadIntentDetail: vi.fn(async () => ({ detail: true })),
      loadIntentList: vi.fn(async () => ({ intents: [] })),
      loadPendingQuestions: vi.fn(async () => []),
      loadWorkingAgents: vi.fn(async () => []),
      notifyQuestions: vi.fn(),
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
      applyModelChange: vi.fn(async () => ({ ok: true })),
      checkDrift: vi.fn(async () => ({ drift: false })),
      estimateCost: vi.fn(() => ({ usd: 1 })),
      ledgerRows: vi.fn(() => []),
      modelOptions: vi.fn(async () => ({ editable: true, models: ['m'] })),
      previewModelChange: vi.fn(async () => ({ diff: 'd' })),
      pricesFromLedger: vi.fn(() => ({})),
      fetchRemote: vi.fn(async () => 'fetched'),
      getGitStatus: vi.fn(async () => 'status'),
      getRemoteChanges: vi.fn(async () => 'changes'),
      listConflicts: vi.fn(async () => []),
      showRemoteFile: vi.fn(async () => 'remote'),
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
      setLanguageFromSettings: vi.fn(() => 'sv')
    }
  };
});

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
  loadPendingQuestions: m.svc.loadPendingQuestions,
  loadWorkingAgents: m.svc.loadWorkingAgents
}));
vi.mock('../../src/main/notify.js', () => ({ notifyQuestions: m.svc.notifyQuestions }));
vi.mock('../../src/main/parsers/ledger.js', () => ({ agentName: m.svc.agentName, summarizeLedger: m.svc.summarizeLedger }));
vi.mock('../../src/main/models.js', () => ({ getConfiguredModels: m.svc.getConfiguredModels }));
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
vi.mock('../../src/main/modelChoice.js', () => ({
  applyModelChange: m.svc.applyModelChange,
  checkDrift: m.svc.checkDrift,
  estimateCost: m.svc.estimateCost,
  ledgerRows: m.svc.ledgerRows,
  modelOptions: m.svc.modelOptions,
  previewModelChange: m.svc.previewModelChange,
  pricesFromLedger: m.svc.pricesFromLedger
}));
vi.mock('../../src/main/updater.js', () => ({ createUpdater: () => m.updater }));
vi.mock('../../src/main/git.js', () => ({
  fetchRemote: m.svc.fetchRemote,
  getGitStatus: m.svc.getGitStatus,
  getRemoteChanges: m.svc.getRemoteChanges,
  listConflicts: m.svc.listConflicts,
  showRemoteFile: m.svc.showRemoteFile
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
  getProjectSettings: m.svc.getProjectSettings,
  getSettings: m.svc.getSettings,
  setProjectSettings: m.svc.setProjectSettings,
  setSettings: m.svc.setSettings
}));
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
async function openProject(dir = '/proj', detection = { isAidlc: true, activeSpace: 'default' }) {
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
    const { projectId, sender } = await openProject('/work/plain', { isAidlc: false });
    const { onFound } = svc.watchForAidlc.mock.calls.at(-1)[0];
    svc.detectProject.mockResolvedValueOnce({ isAidlc: true, activeSpace: 'team' });
    await onFound();
    expect(sender.send).toHaveBeenCalledWith('project:detected', { projectId, detection: { isAidlc: true, activeSpace: 'team' } });
  });

  it('logs a failing re-detection and keeps watching', async () => {
    await openProject('/work/plain2', { isAidlc: false });
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
    expect(electron.shell.openExternal).toHaveBeenLastCalledWith('https://github.com/tochman/aidlc-dash');
    await expect(call('app:openExternal', {}, 'https://evil.example')).rejects.toThrow();
    await expect(call('app:openExternal', {}, 'toString')).rejects.toThrow();
    await call('app:openDocsUrl', {});
    expect(electron.shell.openExternal).toHaveBeenLastCalledWith('https://docs.example/aidlc');
    expect(await call('i18n:language', {})).toBe('sv');
  });
});

describe('feature docs and project settings', () => {
  it('loads features and story links', async () => {
    const { projectId } = await openProject('/work/feat');
    expect(await call('features:load', {}, projectId)).toEqual({ epics: [] });
    expect(await call('features:storyLinks', {}, projectId, null)).toEqual({});
    svc.loadIntentList.mockResolvedValueOnce({ intents: [{ dirName: 'a' }, { dirName: 'b', missingOnDisk: true }] });
    await call('features:storyLinks', {}, projectId, 'default');
    expect(svc.loadStoryLinks).toHaveBeenLastCalledWith('/work/feat', 'default', ['a']);
  });

  it('saves only the known project settings and stops the feature watch when hidden', async () => {
    const { projectId, sender } = await openProject('/work/ps');
    expect(await call('projectSettings:get', {}, projectId)).toMatchObject({ featureDocs: 'show' });
    svc.getProjectSettings.mockResolvedValueOnce({ featureDocs: 'hide' });
    const next = await call('projectSettings:set', {}, projectId, { featureDocs: 'hide', evil: 1 });
    expect(next).toEqual({ featureDocs: 'hide', featuresPath: undefined, harness: undefined, harnessTabs: undefined });
    expect(sender.send).toHaveBeenCalledWith('features:changed', { projectId });
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
