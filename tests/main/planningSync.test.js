// US-0606 + US-0607 + US-0608: release planning is recorded, committed without touching a story branch's checkout, and
// pushed, against real repositories in os.tmpdir(): a bare origin.git and a clone, removed after each test. `gh` is a
// stub. `windowMs: 0` lets a cycle commit at once; the 30-second window itself is tested with fake timers (FR6).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs, chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadFeatures } from '../../src/main/features.js';
import { readRecord } from '../../src/main/planningRecord.js';
import { createScheduler, planAction, reapplyLost, recordContent, recordTree, resolvePlanning, runCycle, subjectOf } from '../../src/main/planningSync.js';

const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const run = (cwd, ...args) => execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], { cwd, env, encoding: 'utf8' }).trim();

// US-0608: each cycle runs real git several times and FR4.1 runs four cycles; the 5 s default is the runner's, not a
// requirement (no cycle-latency target exists), so this file's real-git tests get 20 s. No assertion changes.
vi.setConfig({ testTimeout: 20_000 });

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
  ctx = { root: clone, userData, featuresPath: 'docs/FEATURES.md', planningBranch: 'docs/planning', gh: null, online: () => true, windowMs: 0 };
}

/** A second clone that moves origin's main on with one commit of `files` ({rel: text}). */
async function moveMain(rel, text, more = {}) {
  const other = path.join(tmp, 'other');
  run(tmp, 'clone', '-q', origin, other);
  configure(other);
  for (const [r, t] of Object.entries({ [rel]: text, ...more })) write(r, t, other);
  run(other, 'commit', '-q', '-am', 'main moves on');
  run(other, 'push', '-q', 'origin', 'main');
}

const storyBranch = (name = 'feat/US-0001') => run(clone, 'checkout', '-q', '-b', name);

afterEach(() => fs.rm(tmp, { recursive: true, force: true }));

