import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { getSetupInfo, parsePreview, runSetup } from '../../src/main/setup.js';

const TMP = path.resolve(__dirname, '../.tmp/setup');

/** Answers `file args` like the real tools; anything else fails like a missing command (ENOENT). */
function fakeExec(responses) {
  return async (file, args) => {
    if (file !== 'git' && file !== 'aidlc') return '__AIDLC_DASH_PATH__/usr/bin';
    const key = `${file} ${args.join(' ')}`;
    if (!(key in responses)) throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT' });
    return responses[key];
  };
}

const PLUGINS_OUTPUT = JSON.stringify({ ok: true, data: { installedPlugins: ['aidlc', 'feature-docs'] } });

async function tmpRoot() {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(path.join(TMP, '.kiro'), { recursive: true });
  await fs.mkdir(path.join(TMP, 'src'), { recursive: true });
  return openRoot(TMP);
}

afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

describe('getSetupInfo', () => {
  it('stops at "not installed" when aidlc is missing, still reporting git and other harnesses (FR4.2)', async () => {
    const root = await tmpRoot();
    const info = await getSetupInfo(root, { exec: fakeExec({}) });
    expect(info.aidlc.installed).toBe(false);
    expect(info.git).toEqual({ isRepo: false });
    expect(info.harnesses).toEqual(['.kiro/']);
    expect(info.preview).toBeNull();
    expect(info.plugins).toEqual([]);
  });

  it('reads the dry-run counts and conflicting files, and the installed plugins (FR4.3, FR4.5)', async () => {
    const root = await tmpRoot();
    const info = await getSetupInfo(root, {
      exec: fakeExec({
        'git rev-parse --is-inside-work-tree': 'true\n',
        'aidlc --version': 'aidlc 2.11.3 (runtime 2.11.3)\n',
        [`aidlc --project-dir ${root} config --harness claude --dry-run`]: `Config plan for ${root}: create=358 update=0 merge=0 preserve=0 remove=0 conflict=2\nconflict: .claude/settings.json\nconflict: CLAUDE.md\n`,
        'aidlc config project --show --json': PLUGINS_OUTPUT
      })
    });
    expect(info.aidlc).toEqual({ installed: true, version: 'aidlc 2.11.3 (runtime 2.11.3)' });
    expect(info.git.isRepo).toBe(true);
    expect(info.preview).toMatchObject({ create: 358, update: 0, conflict: 2, conflicts: ['.claude/settings.json', 'CLAUDE.md'] });
    expect(info.plugins).toEqual(['aidlc', 'feature-docs']);
    expect(info.presets).toEqual(['thorough', 'balanced', 'minimal']);
    expect(info.harness).toBe('claude');
  });

  it('previews the chosen harness, and refuses one outside the table (US-0802 FR1.4, FR2.1)', async () => {
    const root = await tmpRoot();
    const exec = fakeExec({
      'git rev-parse --is-inside-work-tree': 'true\n',
      'aidlc --version': 'aidlc 2.11.3\n',
      [`aidlc --project-dir ${root} config --harness opencode --dry-run`]: `config plan for ${root}: create=376 update=0 merge=0 preserve=0 remove=0 conflict=0\n`,
      'aidlc config project --show --json': PLUGINS_OUTPUT
    });
    const info = await getSetupInfo(root, { harness: 'opencode', exec });
    expect(info.harness).toBe('opencode');
    expect(info.preview).toMatchObject({ create: 376, remove: 0, conflict: 0 });
    await expect(getSetupInfo(root, { harness: '--yes', exec })).rejects.toThrow(/Okänd harness/);
  });

  // Regression: in a project with Claude Code and opencode, the plugin list needs --harness; when the harness
  // being added is not installed yet, aidlc refuses it, so an installed one answers instead.
  it('reads the plugins through an installed harness when the project has several', async () => {
    const root = await tmpRoot();
    const info = await getSetupInfo(root, {
      harness: 'kiro',
      exec: fakeExec({
        'git rev-parse --is-inside-work-tree': 'true\n',
        'aidlc --version': 'aidlc 2.11.3\n',
        [`aidlc --project-dir ${root} config --harness kiro --dry-run`]: 'create=40 update=0 merge=0 preserve=300 remove=0 conflict=0\n',
        // no `--harness kiro` and no bare form: both are refused in this project
        'aidlc config project --show --json --harness claude': PLUGINS_OUTPUT
      })
    });
    expect(info.plugins).toEqual(['aidlc', 'feature-docs']);
    expect(info.warning).toBeUndefined();
  });

  it('warns with the last error when no harness can read the plugins', async () => {
    const root = await tmpRoot();
    const info = await getSetupInfo(root, {
      exec: fakeExec({ 'git rev-parse --is-inside-work-tree': 'true\n', 'aidlc --version': 'aidlc 2.11.3\n' })
    });
    expect(info.plugins).toEqual([]);
    expect(info.warning).toMatch(/ENOENT/);
  });
});

