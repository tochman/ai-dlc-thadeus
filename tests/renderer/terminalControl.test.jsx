import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivity, dropText, runSequence, shellQuote, waitFor } from '../../src/renderer/terminalControl.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A fake pty: every write echoes, so the activity turns busy and then idle after the quiet period. */
function fakeTerm() {
  const activity = createActivity();
  const writes = [];
  return {
    activity,
    writes,
    write: (text) => {
      writes.push(text);
      activity.onData();
    }
  };
}

describe('createActivity', () => {
  it('starts exited, is busy on output and idle after 1.5 s of quiet, exited on exit (FR1.2, NFR3)', () => {
    const a = createActivity();
    const seen = [];
    a.subscribe((s) => seen.push(s));
    expect(a.state).toBe('exited');

    a.onData();
    expect(a.state).toBe('busy');
    vi.advanceTimersByTime(1000);
    a.onData(); // more output restarts the quiet period
    vi.advanceTimersByTime(1400);
    expect(a.state).toBe('busy');
    vi.advanceTimersByTime(200);
    expect(a.state).toBe('idle');

    a.onExit(1);
    expect(a.state).toBe('exited');
    expect(a.exitCode).toBe(1);
    expect(seen).toEqual(['busy', 'idle', 'exited']);
  });
});

describe('runSequence', () => {
  it('waits for idle before each step and adds Enter only to submitted steps (FR2.3)', async () => {
    const term = fakeTerm();
    term.activity.onData();
    const done = runSequence(term, [
      { text: '/aidlc intent 261113-x', submit: true },
      { text: '/aidlc', submit: false }
    ]);

    await vi.advanceTimersByTimeAsync(1000);
    expect(term.writes).toEqual([]); // still busy from earlier output
    await vi.advanceTimersByTimeAsync(600);
    expect(term.writes).toEqual(['/aidlc intent 261113-x\r']);

    term.activity.onData(); // the switch command keeps printing
    await vi.advanceTimersByTimeAsync(1000);
    expect(term.writes).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(600);
    await done;
    expect(term.writes).toEqual(['/aidlc intent 261113-x\r', '/aidlc']);
  });

  it('rejects when the tab never becomes idle within the timeout (FR1.3)', async () => {
    const term = fakeTerm();
    const result = waitFor(term.activity, 'idle', 20000).catch((err) => err);
    await vi.advanceTimersByTimeAsync(20000);
    expect((await result).message).toMatch(/inom 20 s/);

    const seq = runSequence(term, [{ text: 'x', submit: false }], { timeoutMs: 500 }).catch((err) => err);
    await vi.advanceTimersByTimeAsync(500);
    expect(await seq).toBeInstanceOf(Error);
    expect(term.writes).toEqual([]);
  });
});

describe('dropText', () => {
  it('escapes shell characters in each path and joins them with spaces, without Enter', () => {
    expect(shellQuote('/Users/me/Bilder/skärm.png')).toBe('/Users/me/Bilder/skärm.png');
    expect(shellQuote("/tmp/it's (1) $x.png")).toBe("/tmp/it\\'s\\ \\(1\\)\\ \\$x.png");
    expect(shellQuote('/tmp/"quoted".png')).toBe('/tmp/\\"quoted\\".png');
    expect(dropText(['/a b.png', '/c.png', '/d e/f.jpg'])).toBe('/a\\ b.png /c.png /d\\ e/f.jpg ');
    expect(dropText([])).toBe('');
  });
});
