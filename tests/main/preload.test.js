// US-0506 u1 C4, OD1: the preload's window.bridge, with electron mocked and exposeInMainWorld captured.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  exposed: {},
  ipcRenderer: { invoke: vi.fn(async () => 'ok'), send: vi.fn(), on: vi.fn(), removeListener: vi.fn() }
}));
vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (key, api) => (m.exposed[key] = api) },
  ipcRenderer: m.ipcRenderer,
  webUtils: { getPathForFile: () => '' }
}));

const argv = process.argv;
async function load(flag) {
  vi.resetModules();
  process.argv = flag ? [...argv, '--thadeus-timing'] : [...argv];
  await import('../../src/preload/index.js');
  return m.exposed.bridge;
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  process.argv = argv;
});

describe('preload bridge (US-0506 u1)', () => {
  it('has agentEvents list, answer, close and onChanged on the C4 channels', async () => {
    const bridge = await load(false);
    await bridge.agentEvents.list('p1');
    await bridge.agentEvents.answer('e1', { question: { picks: [[0]], own: [null] } });
    await bridge.agentEvents.close('e1');
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([
      ['agentEvents:list', 'p1'],
      ['agentEvents:answer', 'e1', { question: { picks: [[0]], own: [null] } }],
      ['agentEvents:close', 'e1']
    ]);
    const cb = vi.fn();
    const off = bridge.agentEvents.onChanged(cb);
    const [[channel, listener]] = m.ipcRenderer.on.mock.calls;
    expect(channel).toBe('agent-events:changed');
    listener({}, { projectId: 'p1', events: [] });
    expect(cb).toHaveBeenCalledWith({ projectId: 'p1', events: [] });
    off();
    expect(m.ipcRenderer.removeListener).toHaveBeenCalledWith('agent-events:changed', listener);
  });

  it('has agentEvents latest and reopen on their C4 channels (US-0506 u3)', async () => {
    const bridge = await load(false);
    await bridge.agentEvents.latest('p1');
    await bridge.agentEvents.reopen('e1');
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([
      ['agentEvents:latest', 'p1'],
      ['agentEvents:reopen', 'e1']
    ]);
  });

  it('adds stamp only with --thadeus-timing, as a send, not an invoke (NFR1.7)', async () => {
    expect((await load(false)).agentEvents.stamp).toBeUndefined();
    const bridge = await load(true);
    bridge.agentEvents.stamp('e1', 'dialogShown');
    expect(m.ipcRenderer.send).toHaveBeenCalledWith('agent-timing:stamp', 'e1', 'dialogShown');
    expect(m.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('keeps listQuestions and onQuestions (K15); agentEvents.onFocus replaces onQuestionFocus (US-0506 u5 SD53)', async () => {
    const bridge = await load(false);
    await bridge.listQuestions();
    expect(m.ipcRenderer.invoke).toHaveBeenCalledWith('questions:list');
    bridge.onQuestions(() => {});
    const cb = vi.fn();
    bridge.agentEvents.onFocus(cb);
    expect(m.ipcRenderer.on.mock.calls.map((c) => c[0])).toEqual(['questions:changed', 'agent-events:focus']);
    m.ipcRenderer.on.mock.calls[1][1]({}, { eventId: 'h1-x' });
    expect(cb).toHaveBeenCalledWith({ eventId: 'h1-x' });
    expect(bridge.onQuestionFocus).toBeUndefined();
  });

  it('checkSignIn passes only the tool id (US-0804 NFR1)', async () => {
    const bridge = await load(false);
    await bridge.checkSignIn('gh', { timeout: 1 }, '/bin/rm');
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([['signIn:check', 'gh']]);
  });

  it('has named team methods on the US-1201 channels; the Bitbucket password only ever goes in, with save', async () => {
    const bridge = await load(false);
    await bridge.getPlatform('p1');
    await bridge.getPulls('p1');
    await bridge.getCollisions('p1');
    await bridge.getMachines('p1', 'default');
    await bridge.getStoryComments('p1', 'default', '261116-a');
    await bridge.teamRefresh('p1');
    await bridge.getMergeNote('p1', 'default', '261116-a');
    await bridge.bitbucket.status();
    await bridge.bitbucket.save('thomas', 'pw');
    await bridge.bitbucket.clear();
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([
      ['team:platform', 'p1'],
      ['team:pulls', 'p1'],
      ['team:collisions', 'p1'],
      ['team:machines', 'p1', 'default'],
      ['team:comments', 'p1', 'default', '261116-a'],
      ['team:refresh', 'p1'],
      ['team:mergeNote', 'p1', 'default', '261116-a'],
      ['credentials:bitbucket', { action: 'status' }],
      ['credentials:bitbucket', { action: 'save', username: 'thomas', appPassword: 'pw' }],
      ['credentials:bitbucket', { action: 'clear' }]
    ]);
  });

  it('has agentHooks status, preview, apply, cancel and onChanged, passing exactly their arguments (US-0506 u4 SD32)', async () => {
    const bridge = await load(false);
    await bridge.agentHooks.status('p1');
    await bridge.agentHooks.preview('p1', 'claude', 'install');
    await bridge.agentHooks.apply('p1', 'id-1');
    await bridge.agentHooks.cancel('p1', 'id-1');
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([
      ['agentHooks:status', 'p1'],
      ['agentHooks:preview', 'p1', 'claude', 'install'],
      ['agentHooks:apply', 'p1', 'id-1'],
      ['agentHooks:cancel', 'p1', 'id-1']
    ]);
    const cb = vi.fn();
    bridge.agentHooks.onChanged(cb);
    const [[channel, listener]] = m.ipcRenderer.on.mock.calls;
    expect(channel).toBe('agent-hooks:changed');
    listener({}, { projectId: 'p1', harnesses: [] });
    expect(cb).toHaveBeenCalledWith({ projectId: 'p1', harnesses: [] });
  });

  it('has getVelocity on project:velocity (US-0303 FR3.5)', async () => {
    const bridge = await load(false);
    await bridge.getVelocity('p1', 'default');
    expect(m.ipcRenderer.invoke).toHaveBeenCalledWith('project:velocity', 'p1', 'default');
  });
});

describe('preload bridge (US-0513)', () => {
  it('has archive, unarchive and the progress; only names and a reason cross the bridge', async () => {
    const bridge = await load(false);
    await bridge.archiveIntents('p1', ['a', 'b'], 'done');
    await bridge.unarchiveIntent('p1', 'a');
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([
      ['intents:archive', 'p1', ['a', 'b'], 'done'],
      ['intents:unarchive', 'p1', 'a']
    ]);
    const cb = vi.fn();
    const off = bridge.onArchiveProgress(cb);
    const [[channel, listener]] = m.ipcRenderer.on.mock.calls;
    expect(channel).toBe('intents:archiveProgress');
    listener({}, { projectId: 'p1', n: 1, total: 2 });
    expect(cb).toHaveBeenCalledWith({ projectId: 'p1', n: 1, total: 2 });
    off();
    expect(m.ipcRenderer.removeListener).toHaveBeenCalledWith('intents:archiveProgress', listener);
  });
});

describe('preload bridge (US-1411)', () => {
  it('has archive and unarchive of a Spec Kit feature; only the project and the folder name cross the bridge', async () => {
    const bridge = await load(false);
    await bridge.archiveSpeckitFeature('p1', '001-a');
    await bridge.unarchiveSpeckitFeature('p1', '001-a');
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([
      ['speckit:archive', 'p1', '001-a'],
      ['speckit:unarchive', 'p1', '001-a']
    ]);
  });
});

describe('preload bridge (US-0212)', () => {
  it('has the cost rule calls on their channels; only {on, lines} cross the bridge', async () => {
    const bridge = await load(false);
    await bridge.costRulesStatus('p1');
    await bridge.previewCostRules('p1', { on: true, lines: { project: ['x'] } });
    await bridge.applyCostRules('p1');
    expect(m.ipcRenderer.invoke.mock.calls).toEqual([
      ['costRules:status', 'p1'],
      ['costRules:preview', 'p1', { on: true, lines: { project: ['x'] } }],
      ['costRules:apply', 'p1']
    ]);
  });
});
