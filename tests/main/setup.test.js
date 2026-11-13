import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { buildSetupCommand, getSetupInfo, parsePreview } from '../../src/main/setup.js';

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
  });
});

describe('parsePreview (F-02)', () => {
  it('reads every count and the Note: lines from the real dry-run output', () => {
    const raw = '  Note: no AI-DLC install found in /Users/me/new-app; planning a fresh install\nconfig plan for /Users/me/new-app: create=360 update=0 merge=0 preserve=1 remove=0 conflict=0\n';
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

describe('buildSetupCommand', () => {
  it('chains git init, the base command, plugins and preset with &&, and rejects unknown values (FR4.4, FR4.5)', () => {
    expect(buildSetupCommand({})).toBe('aidlc --project-dir . config --harness claude --yes');
    expect(buildSetupCommand({ needsGit: true, plugins: ['feature-docs'], preset: 'balanced' }, ['aidlc', 'feature-docs'])).toBe(
      'git init -b main && aidlc --project-dir . config --harness claude --yes && aidlc config project --plugins feature-docs --yes && aidlc config models --preset balanced --project --yes'
    );
    expect(() => buildSetupCommand({ plugins: ['not-listed'] }, ['aidlc'])).toThrow(/Okänt plugin/);
    expect(() => buildSetupCommand({ plugins: ['x; rm -rf ~'] }, ['x; rm -rf ~'])).toThrow(/Okänt plugin/);
    expect(() => buildSetupCommand({ preset: 'max' })).toThrow(/Okänd modellnivå/);
  });
});