describe('commit without touching the work (US-0606 FR2)', () => {
  beforeEach(() => setup());

  it('leaves a story branch, its index and its working tree byte for byte as they were, and pushes to origin/main (NFR1, FR2.1, FR3.2)', async () => {
    storyBranch('feat/US-0102'); // the edit below is in US-0102's own block, so it stays (US-0608 FR3.2)
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
    expect(run(clone, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('feat/US-0102');
    expect(run(clone, 'status', '--porcelain')).toBe(status);
    expect(run(clone, 'worktree', 'list').split('\n')).toHaveLength(1);
    expect(res).toMatchObject({ pending: 0 });
    expect(originLog()[0]).toBe('docs: plan US-0101 for v1.0.0');
    expect(run(origin, 'show', `main:${EPIC}`)).toContain('**US-0101: First story** 📋 Planned, for v1.0.0');
    expect(run(origin, 'show', 'main:docs/releases/1.0.0.md')).toContain('| US-0101 |');
  });

  it('on main, writes in place, and the cycle commits and pushes (FR2.2)', async () => {
    expect(await setRelease('US-0101', 'v1.0.0')).toMatchObject({ ok: true, inPlace: true });
    expect(read(EPIC)).toContain('📋 Planned, for v1.0.0');
    await runCycle(ctx);
    expect(run(clone, 'log', '-1', '--format=%s')).toBe('docs: plan US-0101 for v1.0.0');
    expect(run(clone, 'status', '--porcelain')).toBe('');
    expect(run(origin, 'rev-parse', 'main')).toBe(run(clone, 'rev-parse', 'HEAD'));
  });

  it('puts several actions in a row into one commit with one subject (FR2.3, US-0608 FR6.2)', async () => {
    storyBranch();
    await setRelease('US-0101', 'v1.0.0');
    await setRelease('US-0102', 'v1.0.0');
    await planAction(ctx, { kind: 'createRelease', storyIds: [], version: 'v2.0.0' });
    expect(originLog()).toEqual(['start']);
    await runCycle(ctx);
    expect(originLog()).toEqual(['docs: plan US-0101, US-0102 for v1.0.0; plan v2.0.0', 'start']);
  });

  it('agent edits to the feature docs are committed and pushed on main, and an own story edit stays on a story branch (FR2.5)', async () => {
    write(EPIC, `${EPIC_TEXT}agent edit\n`);
    write('src.txt', 'not a doc\n');
    await runCycle(ctx);
    expect(originLog()[0]).toBe('docs: update US-0102');
    expect(status()).toBe(' M src.txt\n');

    storyBranch('feat/US-0102');
    write(EPIC, `${EPIC_TEXT}agent edit on the story\n`);
    await runCycle(ctx);
    expect(originLog()).toHaveLength(2);
    expect(status()).toBe(` M ${EPIC}\n M src.txt\n`);
  });

  it('a commit hook refusing returns the reason and the files, and keeps the change (FR4.2)', async () => {
    hook(path.join(clone, '.git'), 'pre-commit', 'echo "lint failed" >&2; exit 1');
    expect(await setRelease('US-0101', 'v1.0.0')).toMatchObject({ ok: true });
    const res = await runCycle(ctx);
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

describe('every planning change is kept until it is on the target (US-0608)', () => {
  beforeEach(() => setup());
  const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
  const hashesNow = async () => {
    const f = await loadFeatures(clone, 'docs/FEATURES.md');
    return { epicHash: f.epics[0].hash, overviewHash: f.overviewHash };
  };
  const contents = async () => (await readRecord(userData, clone)).actions.filter((a) => a.kind === 'content');
  const withText = (text, line) => text.replace('- **Priority:** Low', `- **Priority:** Low\n${line}`);

  it('FR1.1: a second assignment on main with the hashes read before the first succeeds', async () => {
    const seen = await hashesNow();
    expect(await planAction(ctx, { kind: 'setRelease', storyIds: ['US-0101'], version: 'v1.0.0' }, seen)).toMatchObject({ ok: true });
    expect(await planAction(ctx, { kind: 'setRelease', storyIds: ['US-0102'], version: 'v1.0.0' }, seen)).toMatchObject({ ok: true });
    expect(read(EPIC)).toContain('**US-0102: Second story** 📋 Planned, for v1.0.0');
  });

  it('FR1.2: an action says whether it changed the docs, so the view knows a reload with new hashes follows', async () => {
    expect(await setRelease('US-0101', 'v1.0.0')).toEqual({ ok: true, inPlace: true, changed: true });
    expect(await setRelease('US-0101', 'v1.0.0')).toEqual({ ok: true, inPlace: true, changed: false }); // already so: no reload
  });

  it('FR1.3: a file changed outside the app is refused with the file named, and the change stays in the record', async () => {
    const seen = await hashesNow();
    write(EPIC, `${EPIC_TEXT}outside\n`);
    expect(await planAction(ctx, { kind: 'setRelease', storyIds: ['US-0101'], version: 'v1.0.0' }, seen)).toEqual({ conflict: EPIC, kept: true });
    expect((await readRecord(userData, clone)).actions).toMatchObject([{ kind: 'setRelease', storyIds: ['US-0101'], state: 'pending' }]);
  });

  it('FR2.1, FR2.3: an editor save and an agent write are recorded once each, the app own writes not at all, and leave only on origin/main', async () => {
    await setRelease('US-0101', 'v1.0.0'); // the app's own writes: the epic and docs/releases/1.0.0.md
    const mine = withText(read(EPIC), '- free text');
    expect(await recordContent(ctx, EPIC, mine, { expectHash: sha(read(EPIC)) })).toMatchObject({ kind: 'content', file: EPIC, by: 'editor' });
    write(EPIC, mine);
    write('docs/FEATURES.md', `${OVERVIEW}agent line\n`);
    await recordTree(ctx);
    await recordTree(ctx);
    expect((await contents()).map((e) => e.file)).toEqual([EPIC, 'docs/FEATURES.md']);
    await runCycle({ ...ctx, online: () => false });
    expect((await readRecord(userData, clone)).actions).toHaveLength(3); // committed, not on the target yet
    await runCycle(ctx);
    expect((await readRecord(userData, clone)).actions).toEqual([]);
    expect(run(origin, 'show', `main:${EPIC}`)).toContain('- free text');
    expect(run(origin, 'show', 'main:docs/FEATURES.md')).toContain('agent line');
  });

  it('FR3: on a story branch another story and a release file go to dash/planning and leave the tree and index; the own block stays', async () => {
    storyBranch('feat/US-0101');
    const own = EPIC_TEXT.replace('- **Priority:** High', '- **Priority:** High\n- own note');
    write(EPIC, own.replace('**US-0102: Second story** 📋 Planned', '**US-0102: Second story** 🚧 In progress'));
    write('docs/releases/2.0.0.md', '# Release plan v2.0.0\n');
    run(clone, 'add', EPIC, 'docs/releases/2.0.0.md');
    await recordTree(ctx);
    expect(read(EPIC)).toBe(own);
    expect(existsSync(path.join(clone, 'docs/releases/2.0.0.md'))).toBe(false);
    expect(run(clone, 'diff', '--cached', '--name-only')).toBe('');
    await runCycle(ctx);
    expect(originLog()[0]).toBe('docs: update US-0102');
    expect(run(origin, 'show', `main:${EPIC}`)).toContain('**US-0102: Second story** 🚧 In progress');
    expect(run(origin, 'show', `main:${EPIC}`)).not.toContain('own note');
    expect(run(origin, 'show', 'main:docs/releases/2.0.0.md')).toBe('# Release plan v2.0.0');
    expect({ epic: read(EPIC), branch: run(clone, 'rev-parse', '--abbrev-ref', 'HEAD') }).toEqual({ epic: own, branch: 'feat/US-0101' });
  });

  it('FR4.1: after a discard, a stash, a restart and a branch switch, the next cycle applies every waiting change again', async () => {
    hook(path.join(clone, '.git'), 'pre-commit', 'exit 1'); // nothing commits, so every change keeps waiting
    await setRelease('US-0101', 'v1.0.0');
    const mine = withText(read(EPIC), '- free text');
    await recordContent(ctx, EPIC, mine, { expectHash: sha(read(EPIC)) });
    write(EPIC, mine);
    const waiting = () => [read(EPIC), read('docs/releases/1.0.0.md')];
    const expected = waiting();

    run(clone, 'checkout', '--', 'docs');
    expect((await runCycle(ctx)).reapplied).toBeGreaterThan(0);
    expect(waiting()).toEqual(expected);
    run(clone, 'stash', '-q');
    expect((await runCycle(ctx)).reapplied).toBeGreaterThan(0);
    expect(waiting()).toEqual(expected);
    run(clone, 'checkout', '--', 'docs');
    vi.resetModules(); // a fresh app process: only the record on disk is left
    const fresh = await import('../../src/main/planningSync.js');
    expect((await fresh.runCycle(ctx)).reapplied).toBeGreaterThan(0);
    expect(waiting()).toEqual(expected);

    run(clone, 'checkout', '--', 'docs');
    await fs.rm(path.join(clone, '.git/hooks/pre-commit'));
    storyBranch();
    await fresh.runCycle(ctx);
    expect(run(origin, 'show', `main:${EPIC}`)).toContain('- free text');
    expect(run(origin, 'show', `main:${EPIC}`)).toContain('**US-0101: First story** 📋 Planned, for v1.0.0');
    expect(status()).toBe('');
  });

  it('FR5.2, FR5.3: a conflict keeps the target in the file and mine in the record; Use mine and Keep theirs do so', async () => {
    const mineEpic = withText(EPIC_TEXT, '- my text');
    const theirsEpic = withText(EPIC_TEXT, '- their text');
    const theirsOverview = `${OVERVIEW}their line\n`;
    await recordContent(ctx, EPIC, mineEpic, { expectHash: sha(EPIC_TEXT) });
    await recordContent(ctx, 'docs/FEATURES.md', `${OVERVIEW}my line\n`, { expectHash: sha(OVERVIEW) });
    await moveMain(EPIC, theirsEpic, { 'docs/FEATURES.md': theirsOverview });
    run(clone, 'pull', '-q', '--ff-only');

    expect(await runCycle(ctx)).toMatchObject({ conflicts: 2 });
    expect([read(EPIC), read('docs/FEATURES.md')]).toEqual([theirsEpic, theirsOverview]);
    const [epic, overview] = await contents();
    expect(epic).toMatchObject({ state: 'conflict', content: mineEpic });

    await resolvePlanning(ctx, epic.id, 'mine');
    await resolvePlanning(ctx, overview.id, 'theirs');
    await runCycle(ctx);
    expect([read(EPIC), read('docs/FEATURES.md')]).toEqual([mineEpic, theirsOverview]);
    expect(run(origin, 'show', `main:${EPIC}`)).toContain('- my text');
    expect(await contents()).toEqual([]);
  });

  it('FR6: three changes within 30 s are one commit, 30 s after the last, with the FR6.2 subject', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      let committed;
      const done = new Promise((resolve) => (committed = resolve));
      const timed = { ...ctx, windowMs: undefined, onCommitted: committed };
      const head = run(clone, 'rev-parse', 'HEAD');
      await planAction(timed, { kind: 'setRelease', storyIds: ['US-0101'], version: 'v1.0.0' });
      await vi.advanceTimersByTimeAsync(10000);
      await planAction(timed, { kind: 'setRelease', storyIds: ['US-0102'], version: 'v1.0.0' });
      await vi.advanceTimersByTimeAsync(10000);
      await planAction(timed, { kind: 'createRelease', storyIds: [], version: 'v2.0.0' });
      await vi.advanceTimersByTimeAsync(29000);
      expect(run(clone, 'rev-parse', 'HEAD')).toBe(head);
      await vi.advanceTimersByTimeAsync(1000);
      await done;
      expect(run(clone, 'log', '--format=%s', `${head}..HEAD`)).toBe('docs: plan US-0101, US-0102 for v1.0.0; plan v2.0.0');
    } finally {
      vi.useRealTimers();
    }
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

describe('subjectOf (US-0033 AC2, AC4)', () => {
  const ids = (n) => Array.from({ length: n }, (_, i) => `US-140${i + 1}`);
  const edit = (storyIds) => ({ kind: 'content', storyIds });

  it('cuts a long list after five stories with "and N more", and keeps five whole', () => {
    expect(subjectOf([edit(ids(3)), edit(ids(7))])).toBe('docs: update US-1401, US-1402, US-1403, US-1404, US-1405 and 2 more');
    expect(subjectOf([edit(ids(5))])).toBe('docs: update US-1401, US-1402, US-1403, US-1404, US-1405');
    expect(subjectOf([{ kind: 'setRelease', version: 'v1.0.0', storyIds: ids(6) }])).toBe(
      'docs: plan US-1401, US-1402, US-1403, US-1404, US-1405 and 1 more for v1.0.0'
    );
  });

  it('names nothing when no story can be told', () => {
    expect(subjectOf([edit([]), edit([])])).toBe('docs: update the feature docs');
  });
});
