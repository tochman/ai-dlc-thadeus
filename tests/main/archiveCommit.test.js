// US-0513 FR5: what archiving changed is committed on main, against real repositories in os.tmpdir() (a bare origin and a
// clone, removed after each test). AI-DLC never runs: `archiveFiles` writes the files its command would.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync, mkdirSync, promises as fs, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeArchive, commitArchive } from '../../src/main/archiveCommit.js';
import { setProtectedMain } from '../../src/main/planningRecord.js';
import { runCycle } from '../../src/main/planningSync.js';

vi.setConfig({ testTimeout: 20_000 }); // real git, as planningSync.test.js

const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const run = (cwd, ...args) => execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], { cwd, env, encoding: 'utf8' }).trim();
const INTENTS = 'aidlc/spaces/default/intents';
const INDEX = `${INTENTS}/intents.json`;
const filesOf = (dirName) => [`${INTENTS}/${dirName}/aidlc-state.md`, `${INTENTS}/${dirName}/audit/host-1.md`];

let tmp;
let origin;
let clone;
let ctx;
const at = (rel) => path.join(clone, rel);
const status = () => execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: clone, encoding: 'utf8' });
const subject = () => run(clone, 'log', '-1', '--format=%s');
const committed = () => run(clone, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort();

beforeEach(async () => {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'archive-commit-')));
  origin = path.join(tmp, 'origin.git');
  clone = path.join(tmp, 'clone');
  run(tmp, 'init', '-q', '--bare', origin);
  run(tmp, 'clone', '-q', origin, clone);
  run(clone, 'config', 'user.name', 'T');
  run(clone, 'config', 'user.email', 't@example.com');
  run(clone, 'config', 'commit.gpgsign', 'false');
  for (const dirName of ['261120-a', '261121-b']) {
    mkdirSync(at(`${INTENTS}/${dirName}/audit`), { recursive: true });
    for (const f of filesOf(dirName)) writeFileSync(at(f), 'start\n');
  }
  writeFileSync(at(INDEX), '[]\n');
  writeFileSync(at('src.txt'), 'code\n');
  run(clone, 'add', '.');
  run(clone, 'commit', '-q', '-m', 'start');
  run(clone, 'push', '-q', '-u', 'origin', 'main');
  ctx = { root: clone, userData: path.join(tmp, 'userData'), online: () => true, planningOff: false };
});
afterEach(() => fs.rm(tmp, { recursive: true, force: true }));

/** Writes what the command would for each intent and returns the changed files. */
function archiveFiles(...dirNames) {
  const files = [INDEX, ...dirNames.flatMap(filesOf)];
  for (const f of files) appendFileSync(at(f), 'archived\n');
  return files;
}
/** The whole run: look first, archive, commit. */
async function archive(dirNames, { verb = 'archive', slugs = dirNames.map((d) => d.slice(7)) } = {}) {
  const before = await beforeArchive(ctx, 'default');
  return commitArchive(ctx, before, { verb, slugs, files: archiveFiles(...dirNames) });
}

describe('the commit on main (AC5.1.1)', () => {
  it('one intent: exactly its files and intents.json, as chore: archive <slug>', async () => {
    writeFileSync(at('src.txt'), 'work in progress\n'); // not the app's to commit
    expect(await archive(['261120-a'])).toEqual({ state: 'waiting' });
    expect(subject()).toBe('chore: archive a');
    expect(committed()).toEqual([INDEX, ...filesOf('261120-a')].sort());
    expect(status()).toBe(' M src.txt\n');
  });

  it('several: one commit named by how many were archived; a new audit file goes along', async () => {
    const extra = `${INTENTS}/261121-b/audit/other-2.md`;
    const before = await beforeArchive(ctx, 'default');
    const files = [...archiveFiles('261120-a', '261121-b'), extra];
    writeFileSync(at(extra), 'new\n');
    expect(await commitArchive(ctx, before, { verb: 'archive', slugs: ['a', 'b'], files })).toEqual({ state: 'waiting' });
    expect(subject()).toBe('chore: archive 2 intents');
    expect(committed()).toEqual([...files].sort());
    expect(status()).toBe('');
  });

  it('unarchive: chore: unarchive <slug>', async () => {
    await archive(['261120-a'], { verb: 'unarchive' });
    expect(subject()).toBe('chore: unarchive a');
  });

  it('what the person has staged stays staged and out of the commit', async () => {
    writeFileSync(at('src.txt'), 'staged work\n');
    run(clone, 'add', 'src.txt');
    await archive(['261120-a']);
    expect(committed()).not.toContain('src.txt');
    expect(status()).toBe('M  src.txt\n');
  });

  it('nothing archived: no commit (AC5.1.6)', async () => {
    const before = await beforeArchive(ctx, 'default');
    expect(await commitArchive(ctx, before, { verb: 'archive', slugs: [], files: archiveFiles('261120-a') })).toBeNull();
    expect(subject()).toBe('start');
  });
});

