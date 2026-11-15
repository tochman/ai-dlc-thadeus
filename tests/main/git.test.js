import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { getGitStatus, getRemoteChanges, showRemoteFile } from '../../src/main/git.js';

const PROJECT = path.resolve(__dirname, '../fixtures/project');

/** Answers fixed argument lists like git would; anything else fails as git does (exit 128). */
function fakeExec(responses) {
  const calls = [];
  const exec = async (file, args, opts) => {
    calls.push({ file, args, opts });
    if (file !== 'git') return '__AIDLC_DASH_PATH__/usr/bin'; // the login-shell PATH probe
    const key = args.join(' ');
    if (!(key in responses)) throw Object.assign(new Error(`fatal: ${key}`), { code: 128 });
    return responses[key];
  };
  return { exec, calls };
}

const REPO = { 'rev-parse --is-inside-work-tree': 'true\n', 'rev-parse --abbrev-ref HEAD': 'feature/x\n' };

describe('getGitStatus', () => {
  it('reports branch, upstream, ahead/behind and uncommitted files split into aidlc/ and other (FR3.5, FR3.1)', async () => {
    const { exec, calls } = fakeExec({
      ...REPO,
      'rev-parse --abbrev-ref --symbolic-full-name @{u}': 'origin/feature/x\n',
      'rev-list --left-right --count HEAD...origin/feature/x': '2\t5\n',
      'status --porcelain': ' M aidlc/spaces/default/intents/intents.json\n?? src/new.js\nR  old.md -> aidlc/moved.md\n M README.md\n'
    });
    const status = await getGitStatus('/repo', { exec });

    expect(status).toEqual({
      isRepo: true,
      branch: 'feature/x',
      upstream: 'origin/feature/x',
      tracking: true,
      ahead: 2,
      behind: 5,
      dirtyAidlc: 2,
      dirtyOther: 2
    });
    const gitCalls = calls.filter((c) => c.file === 'git');
    expect(gitCalls.every((c) => c.opts.cwd === '/repo' && c.opts.timeout === 10000 && c.opts.shell === undefined)).toBe(true);
    expect(gitCalls[0].opts.env.PATH).toBe('/usr/bin');
  });

  it('falls back to origin/main without an upstream, and reports no remote or no repo (FR3.3, NFR2)', async () => {
    const withMain = fakeExec({
      ...REPO,
      'rev-parse --verify --quiet refs/remotes/origin/main': 'abc123\n',
      'rev-list --left-right --count HEAD...origin/main': '0\t3\n',
      'status --porcelain': ''
    });
    expect(await getGitStatus('/repo', { exec: withMain.exec })).toMatchObject({ upstream: 'origin/main', tracking: false, behind: 3 });

    const noRemote = fakeExec({ ...REPO, 'status --porcelain': '' });
    expect(await getGitStatus('/repo', { exec: noRemote.exec })).toMatchObject({ isRepo: true, upstream: null, ahead: 0, behind: 0 });
    expect(noRemote.calls.some((c) => c.args[0] === 'rev-list')).toBe(false);

    expect(await getGitStatus('/repo', { exec: fakeExec({}).exec })).toEqual({ isRepo: false });
  });
});

describe('getRemoteChanges', () => {
  it('counts aidlc/ commits, splits changed files, sums new audit lines and finds remote-only intents (FR3.3, FR3.4)', async () => {
    const root = await openRoot(PROJECT);
    const remoteIndex = JSON.stringify([
      { dirName: '261110-epic02-finish', slug: 'epic02-finish', status: 'complete' },
      { dirName: '261114-from-laptop', slug: 'from-laptop', status: 'in-flight' }
    ]);
    const { exec } = fakeExec({
      'rev-parse --abbrev-ref --symbolic-full-name @{u}': 'origin/main\n',
      'rev-list --count HEAD..origin/main -- aidlc/': '4\n',
      'diff --name-only --relative HEAD...origin/main':
        'aidlc/spaces/default/intents/intents.json\naidlc/spaces/default/intents/261114-from-laptop/audit/mac-1.md\nsrc/app.js\n',
      'diff --numstat --relative HEAD...origin/main -- aidlc/':
        '3\t1\taidlc/spaces/default/intents/intents.json\n12\t0\taidlc/spaces/default/intents/261114-from-laptop/audit/mac-1.md\n',
      'show origin/main:./aidlc/spaces/default/intents/intents.json': remoteIndex
    });
    const changes = await getRemoteChanges(root, 'origin/main', { space: 'default', exec });

    expect(changes.aidlcCommits).toBe(4);
    expect(changes.aidlcFiles).toHaveLength(2);
    expect(changes.otherFiles).toEqual(['src/app.js']);
    expect(changes.auditLines).toBe(12);
    expect(changes.newIntents.map((i) => i.dirName)).toEqual(['261114-from-laptop']);
  });
});

describe('showRemoteFile', () => {
  it('reads only files under aidlc/ from the compared ref, and rejects option-like arguments (FR3.4, NFR1)', async () => {
    const { exec, calls } = fakeExec({
      'rev-parse --abbrev-ref --symbolic-full-name @{u}': 'origin/main\n',
      'show origin/main:./aidlc/spaces/default/intents/a/x.md': '# Remote\n'
    });
    expect(await showRemoteFile('/repo', 'origin/main', 'aidlc/spaces/default/intents/a/x.md', { exec })).toBe('# Remote\n');

    await expect(showRemoteFile('/repo', 'origin/main', 'src/secret.js', { exec })).rejects.toThrow(/under aidlc/);
    await expect(showRemoteFile('/repo', 'origin/main', 'aidlc/../.env', { exec })).rejects.toThrow(/under aidlc/);
    await expect(showRemoteFile('/repo', '--output=/tmp/x', 'aidlc/a.md', { exec })).rejects.toThrow(/Ogiltigt/);
    await expect(showRemoteFile('/repo', 'origin/other', 'aidlc/a.md', { exec })).rejects.toThrow(/Bara upstream/);
    expect(calls.filter((c) => c.args[0] === 'show')).toHaveLength(1);
  });
});
