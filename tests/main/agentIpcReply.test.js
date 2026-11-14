// US-0506 u3 LC6: the reply members of the agent IpcRouter, with a fake store (C2, C4, SD9, SD10, SD12, BR6.6).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentIpc } from '../../src/main/agentIpc.js';
import { t } from '../../src/shared/i18n.js';

let store, ipc;
beforeEach(() => {
  store = {
    answer: vi.fn(async () => ({ state: 'sent', via: 'typed' })),
    latest: vi.fn(() => ({ tabId: 'agent:claude', text: 'Hi', status: 'waiting' })),
    reopen: vi.fn(() => ({ state: 'shown' })),
    terminalInput: vi.fn(),
    onChanged: vi.fn()
  };
  ipc = createAgentIpc({ channel: {}, store, timing: { on: false }, hooksCurrent: () => false, senders: () => [] });
});
const call = (ch, ...args) => ipc.handlers[ch]({}, ...args);

describe('agentEvents:answer with a reply (SD9)', () => {
  it('passes { reply: { text } } to the store', async () => {
    await expect(call('agentEvents:answer', 'h1-a', { reply: { text: 'notes.md' } })).resolves.toEqual({ state: 'sent', via: 'typed' });
    expect(store.answer).toHaveBeenCalledWith('h1-a', { reply: { text: 'notes.md' } });
  });

  it('refuses a non-string text before the store', async () => {
    for (const text of [42, null, undefined, ['a']])
      await expect(call('agentEvents:answer', 'h1-a', { reply: { text } })).rejects.toThrow(t('agentDialog.errors.doesNotFit'));
    expect(store.answer).not.toHaveBeenCalled();
  });

  it('refuses a text over 262 144 UTF-16 units before the store, and accepts one at the bound', async () => {
    await expect(call('agentEvents:answer', 'h1-a', { reply: { text: 'a'.repeat(262_145) } })).rejects.toThrow(t('agentDialog.errors.doesNotFit'));
    expect(store.answer).not.toHaveBeenCalled();
    await call('agentEvents:answer', 'h1-a', { reply: { text: 'a'.repeat(262_144) } });
    expect(store.answer).toHaveBeenCalledTimes(1);
  });
});

describe('agentEvents:latest, agentEvents:reopen and terminalInput (C2, C4)', () => {
  it('latest checks the project id and returns the store value', async () => {
    await expect(call('agentEvents:latest', 'p1')).resolves.toEqual({ tabId: 'agent:claude', text: 'Hi', status: 'waiting' });
    expect(store.latest).toHaveBeenCalledWith('p1');
    await expect(call('agentEvents:latest', 7)).rejects.toThrow(t('errors.invalidProjectId'));
    expect(store.latest).toHaveBeenCalledTimes(1);
  });

  it('reopen checks the id and returns { state: "shown" }', async () => {
    await expect(call('agentEvents:reopen', 'h1-a')).resolves.toEqual({ state: 'shown' });
    expect(store.reopen).toHaveBeenCalledWith('h1-a');
  });

  it('reopen refuses an empty, long or non-string id before the store', async () => {
    for (const id of ['', 'x'.repeat(65), 3]) await expect(call('agentEvents:reopen', id)).rejects.toThrow(t('agentDialog.errors.unknownEvent'));
    expect(store.reopen).not.toHaveBeenCalled();
  });

  it('terminalInput forwards to the store', () => {
    ipc.terminalInput('pty-1', 'a');
    expect(store.terminalInput).toHaveBeenCalledWith('pty-1', 'a');
  });
});
