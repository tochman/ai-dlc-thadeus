// US-1408 FR2.1–FR2.3, BR1.1–BR2.6, NFR3.1–NFR3.6: the framework kept in `.thadeus/project.json`, on real temp folders.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { readProjectFile, writeProjectFile } from '../../src/main/projectFile.js';

// The race seam: runs `race.before(abs)` just before writeAtomic's own `expect`, as a symlink swapped in at the last moment.
const race = vi.hoisted(() => ({ before: null }));
vi.mock('../../src/main/fileWrite.js', async (importOriginal) => {
  const real = await importOriginal();
  const writeAtomic = (abs, bytes, opts = {}) =>
    real.writeAtomic(abs, bytes, {
      ...opts,
      expect: async () => {
        if (race.before) await race.before(abs);
        await opts.expect?.();
      }
    });
  return { ...real, writeAtomic };
});

let root;

beforeEach(async () => {
  race.before = null;
  root = await openRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-pf-')));
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

const file = (rel = '.thadeus/project.json') => path.join(root, rel);
async function put(text, rel = '.thadeus/project.json') {
  await fs.mkdir(path.dirname(file(rel)), { recursive: true });
  await fs.writeFile(file(rel), text);
}
const putJson = (value) => put(JSON.stringify(value));

/** Every entry under the root with its bytes, link target or `dir`, so a test can tell what changed. */
async function snapshot(dir = root, rel = '', out = {}) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const key = rel ? `${rel}/${e.name}` : e.name;
    if (e.isSymbolicLink()) out[key] = `link:${await fs.readlink(abs)}`;
    else if (e.isDirectory()) {
      out[key] = 'dir';
      await snapshot(abs, key, out);
    } else out[key] = (await fs.readFile(abs)).toString('base64');
  }
  return out;
}

describe('projectFile.readProjectFile (W1, BR1.1, BR1.2)', () => {
  const cases = [
    ['missing: no .thadeus/', 'missing', async () => {}],
    ['missing: .thadeus/ without the file', 'missing', () => fs.mkdir(file('.thadeus'))],
    ['unreadable: bad JSON', 'unreadable', () => put('{"version": 1,')],
    ['unreadable: a 70 KiB file (NFR3.2)', 'unreadable', () => putJson({ version: 1, framework: 'aidlc', pad: 'x'.repeat(70 * 1024) })],
    ['unreadable: JSON nested 100,000 levels (NFR3.3)', 'unreadable', () => put('['.repeat(100000) + ']'.repeat(100000))],
    [
      'unreadable: a symlinked .thadeus/ (NFR3.1)',
      'unreadable',
      async () => {
        await put(JSON.stringify({ version: 1, framework: 'aidlc' }), 'elsewhere/project.json');
        await fs.symlink(file('elsewhere'), file('.thadeus'));
      }
    ],
    [
      'unreadable: a symlinked file (NFR3.1)',
      'unreadable',
      async () => {
        await put(JSON.stringify({ version: 1, framework: 'aidlc' }), 'other.json');
        await fs.mkdir(file('.thadeus'));
        await fs.symlink(file('other.json'), file());
      }
    ],
    ['unreadable: a folder in the file’s place', 'unreadable', () => fs.mkdir(file(), { recursive: true })],
    ['invalid: an array', 'invalid', () => putJson([{ version: 1, framework: 'aidlc' }])],
    ['invalid: version "1"', 'invalid', () => putJson({ version: '1', framework: 'aidlc' })],
    ['invalid: version 1 with no framework', 'invalid', () => putJson({ version: 1 })],
    ['unknownVersion: version 2, even with no framework', 'unknownVersion', () => putJson({ version: 2 })],
    ['unknownFramework: framework "bogus"', 'unknownFramework', () => putJson({ version: 1, framework: 'bogus' })]
  ];

  it.each(cases)('%s', async (_name, reason, arrange) => {
    await arrange();
    const before = await snapshot();
    expect(await readProjectFile(root)).toEqual({ ok: false, reason });
    expect(await snapshot()).toEqual(before); // NFR3.6: reading writes nothing
  });

  it('ok: gives the parsed value with every key, and writes nothing', async () => {
    await putJson({ version: 1, framework: 'speckit', note: { kept: true } });
    const before = await snapshot();
    expect(await readProjectFile(root)).toEqual({ ok: true, value: { version: 1, framework: 'speckit', note: { kept: true } } });
    expect(await snapshot()).toEqual(before);
  });

  it('ok: a file of exactly 64 KiB is still read', async () => {
    const head = JSON.stringify({ version: 1, framework: 'aidlc', pad: '' });
    await put(head.replace('"pad":""', `"pad":"${'x'.repeat(64 * 1024 - head.length)}"`));
    expect((await fs.stat(file())).size).toBe(64 * 1024);
    expect(await readProjectFile(root)).toMatchObject({ ok: true, value: { framework: 'aidlc' } });
  });
});

