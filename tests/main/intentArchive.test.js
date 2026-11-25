// US-0513 FR1.3–FR1.5, FR2.2, FR4.3, NFR1: archive and unarchive through AI-DLC's own commands; AI-DLC itself never runs
// here, a fake command writes the files it would.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { archiveIntents, unarchiveIntent } from '../../src/main/intentArchive.js';
import { openRoot } from '../../src/main/projectAccess.js';
import { t } from '../../src/shared/i18n.js';

const INTENTS = 'aidlc/spaces/default/intents';
const refusal = (text) => Object.assign(new Error('Command failed'), { stdout: text });
const timeout = () => Object.assign(new Error('Command failed'), { killed: true });

let root;
let intents;
beforeEach(async () => {
  root = await openRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'archive-')));
  intents = [];
  for (const dirName of ['261120-a', '261121-b', '261122-c']) {
    await fs.mkdir(path.join(root, INTENTS, dirName, 'audit'), { recursive: true });
    await fs.writeFile(path.join(root, INTENTS, dirName, 'aidlc-state.md'), 'Completed');
    await fs.writeFile(path.join(root, INTENTS, dirName, 'audit/other-1.md'), 'x');
    intents.push({ dirName, slug: dirName.slice(7), status: 'complete', missingOnDisk: false, missingInIndex: false });
  }
  await fs.writeFile(path.join(root, INTENTS, 'intents.json'), '[]');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

/** The command's own order: the audit first, then the state, then intents.json. */
async function write(dirName, { upTo = 3 } = {}) {
  const base = path.join(root, INTENTS, dirName);
  await fs.appendFile(path.join(base, 'audit/host-9.md'), 'WORKFLOW\n');
  if (upTo > 1) await fs.appendFile(path.join(base, 'aidlc-state.md'), ' Archived');
  if (upTo > 2) await fs.appendFile(path.join(root, INTENTS, 'intents.json'), ' ');
}
/** Records each command with its options; `answer(dirName)` may write and throw. */
function fakeExec(answer = write) {
  const calls = [];
  const exec = vi.fn(async (file, args, options) => {
    if (args[0] === '-l') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push({ args, timeout: options.timeout, cwd: options.cwd });
    await answer(args[2]);
    return 'ok';
  });
  return { exec, calls, argsOf: () => calls.map((c) => c.args) };
}
const filesOf = (dirName) => [`${INTENTS}/${dirName}/aidlc-state.md`, `${INTENTS}/${dirName}/audit/host-9.md`];
const archive = (dirNames, reason, opts) => archiveIntents(root, dirNames, reason, { space: 'default', intents, ...opts });

describe('archiveIntents, one intent (AC1.1.3–AC1.1.6)', () => {
  it('runs exactly aidlc intent archive <dirName>, in the project with a 20 s limit, and names the files it changed', async () => {
    const { exec, calls } = fakeExec();
    expect(await archive(['261120-a'], undefined, { exec })).toEqual({
      ok: true,
      archived: ['261120-a'],
      refused: [],
      files: [`${INTENTS}/intents.json`, ...filesOf('261120-a')].sort()
    });
    expect(calls).toEqual([{ args: ['intent', 'archive', '261120-a'], timeout: 20000, cwd: root }]);
  });

  it('sends --reason only when the trimmed one-line reason is not empty', async () => {
    const { exec, argsOf } = fakeExec();
    await archive(['261120-a'], '  done\nwith it ', { exec });
    await archive(['261120-a'], '   ', { exec });
    expect(argsOf()).toEqual([
      ['intent', 'archive', '261120-a', '--reason', 'done with it'],
      ['intent', 'archive', '261120-a']
    ]);
  });

  it('a reason that is too long or starts with a dash runs nothing', async () => {
    const { exec, calls } = fakeExec();
    expect(await archive(['261120-a'], 'x'.repeat(201), { exec })).toEqual({ ok: false, error: t('intents.archive.reasonError.tooLong') });
    expect(await archive(['261120-a'], '--force', { exec })).toEqual({ ok: false, error: t('intents.archive.reasonError.dash') });
    expect(calls).toEqual([]);
  });

  it('a name that is unknown, invalid, missing on disk or without a row throws before anything runs (NFR1)', async () => {
    const { exec } = fakeExec();
    for (const bad of ['261199-z', '../x', '--help']) await expect(archive([bad], '', { exec })).rejects.toThrow();
    await expect(archive(['261120-a', '261199-z'], '', { exec })).rejects.toThrow();
    intents[0].missingOnDisk = true;
    intents[1].missingInIndex = true;
    await expect(archive(['261120-a'], '', { exec })).rejects.toThrow();
    await expect(archive(['261121-b'], '', { exec })).rejects.toThrow();
    expect(exec).not.toHaveBeenCalled();
  });

  it('a refusal comes back with AI-DLC’s words, a timeout with the time-out text', async () => {
    const said = fakeExec(() => Promise.reject(refusal('Intent "261120-a" still has claimed team Unit(s).\n')));
    expect(await archive(['261120-a'], '', { exec: said.exec })).toEqual({
      ok: true,
      archived: [],
      refused: [{ dirName: '261120-a', error: 'Intent "261120-a" still has claimed team Unit(s).' }],
      files: []
    });
    const late = fakeExec(async (dirName) => {
      await write(dirName, { upTo: 2 });
      throw timeout();
    });
    const res = await archive(['261120-a'], '', { exec: late.exec });
    expect(res.refused).toEqual([{ dirName: '261120-a', error: t('errors.timeoutAfter', { seconds: 20 }) }]);
    expect(res.files).toEqual(filesOf('261120-a')); // what the cut-off command changed is known
  });

  it('in another space than AI-DLC’s active one nothing runs, and the reason names both (AC1.1.6)', async () => {
    const { exec, calls } = fakeExec();
    await fs.mkdir(path.join(root, 'aidlc/spaces/team'));
    await fs.writeFile(path.join(root, 'aidlc/active-space'), 'team');
    const error = t('intents.archive.otherSpace', { space: 'default', active: 'team' });
    expect(await archive(['261120-a'], '', { exec })).toEqual({ ok: false, error });
    expect(await unarchiveIntent(root, '261120-a', { space: 'default', intents, exec })).toEqual({ ok: false, error });
    expect(calls).toEqual([]);
  });

  it('a blocked intent runs nothing and gives the reason (FR1.5)', async () => {
    const { exec, calls } = fakeExec();
    expect((await archive(['261120-a'], '', { exec, blocked: async () => 'an agent works' })).refused).toEqual([
      { dirName: '261120-a', error: 'an agent works' }
    ]);
    expect(calls).toEqual([]);
  });
});

