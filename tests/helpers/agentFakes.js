// US-0506 u2: fakes for the AgentEventStore tests of permission events (plan Step 3). The channel fake has the C2
// members the store uses plus the main-internal answerState, retract and isLive; every member is a spy whose result
// a test sets. The pty fake records write and tapOutput, so a permission test can assert that no key was ever typed.
import { vi } from 'vitest';

export function fakeChannel() {
  const listeners = [];
  const ch = {
    live: new Set(),
    emit: (raw) => listeners.forEach((fn) => fn(raw)),
    onRawEvent: vi.fn((fn) => listeners.push(fn)),
    isLive: vi.fn((sid) => ch.live.has(sid)),
    ptyOf: vi.fn((sid) => (ch.live.has(sid) ? `pty-${sid}` : null)),
    writeAnswer: vi.fn(async () => {}),
    answerState: vi.fn(async () => ({ folder: true, waiting: true, answerPresent: false, nack: false })),
    retract: vi.fn(async () => false)
  };
  return ch;
}

export function fakePty() {
  return { write: vi.fn(), tapOutput: vi.fn(() => () => {}) };
}
