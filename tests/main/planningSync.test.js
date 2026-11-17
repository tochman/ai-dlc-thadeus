// US-0606 + US-0607: release planning is recorded, committed without touching a story branch's checkout, and pushed,
// against real repositories in os.tmpdir(): a bare origin.git and a clone, removed after each test. `gh` is a stub.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { promises as fs, chmodSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readRecord } from '../../src/main/planningRecord.js';
import { createScheduler, planAction, reapplyLost, runCycle } from '../../src/main/planningSync.js';

const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const run = (cwd, ...args) => execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], { cwd, env, encoding: 'utf8' }).trim();

const EPIC = 'docs/features/epic-01.md';
const EPIC_TEXT = [
  '# EPIC-01: One',
  '',
  '**Status (2026-11-17):** 📋 US-0101 and US-0102 planned.',
  '',
  '## User Stories',
  '',
  '**US-0101: First story** 📋 Planned',
  '- **Priority:** High',
  '',
  '**US-0102: Second story** 📋 Planned',
  '- **Priority:** Low',
  ''
].join('\n');
const OVERVIEW = '# Features\n\n| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-01](features/epic-01.md) | One | 📋 US-0101 and US-0102 planned |\n';

let tmp;
let origin;
let clone;
let userData;
let ctx;

const write = (rel, text, dir = clone) => writeFileSync(path.join(dir, rel), text);
const read = (rel, dir = clone) => readFileSync(path.join(dir, rel), 'utf8');
const status = () => execFileSync('git', ['status', '--porcelain'], { cwd: clone, encoding: 'utf8' });
const originLog = (ref = 'main') => run(origin, 'log', '--format=%s', ref).split('\n');
const hook = (dir, name, script) => {
  const file = path.join(dir, 'hooks', name);
  writeFileSync(file, `#!/bin/sh\n${script}\n`);
  chmodSync(file, 0o755);
};
const configure = (dir) => {
  run(dir, 'config', 'user.name', 'T');
  run(dir, 'config', 'user.email', 't@example.com');
  run(dir, 'config', 'commit.gpgsign', 'false');
};
const setRelease = (storyId, version) => planAction(ctx, { kind: 'setRelease', storyIds: [storyId], version });

async function setup({ withOrigin = true } = {}) {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'planning-sync-')));
  origin = path.join(tmp, 'origin.git');
  clone = path.join(tmp, 'clone');
  userData = path.join(tmp, 'userData');
  if (withOrigin) {
    run(tmp, 'init', '-q', '--bare', origin);
    run(tmp, 'clone', '-q', origin, clone);
  } else {
    run(tmp, 'init', '-q', clone);
  }
  configure(clone);
  await fs.mkdir(path.join(clone, 'docs/features'), { recursive: true });
  await fs.mkdir(path.join(clone, 'docs/releases'), { recursive: true });
  write('docs/FEATURES.md', OVERVIEW);
  write(EPIC, EPIC_TEXT);
  write('docs/releases/1.0.0.md', '# Release plan v1.0.0\n');
  write('src.txt', 'code\n');
  run(clone, 'add', '.');
  run(clone, 'commit', '-q', '-m', 'start');
  if (withOrigin) run(clone, 'push', '-q', '-u', 'origin', 'main');
  ctx = { root: clone, userData, featuresPath: 'docs/FEATURES.md', planningBranch: 'docs/planning', gh: null, online: () => true };
}

/** A second clone that moves origin's main on with one commit. */
async function moveMain(rel, text) {
  const other = path.join(tmp, 'other');
  run(tmp, 'clone', '-q', origin, other);
  configure(other);
  write(rel, text, other);
  run(other, 'commit', '-q', '-am', 'main moves on');
  run(other, 'push', '-q', 'origin', 'main');
}

const storyBranch = () => run(clone, 'checkout', '-q', '-b', 'feat/US-0001');

afterEach(() => fs.rm(tmp, { recursive: true, force: true }));

