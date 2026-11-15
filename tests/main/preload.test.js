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
});