describe('projectFile.writeProjectFile (W2, BR2.1–BR2.6)', () => {
  const HOSTILE = '<img src=x onerror=alert(1)>';
  const onDisk = async () => fs.readFile(file(), 'utf8');

  it('BR2.2: refuses a framework other than aidlc or speckit, and writes nothing', async () => {
    await put('# readme\n', 'README.md');
    const before = await snapshot();
    const res = await writeProjectFile(root, 'bogus');
    expect(res).toMatchObject({ ok: false, error: { code: 'invalidFramework' } });
    expect(res.error.message).toEqual(expect.any(String));
    expect(res.error.message).not.toContain('bogus');
    expect(await snapshot()).toEqual(before);
  });

  it('BR2.6: creates .thadeus/ and the file on a fresh project; only .thadeus/project.json is new (NFR3.4)', async () => {
    await put('# readme\n', 'README.md');
    const before = await snapshot();
    expect(await writeProjectFile(root, 'speckit')).toEqual({ ok: true, file: '.thadeus/project.json', replaced: false });
    expect(await onDisk()).toBe('{\n  "version": 1,\n  "framework": "speckit"\n}\n');
    const after = await snapshot();
    expect(Object.keys(after).filter((k) => !(k in before))).toEqual(['.thadeus', '.thadeus/project.json']);
    expect(await readProjectFile(root)).toEqual({ ok: true, value: { version: 1, framework: 'speckit' } });
  });

  it('BR2.3: keeps every other key, a __proto__ key included, and leaves Object.prototype alone (NFR3.3)', async () => {
    await put('{"version": 1, "framework": "aidlc", "team": {"lead": "x"}, "__proto__": {"polluted": 1}}');
    expect(await writeProjectFile(root, 'speckit')).toEqual({ ok: true, file: '.thadeus/project.json', replaced: false });
    const text = await onDisk();
    expect(text).toContain('"__proto__"');
    const parsed = JSON.parse(text);
    expect(Object.hasOwn(parsed, '__proto__')).toBe(true);
    expect(parsed.__proto__).toEqual({ polluted: 1 });
    expect(parsed).toMatchObject({ version: 1, framework: 'speckit', team: { lead: 'x' } });
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('BR2.3: rewrites an unknownFramework file, keeping its keys and dropping the bad value', async () => {
    await putJson({ version: 1, framework: HOSTILE, other: 2 });
    expect(await writeProjectFile(root, 'aidlc')).toEqual({ ok: true, file: '.thadeus/project.json', replaced: false });
    expect(JSON.parse(await onDisk())).toEqual({ version: 1, framework: 'aidlc', other: 2 });
  });

  it.each([
    ['an unreadable file', '{"version": 1, "framework": "aidlc", "keep": tru'],
    ['an invalid file', '[{"version": 1}]']
  ])('BR2.4: replaces %s with a fresh one and says so', async (_name, text) => {
    await put(text);
    expect(await writeProjectFile(root, 'aidlc')).toEqual({ ok: true, file: '.thadeus/project.json', replaced: true });
    expect(JSON.parse(await onDisk())).toEqual({ version: 1, framework: 'aidlc' });
  });

  it('BR2.5: refuses a newer version, naming the file and the version, and leaves it as it was', async () => {
    const text = JSON.stringify({ version: 2, framework: HOSTILE });
    await put(text);
    const res = await writeProjectFile(root, 'aidlc');
    expect(res).toMatchObject({ ok: false, error: { code: 'newerVersion' } });
    expect(res.error.message).toContain('.thadeus/project.json');
    expect(res.error.message).toContain('2');
    expect(res.error.message).not.toContain(HOSTILE); // NFR1.1
    expect(await onDisk()).toBe(text);
  });

  it('BR2.5: a version too big to be a safe integer is refused with no number in the message', async () => {
    const text = '{"version": 1e400, "framework": "aidlc"}';
    await put(text);
    const res = await writeProjectFile(root, 'speckit');
    expect(res).toMatchObject({ ok: false, error: { code: 'newerVersion' } });
    expect(res.error.message.replace('.thadeus/project.json', '')).not.toMatch(/\d|Infinity/);
    expect(await onDisk()).toBe(text);
  });

  it('NFR3.1: a symlinked .thadeus/ gives writeFailed, and its target is not touched', async () => {
    await put(JSON.stringify({ version: 1, framework: HOSTILE }), 'elsewhere/project.json');
    await fs.symlink(file('elsewhere'), file('.thadeus'));
    const before = await snapshot();
    const res = await writeProjectFile(root, 'aidlc');
    expect(res).toMatchObject({ ok: false, error: { code: 'writeFailed' } });
    expect(res.error.message).toContain('.thadeus/project.json');
    expect(res.error.message).not.toContain(HOSTILE);
    expect(await snapshot()).toEqual(before);
  });

  it('NFR3.1: a symlinked file gives writeFailed, and the link and its target stay as they were', async () => {
    await put(JSON.stringify({ version: 1, framework: 'aidlc' }), 'other.json');
    await fs.mkdir(file('.thadeus'));
    await fs.symlink(file('other.json'), file());
    const before = await snapshot();
    expect(await writeProjectFile(root, 'speckit')).toMatchObject({ ok: false, error: { code: 'writeFailed' } });
    expect(await snapshot()).toEqual(before);
  });

  it('NFR3.4: a symlink swapped in just before the rename aborts the write; the old bytes stay and no temp file is left', async () => {
    const old = JSON.stringify({ version: 1, framework: 'aidlc' });
    await put(old, 'target.json');
    await put(JSON.stringify({ version: 1, framework: 'aidlc' }));
    race.before = async (abs) => {
      await fs.rm(abs);
      await fs.symlink(file('target.json'), abs);
    };
    expect(await writeProjectFile(root, 'speckit')).toMatchObject({ ok: false, error: { code: 'writeFailed' } });
    expect(await fs.readFile(file('target.json'), 'utf8')).toBe(old);
    expect((await fs.lstat(file())).isSymbolicLink()).toBe(true);
    expect(await fs.readdir(file('.thadeus'))).toEqual(['project.json']);
  });

  it('NFR3.4: a .thadeus/ swapped for a symlink just before the rename aborts the write too', async () => {
    race.before = async () => {
      // The folder (with the temp file in it) moves away and a link to it takes its place: a rename would land there.
      await fs.rename(file('.thadeus'), file('elsewhere'));
      await fs.symlink(file('elsewhere'), file('.thadeus'));
    };
    expect(await writeProjectFile(root, 'aidlc')).toMatchObject({ ok: false, error: { code: 'writeFailed' } });
    expect(await fs.readdir(file('elsewhere'))).toEqual([]);
  });
});
