// US-0506 u4 LC30: HookInstaller status, preview, apply and watch on real temporary projects (SD31, SD33, PD30–PD33,
// RD33–RD35, RD39, RD40, RD42).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CANONICAL, CURRENT, FILES, PLUGIN_BYTES, SCRIPT_BYTES, createHookInstaller } from '../../src/main/agentHooks.js';
import { fixture, removeProject, tempProject, testEarlier } from '../helpers/agentHooksFixtures.js';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WRITES = ['writeFile', 'rename', 'unlink', 'mkdir', 'rmdir', 'chmod', 'rm'];
const releases = [testEarlier(CANONICAL), CURRENT];
const fakeWatch = () => {
  const w = { onChange: null, closed: false };
  return { w, watch: ({ onChange }) => ((w.onChange = onChange), { ready: Promise.resolve(), close: async () => void (w.closed = true) }) };
};

let root, installer, pushes, logs, fake;
const make = (over = {}) =>
  createHookInstaller({
    log: (line) => logs.push(line),
    onStatus: (s) => pushes.push(s),
    usedOf: () => ['claude'],
    releases,
    watch: fake.watch,
    ...over
  });
const abs = (rel) => path.join(root, rel);
const read = (rel) => fs.readFile(abs(rel));
const exists = (rel) =>
  fs.lstat(abs(rel)).then(
    () => true,
    () => false
  );
const put = async (rel, bytes) => {
  await fs.mkdir(path.dirname(abs(rel)), { recursive: true });
  await fs.writeFile(abs(rel), bytes);
};
const harness = (payload, id) => payload.find((h) => h.harness === id);
const spyAll = (names) => Object.fromEntries(names.map((n) => [n, vi.spyOn(fs, n)]));
const calls = (spies) => Object.values(spies).reduce((n, s) => n + s.mock.calls.length, 0);
const fail = (name, code, match = () => true) => {
  const orig = fs[name].bind(fs);
  const spy = vi.spyOn(fs, name).mockImplementation(async (...args) => {
    if (match(...args)) {
      spy.mockRestore();
      throw Object.assign(new Error(code), { code });
    }
    return orig(...args);
  });
  return spy;
};

beforeEach(async () => {
  root = await tempProject();
  pushes = [];
  logs = [];
  fake = fakeWatch();
  installer = make();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await installer.closeProject('p1');
  await removeProject(root);
});

describe('status (BR7.4, BR7.5, BR7.17, RD39, PD30, PD31)', () => {
  it('gives one entry per harness with each file in words, and pushes it on open', async () => {
    const status = await installer.openProject('p1', root);
    expect(status).toEqual([
      {
        harness: 'claude',
        used: true,
        status: 'missing',
        files: [
          { path: FILES.settings, status: 'missing' },
          { path: FILES.script, status: 'missing' }
        ]
      },
      { harness: 'opencode', used: false, status: 'missing', files: [{ path: FILES.plugin, status: 'missing' }] }
    ]);
    expect(pushes).toEqual([{ projectId: 'p1', root, harnesses: status, previous: null }]);
  });

  it('marks an unusable file with its reason and keeps the harness missing', async () => {
    await put(FILES.settings, fixture('current.json'));
    await put(FILES.script, SCRIPT_BYTES);
    await put(FILES.plugin, fixture('invalid.json'));
    await fs.writeFile(abs(FILES.settings), fixture('invalid.json'));
    const status = await installer.openProject('p1', root);
    expect(harness(status, 'claude')).toMatchObject({ status: 'missing', files: [{ status: 'missing', reason: 'invalidJson' }, { status: 'current' }] });
    expect(harness(status, 'opencode').status).toBe('editedByHand');
  });

  it('gives current only when every file of the harness is current', async () => {
    await put(FILES.script, SCRIPT_BYTES);
    expect(harness(await installer.openProject('p1', root), 'claude').status).toBe('outOfDate');
    await put(FILES.settings, fixture('current.json'));
    expect(harness(await installer.status('p1'), 'claude').status).toBe('current');
    await put(FILES.settings, fixture('earlier-release.json'));
    expect(harness(await installer.status('p1'), 'claude').status).toBe('outOfDate');
    await put(FILES.settings, fixture('hand-edited.json'));
    expect(harness(await installer.status('p1'), 'claude').status).toBe('editedByHand');
  });

  it('answers isCurrent from memory, false for an unknown root or harness', async () => {
    await put(FILES.settings, fixture('current.json'));
    await put(FILES.script, SCRIPT_BYTES);
    await installer.openProject('p1', root);
    const spies = spyAll(['readFile', 'lstat', 'stat', 'realpath', 'readdir']);
    let yes = 0;
    for (let i = 0; i < 1000; i++) if (installer.isCurrent(root, 'claude')) yes++;
    expect(yes).toBe(1000);
    expect(installer.isCurrent(root, 'opencode')).toBe(false);
    expect(installer.isCurrent('/elsewhere', 'claude')).toBe(false);
    expect(installer.isCurrent(root, 'codex')).toBe(false);
    expect(calls(spies)).toBe(0);
  });

  it('makes no write on open, status or preview, and at most 3 readFile calls on open', async () => {
    await put(FILES.settings, fixture('aidlc.json'));
    await put(FILES.script, SCRIPT_BYTES);
    await put(FILES.plugin, PLUGIN_BYTES);
    const writes = spyAll(WRITES);
    const reads = vi.spyOn(fs, 'readFile');
    await installer.openProject('p1', root);
    expect(reads).toHaveBeenCalledTimes(3);
    await installer.status('p1');
    await installer.preview('p1', 'claude', 'install');
    await installer.preview('p1', 'opencode', 'remove');
    expect(calls(writes)).toBe(0);
  });
});