describe('archiveIntents, several (AC4.1.3, AC4.1.4)', () => {
  const all = ['261122-c', '261120-a', '261121-b'];

  it('archives one at a time in the order given, with progress, and the same reason for all', async () => {
    let running = 0;
    const { exec, argsOf } = fakeExec(async (dirName) => {
      expect(++running).toBe(1);
      await write(dirName);
      running--;
    });
    const progress = [];
    const res = await archive([...all, '261122-c'], 'tidy', { exec, onProgress: (p) => progress.push(p) }); // a name twice runs once
    expect(res.archived).toEqual(all);
    expect(argsOf()).toEqual(all.map((dirName) => ['intent', 'archive', dirName, '--reason', 'tidy']));
    expect(progress).toEqual([
      { n: 1, total: 3 },
      { n: 2, total: 3 },
      { n: 3, total: 3 }
    ]);
    expect(res.files).toEqual([`${INTENTS}/intents.json`, ...all.flatMap(filesOf)].sort());
  });

  it('a refused, blocked or timed-out one in the middle does not stop the rest', async () => {
    const { exec, argsOf } = fakeExec(async (dirName) => {
      if (dirName === '261120-a') throw refusal('no');
      await write(dirName);
    });
    const res = await archive(all, '', { exec });
    expect(argsOf().map((a) => a[2])).toEqual(all);
    expect(res).toMatchObject({ ok: true, archived: ['261122-c', '261121-b'], refused: [{ dirName: '261120-a', error: 'no' }] });

    const second = await archive(all, '', { ...fakeExec(), blocked: async (dirName) => (dirName === '261122-c' ? 'busy' : null) });
    expect(second).toMatchObject({ archived: ['261120-a', '261121-b'], refused: [{ dirName: '261122-c', error: 'busy' }] });

    const broken = async (dirName) => {
      if (dirName === '261122-c') throw new Error('EACCES');
      return null;
    };
    expect(await archive(all, '', { ...fakeExec(), blocked: broken })).toMatchObject({ archived: ['261120-a', '261121-b'], refused: [{ error: 'EACCES' }] });
  });

  it('an unfinished one among several runs nothing', async () => {
    const { exec, calls } = fakeExec();
    intents[1].status = 'in-flight';
    expect(await archive(all, '', { exec })).toEqual({ ok: false, error: t('intents.archive.onlyComplete') });
    expect(calls).toEqual([]);
    expect((await archive(['261121-b'], '', { exec })).archived).toEqual(['261121-b']); // one alone may be unfinished
  });
});

describe('unarchiveIntent (AC2.1.2, AC2.1.4)', () => {
  const unarchive = (dirName, exec) => unarchiveIntent(root, dirName, { space: 'default', intents, exec });

  it('runs exactly aidlc intent unarchive <dirName> and names the files it changed', async () => {
    const { exec, calls } = fakeExec();
    expect(await unarchive('261120-a', exec)).toEqual({ ok: true, files: [`${INTENTS}/intents.json`, ...filesOf('261120-a')].sort() });
    expect(calls).toEqual([{ args: ['intent', 'unarchive', '261120-a'], timeout: 20000, cwd: root }]);
  });

  it('a refusal comes back with AI-DLC’s words, and an unknown name throws', async () => {
    const { exec } = fakeExec(() => Promise.reject(refusal('Intent "261120-a" is not archived')));
    expect(await unarchive('261120-a', exec)).toEqual({ ok: false, error: 'Intent "261120-a" is not archived', files: [] });
    await expect(unarchive('-x', exec)).rejects.toThrow();
  });
});