describe('commit without touching the work (US-0606 FR2)', () => {
  beforeEach(() => setup());

  it('leaves a story branch, its index and its working tree byte for byte as they were, and pushes to origin/main (NFR1, FR2.1, FR3.2)', async () => {
    storyBranch();
    write('src.txt', 'code in progress\n');
    write(EPIC, `${EPIC_TEXT}story edit\n`);
    run(clone, 'add', 'src.txt');
    run(clone, 'status', '--porcelain'); // settles the index's stat data before the snapshot
    const before = { index: readFileSync(path.join(clone, '.git/index')), head: run(clone, 'rev-parse', 'HEAD'), epic: read(EPIC), src: read('src.txt') };
    const status = run(clone, 'status', '--porcelain');

    expect(await setRelease('US-0101', 'v1.0.0')).toMatchObject({ ok: true, inPlace: false });
    const res = await runCycle(ctx);

    expect(readFileSync(path.join(clone, '.git/index')).equals(before.index)).toBe(true);
    expect({ head: run(clone, 'rev-parse', 'HEAD'), epic: read(EPIC), src: read('src.txt') }).toEqual({
      head: before.head,
      epic: before.epic,
      src: before.src
    });
    expect(run(clone, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('feat/US-0001');
    expect(run(clone, 'status', '--porcelain')).toBe(status);
    expect(run(clone, 'worktree', 'list').split('\n')).toHaveLength(1);
    expect(res).toMatchObject({ pending: 0 });
    expect(originLog()[0]).toBe('docs: plan US-0101 for v1.0.0');
    expect(run(origin, 'show', `main:${EPIC}`)).toContain('**US-0101: First story** 📋 Planned, for v1.0.0');
    expect(run(origin, 'show', 'main:docs/releases/1.0.0.md')).toContain('| US-0101 |');
  });

  it('on main, commits in place and pushes (FR2.2)', async () => {
    expect(await setRelease('US-0101', 'v1.0.0')).toMatchObject({ ok: true, inPlace: true });
    expect(run(clone, 'log', '-1', '--format=%s')).toBe('docs: plan US-0101 for v1.0.0');
    expect(run(clone, 'status', '--porcelain')).toBe('');
    await runCycle(ctx);
    expect(run(origin, 'rev-parse', 'main')).toBe(run(clone, 'rev-parse', 'HEAD'));
  });

  it('puts several actions in a row into one push, each with its subject (FR2.3)', async () => {
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    await setRelease('US-0102', 'v1.0.0');
    await planAction(ctx, { kind: 'createRelease', storyIds: [], version: 'v2.0.0' });
    expect(originLog()).toEqual(['start']);
    await runCycle(ctx);
    expect(originLog()).toEqual(['docs: plan v2.0.0', 'docs: plan US-0102 for v1.0.0', 'docs: plan US-0101 for v1.0.0', 'start']);
  });

  it('agent edits to the feature docs are committed and pushed on main, and stay on a story branch (FR2.5)', async () => {
    write(EPIC, `${EPIC_TEXT}agent edit\n`);
    write('src.txt', 'not a doc\n');
    await runCycle(ctx);
    expect(originLog()[0]).toBe('docs: update the feature docs');
    expect(status()).toBe(' M src.txt\n');

    storyBranch();
    write(EPIC, `${EPIC_TEXT}agent edit on the story\n`);
    await runCycle(ctx);
    expect(originLog()).toHaveLength(2);
    expect(status()).toBe(` M ${EPIC}\n M src.txt\n`);
  });

  it('a commit hook refusing returns the reason and the files, and keeps the change (FR4.2)', async () => {
    hook(path.join(clone, '.git'), 'pre-commit', 'echo "lint failed" >&2; exit 1');
    const res = await setRelease('US-0101', 'v1.0.0');
    expect(res.error).toMatchObject({ kind: 'commit', files: [EPIC, 'docs/releases/1.0.0.md'] });
    expect(res.error.reason).toMatch(/lint failed/);
    expect(read(EPIC)).toContain('📋 Planned, for v1.0.0');
    expect((await readRecord(userData, clone)).actions).toMatchObject([{ kind: 'setRelease', state: 'pending' }]);
  });
});

describe('push (US-0607 FR3)', () => {
  beforeEach(() => setup());

  it('rebases onto a main that moved, then pushes (FR3.2)', async () => {
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    await moveMain('src.txt', 'changed on main\n');
    await runCycle(ctx);
    expect(originLog()).toEqual(['docs: plan US-0101 for v1.0.0', 'main moves on', 'start']);
  });

  it('on a rebase conflict pushes nothing, keeps the record and names the files (FR3.5)', async () => {
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    await moveMain(EPIC, EPIC_TEXT.replace('**US-0101: First story** 📋 Planned', '**US-0101: First story** 🚧 In progress'));
    const res = await runCycle(ctx);
    expect(res.error).toMatchObject({ kind: 'conflict', files: [EPIC] });
    expect(originLog()).toEqual(['main moves on', 'start']);
    expect(res.pending).toBe(1);
    expect(run(clone, 'worktree', 'list').split('\n')).toHaveLength(1);
  });

  it('with a protected main and gh, pushes the docs branch, then opens and squash-merges the pull request (FR3.3)', async () => {
    const gh = vi.fn(async () => '{}');
    ctx.gh = gh;
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    const res = await runCycle(ctx);
    const calls = gh.mock.calls.map(([args]) => args.slice(0, 2).join(' '));
    expect(calls).toEqual(['api repos/{owner}/{repo}/branches/main/protection', 'pr create', 'pr merge']);
    expect(gh.mock.calls[1][0]).toEqual(expect.arrayContaining(['--base', 'main', '--head', 'docs/planning']));
    expect(gh.mock.calls[2][0]).toEqual(expect.arrayContaining(['docs/planning', '--squash']));
    expect(originLog('docs/planning')[0]).toBe('docs: plan US-0101 for v1.0.0');
    expect(originLog()).toEqual(['start']);
    expect(res).toMatchObject({ pending: 0, merged: true });
    expect((await readRecord(userData, clone)).protectedMain).toBe(true);
  });

  it('without gh, a push refused as protected switches to the docs branch and offers the pull request (FR3.3)', async () => {
    hook(
      origin,
      'pre-receive',
      'while read o n ref; do [ "$ref" = refs/heads/main ] && { echo "GH006: Protected branch update failed" >&2; exit 1; }; done; exit 0'
    );
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    const res = await runCycle(ctx);
    expect(res).toMatchObject({ pending: 0, prOffer: { branch: 'docs/planning' } });
    expect(originLog('docs/planning')[0]).toBe('docs: plan US-0101 for v1.0.0');
    expect((await readRecord(userData, clone)).protectedMain).toBe(true);
  });

  it('offline, or with the push refused, keeps the record and answers the same each time (FR3.5)', async () => {
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    const offline = { ...ctx, online: () => false };
    expect(await runCycle(offline)).toEqual(await runCycle(offline));
    expect((await runCycle(offline)).error).toEqual({ kind: 'offline' });

    hook(origin, 'pre-receive', 'echo "refused by the server" >&2; exit 1');
    const refused = await runCycle(ctx);
    expect(refused.error).toMatchObject({ kind: 'push', reason: expect.stringMatching(/refused by the server/) });
    expect(refused.pending).toBe(1);
    expect(await runCycle(ctx)).toEqual(refused);
  });

  it('an action leaves the record only once it is on the remote target (FR1.2)', async () => {
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    await runCycle({ ...ctx, online: () => false });
    expect((await readRecord(userData, clone)).actions).toMatchObject([{ state: 'committed' }]);
    await runCycle(ctx);
    expect((await readRecord(userData, clone)).actions).toEqual([]);
    expect(originLog()[0]).toBe('docs: plan US-0101 for v1.0.0');
  });

  it('applies an action again after `git checkout -- <files>` and says so (NFR2, FR1.3)', async () => {
    hook(path.join(clone, '.git'), 'pre-commit', 'exit 1');
    await setRelease('US-0101', 'v1.0.0');
    run(clone, 'checkout', '--', 'docs');
    expect(read(EPIC)).toBe(EPIC_TEXT);
    await fs.rm(path.join(clone, '.git/hooks/pre-commit'));
    expect(await reapplyLost(ctx)).toMatchObject({ reapplied: 1 });
    expect(await runCycle(ctx)).toMatchObject({ reapplied: 0, pending: 0 });
    expect(originLog()[0]).toBe('docs: plan US-0101 for v1.0.0');
  });
});

describe('no origin (US-0607 FR3.4)', () => {
  beforeEach(() => setup({ withOrigin: false }));

  it('commits locally, keeps the record and says there is no remote', async () => {
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    const res = await runCycle(ctx);
    expect(res).toMatchObject({ noRemote: true, pending: 1 });
    expect(run(clone, 'log', '-1', '--format=%s', 'dash/planning')).toBe('docs: plan US-0101 for v1.0.0');
  });
});

describe('createScheduler (US-0607 FR3.1, FR4.1)', () => {
  const make = (over = {}) => {
    let t = 0;
    const s = { idle: true, ...over };
    const runFn = vi.fn(async (key) => ({ key, pending: 0 }));
    const sched = createScheduler({ run: runFn, idle: () => s.idle, intervalMs: () => 600000, now: () => t });
    return { sched, runFn, s, advance: (ms) => (t += ms) };
  };

  it('runs right after an action only when idle, and Push now ignores idle', async () => {
    const { sched, runFn, s } = make({ idle: false });
    expect(await sched.kick('a')).toBeNull();
    expect(runFn).not.toHaveBeenCalled();
    expect(await sched.pushNow('a')).toEqual({ key: 'a', pending: 0 });
    expect(sched.status('a')).toEqual({ key: 'a', pending: 0 });
    s.idle = true;
    await sched.kick('a');
    expect(runFn).toHaveBeenCalledTimes(2);
  });

  it('runs each project at the interval while busy, and on every tick while idle', async () => {
    const { sched, runFn, s, advance } = make({ idle: false });
    await sched.pushNow('a');
    advance(60000);
    await sched.tick(['a', 'b']);
    expect(runFn.mock.calls.map(([k]) => k)).toEqual(['a', 'b']); // b never ran, so it is due
    advance(600000);
    await sched.tick(['a', 'b']);
    expect(runFn).toHaveBeenCalledTimes(4);
    s.idle = true;
    advance(60000);
    await sched.tick(['a']);
    expect(runFn).toHaveBeenCalledTimes(5);
  });

  it('turns a failing cycle into an error result instead of throwing', async () => {
    const sched = createScheduler({ run: async () => Promise.reject(new Error('git missing')), idle: () => true, intervalMs: () => 1 });
    expect(await sched.pushNow('a')).toEqual({ error: { kind: 'git', reason: 'git missing' } });
    await expect(sched.tick(['a'])).resolves.toBeDefined();
  });
});
