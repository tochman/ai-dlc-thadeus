// US-0034: a fixed command can get text on its stdin (the sudo password), never in its args.
import { describe, expect, it, vi } from 'vitest';
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
