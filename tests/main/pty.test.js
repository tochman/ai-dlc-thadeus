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
    for (const harness of ['bogus', 'claude; rm -rf ~', undefined, { id: 'claude' }]) {
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

describe('the agent command per project (US-0806 FR2, FR3.3, FR4.1)', () => {
  it('runs a saved command through the login shell in the project folder (FR2.1)', async () => {
    const working = fakePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');
    await pty.spawnSession({ ...spawnArgs, root: '/work/proj', kind: 'agent', harness: 'codex', command: 'codex --full-auto' });
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', command: '~/bin/my-cli -p x=1', toolPaths: { claude: '/opt/claude' } });
    const [first, second] = working.spawn.mock.calls;
    expect(first[1]).toEqual(['-l', '-i', '-c', 'codex --full-auto']);
    expect(first[2].cwd).toBe('/work/proj');
    expect(second[1]).toEqual(['-l', '-i', '-c', '~/bin/my-cli -p x=1']); // the saved command wins over the tool path
    pty.killAllSessions();
  });

  it('without a saved command the table CLI starts, with the chosen tool path (FR2.2)', async () => {
    const working = fakePty();
    vi.doMock('node-pty', () => working);
    const pty = await import('../../src/main/pty.js');
    for (const harness of ['codex', 'kiro', 'cursor', 'copilot']) await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness });
    await pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', command: undefined, toolPaths: { claude: '/opt/claude' } });
    expect(working.spawn.mock.calls.map((c) => c[1][3])).toEqual(['codex', 'kiro-cli', 'cursor-agent', 'copilot', '/opt/claude']);
    pty.killAllSessions();
  });

  it('a command that fails the check throws before node-pty loads (FR3.3)', async () => {
    const factory = vi.fn(fakePty);
    vi.doMock('node-pty', factory);
    const pty = await import('../../src/main/pty.js');
    for (const command of ['claude; rm -rf ~', '$(x)', 'a\nb', '', 'x'.repeat(501)]) {
      await expect(pty.spawnSession({ ...spawnArgs, kind: 'agent', harness: 'claude', command })).rejects.toThrow(/Agentkommandot/);
    }
    expect(factory).not.toHaveBeenCalled();
  });

  it('agentCommandFound runs one fixed command -v script in the login shell, the word as $1 (FR4.1, NFR3)', async () => {
    const pty = await import('../../src/main/pty.js');
    const exec = vi.fn(async () => '/usr/bin/codex\n');
    expect(await pty.agentCommandFound('codex', '/work/proj', { exec })).toBe(true);
    expect(exec).toHaveBeenCalledTimes(1); // no separate PATH read: the login shell sets its own
    const [file, args, options] = exec.mock.calls[0];
    expect(file).toBe(process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'));
    expect(args.slice(0, 3)).toEqual(['-l', '-i', '-c']);
    expect(args[3]).toMatch(/command -v -- "\$p"/);
    expect(args.slice(4)).toEqual(['_', 'codex']); // a positional argument, never spliced into the script
    expect(options.cwd).toBe('/work/proj');

    const missing = vi.fn(async () => {
      throw Object.assign(new Error('exit 1'), { code: 1 });
    });
    expect(await pty.agentCommandFound('nope', '/work/proj', { exec: missing })).toBe(false);
    await expect(pty.agentCommandFound('a;b', '/work/proj', { exec })).resolves.toBe(true); // still only $1: the shell never parses it
    expect(exec.mock.calls[1][1][3]).toBe(args[3]);
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