describe('where the commit stands (AC5.1.2)', () => {
  it('the planning sync’s own push takes it to origin', async () => {
    await archive(['261120-a']);
    const cycle = { ...ctx, featuresPath: 'docs/FEATURES.md', planningBranch: 'docs/planning', gh: null, windowMs: 0 };
    expect(await runCycle(cycle)).toMatchObject({ pushed: true });
    expect(run(origin, 'log', '-1', '--format=%s', 'main')).toBe('chore: archive a');
  });

  it('says so when it stays local: the sync is off, no remote, a protected main, offline', async () => {
    ctx.online = () => false;
    expect(await archive(['261120-a'])).toEqual({ state: 'offline' });
    await setProtectedMain(ctx.userData, clone, true);
    expect(await archive(['261120-a'])).toEqual({ state: 'protected' });
    run(clone, 'remote', 'remove', 'origin');
    expect(await archive(['261120-a'])).toEqual({ state: 'noRemote' });
    ctx.planningOff = true;
    expect(await archive(['261120-a'])).toEqual({ state: 'syncOff' });
    expect(run(clone, 'rev-list', '--count', 'HEAD')).toBe('5'); // each of them is committed
  });
});

describe('no commit (AC5.1.3, AC5.1.4, AC5.1.5)', () => {
  it('on another branch, a detached HEAD or a branch switched meanwhile', async () => {
    run(clone, 'checkout', '-q', '-b', 'feat/US-0001');
    expect(await archive(['261120-a'])).toEqual({ state: 'notMain' });
    run(clone, 'checkout', '-q', '--', '.');
    run(clone, 'checkout', '-q', '--detach');
    expect(await archive(['261120-a'])).toEqual({ state: 'notMain' });
    run(clone, 'checkout', '-q', '--', '.');
    run(clone, 'checkout', '-q', 'main');
    const before = await beforeArchive(ctx, 'default');
    run(clone, 'checkout', '-q', 'feat/US-0001');
    expect(await commitArchive(ctx, before, { verb: 'archive', slugs: ['a'], files: archiveFiles('261120-a') })).toEqual({ state: 'notMain' });
    expect(subject()).toBe('start');
  });

  it('outside a git repository', async () => {
    await fs.rm(path.join(clone, '.git'), { recursive: true });
    expect(await archive(['261120-a'])).toEqual({ state: 'notMain' });
    expect(existsSync(path.join(clone, '.git'))).toBe(false);
  });

  it('with uncommitted changes in intents.json before, or an untracked one', async () => {
    appendFileSync(at(INDEX), 'a new intent\n');
    expect(await archive(['261120-a'])).toEqual({ state: 'dirtyIndex' });
    run(clone, 'checkout', '-q', '--', '.');
    run(clone, 'rm', '-q', '--cached', INDEX);
    run(clone, 'commit', '-q', '-m', 'untrack');
    expect(await archive(['261120-a'])).toEqual({ state: 'dirtyIndex' });
    expect(subject()).toBe('untrack');
  });

  it('earlier lines in the intent’s own state and audit alone do not stop it, and go along', async () => {
    for (const f of filesOf('261120-a')) appendFileSync(at(f), 'earlier\n');
    expect(await archive(['261120-a'])).toEqual({ state: 'waiting' });
    expect(run(clone, 'show', `HEAD:${filesOf('261120-a')[1]}`)).toBe('start\nearlier\narchived');
    expect(status()).toBe('');
  });

  it('a refusing hook gives git’s reason; the files stay changed and are unstaged, staged work stays staged', async () => {
    const hook = path.join(clone, '.git/hooks/pre-commit');
    mkdirSync(path.dirname(hook), { recursive: true });
    writeFileSync(hook, '#!/bin/sh\necho "not today" >&2\nexit 1\n');
    chmodSync(hook, 0o755);
    writeFileSync(at('src.txt'), 'staged work\n');
    run(clone, 'add', 'src.txt');
    expect(await archive(['261120-a'])).toEqual({ state: 'refused', reason: expect.stringContaining('not today') });
    expect(subject()).toBe('start');
    expect(status().split('\n').filter(Boolean).sort()).toEqual([...[INDEX, ...filesOf('261120-a')].map((f) => ` M ${f}`), 'M  src.txt'].sort());
  });
});
