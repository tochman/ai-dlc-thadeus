import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import {
  behindCount,
  changedFiles,
  getGitStatus,
  getRemoteChanges,
  listReleaseTags,
  originUrl,
  predictConflicts,
  remoteStoryBranches,
  showRemoteFile,
  storyMarkerHistory
} from '../../src/main/git.js';

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

describe('listReleaseTags (US-0603 NFR2)', () => {
  const ARGS = 'tag --list v* --format=%(refname:short)%09%(creatordate:short)';
  it('reads every v* tag with its date in one fixed git command', async () => {
    const { exec, calls } = fakeExec({ [ARGS]: 'v0.2.0\t2026-11-10\nv0.2.4\t2026-11-14\n\nvnext\n' });
    expect(await listReleaseTags('/repo', { exec })).toEqual([
      { name: 'v0.2.0', date: '2026-11-10' },
      { name: 'v0.2.4', date: '2026-11-14' },
      { name: 'vnext', date: null }
    ]);
    const gitCalls = calls.filter((c) => c.file === 'git');
    expect(gitCalls).toHaveLength(1);
    expect(gitCalls[0].opts.shell).toBeUndefined();
  });

  it('gives no tags without git or a repository, without throwing', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await listReleaseTags('/repo', { exec: fakeExec({}).exec })).toEqual([]);
    expect(await listReleaseTags('/repo', { exec: fakeExec({ [ARGS]: '' }).exec })).toEqual([]);
  });
});

describe('storyMarkerHistory (US-0303 FR2.4, NFR4)', () => {
  const ARGS = 'log --first-parent --reverse --format=%x00%H%x09%cI -p --unified=0 -- docs/features';
  it("reads the epic files' history on the checked-out branch in one fixed git command, without a shell", async () => {
    const { exec, calls } = fakeExec({ [ARGS]: '\0abc\t2026-11-13T07:20:57+01:00\n' });
    expect(await storyMarkerHistory('/repo', 'docs/features', { exec })).toBe('\0abc\t2026-11-13T07:20:57+01:00\n');
    const gitCalls = calls.filter((c) => c.file === 'git');
    expect(gitCalls).toHaveLength(1);
    expect(gitCalls[0].opts.shell).toBeUndefined();
    expect(gitCalls[0].opts.cwd).toBe('/repo');
  });

  it('gives null when git fails, and refuses a folder that is an option or leaves the root', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await storyMarkerHistory('/repo', 'docs/features', { exec: fakeExec({}).exec })).toBeNull();
    const { exec, calls } = fakeExec({});
    await expect(storyMarkerHistory('/repo', '--output=/tmp/x', { exec })).rejects.toThrow();
    await expect(storyMarkerHistory('/repo', '../outside', { exec })).rejects.toThrow();
    await expect(storyMarkerHistory('/repo', '/etc', { exec })).rejects.toThrow();
    expect(calls.filter((c) => c.file === 'git')).toHaveLength(0);
  });
});

// US-1201 AC-2, AC-3: real repositories in tests/.tmp: a bare "origin" and two clones. Clone A works on the story branch
// feat/US-0001; clone B moves main on, touching the same line, so the story branch is behind and would conflict.
describe('collisions against real repositories (US-1201 AC-2, AC-3)', () => {
  const TMP = path.resolve(__dirname, '../.tmp/git-collisions');
  const ORIGIN = path.join(TMP, 'origin.git');
  const A = path.join(TMP, 'a');
  const B = path.join(TMP, 'b');
  const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
  const run = (cwd, ...args) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main', ...args], { cwd, env, encoding: 'utf8' });
  const commit = (cwd, file, text, message) => {
    writeFileSync(path.join(cwd, file), text);
    run(cwd, 'add', file);
    run(cwd, 'commit', '-q', '-m', message);
  };

  beforeAll(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
    run(TMP, 'init', '-q', '--bare', ORIGIN);
    run(TMP, 'clone', '-q', ORIGIN, A);
    commit(A, 'shared.txt', 'one\n', 'start');
    commit(A, 'other.txt', 'x\n', 'other');
    run(A, 'push', '-q', 'origin', 'main');
    run(A, 'checkout', '-q', '-b', 'feat/US-0001');
    commit(A, 'shared.txt', 'one from the story\n', 'story');
    commit(A, 'story.txt', 'new\n', 'story file');
    run(A, 'push', '-q', 'origin', 'feat/US-0001');
    run(TMP, 'clone', '-q', ORIGIN, B);
    commit(B, 'shared.txt', 'one from main\n', 'main moves on');
    run(B, 'push', '-q', 'origin', 'main');
    run(A, 'fetch', '-q');
    run(TMP, 'init', '-q', path.join(TMP, 'no-remote'));
  });
  afterAll(() => rmSync(TMP, { recursive: true, force: true }));

  it('counts the commits the story branch is behind origin/main, and gives null without origin/main', async () => {
    expect(await behindCount(A)).toBe(1);
    expect(await behindCount(B)).toBe(0);
    expect(await behindCount(A, 'origin/nope')).toBeNull();
  });

  it('lists the files a branch changes against origin/main', async () => {
    expect(await changedFiles(A)).toEqual(['shared.txt', 'story.txt']);
    expect(await changedFiles(A, 'origin/feat/US-0001')).toEqual(['shared.txt', 'story.txt']);
    await expect(changedFiles(A, '--output=/tmp/x')).rejects.toThrow(/Ogiltigt/);
  });

  it('predicts the conflicting files with git merge-tree and leaves the working tree, index and HEAD as they were', async () => {
    const before = [run(A, 'rev-parse', 'HEAD'), run(A, 'status', '--porcelain'), run(A, 'stash', 'list')];
    expect(await predictConflicts(A, 'HEAD', 'origin/main')).toEqual(['shared.txt']);
    expect(await predictConflicts(B, 'HEAD', 'origin/main')).toEqual([]);
    expect([run(A, 'rev-parse', 'HEAD'), run(A, 'status', '--porcelain'), run(A, 'stash', 'list')]).toEqual(before);
    await expect(predictConflicts(A, 'HEAD', 'origin/missing')).rejects.toThrow();
  });

  it("lists origin's story branches with commits that are not in main, and the origin address", async () => {
    expect(await remoteStoryBranches(A)).toEqual([{ branch: 'origin/feat/US-0001', story: 'US-0001', ahead: 2 }]);
    expect(await originUrl(A)).toBe(ORIGIN);
    expect(await originUrl(path.join(TMP, 'no-remote'))).toBeNull();
  });
});
