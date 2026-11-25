// US-0609: the app's own files (`.thadeus/`, the harness hook files) are committed and pushed by the app, in a worktree
// on its own branch, against real repositories in os.tmpdir(): a bare origin.git, a clone on a story branch and a
// second clone standing for another machine, removed after each test. `gh` is null; online is true. Token readings get
// their times from a counter (the injected clock).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs, chmodSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultExec } from '../../src/main/exec.js';
import { splice } from '../../src/main/agentHooks.js';
import { addThadeus, readRecord, recordFile } from '../../src/main/planningRecord.js';
import { isThadeusPath, syncCycle } from '../../src/main/thadeusSync.js';

const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const run = (cwd, ...args) => execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], { cwd, env, encoding: 'utf8' }).trim();

// Each cycle runs real git several times; the 5 s default is the runner's, not a requirement.
vi.setConfig({ testTimeout: 20_000 });

const LOG = '.thadeus/tokens/261120-i.json';
const TEMP = `.thadeus/tokens/.i.json.${randomUUID()}.tmp`; // as writeAtomic names it
const SETTINGS = '.claude/settings.json';
const PLUGIN = '.opencode/plugins/thadeus-dialog.js';
const PERSON_SETTINGS = '{\n  "permissions": {\n    "allow": []\n  }\n}\n';

let tmp;
let origin;
let clone;
let userData;
let ctx;
let clock;

const tick = () => (clock += 30_000);
const reading = (at = tick()) => ({ at, input: at, output: 1, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, usd: 0 });
const write = async (rel, text, dir = clone) => {
  await fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
  writeFileSync(path.join(dir, rel), text);
};
const read = (rel, dir = clone) => readFileSync(path.join(dir, rel), 'utf8');
const atOrigin = (rel, ref = 'main') => run(origin, 'show', `${ref}:${rel}`);
const originLog = (ref = 'main') => run(origin, 'log', '--format=%s', ref).split('\n');
const configure = (dir) => {
  run(dir, 'config', 'user.name', 'T');
  run(dir, 'config', 'user.email', 't@example.com');
  run(dir, 'config', 'commit.gpgsign', 'false');
};
const waiting = async (file, harness) => {
  await addThadeus(userData, clone, { file, ...(harness ? { harness } : {}) });
};

async function setup(files = {}) {
  clock = 1_800_000_000_000;
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-sync-')));
  origin = path.join(tmp, 'origin.git');
  clone = path.join(tmp, 'clone');
  userData = path.join(tmp, 'userData');
  run(tmp, 'init', '-q', '--bare', origin);
  run(tmp, 'clone', '-q', origin, clone);
  configure(clone);
  for (const [rel, text] of Object.entries({ 'src.txt': 'code\n', ...files })) await write(rel, text);
  run(clone, 'add', '.');
  run(clone, 'commit', '-q', '-m', 'start');
  run(clone, 'push', '-q', '-u', 'origin', 'main');
  run(clone, 'checkout', '-q', '-b', 'feat/US-9001');
  ctx = { root: clone, userData, planningBranch: 'docs/planning', gh: null, online: () => true };
}

/** Another machine moves origin's main on with one commit of `files` ({rel: text}). */
async function otherMachine(files) {
  const other = path.join(tmp, 'other');
  run(tmp, 'clone', '-q', origin, other);
  configure(other);
  for (const [rel, text] of Object.entries(files)) await write(rel, text, other);
  run(other, 'add', '.');
  run(other, 'commit', '-q', '-m', 'main moves on');
  run(other, 'push', '-q', 'origin', 'main');
}

afterEach(() => tmp && fs.rm(tmp, { recursive: true, force: true }));

describe('which files are the app’s (US-0609 AC3.1.1)', () => {
  it('takes files under .thadeus/ and skips .DS_Store and editor swap files', () => {
    expect(isThadeusPath(LOG)).toBe(true);
    expect(isThadeusPath('.thadeus/hooks/dialog.sh')).toBe(true);
    for (const junk of ['.thadeus/.DS_Store', '.thadeus/tokens/.i.json.swp', '.thadeus/tokens/i.json~', '.thadeus/tokens/.#i.json', 'src/a.js', '.thadeus']) {
      expect(isThadeusPath(junk)).toBe(false);
    }
  });

  it('skips the atomic write’s temporary files, but not another .tmp file (US-0047 AC1)', () => {
    expect(isThadeusPath(TEMP)).toBe(false);
    expect(isThadeusPath('.thadeus/notes.tmp')).toBe(true);
    expect(isThadeusPath('.thadeus/.notes.tmp')).toBe(true);
  });
});