describe('preview (BR7.7, SD31, SD33, RD39)', () => {
  beforeEach(() => installer.openProject('p1', root));

  it('returns only previewId and each file’s path, change, summary, diff and replacesHandEdit', async () => {
    await put(FILES.settings, fixture('hand-edited.json'));
    const pv = await installer.preview('p1', 'claude', 'update');
    expect(pv).toMatchObject({ harness: 'claude', action: 'update', canApply: true });
    expect(pv.previewId).toMatch(/^[0-9a-f-]{36}$/);
    expect(pv.files.map((f) => Object.keys(f).sort())).toEqual([
      ['change', 'diff', 'path', 'replacesHandEdit', 'summary'],
      ['change', 'diff', 'path', 'replacesHandEdit', 'summary']
    ]);
    expect(pv.files.map((f) => [f.path, f.change, f.replacesHandEdit])).toEqual([
      [FILES.settings, 'modify', true],
      [FILES.script, 'create', false]
    ]);
    const json = JSON.stringify(pv);
    expect(json).not.toMatch(/nextBytes|baseDigest/);
    expect(json).not.toContain('reply; exit 0'); // the Stop entry is far from the splice, so no diff line shows it
  });

  it('keeps one open preview per harness: a newer one supersedes the open one', async () => {
    const first = await installer.preview('p1', 'claude', 'install');
    const other = await installer.preview('p1', 'opencode', 'install');
    const second = await installer.preview('p1', 'claude', 'install');
    expect(await installer.apply('p1', first.previewId)).toMatchObject({ result: 'refused', refusal: 'previewUnknown' });
    expect((await installer.apply('p1', other.previewId)).result).toBe('written');
    expect((await installer.apply('p1', second.previewId)).result).toBe('written');
  });

  it('builds no preview for a harness with a reason, and says why', async () => {
    await put(FILES.settings, fixture('jsonc-comment.json'));
    expect(await installer.preview('p1', 'claude', 'install')).toEqual({ refusal: 'invalidJson', file: FILES.settings });
    await fs.rm(abs('.claude'), { recursive: true });
    await fs.mkdir(abs('docs'));
    await fs.symlink(abs('docs'), abs('.claude'));
    expect(await installer.preview('p1', 'claude', 'install')).toEqual({ refusal: 'cannotWrite', file: FILES.settings, cause: 'link' });
  });

  it('offers no apply when nothing would change, and applying it anyway writes nothing', async () => {
    await put(FILES.plugin, PLUGIN_BYTES);
    const pv = await installer.preview('p1', 'opencode', 'install');
    expect(pv.canApply).toBe(false);
    expect(pv.files[0]).toMatchObject({ change: 'none', diff: '' });
    const writes = spyAll(WRITES);
    expect(await installer.apply('p1', pv.previewId)).toMatchObject({ result: 'nothingToChange' });
    expect(calls(writes)).toBe(0);
  });

  it('cancel ends an open preview in main', async () => {
    const pv = await installer.preview('p1', 'claude', 'install');
    installer.cancel('p1', pv.previewId);
    expect(await installer.apply('p1', pv.previewId)).toMatchObject({ result: 'refused', refusal: 'previewUnknown' });
  });
});

