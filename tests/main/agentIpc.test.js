// US-0506 u1 LC6: the agent part of IpcRouter, with fakes for the channel, the store and the senders (RD5, SD4, OD1, BR2.7).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentIpc } from '../../src/main/agentIpc.js';
import { t } from '../../src/shared/i18n.js';

let channel, store, timing, hooksCurrent, senders, ipc, changed;
const make = (over = {}) => createAgentIpc({ channel, store, timing, hooksCurrent, senders: () => senders, ...over });

beforeEach(() => {
  channel = {
    openSession: vi.fn(async () => ({
      sessionId: 's1',
      waitSeconds: 595,
      env: { THADEUS_SESSION_DIR: '/d', THADEUS_SESSION_SECRET: 'x', THADEUS_WAIT_SECONDS: '595' }
    })),
    bindPty: vi.fn(),
    closeSession: vi.fn(async () => {}),
    dispose: vi.fn(async () => {})
  };
  store = {
    startSession: vi.fn(),
    endSession: vi.fn(),
    list: vi.fn(() => [{ eventId: 'e1' }]),
    answer: vi.fn(async () => ({ state: 'sent', via: 'hook' })),
    close: vi.fn(async () => ({ state: 'handedBack' })),
    harnessOf: vi.fn(() => 'claude'),
    onChanged: vi.fn((fn) => (changed = fn)),
    dispose: vi.fn()
  };
  timing = { on: false, stampFromRenderer: vi.fn() };
  hooksCurrent = vi.fn(async () => true);
  senders = [
    { isDestroyed: () => false, send: vi.fn() },
    { isDestroyed: () => true, send: vi.fn() }
  ];
  ipc = make();
});

const args = { projectId: 'p1', root: '/proj', kind: 'agent', harness: 'claude' };

describe('spawn wiring (BR2.7, RD5)', () => {
  it('an agent spawn with hooks current opens a session, passes its env, then binds the pty and starts the store session', async () => {
    const spawnFn = vi.fn(async () => 'pty-1');
    expect(await ipc.spawn(args, spawnFn)).toBe('pty-1');
    expect(hooksCurrent).toHaveBeenCalledWith('/proj', 'claude');
    expect(channel.openSession).toHaveBeenCalledWith({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    expect(spawnFn).toHaveBeenCalledWith({
      env: { THADEUS_SESSION_DIR: '/d', THADEUS_SESSION_SECRET: 'x', THADEUS_WAIT_SECONDS: '595' },
      onExit: expect.any(Function)
    });
    expect(channel.bindPty).toHaveBeenCalledWith({ sessionId: 's1', ptyId: 'pty-1' });
    expect(store.startSession).toHaveBeenCalledWith({ sessionId: 's1', projectId: 'p1', tabId: 'agent:claude', harness: 'claude', waitSeconds: 595 });
  });

  it('with hooks not current, or for a shell tab, opens no session and passes no env (K4)', async () => {
    hooksCurrent.mockResolvedValueOnce(false);
    const spawnFn = vi.fn(async () => 'pty-2');
    await ipc.spawn(args, spawnFn);
    await ipc.spawn({ ...args, kind: 'shell' }, spawnFn);
    expect(spawnFn.mock.calls).toEqual([[{}], [{}]]);
    expect(channel.openSession).not.toHaveBeenCalled();
  });

  it('a failed spawn closes the session it opened', async () => {
    await expect(ipc.spawn(args, async () => Promise.reject(new Error('no pty')))).rejects.toThrow('no pty');
    expect(channel.closeSession).toHaveBeenCalledWith('s1');
    expect(store.startSession).not.toHaveBeenCalled();
  });

  it('a pty exit ends the store session first, then closes the channel session', async () => {
    let onExit;
    await ipc.spawn(args, async (extra) => {
      onExit = extra.onExit;
      return 'pty-1';
    });
    const order = [];
    store.endSession.mockImplementation(() => order.push('store'));
    channel.closeSession.mockImplementation(async () => order.push('channel'));
    await onExit();
    expect(order).toEqual(['store', 'channel']);
    expect(store.endSession).toHaveBeenCalledWith('s1');
  });

  it('shutdown closes every session and the channel', async () => {
    await ipc.spawn(args, async () => 'pty-1');
    await ipc.shutdown();
    expect(store.endSession).toHaveBeenCalledWith('s1');
    expect(channel.closeSession).toHaveBeenCalledWith('s1');
    expect(channel.dispose).toHaveBeenCalled();
  });
});

describe('handlers (C4, SD4)', () => {
  const answer = (eventId, a) => ipc.handlers['agentEvents:answer']({}, eventId, a);
  const fit = { question: { picks: [[0]], own: [null] } };

  it('lists a project and passes a checked answer and close to the store', async () => {
    expect(await ipc.handlers['agentEvents:list']({}, 'p1')).toEqual([{ eventId: 'e1' }]);
    await expect(ipc.handlers['agentEvents:list']({}, 42)).rejects.toThrow();
    expect(await answer('e1', fit)).toEqual({ state: 'sent', via: 'hook' });
    expect(store.answer).toHaveBeenCalledWith('e1', fit);
    expect(await ipc.handlers['agentEvents:close']({}, 'e1')).toEqual({ state: 'handedBack' });
    await expect(ipc.handlers['agentEvents:close']({}, 7)).rejects.toThrow();
  });

  it.each([
    ['a non-string id', 7, fit],
    ['an id over 64 characters', 'e'.repeat(65), fit],
    ['no question field', 'e1', { picks: [[0]], own: [null] }],
    ['picks not arrays', 'e1', { question: { picks: [0], own: [null] } }],
    ['a fractional index', 'e1', { question: { picks: [[0.5]], own: [null] } }],
    ['a negative index', 'e1', { question: { picks: [[-1]], own: [null] } }],
    ['own not strings', 'e1', { question: { picks: [[0]], own: [3] } }],
    ['no answer', 'e1', null]
  ])('refuses %s before the store sees it', async (_name, eventId, a) => {
    await expect(answer(eventId, a)).rejects.toThrow(t('agentDialog.errors.doesNotFit'));
    expect(store.answer).not.toHaveBeenCalled();
  });

  it('store changes are pushed to every live sender', () => {
    changed({ projectId: 'p1', events: [{ eventId: 'e1' }] });
    expect(senders[0].send).toHaveBeenCalledWith('agent-events:changed', { projectId: 'p1', events: [{ eventId: 'e1' }] });
    expect(senders[1].send).not.toHaveBeenCalled();
    ipc.publish('p2');
    expect(senders[0].send).toHaveBeenLastCalledWith('agent-events:changed', { projectId: 'p2', events: [{ eventId: 'e1' }] });
  });

  it('the timing stamp listener exists only with timing on (OD1)', () => {
    expect(ipc.listeners).toEqual({});
    timing = { on: true, stampFromRenderer: vi.fn() };
    const timed = make();
    timed.listeners['agent-timing:stamp']({}, 'e1', 'dialogShown');
    expect(timing.stampFromRenderer).toHaveBeenCalledWith('e1', 'dialogShown', 'claude');
  });
});