describe('the sync cycle (US-0609 FR3)', () => {
  beforeEach(() => setup({ [SETTINGS]: PERSON_SETTINGS, '.thadeus/notes.txt': 'a\n' }));

  it('commits a waiting .thadeus file to origin/main in one commit, and leaves the story branch, index and tree as they were (AC3.1.1, AC3.1.4)', async () => {
    await write('src.txt', 'code in progress\n');
    await write('staged.txt', 'staged\n');
    run(clone, 'add', 'staged.txt');
    await write(LOG, JSON.stringify([reading()]));
    run(clone, 'status', '--porcelain'); // settles the index's stat data before the snapshot
    const before = { index: readFileSync(path.join(clone, '.git/index')), head: run(clone, 'rev-parse', 'HEAD'), status: run(clone, 'status', '--porcelain') };
    await waiting(LOG);

    const res = await syncCycle(ctx);

    expect(res).toMatchObject({ pushed: true, pending: 0 });
    expect(originLog()).toEqual(['chore: sync .thadeus', 'start']);
    expect(atOrigin(LOG)).toBe(read(LOG));
    expect(readFileSync(path.join(clone, '.git/index')).equals(before.index)).toBe(true);
    expect({ head: run(clone, 'rev-parse', 'HEAD'), status: run(clone, 'status', '--porcelain') }).toEqual({ head: before.head, status: before.status });
    expect(run(clone, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('feat/US-9001');
    expect(run(clone, 'worktree', 'list').split('\n')).toHaveLength(1);
    expect(run(clone, 'branch', '--list', 'dash/thadeus')).toBe('');
    expect((await readRecord(userData, clone)).actions).toEqual([]);
  });

  it('puts 50 readings added between two cycles in one commit (AC3.1.5)', async () => {
    let list = [reading()];
    await write(LOG, JSON.stringify(list));
    await waiting(LOG);
    await syncCycle(ctx);
    for (let i = 0; i < 50; i++) {
      list = [...list, reading()];
      await write(LOG, JSON.stringify(list));
      await waiting(LOG);
    }
    expect((await readRecord(userData, clone)).actions).toHaveLength(1);

    await syncCycle(ctx);

    expect(originLog()).toEqual(['chore: sync .thadeus', 'chore: sync .thadeus', 'start']);
    expect(JSON.parse(atOrigin(LOG))).toHaveLength(51);
  });

  it('keeps every reading of both machines when origin/main has newer readings in the same token log (AC3.1.6)', async () => {
    const theirs = [reading(), reading()];
    const mine = [reading(), reading()];
    await otherMachine({ [LOG]: JSON.stringify(theirs) });
    await write(LOG, JSON.stringify(mine));
    await waiting(LOG);

    expect(await syncCycle(ctx)).toMatchObject({ pushed: true, pending: 0 });

    expect(JSON.parse(atOrigin(LOG)).map((r) => r.at)).toEqual([...theirs, ...mine].map((r) => r.at).sort((a, b) => a - b));
    expect(originLog()[0]).toBe('chore: sync .thadeus');
  });

  it('keeps the record, names the file and pushes nothing on a real conflict in another .thadeus file (AC3.1.6)', async () => {
    await otherMachine({ '.thadeus/notes.txt': 'b\n' });
    await write('.thadeus/notes.txt', 'c\n');
    await waiting('.thadeus/notes.txt');

    const res = await syncCycle(ctx);

    expect(res).toMatchObject({ error: { kind: 'conflict', files: ['.thadeus/notes.txt'] }, pending: 1 });
    expect(originLog()).toEqual(['main moves on', 'start']);
    expect(atOrigin('.thadeus/notes.txt')).toBe('b');
    expect((await readRecord(userData, clone)).actions.map((a) => a.file)).toEqual(['.thadeus/notes.txt']);
    expect(run(clone, 'worktree', 'list').split('\n')).toHaveLength(1);
  });

  it('commits only the app’s spans of origin’s .claude/settings.json, and names the person’s other edit it leaves (AC3.1.2)', async () => {
    const installed = splice(Buffer.from(PERSON_SETTINGS), 'install').bytes.toString('utf8');
    const withEdit = installed.replace('"allow": []', '"allow": ["Bash(ls)"]');
    expect(withEdit).not.toBe(installed);
    await write(SETTINGS, withEdit);
    await waiting(SETTINGS, 'claude');

    const res = await syncCycle(ctx);

    expect(res).toMatchObject({ pushed: true, left: [SETTINGS] });
    expect(`${atOrigin(SETTINGS)}\n`).toBe(installed);
    expect(read(SETTINGS)).toBe(withEdit);
  });

  it('commits the opencode plugin file whole (FR3.2)', async () => {
    await write(PLUGIN, 'export const plugin = 2;\n');
    await waiting(PLUGIN, 'opencode');

    expect(await syncCycle(ctx)).toMatchObject({ pushed: true, pending: 0 });

    expect(`${atOrigin(PLUGIN)}\n`).toBe('export const plugin = 2;\n');
  });

  it('with a protected main, commits to the docs branch and offers the pull request (AC3.1.1)', async () => {
    const hook = path.join(origin, 'hooks', 'pre-receive');
    writeFileSync(
      hook,
      '#!/bin/sh\nwhile read o n ref; do [ "$ref" = refs/heads/main ] && { echo "GH006: Protected branch update failed" >&2; exit 1; }; done; exit 0\n'
    );
    chmodSync(hook, 0o755);
    await write(LOG, JSON.stringify([reading()]));
    await waiting(LOG);

    const res = await syncCycle(ctx);

    expect(res).toMatchObject({ pushed: true, pending: 0, prOffer: { branch: 'docs/planning' } });
    expect(originLog('docs/planning')[0]).toBe('chore: sync .thadeus');
    expect(originLog()).toEqual(['start']);
    expect((await readRecord(userData, clone)).protectedMain).toBe(true);
  });

  it('pushes the other files and clears an entry that is neither on disk nor at origin (US-0047 AC2)', async () => {
    await write(LOG, JSON.stringify([reading()]));
    await waiting('.thadeus/gone.txt');
    await waiting(PLUGIN, 'opencode'); // a harness file on neither side
    await waiting(LOG);

    expect(await syncCycle(ctx)).toMatchObject({ pushed: true, pending: 0 });

    expect(atOrigin(LOG)).toBe(read(LOG));
    expect(run(origin, 'show', '--name-only', '--format=', 'main')).toBe(LOG);
    expect((await readRecord(userData, clone)).actions).toEqual([]);
  });

  it('commits nothing when only a file that is on neither side waits (US-0047 AC2)', async () => {
    await waiting('.thadeus/gone.txt');

    expect(await syncCycle(ctx)).toEqual({ pending: 0 });

    expect(originLog()).toEqual(['start']);
    expect((await readRecord(userData, clone)).actions).toEqual([]);
  });

  it('clears a temporary file an earlier version recorded, and pushes the rest (US-0047 AC3)', async () => {
    await write(LOG, JSON.stringify([reading()]));
    const entry = (id, file) => ({ id, kind: 'thadeus', file, at: '2026-11-24T10:00:00.000Z', state: 'pending' });
    const file = recordFile(userData, clone);
    await fs.mkdir(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ actions: [entry('a', TEMP), entry('b', LOG)] }));
    expect((await readRecord(userData, clone)).actions.map((a) => a.file)).toEqual([LOG]);

    expect(await syncCycle(ctx)).toMatchObject({ pushed: true, pending: 0 });

    expect(atOrigin(LOG)).toBe(read(LOG));
    expect(JSON.parse(readFileSync(file, 'utf8')).actions).toEqual([]);
  });

  it('does nothing, not even a fetch, when no entry waits', async () => {
    const exec = vi.fn(defaultExec);
    expect(await syncCycle({ ...ctx, exec })).toEqual({ pending: 0 });
    expect(exec.mock.calls.filter(([file]) => file === 'git')).toEqual([]);
  });
});