describe('apply (BR7.9, BR7.14, BR7.16, RD33–RD35, RD40)', () => {
  beforeEach(() => installer.openProject('p1', root));

  it('install writes the previewed bytes, script before settings, and the harness becomes current', async () => {
    await put(FILES.settings, fixture('aidlc.json'));
    const pv = await installer.preview('p1', 'claude', 'install');
    const renames = vi.spyOn(fs, 'rename');
    const out = await installer.apply('p1', pv.previewId);
    expect(out.result).toBe('written');
    expect(renames.mock.calls.map(([, to]) => path.relative(root, to))).toEqual([FILES.script, FILES.settings]);
    expect(sha(await read(FILES.script))).toBe(sha(SCRIPT_BYTES));
    expect(harness(out.status, 'claude').status).toBe('current');
    expect(installer.isCurrent(root, 'claude')).toBe(true);
    expect(logs.some((l) => l.startsWith('[agent-hooks]') && l.includes('written'))).toBe(true);
  });

  it('remove changes settings first, deletes the script, removes empty folders and keeps a folder with other files', async () => {
    await put(FILES.settings, fixture('current.json'));
    await put(FILES.script, SCRIPT_BYTES);
    await put('.thadeus/notes.txt', 'mine');
    const order = [];
    const orig = { rename: fs.rename.bind(fs), unlink: fs.unlink.bind(fs) };
    vi.spyOn(fs, 'rename').mockImplementation((a, b) => (order.push(['rename', path.relative(root, b)]), orig.rename(a, b)));
    vi.spyOn(fs, 'unlink').mockImplementation((a) => (order.push(['unlink', path.relative(root, a)]), orig.unlink(a)));
    const pv = await installer.preview('p1', 'claude', 'remove');
    expect(pv.files.map((f) => f.change)).toEqual(['modify', 'delete']);
    const out = await installer.apply('p1', pv.previewId);
    expect(out.result).toBe('written');
    expect(order).toEqual([
      ['rename', FILES.settings],
      ['unlink', FILES.script]
    ]);
    expect((await read(FILES.settings)).toString()).toBe('{}\n');
    expect(await exists('.thadeus/hooks')).toBe(false);
    expect(await exists('.thadeus/notes.txt')).toBe(true);
    expect(harness(out.status, 'claude').status).toBe('missing');
  });

  it('refuses unknown, applied, cancelled and another project’s ids with previewUnknown', async () => {
    const other = await tempProject();
    await installer.openProject('p2', other);
    const theirs = await installer.preview('p2', 'claude', 'install');
    const pv = await installer.preview('p1', 'opencode', 'install');
    expect(await installer.apply('p1', theirs.previewId)).toMatchObject({ refusal: 'previewUnknown' });
    expect(await installer.apply('p1', 'b6f3e7a2-0000-4000-8000-000000000000')).toMatchObject({ refusal: 'previewUnknown' });
    expect(await installer.apply('nope', pv.previewId)).toMatchObject({ refusal: 'previewUnknown' });
    expect((await installer.apply('p1', pv.previewId)).result).toBe('written');
    expect(await installer.apply('p1', pv.previewId)).toMatchObject({ refusal: 'previewUnknown' });
    await installer.closeProject('p2');
    await removeProject(other);
  });

  it('applies a preview once: two applies without awaiting write each file once', async () => {
    const pv = await installer.preview('p1', 'claude', 'install');
    const renames = vi.spyOn(fs, 'rename');
    const [a, b] = await Promise.all([installer.apply('p1', pv.previewId), installer.apply('p1', pv.previewId)]);
    expect(a.result).toBe('written');
    expect(b).toMatchObject({ result: 'refused', refusal: 'previewUnknown' });
    expect(renames).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['changed', async () => put(FILES.settings, fixture('other-pretooluse.json')), true],
    ['created', async () => put(FILES.settings, fixture('no-hooks.json')), false],
    ['deleted', async () => fs.rm(abs(FILES.settings)), true]
  ])('writes nothing when the settings file was %s after the preview, and returns a new preview (W6, RD35)', async (_what, change, present) => {
    if (present) await put(FILES.settings, fixture('aidlc.json'));
    const pv = await installer.preview('p1', 'claude', 'install');
    await change();
    const writes = spyAll(['writeFile', 'rename', 'unlink', 'mkdir']);
    const out = await installer.apply('p1', pv.previewId);
    expect(out).toMatchObject({ result: 'refused', refusal: 'changedSincePreview', file: FILES.settings });
    expect(calls(writes)).toBe(0);
    expect(out.preview.previewId).not.toBe(pv.previewId);
    expect(await installer.apply('p1', pv.previewId)).toMatchObject({ refusal: 'previewUnknown' });
    expect((await installer.apply('p1', out.preview.previewId)).result).toBe('written');
  });

  it('reads each target last, directly before its rename or unlink (RD35)', async () => {
    await put(FILES.settings, fixture('aidlc.json'));
    const order = [];
    for (const n of ['readFile', 'rename', 'unlink', 'lstat', 'stat', 'writeFile', 'chmod', 'mkdir', 'realpath', 'rm', 'rmdir']) {
      const orig = fs[n].bind(fs);
      vi.spyOn(fs, n).mockImplementation((...a) => (order.push([n, String(a.at(n === 'rename' ? 1 : 0))]), orig(...a)));
    }
    const check = () => {
      for (const [i, [n, p]] of order.entries()) if (n === 'rename' || n === 'unlink') expect(order[i - 1]).toEqual(['readFile', p]);
    };
    await installer.apply('p1', (await installer.preview('p1', 'claude', 'install')).previewId);
    expect(order.filter(([n]) => n === 'rename')).toHaveLength(2);
    check();
    order.length = 0;
    await installer.apply('p1', (await installer.preview('p1', 'claude', 'remove')).previewId);
    expect(order.filter(([n]) => n === 'unlink')).toHaveLength(1);
    check();
  });

  it('gives partiallyWritten naming the settings file when its rename fails after the script, and outOfDate', async () => {
    const pv = await installer.preview('p1', 'claude', 'install');
    fail('rename', 'EACCES', (_from, to) => to === abs(FILES.settings));
    const out = await installer.apply('p1', pv.previewId);
    expect(out).toMatchObject({ result: 'partiallyWritten', file: FILES.settings, cause: 'EACCES' });
    expect(await exists(FILES.script)).toBe(true);
    expect(await exists(FILES.settings)).toBe(false);
    expect(harness(out.status, 'claude').status).toBe('outOfDate');
  });

  it('gives partiallyWritten when the script unlink fails on remove, and offers remove again', async () => {
    await put(FILES.settings, fixture('current.json'));
    await put(FILES.script, SCRIPT_BYTES);
    const pv = await installer.preview('p1', 'claude', 'remove');
    fail('unlink', 'EPERM');
    const out = await installer.apply('p1', pv.previewId);
    expect(out).toMatchObject({ result: 'partiallyWritten', file: FILES.script, cause: 'EPERM' });
    expect(harness(out.status, 'claude').status).toBe('outOfDate');
    expect((await installer.preview('p1', 'claude', 'remove')).files.map((f) => f.change)).toEqual(['none', 'delete']);
  });

  it('refuses with cannotWrite and leaves no file or new folder when the first write fails', async () => {
    const pv = await installer.preview('p1', 'claude', 'install');
    fail('writeFile', 'ENOSPC');
    const out = await installer.apply('p1', pv.previewId);
    expect(out).toMatchObject({ result: 'refused', refusal: 'cannotWrite', file: FILES.script, cause: 'ENOSPC' });
    expect(await exists('.thadeus')).toBe(false);
    expect(await exists(FILES.settings)).toBe(false);
  });

  it('never leaves a preview applying after an unexpected throw', async () => {
    const pv = await installer.preview('p1', 'opencode', 'install');
    vi.spyOn(fs, 'readFile').mockImplementationOnce(() => {
      throw new TypeError('boom');
    });
    expect(await installer.apply('p1', pv.previewId)).toMatchObject({ result: 'refused', refusal: 'cannotWrite' });
    expect(await installer.apply('p1', pv.previewId)).toMatchObject({ refusal: 'previewUnknown' });
  });

  it('runs two harnesses’ applies on one project one after the other', async () => {
    const a = await installer.preview('p1', 'claude', 'install');
    const b = await installer.preview('p1', 'opencode', 'install');
    const order = [];
    const orig = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      order.push(`start ${path.basename(to)}`);
      await wait(20);
      await orig(from, to);
      order.push(`end ${path.basename(to)}`);
    });
    await Promise.all([installer.apply('p1', a.previewId), installer.apply('p1', b.previewId)]);
    expect(order).toEqual(['start dialog.sh', 'end dialog.sh', 'start settings.json', 'end settings.json', 'start thadeus-dialog.js', 'end thadeus-dialog.js']);
  });

  it('gives new files and folders the umask modes and keeps a changed file’s mode; dialog.sh has no CR or BOM', async () => {
    const umask = process.umask();
    await put(FILES.settings, fixture('no-hooks.json'));
    await fs.chmod(abs(FILES.settings), 0o600);
    await installer.apply('p1', (await installer.preview('p1', 'claude', 'install')).previewId);
    const mode = async (rel) => (await fs.stat(abs(rel))).mode & 0o7777;
    expect(await mode(FILES.settings)).toBe(0o600);
    expect(await mode(FILES.script)).toBe(0o666 & ~umask);
    expect(await mode('.thadeus')).toBe(0o777 & ~umask);
    expect(await mode('.thadeus/hooks')).toBe(0o777 & ~umask);
    const script = await read(FILES.script);
    expect(script.includes('\r')).toBe(false);
    expect(script.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(false);
  });

  it('handles the 1 MB settings fixture within the CI tolerances (PD31, PD33)', async () => {
    await put(FILES.settings, fixture('large.json'));
    let t0 = performance.now();
    await installer.status('p1');
    expect(performance.now() - t0).toBeLessThan(200);
    t0 = performance.now();
    const pv = await installer.preview('p1', 'claude', 'install');
    expect(performance.now() - t0).toBeLessThan(300);
    t0 = performance.now();
    expect((await installer.apply('p1', pv.previewId)).result).toBe('written');
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

describe('watch (BR7.17, PD32, RD40, SCD31)', () => {
  it('recomputes after a running apply, never in the middle of it', async () => {
    await installer.openProject('p1', root);
    const pv = await installer.preview('p1', 'claude', 'install');
    const orig = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (to === abs(FILES.script)) fake.w.onChange(); // a change seen while the apply runs
      return orig(from, to);
    });
    pushes.length = 0;
    await installer.apply('p1', pv.previewId);
    await wait(50);
    expect(pushes.map((p) => harness(p.harnesses, 'claude').status)).toEqual(['current']);
  });

  it('closing the project closes its watcher and forgets its isCurrent keys', async () => {
    await put(FILES.plugin, PLUGIN_BYTES);
    await installer.openProject('p1', root);
    expect(installer.isCurrent(root, 'opencode')).toBe(true);
    await installer.closeProject('p1');
    expect(fake.w.closed).toBe(true);
    expect(installer.isCurrent(root, 'opencode')).toBe(false);
    await expect(installer.status('p1')).rejects.toThrow();
  });

  describe('with the real watcher', () => {
    beforeEach(async () => {
      installer = make({ watch: undefined });
      await installer.openProject('p1', root);
      await installer.ready('p1');
      await wait(300); // macOS FSEvents settling, as the watcher tests do
      pushes.length = 0;
    });

    it('5 rewrites in 100 ms give one push within 1.5 s; the same bytes again give none', async () => {
      for (let i = 0; i < 5; i++) {
        await put(FILES.settings, i % 2 ? fixture('current.json') : fixture('earlier-release.json'));
        await wait(20);
      }
      await wait(1500);
      expect(pushes).toHaveLength(1);
      await put(FILES.settings, fixture('earlier-release.json'));
      await wait(1200);
      expect(pushes).toHaveLength(1);
    });

    it('a write to dialog.sh and to the plugin each give one push, and deleting .thadeus gives one', async () => {
      await put(FILES.script, SCRIPT_BYTES);
      await wait(1200);
      expect(pushes).toHaveLength(1);
      await put(FILES.plugin, PLUGIN_BYTES);
      await wait(1200);
      expect(pushes).toHaveLength(2);
      await fs.rm(abs('.thadeus'), { recursive: true });
      await wait(1200);
      expect(pushes).toHaveLength(3);
      expect(harness(pushes[2].harnesses, 'claude').status).toBe('missing');
    });

    it('a fixed invalid file loses its reason', async () => {
      await put(FILES.settings, fixture('invalid.json'));
      await wait(1200);
      expect(harness(pushes.at(-1).harnesses, 'claude').files[0].reason).toBe('invalidJson');
      await put(FILES.settings, fixture('current.json'));
      await wait(1500);
      expect(harness(pushes.at(-1).harnesses, 'claude').files[0]).toEqual({ path: FILES.settings, status: 'current' });
    });
  });
});
