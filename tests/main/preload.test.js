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

  it('adds stamp only with --thadeus-timing, as a send, not an invoke (NFR1.7)', async () => {
    expect((await load(false)).agentEvents.stamp).toBeUndefined();
    const bridge = await load(true);
    bridge.agentEvents.stamp('e1', 'dialogShown');
    expect(m.ipcRenderer.send).toHaveBeenCalledWith('agent-timing:stamp', 'e1', 'dialogShown');
    expect(m.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('keeps listQuestions, onQuestions and onQuestionFocus (K15)', async () => {
    const bridge = await load(false);
    await bridge.listQuestions();
    expect(m.ipcRenderer.invoke).toHaveBeenCalledWith('questions:list');
    bridge.onQuestions(() => {});
    bridge.onQuestionFocus(() => {});
    expect(m.ipcRenderer.on.mock.calls.map((c) => c[0])).toEqual(['questions:changed', 'questions:focus']);
  });
});
