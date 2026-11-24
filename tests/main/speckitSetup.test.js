// US-1405 FR3, BR3.1–BR3.7: the Spec Kit setup preview and run, with `specify` simulated through an injected exec.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { INSTALL_HINT, getSpeckitSetupInfo, runSpeckitSetup } from '../../src/main/speckitSetup.js';

const TMP = path.resolve(__dirname, '../.tmp/speckit-setup');
const VERSION = 'specify 1.4.3';

/** Answers `file args` like the real tool; the login-shell PATH probe gets a PATH; anything else is ENOENT. */
function fakeExec(responses, calls = []) {
  return async (file, args, options) => {
    if (file !== 'specify') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push({ file, args, options });
    const key = `${file} ${args.join(' ')}`;
    const answer = responses[key];
    if (answer === undefined) throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT' });
    if (answer instanceof Error) throw answer;
    return answer;
  };
}

/** A temp project with the given entries: names ending in `/` are folders, the rest empty files. */
async function tmpRoot(entries = []) {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
  for (const e of entries) {
    if (e.endsWith('/')) await fs.mkdir(path.join(TMP, e), { recursive: true });
    else await fs.writeFile(path.join(TMP, e), '');
  }
  return openRoot(TMP);
}

afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

describe('getSpeckitSetupInfo (BR3.1, BR3.6)', () => {
  it('gives specifyOnPath false and the install hint when specify is missing, without throwing (AC2.1.2)', async () => {
    const root = await tmpRoot(['.claude/']);
    const info = await getSpeckitSetupInfo(root, { exec: fakeExec({}) });
    expect(info.specifyOnPath).toBe(false);
    expect(info.version).toBeNull();
    expect(info.installHint).toBe('uv tool install specify-cli');
    expect(INSTALL_HINT).toBe(info.installHint);
  });

  it('reads the version when specify is found', async () => {
    const root = await tmpRoot(['.claude/']);
    const info = await getSpeckitSetupInfo(root, { exec: fakeExec({ 'specify --version': `${VERSION}\n` }) });
    expect(info).toMatchObject({ specifyOnPath: true, version: VERSION });
  });

  it('finds no harness, claude, opencode (folder or opencode.json) and both (BR3.1)', async () => {
    const exec = fakeExec({ 'specify --version': VERSION });
    expect((await getSpeckitSetupInfo(await tmpRoot([]), { exec })).harnesses).toEqual([]);
    expect((await getSpeckitSetupInfo(await tmpRoot(['.claude/']), { exec })).harnesses).toEqual(['claude']);
    expect((await getSpeckitSetupInfo(await tmpRoot(['.opencode/']), { exec })).harnesses).toEqual(['opencode']);
    expect((await getSpeckitSetupInfo(await tmpRoot(['opencode.json']), { exec })).harnesses).toEqual(['opencode']);
    expect((await getSpeckitSetupInfo(await tmpRoot(['.claude/', '.opencode/']), { exec })).harnesses).toEqual(['claude', 'opencode']);
  });

  it('takes the one harness the project has, and records the exact command (BR3.4, R-01)', async () => {
    const info = await getSpeckitSetupInfo(await tmpRoot(['.opencode/']), { exec: fakeExec({ 'specify --version': VERSION }) });
    expect(info.harness).toBe('opencode');
    expect(info.command).toEqual(['specify', 'init', '--here', '--force', '--non-interactive', '--integration', 'opencode']);
  });

  it('leaves the harness to the person with none or two, and uses the one picked (R-01)', async () => {
    const exec = fakeExec({ 'specify --version': VERSION });
    const root = await tmpRoot(['.claude/', '.opencode/']);
    const open = await getSpeckitSetupInfo(root, { exec });
    expect(open.harness).toBeNull();
    expect(open.command).toBeNull();
    const picked = await getSpeckitSetupInfo(root, { harness: 'claude', exec });
    expect(picked.harness).toBe('claude');
    expect(picked.command.at(-1)).toBe('claude');
  });

  it('refuses a harness other than claude or opencode (BR3.2)', async () => {
    const root = await tmpRoot([]);
    await expect(getSpeckitSetupInfo(root, { harness: '--yes', exec: fakeExec({}) })).rejects.toThrow(/--yes/);
  });

  it('names what is added, and says when the folder already has files (R-02)', async () => {
    const exec = fakeExec({ 'specify --version': VERSION });
    const empty = await getSpeckitSetupInfo(await tmpRoot([]), { harness: 'claude', exec });
    expect(empty.notEmpty).toBe(false);
    expect(empty.adds).toEqual(['.specify/', '.claude/']);
    const full = await getSpeckitSetupInfo(await tmpRoot(['.git/', 'README.md']), { harness: 'opencode', exec });
    expect(full.notEmpty).toBe(true);
    expect(full.adds).toEqual(['.specify/', '.opencode/']);
    const gitOnly = await getSpeckitSetupInfo(await tmpRoot(['.git/']), { harness: 'claude', exec });
    expect(gitOnly.notEmpty).toBe(false); // a fresh repository counts as empty
  });
});

