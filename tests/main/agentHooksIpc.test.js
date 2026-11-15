// US-0506 u4 LC34, SD32: the agentHooks IPC handlers check exact argument lists before any file is read, and every
// status change is pushed to the windows and demotes a harness that stopped being current (RD42).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { hooksHandlers, statusPusher } from '../../src/main/agentHooks.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
let installer, handlers;

beforeEach(() => {
  installer = {
    has: vi.fn((id) => id === 'p1'),
    status: vi.fn(async () => []),
    preview: vi.fn(async () => ({ previewId: ID })),
    apply: vi.fn(async () => ({ result: 'written' })),
    cancel: vi.fn()
  };
  handlers = hooksHandlers(installer);
});
afterEach(() => vi.restoreAllMocks());

const reads = () => [vi.spyOn(fs, 'readFile'), vi.spyOn(fs, 'lstat'), vi.spyOn(fs, 'stat')];
const none = (spies) => spies.every((s) => s.mock.calls.length === 0);
const call = (channel, ...args) => handlers[channel]({ sender: {} }, ...args);

describe('agentHooks handlers (SD32)', () => {
  it('pass valid calls to the installer with exactly their arguments', async () => {
    await call('agentHooks:status', 'p1');
    await call('agentHooks:preview', 'p1', 'claude', 'install');
    await call('agentHooks:apply', 'p1', ID);
    await call('agentHooks:cancel', 'p1', ID);
    expect(installer.status).toHaveBeenCalledWith('p1');
    expect(installer.preview).toHaveBeenCalledWith('p1', 'claude', 'install');
    expect(installer.apply).toHaveBeenCalledWith('p1', ID);
    expect(installer.cancel).toHaveBeenCalledWith('p1', ID);
  });

  it.each([
    ['agentHooks:status', []],
    ['agentHooks:status', ['p1', 'x']],
    ['agentHooks:preview', ['p1', 'claude']],
    ['agentHooks:preview', ['p1', 'claude', 'install', 'x']],
    ['agentHooks:preview', ['p1', 'codex', 'install']],
    ['agentHooks:preview', ['p1', 'toString', 'install']],
    ['agentHooks:preview', ['p1', 'claude', 'delete']],
    ['agentHooks:apply', ['p1']],
    ['agentHooks:apply', ['p1', ID, 'claude']],
    ['agentHooks:apply', ['p1', 42]],
    ['agentHooks:apply', ['p1', { previewId: ID }]],
    ['agentHooks:cancel', ['p1', 'not-a-uuid']],
    ['agentHooks:cancel', ['p1', ID, 'remove']]
  ])('%s with %j throws invalidValue and reads no file', async (channel, args) => {
    const spies = reads();
    await expect(call(channel, ...args)).rejects.toThrow(/Ogiltigt värde|Invalid value/);
    expect(none(spies)).toBe(true);
    expect(Object.values(installer).every((fn) => fn === installer.has || fn.mock.calls.length === 0)).toBe(true);
  });

  it('refuses an unknown project before the installer runs', async () => {
    await expect(call('agentHooks:status', 'p9')).rejects.toThrow();
    await expect(call('agentHooks:preview', 7, 'claude', 'install')).rejects.toThrow();
    expect(installer.status).not.toHaveBeenCalled();
    expect(installer.preview).not.toHaveBeenCalled();
  });
});

describe('statusPusher (BR7.17, BR7.18, RD42)', () => {
  const live = { isDestroyed: () => false, send: vi.fn() };
  const gone = { isDestroyed: () => true, send: vi.fn() };
  const h = (harness, status) => ({ harness, used: true, status, files: [] });

  it('pushes agent-hooks:changed to every live window', () => {
    const push = statusPusher({ senders: () => [live, gone], demote: vi.fn() });
    const harnesses = [h('claude', 'missing'), h('opencode', 'missing')];
    push({ projectId: 'p1', root: '/r', harnesses, previous: null });
    expect(live.send).toHaveBeenCalledWith('agent-hooks:changed', { projectId: 'p1', harnesses });
    expect(gone.send).not.toHaveBeenCalled();
  });

  it('demotes a harness that stopped being current, and only that one', () => {
    const demote = vi.fn();
    const push = statusPusher({ senders: () => [], demote });
    push({ projectId: 'p1', root: '/r', harnesses: [h('claude', 'current'), h('opencode', 'current')], previous: null });
    expect(demote).not.toHaveBeenCalled();
    push({
      projectId: 'p1',
      root: '/r',
      harnesses: [h('claude', 'missing'), h('opencode', 'current')],
      previous: [h('claude', 'current'), h('opencode', 'current')]
    });
    expect(demote.mock.calls).toEqual([['/r', 'claude']]);
  });
});
