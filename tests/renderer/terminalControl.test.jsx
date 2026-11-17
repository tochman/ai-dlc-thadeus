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

// US-0213 FR3.2, FR3.3, FR5.3, NFR4 and US-0026 FR3.3: the one path a handoff choice is typed through.
import { sendHandoff } from '../../src/renderer/terminalControl.js';

describe('sendHandoff', () => {
  const bridgeOf = ({ lines = ['/compact keep'], waitReady = false, idle = [true], ready = true } = {}) => {
    const idles = [...idle];
    return {
      commands: vi.fn(async () => (lines ? { lines, waitReady } : null)),
      idle: vi.fn(async () => (idles.length > 1 ? idles.shift() : idles[0])),
      waiting: vi.fn(async () => {}),
      waitReady: vi.fn(async () => ready),
      sent: vi.fn(async () => {})
    };
  };

  it('Compact types the fixed line with Enter once the agent is idle, then reports it sent', async () => {
    const bridge = bridgeOf();
    const write = vi.fn();
    await expect(sendHandoff({ bridge, eventId: 'h1', choice: 'compact', write })).resolves.toEqual({ ok: true });
    expect(write.mock.calls).toEqual([['/compact keep\r']]);
    expect(bridge.sent).toHaveBeenCalledWith('h1', 'compact');
  });

  it('Fresh session types /clear, waits for the new session, then /aidlc --resume', async () => {
    const bridge = bridgeOf({ lines: ['/clear', '/aidlc --resume'], waitReady: true });
    const write = vi.fn();
    await sendHandoff({ bridge, eventId: 'h1', choice: 'fresh', write });
    expect(write.mock.calls.flat()).toEqual(['/clear\r', '/aidlc --resume\r']);
    expect(bridge.waitReady.mock.invocationCallOrder[0]).toBeGreaterThan(bridge.commands.mock.invocationCallOrder[0]);
  });

  it('a new session that never gets ready types nothing more and says why', async () => {
    const bridge = bridgeOf({ lines: ['/clear', '/aidlc --resume'], waitReady: true, ready: false });
    const write = vi.fn();
    const out = await sendHandoff({ bridge, eventId: 'h1', choice: 'clearResume', write });
    expect(out).toEqual({ ok: false, reason: 'notReady' });
    expect(write.mock.calls.flat()).toEqual(['/clear\r']);
    expect(bridge.sent).not.toHaveBeenCalled();
  });

  it('while the agent is not idle nothing is typed: the page says it waits, then the line goes once it is idle (FR5.3)', async () => {
    const bridge = bridgeOf({ idle: [false, false, true] });
    const write = vi.fn();
    const onWaiting = vi.fn();
    const done = sendHandoff({ bridge, eventId: 'h1', choice: 'compact', write, onWaiting, pollMs: 500 });
    await vi.advanceTimersByTimeAsync(0);
    expect(write).not.toHaveBeenCalled();
    expect(bridge.waiting).toHaveBeenCalledWith('h1', true);
    expect(onWaiting).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    await done;
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('a harness with no commands, or a choice that was not offered, types nothing (FR3.5)', async () => {
    const bridge = bridgeOf({ lines: null });
    const write = vi.fn();
    expect(await sendHandoff({ bridge, eventId: 'h1', choice: 'compact', write })).toEqual({ ok: false, reason: 'noCommands' });
    expect(write).not.toHaveBeenCalled();
  });
});
