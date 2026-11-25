// US-0034: a fixed command can get text on its stdin (the sudo password), never in its args.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultExec, runFixed } from '../../src/main/exec.js';

describe('exec input (US-0034)', () => {
  it('runFixed passes input to exec in the options, not in the args', async () => {
    const exec = vi.fn(async (file, args) => (args[0] === '-l' ? '__AIDLC_DASH_PATH__/usr/bin' : 'ok'));
    await runFixed('/usr/bin/sudo', ['-S', '/usr/bin/true'], { exec, input: 'hunter2\n' });
    const [, args, options] = exec.mock.calls.at(-1);
    expect(options.input).toBe('hunter2\n');
    expect(args).not.toContain('hunter2\n');
  });

  it('runFixed leaves input out when none is given', async () => {
    const exec = vi.fn(async (file, args) => (args[0] === '-l' ? '__AIDLC_DASH_PATH__/usr/bin' : 'ok'));
    await runFixed('git', ['status'], { exec });
    expect('input' in exec.mock.calls.at(-1)[2]).toBe(false);
  });

  it('defaultExec writes input to the child stdin and closes it', async () => {
    expect(await defaultExec('cat', [], { input: 'hello' })).toBe('hello');
  });
});

// US-0804 FR1.1, FR1.3, FR1.6: what the sign-in checks need of a fixed command.
describe('exec for the sign-in checks (US-0804)', () => {
  it('an empty input closes stdin, so a command that reads it gets the end at once, and a missing one still rejects', async () => {
    expect(await defaultExec('cat', [], { input: '', timeout: 5000 })).toBe('');
    await expect(defaultExec('/nonexistent/tool', [], { input: '' })).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('a command that exits without reading its input decides the answer, and the broken pipe is not an uncaught error', async () => {
    const uncaught = vi.fn();
    const saved = process.listeners('uncaughtException');
    process.removeAllListeners('uncaughtException');
    process.on('uncaughtException', uncaught);
    try {
      const input = 'x'.repeat(4 * 1024 * 1024); // more than a pipe holds, so the write is cut off every time
      expect(await defaultExec('/bin/sh', ['-c', 'echo done'], { input })).toBe('done\n');
      await expect(defaultExec('/bin/sh', ['-c', 'exit 3'], { input })).rejects.toMatchObject({ code: 3 });
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      process.removeAllListeners('uncaughtException');
      saved.forEach((listener) => process.on('uncaughtException', listener));
    }
    expect(uncaught).not.toHaveBeenCalled();
  });

  it('a failed command keeps its stderr and its exit code on the error, beside its stdout', async () => {
    const run = defaultExec('/bin/sh', ['-c', 'echo out; echo first >&2; echo second >&2; exit 4']);
    await expect(run).rejects.toMatchObject({ code: 4, stdout: 'out\n', stderr: 'first\nsecond\n' });
  });

  it('runFixed passes killSignal on, and leaves it out when none is given', async () => {
    const exec = vi.fn(async () => 'ok');
    await runFixed('gh', [], { exec, path: '/usr/bin', killSignal: 'SIGKILL' });
    expect(exec.mock.calls[0][2].killSignal).toBe('SIGKILL');
    await runFixed('gh', [], { exec, path: '/usr/bin' });
    expect('killSignal' in exec.mock.calls[1][2]).toBe(false);
  });

  it('SIGKILL stops a command that ignores SIGTERM', async () => {
    const run = runFixed('/bin/sh', ['-c', "trap '' TERM; while :; do sleep 0.1; done"], { path: process.env.PATH, timeout: 300, killSignal: 'SIGKILL' });
    await expect(run).rejects.toMatchObject({ killed: true });
  });
});

// US-0035 FR1.1-FR1.4: the login shell's PATH, read within 20 s, shared while it runs, a fallback never kept.
describe('loginPath (US-0035)', () => {
  let m;
  beforeEach(async () => {
    vi.resetModules(); // an empty login-PATH cache per test
    m = await import('../../src/main/exec.js');
  });

  const answering = (dirs) => vi.fn(async () => `__AIDLC_DASH_PATH__${dirs}`);
  const timedOut = () => vi.fn(async () => Promise.reject(Object.assign(new Error('timeout'), { killed: true })));

  it('gives the PATH a shell that answers (AC1.1.2)', async () => {
    expect(await m.readLoginPath(answering('/opt/a:/opt/b'))).toEqual({ path: '/opt/a:/opt/b', fromFallback: false });
  });

  it('calls the shell with a 20 s limit (FR1.3)', async () => {
    const exec = answering('/opt/a');
    await m.readLoginPath(exec);
    expect(exec.mock.calls[0][2]).toMatchObject({ timeout: 20000 });
  });

  it("gives the app's PATH on a timeout, and the next call starts a new shell (AC1.1.1)", async () => {
    const exec = timedOut();
    expect(await m.readLoginPath(exec)).toEqual({ path: process.env.PATH, fromFallback: true });
    await m.readLoginPath(exec);
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it('falls back the same way on a reply with no marker', async () => {
    const exec = vi.fn(async () => 'Welcome to zsh');
    expect(await m.readLoginPath(exec)).toEqual({ path: process.env.PATH, fromFallback: true });
    await m.readLoginPath(exec);
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it('starts one shell for three calls during one read, and all get its answer (AC1.1.4)', async () => {
    let answer;
    const exec = vi.fn(() => new Promise((resolve) => (answer = resolve)));
    const calls = [m.readLoginPath(exec), m.readLoginPath(exec), m.loginPath(exec)];
    answer('__AIDLC_DASH_PATH__/opt/slow');
    const [a, b, c] = await Promise.all(calls);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ path: '/opt/slow', fromFallback: false });
    expect(b).toEqual(a);
    expect(c).toBe('/opt/slow');
  });

  it('keeps a successful read (no second shell)', async () => {
    const exec = answering('/opt/a');
    await m.readLoginPath(exec);
    expect(await m.loginPath(exec)).toBe('/opt/a');
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('reads again after refreshLoginPath() (AC1.1.3)', async () => {
    const exec = vi.fn().mockResolvedValueOnce('__AIDLC_DASH_PATH__/opt/old').mockResolvedValueOnce('__AIDLC_DASH_PATH__/opt/old:/opt/new');
    await m.readLoginPath(exec);
    m.refreshLoginPath();
    expect((await m.readLoginPath(exec)).path).toBe('/opt/old:/opt/new');
    expect(exec).toHaveBeenCalledTimes(2);
  });
});