describe('parsePreview (F-02)', () => {
  it('reads every count and the Note: lines from the real dry-run output', () => {
    const raw =
      '  Note: no AI-DLC install found in /Users/me/new-app; planning a fresh install\nconfig plan for /Users/me/new-app: create=360 update=0 merge=0 preserve=1 remove=0 conflict=0\n';
    expect(parsePreview(raw)).toEqual({
      raw,
      create: 360,
      update: 0,
      merge: 0,
      preserve: 1,
      remove: 0,
      conflict: 0,
      conflicts: [],
      notes: ['no AI-DLC install found in /Users/me/new-app; planning a fresh install']
    });
  });

  it('gives null counts and no notes for output without a plan line', () => {
    expect(parsePreview('something else')).toMatchObject({ create: null, preserve: null, conflict: null, conflicts: [], notes: [] });
  });
});

describe('runSetup (US-0802 FR2)', () => {
  const ROOT = '/Users/me/new-app';
  // Same shape getSetupInfo returns, with the real parser's preview.
  const info = (harness = 'opencode', planLine = 'create=376 update=0 merge=0 preserve=0 remove=0 conflict=0') => ({
    harness,
    git: { isRepo: false },
    preview: parsePreview(`config plan for ${ROOT}: ${planLine}\n`),
    plugins: ['aidlc', 'feature-docs']
  });

  /** Records every call; a step whose "file args" is in `failing` fails like a CLI error exit. */
  function recordingExec(failing = {}) {
    const calls = [];
    const exec = async (file, args) => {
      if (file !== 'git' && file !== 'aidlc') return '__AIDLC_DASH_PATH__/usr/bin';
      const key = `${file} ${args.join(' ')}`;
      calls.push({ file, args });
      if (key in failing) throw new Error(failing[key]);
      return `${key}: ok\n`;
    };
    return { exec, calls };
  }

  it('runs git init, config for the chosen harness, plugins and preset in order, with fixed arguments (FR2.2, FR2.3)', async () => {
    const { exec, calls } = recordingExec();
    const result = await runSetup(ROOT, { harness: 'opencode', plugins: ['feature-docs'], preset: 'balanced' }, info(), { exec });
    expect(calls).toEqual([
      { file: 'git', args: ['init', '-b', 'main'] },
      { file: 'aidlc', args: ['--project-dir', ROOT, 'config', '--harness', 'opencode', '--yes'] },
      { file: 'aidlc', args: ['config', 'project', '--plugins', 'feature-docs', '--harness', 'opencode', '--yes'] },
      { file: 'aidlc', args: ['config', 'models', '--preset', 'balanced', '--project', '--harness', 'opencode', '--yes'] }
    ]);
    expect(result.ok).toBe(true);
    expect(result.steps.map((s) => s.ok)).toEqual([true, true, true, true]);
  });

  // Regression: with two harnesses installed, aidlc refuses `config project` / `config models` without
  // --harness ("multiple project harnesses are present"); adding a harness always leaves two.
  it('names the harness on the plugin and preset steps when adding a harness', async () => {
    const refused = 'error: multiple project harnesses are present; pass one --harness <name>';
    const { exec } = recordingExec({
      'aidlc config project --plugins feature-docs --yes': refused,
      'aidlc config models --preset minimal --project --yes': refused
    });
    const result = await runSetup(ROOT, { harness: 'claude', mode: 'add', plugins: ['feature-docs'], preset: 'minimal' }, info('claude'), { exec });
    expect(result.ok).toBe(true);
    expect(result.steps.map((s) => s.command)).toEqual([
      `aidlc --project-dir ${ROOT} config --harness claude --yes`,
      'aidlc config project --plugins feature-docs --harness claude --yes',
      'aidlc config models --preset minimal --project --harness claude --yes'
    ]);
  });

  it('stops at the first failing step and returns the CLI error (FR2.2)', async () => {
    const { exec, calls } = recordingExec({ [`aidlc --project-dir ${ROOT} config --harness opencode --yes`]: 'error: harness opencode is not installed' });
    const result = await runSetup(ROOT, { harness: 'opencode', preset: 'balanced' }, info(), { exec });
    expect(result.ok).toBe(false);
    expect(result.steps.at(-1)).toEqual({
      command: `aidlc --project-dir ${ROOT} config --harness opencode --yes`,
      ok: false,
      error: 'error: harness opencode is not installed'
    });
    expect(calls).toHaveLength(2); // git init, then the failing config; the preset never ran
  });

  it('refuses unknown harnesses, plugins and presets, and a missing preview, before anything runs (FR1.4, FR2.4)', async () => {
    const { exec, calls } = recordingExec();
    await expect(runSetup(ROOT, { harness: 'rm -rf ~' }, info(), { exec })).rejects.toThrow(/Okänd harness/);
    await expect(runSetup(ROOT, { harness: 'opencode', plugins: ['not-listed'] }, info(), { exec })).rejects.toThrow(/Okänt plugin/);
    await expect(runSetup(ROOT, { harness: 'opencode', plugins: ['x; rm -rf ~'] }, { ...info(), plugins: ['x; rm -rf ~'] }, { exec })).rejects.toThrow(
      /Okänt plugin/
    );
    await expect(runSetup(ROOT, { harness: 'opencode', preset: 'max' }, info(), { exec })).rejects.toThrow(/Okänd modellnivå/);
    await expect(runSetup(ROOT, { harness: 'codex' }, info('opencode'), { exec })).rejects.toThrow(/förhandsvisningen/); // preview was for opencode
    await expect(runSetup(ROOT, { harness: 'opencode' }, null, { exec })).rejects.toThrow(/förhandsvisningen/);
    expect(calls).toEqual([]);
  });

  it('refuses a second run for the same project while one is running (NFR3)', async () => {
    let release;
    const exec = (file) =>
      file === 'git' || file === 'aidlc' ? new Promise((r) => (release = () => r('ok'))) : Promise.resolve('__AIDLC_DASH_PATH__/usr/bin');
    const first = runSetup(ROOT, { harness: 'opencode' }, { ...info(), git: { isRepo: true } }, { exec });
    await expect(runSetup(ROOT, { harness: 'opencode' }, info(), { exec })).rejects.toThrow(/körs redan/);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    release();
    expect((await first).ok).toBe(true);
  });

  it('in add mode skips git init, and refuses a preview that removes or clashes with anything (FR3.2)', async () => {
    const { exec, calls } = recordingExec();
    const add = { harness: 'opencode', mode: 'add' };
    await expect(runSetup(ROOT, add, info('opencode', 'create=16 update=0 merge=1 preserve=360 remove=2 conflict=0'), { exec })).rejects.toThrow(/tas bort/);
    await expect(runSetup(ROOT, add, info('opencode', 'create=16 update=0 merge=1 preserve=360 remove=0 conflict=1'), { exec })).rejects.toThrow(/tas bort/);
    expect(calls).toEqual([]);

    expect((await runSetup(ROOT, add, info('opencode', 'create=16 update=0 merge=1 preserve=360 remove=0 conflict=0'), { exec })).ok).toBe(true);
    expect(calls.map((c) => c.args.join(' '))).toEqual([`--project-dir ${ROOT} config --harness opencode --yes`]);
  });
});
