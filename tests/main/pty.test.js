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

  it('knows whether a project has an agent session open; a shell tab is none (US-0513 FR1.4)', async () => {
    vi.doMock('node-pty', fakePty);
    const pty = await import('../../src/main/pty.js');
    await pty.spawnSession(spawnArgs);
    expect(pty.hasAgentSession('p1')).toBe(false);
    const id = await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude' });
    expect(pty.hasAgentSession('p1')).toBe(true);
    expect(pty.hasAgentSession('p2')).toBe(false);
    pty.killSession(id);
    expect(pty.hasAgentSession('p1')).toBe(false);
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

  it("starts the chosen claude and shell paths, and today's ones when nothing is saved (US-0405 FR2.4)", async () => {
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

describe('agent channel variables, exit and output tap (US-0506 u1 LC5: SD2, RD5, PD2)', () => {
  /** A node-pty fake whose processes let the test fire data and exit. */
  function livePty() {
    const procs = [];
    return {
      procs,
      spawn: vi.fn((_file, _args, options) => {
        const p = { options, data: null, exit: null, write: vi.fn(), resize: () => {}, kill: vi.fn() };
        p.onData = (fn) => (p.data = fn);
        p.onExit = (fn) => (p.exit = fn);
        procs.push(p);
        return p;
      })
    };
  }
  const CHANNEL = { THADEUS_SESSION_DIR: '/x/s1', THADEUS_SESSION_SECRET: 'b'.repeat(64), THADEUS_WAIT_SECONDS: '595' };
  const thadeusKeys = (env) => Object.keys(env).filter((k) => k.startsWith('THADEUS_'));

  afterEach(() => {
    for (const k of Object.keys(process.env)) if (k.startsWith('THADEUS_')) delete process.env[k];
  });

  it('a shell tab gets no inherited THADEUS_* key; an agent tab gets exactly the three channel keys (NFR3.2, SD2)', async () => {
    process.env.THADEUS_SESSION_SECRET = 'stale'.repeat(13);
    process.env.THADEUS_SESSION_DIR = '/stale';
    const working = livePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');

    await pty.spawnSession({ ...spawnArgs, env: CHANNEL });
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', env: CHANNEL });
    const [shell, agent] = working.procs.map((p) => p.options.env);
    expect(thadeusKeys(shell)).toEqual([]);
    expect(Object.fromEntries(thadeusKeys(agent).map((k) => [k, agent[k]]))).toEqual(CHANNEL);
    expect(agent.TERM).toBe('xterm-256color');
    pty.killAllSessions();
  });

  it('claude starts with CLAUDE_CODE_AUTO_COMPACT_WINDOW only when the handoff asks for it (US-0213 FR6.3)', async () => {
    delete process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
    const working = livePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', autoCompactWindow: 150_000 });
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude' });
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'opencode', autoCompactWindow: 150_000 });
    await pty.spawnSession({ ...spawnArgs, kind: 'shell', autoCompactWindow: 150_000 });
    expect(working.procs.map((p) => p.options.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW)).toEqual(['150000', undefined, undefined, undefined]);
    pty.killAllSessions();
  });

  it('childEnv is pure: it drops THADEUS_* from the base and adds only the given keys', async () => {
    const { childEnv } = await import('../../src/main/pty.js');
    const base = { PATH: '/bin', THADEUS_TIMING: '1', THADEUS_X: 'y' };
    expect(childEnv(base, { THADEUS_SESSION_DIR: '/d' })).toEqual({ PATH: '/bin', TERM: 'xterm-256color', COLORTERM: 'truecolor', THADEUS_SESSION_DIR: '/d' });
    expect(base.THADEUS_X).toBe('y');
  });

  it('calls onExit when the process exits (RD5)', async () => {
    const working = livePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');
    const onExit = vi.fn();
    const id = await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', env: CHANNEL, onExit });
    working.procs[0].exit({ exitCode: 0, signal: 0 });
    expect(onExit).toHaveBeenCalledWith({ id, exitCode: 0, signal: 0 });
    expect(() => pty.writeSession(id, 'x')).toThrow();
  });

  it('tapOutput sees the output and stops after its remover runs (PD2)', async () => {
    const working = livePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');
    const id = await pty.spawnSession(spawnArgs);
    const seen = [];
    const off = pty.tapOutput(id, (chunk) => seen.push(chunk));
    working.procs[0].data('one');
    off();
    working.procs[0].data('two');
    expect(seen).toEqual(['one']);
    expect(pty.tapOutput('nope', () => {})()).toBeUndefined();
    pty.killAllSessions();
  });
});
