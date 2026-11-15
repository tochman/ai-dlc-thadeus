// US-0506 u5 W1, W3, D4, FR6.1: from an accepted event to a shown notification, with the real store, the real
// notifyEvent wired as ipc.js wires it, a mocked Notification and u1's fake channel.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const shown = [];
vi.mock('electron', () => {
  class Notification {
    static isSupported = () => true;
    constructor(options) {
      this.options = options;
      this.handlers = {};
    }
    on(name, fn) {
      this.handlers[name] = fn;
    }
    show() {
      shown.push(this);
    }
  }
  return { Notification };
});
const { createAgentEventStore } = await import('../../src/main/agentEvents.js');
const { adapters } = await import('../../src/main/agentAdapters.js');
const { notifyEvent } = await import('../../src/main/notify.js');

const FIX = path.resolve(__dirname, '../fixtures/agent-events');
const stop = (text) => Buffer.from(JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: text }));

let listeners, channel, store, win, settings, seq;
const emit = (kind, body, file = `1700000000-${++seq}`) =>
  listeners.forEach((fn) => fn({ sessionId: 's1', version: 'v1', kind, body, file, arrivedAtMs: Date.now(), seq: ++seq }));

beforeEach(() => {
  vi.useFakeTimers();
  shown.length = 0;
  seq = 0;
  listeners = [];
  channel = {
    onRawEvent: (fn) => listeners.push(fn),
    onRefusedReply: () => {},
    isLive: () => true,
    ptyOf: () => 'pty-s1',
    writeAnswer: vi.fn(async () => {}),
    answerState: vi.fn(async () => ({ folder: true, waiting: true, answerPresent: false, nack: false })),
    retract: vi.fn(async () => false)
  };
  settings = {};
  win = {
    isDestroyed: () => false,
    isFocused: () => false,
    isMinimized: () => false,
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    webContents: { send: vi.fn() }
  };
  const timing = { stamp: vi.fn() };
  store = createAgentEventStore({ channel, adapters, pty: { write: vi.fn(), tapOutput: () => () => {} }, timing, log: () => {}, settings: () => settings });
  store.onAdded((ev) => notifyEvent(ev, { settings, win, activeProjectId: 'p1', projectName: 'aidlc-dash', timing }));
  store.startSession({ sessionId: 's1', projectId: 'p1', tabId: 'agent:claude', harness: 'claude', waitSeconds: 595 });
});
afterEach(() => {
  store.dispose();
  vi.useRealTimers();
});

describe('event to notification (US-0506 u5)', () => {
  it('a hook question in the background gives one notification, and its click pushes agent-events:focus', () => {
    emit('question', readFileSync(path.join(FIX, 'claude/gate-2026-11-14.json')));
    const [ev] = store.list('p1');
    expect(shown).toHaveLength(1);
    expect(shown[0].options.title).toBe('Claude Code väntar på dig');
    shown[0].handlers.click();
    expect(win.webContents.send).toHaveBeenCalledWith('agent-events:focus', { eventId: ev.eventId });
  });

  it('a reply with "line" is dismissed at once and gives one notification', () => {
    settings = { replyAlerts: 'line' };
    emit('reply', stop('Done. All tests pass.'));
    expect(store.list('p1').map((e) => e.state)).toEqual(['dismissed']);
    expect(shown.map((n) => n.options.body)).toEqual(['aidlc-dash · Done. All tests pass.']);
  });

  it('the same raw event delivered twice gives one event and one notification', () => {
    emit('reply', stop('Same text'));
    emit('reply', stop('Same text'));
    expect(store.list('p1')).toHaveLength(1);
    expect(shown).toHaveLength(1);
  });
});