describe('runSpeckitSetup (BR3.2–BR3.5, BR3.7)', () => {
  const INIT = (h) => `specify init --here --force --non-interactive --integration ${h}`;

  async function preview(harness, responses) {
    const root = await tmpRoot(['.claude/']);
    const info = await getSpeckitSetupInfo(root, { harness, exec: fakeExec({ 'specify --version': VERSION, ...responses }) });
    return { root, info };
  }

  it('refuses an unknown harness, a missing preview and a preview for another harness, before running anything', async () => {
    const calls = [];
    const exec = fakeExec({ [INIT('claude')]: 'ok' }, calls);
    const { root, info } = await preview('claude');
    await expect(runSpeckitSetup(root, { harness: 'kiro' }, info, { exec })).rejects.toThrow(/kiro/);
    await expect(runSpeckitSetup(root, { harness: 'claude' }, null, { exec })).rejects.toThrow(/claude/);
    await expect(runSpeckitSetup(root, { harness: 'opencode' }, info, { exec })).rejects.toThrow(/opencode/);
    expect(calls).toEqual([]);
  });

  it('runs the exact fixed command in the project folder with a 120 s timeout, and returns its output (BR3.4, AC2.1.1)', async () => {
    const calls = [];
    const { root, info } = await preview('claude');
    const result = await runSpeckitSetup(root, { harness: 'claude' }, info, { exec: fakeExec({ [INIT('claude')]: 'Project ready.\n' }, calls) });
    expect(result).toEqual({ ok: true, output: 'Project ready.\n' });
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual(['init', '--here', '--force', '--non-interactive', '--integration', 'claude']);
    expect(calls[0].options).toMatchObject({ cwd: root, timeout: 120000 });
  });

  it('refuses a second run for the same project while one is going (BR3.3)', async () => {
    const { root, info } = await preview('claude');
    let release;
    const exec = async (file) => (file === 'specify' ? new Promise((r) => (release = r)) : '__AIDLC_DASH_PATH__/usr/bin');
    const first = runSpeckitSetup(root, { harness: 'claude' }, info, { exec });
    await expect(runSpeckitSetup(root, { harness: 'claude' }, info, { exec })).rejects.toThrow(/redan|already/);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    release('done');
    expect((await first).ok).toBe(true);
    // the lock is released afterwards
    expect((await runSpeckitSetup(root, { harness: 'claude' }, info, { exec: fakeExec({ [INIT('claude')]: 'again' }) })).ok).toBe(true);
  });

  it('returns failed with the output on a non-zero exit (BR3.5, AC2.1.3)', async () => {
    const { root, info } = await preview('claude');
    const err = Object.assign(new Error('Command failed: specify init'), { code: 1, stdout: 'Error: something broke\n' });
    const result = await runSpeckitSetup(root, { harness: 'claude' }, info, { exec: fakeExec({ [INIT('claude')]: err }) });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('failed');
    expect(result.error.message).toMatch(/Command failed/);
    expect(result.output).toBe('Error: something broke\n');
  });

  it('returns timeout when specify is killed, and notFound when it is missing (BR3.5)', async () => {
    const { root, info } = await preview('claude');
    const killed = Object.assign(new Error('killed'), { killed: true, signal: 'SIGTERM', stdout: 'half way' });
    const timedOut = await runSpeckitSetup(root, { harness: 'claude' }, info, { exec: fakeExec({ [INIT('claude')]: killed }) });
    expect(timedOut).toMatchObject({ ok: false, error: { code: 'timeout' }, output: 'half way' });
    const missing = await runSpeckitSetup(root, { harness: 'claude' }, info, { exec: fakeExec({}) });
    expect(missing).toMatchObject({ ok: false, error: { code: 'notFound' }, output: '' });
  });

  it('writes nothing itself: no fs write by U3 code, so nothing under .specify/ or specs/ (BR3.7, AC2.1.4)', async () => {
    const { root, info } = await preview('claude');
    const spies = ['writeFile', 'appendFile', 'mkdir', 'rm', 'rename', 'copyFile', 'cp', 'unlink', 'open'].map((name) => vi.spyOn(fs, name));
    try {
      await getSpeckitSetupInfo(root, { harness: 'claude', exec: fakeExec({ 'specify --version': VERSION }) });
      await runSpeckitSetup(root, { harness: 'claude' }, info, { exec: fakeExec({ [INIT('claude')]: 'ok' }) });
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
    expect((await fs.readdir(root)).sort()).toEqual(['.claude']);
  });
});
