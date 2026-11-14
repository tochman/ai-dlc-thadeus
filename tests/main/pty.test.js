import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Regression for the v0.1.0 Linux crash: an unloadable node-pty must fail the terminal tab, not the app.
const sender = { isDestroyed: () => false, send: () => {} };
const spawnArgs = { projectId: 'p1', root: process.cwd(), kind: 'shell', cols: 80, rows: 24, sender };

function fakePty() {
  return { spawn: vi.fn(() => ({ onData: () => {}, onExit: () => {}, write: () => {}, resize: () => {}, kill: vi.fn() })) };
}

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.doUnmock('node-pty');
  vi.restoreAllMocks();
});

describe('pty lazy loading (FR2)', () => {
  it('rejects spawn with a Swedish error when node-pty cannot load, and kill functions do not throw', async () => {
    vi.doMock('node-pty', () => {
      throw new Error('GLIBC_2.42 not found');
    });
    const pty = await import('../../src/main/pty.js');

    await expect(pty.spawnSession(spawnArgs)).rejects.toThrow(/^Terminalmodulen kunde inte laddas/);
    expect(() => pty.killAllSessions()).not.toThrow();
    expect(() => pty.killProjectSessions('x')).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it('retries the load after a failure and spawns once node-pty loads', async () => {
    let attempts = 0;
    const working = fakePty();
    vi.doMock('node-pty', () => {
      attempts += 1;
      if (attempts === 1) throw new Error('first load fails');
      return working;
    });
    const pty = await import('../../src/main/pty.js');

    await expect(pty.spawnSession(spawnArgs)).rejects.toThrow(/Terminalmodulen kunde inte laddas/);
    const id = await pty.spawnSession(spawnArgs);
    expect(typeof id).toBe('string');
    expect(working.spawn).toHaveBeenCalledTimes(1);
    pty.killAllSessions();
  });

  it('starts the agent from the fixed table by harness id and refuses anything else (US-0801 FR3.2, FR3.3, NFR4)', async () => {
    const working = fakePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');

    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude' });
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'opencode' });
    expect(working.spawn.mock.calls.map((c) => c[1])).toEqual([
      ['-l', '-i', '-c', 'claude'],
      ['-l', '-i', '-c', 'opencode']
    ]);
    for (const harness of ['codex', 'claude; rm -rf ~', undefined, { id: 'claude' }]) {
      await expect(pty.spawnSession({ ...spawnArgs, kind: 'agent', harness })).rejects.toThrow(/harness/);
    }
    await expect(pty.spawnSession({ ...spawnArgs, kind: 'claude' })).rejects.toThrow(/terminaltyp/); // the old kind is gone
    expect(working.spawn).toHaveBeenCalledTimes(2);
    pty.killAllSessions();
  });

  it('does not load node-pty when pty.js is imported', async () => {
    const factory = vi.fn(fakePty);
    vi.doMock('node-pty', factory);
    const pty = await import('../../src/main/pty.js');

    expect(factory).not.toHaveBeenCalled();
    await pty.spawnSession(spawnArgs);
    expect(factory).toHaveBeenCalledTimes(1);
    pty.killAllSessions();
  });

  it('starts the chosen claude and shell paths, and today\'s ones when nothing is saved (US-0405 FR2.4)', async () => {
    const working = fakePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');
    const tools = await import('../../src/main/tools.js');
    const today = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
    const calls = () => working.spawn.mock.calls.map((c) => [c[0], c[1]]);

    // No saved path: the bare claude from the table and $SHELL, exactly as before.
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude' });
    await pty.spawnSession(spawnArgs);
    expect(calls()).toEqual([
      [today, ['-l', '-i', '-c', 'claude']],
      [today, ['-l']]
    ]);

    // A saved path reaches both tabs; ipc passes it at spawn time.
    const toolPaths = { claude: '/opt/claude/bin/claude', shell: '/bin/dash' };
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', toolPaths });
    await pty.spawnSession({ ...spawnArgs, toolPaths });
    expect(calls().slice(2)).toEqual([
      ['/bin/dash', ['-l', '-i', '-c', '/opt/claude/bin/claude']],
      ['/bin/dash', ['-l']]
    ]);
    expect(tools.toolPath('claude')).toBe('/opt/claude/bin/claude');

    // A path with a space stays one word for the login shell.
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', toolPaths: { claude: '/Applications/Claude Code/claude' } });
    expect(working.spawn.mock.calls[4][1][3]).toBe("'/Applications/Claude Code/claude'");
    pty.killAllSessions();
  });
});
