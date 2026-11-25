// US-1407 FR8 (contract C10), BR8.1–BR8.5, NFR3.4–NFR3.7, NFR4.5, NFR5.1: the framework switch's checks, preview and
// write, on real temp folders.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRoot } from '../../src/main/projectAccess.js';
import { switchFramework, switchPreview, switchTarget } from '../../src/main/frameworkSwitch.js';

let root;

beforeEach(async () => {
  root = await openRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-fs-')));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});

async function put(rel, text = '') {
  await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await fs.writeFile(path.join(root, rel), text);
}

/** Two spaces: `default` with one open and one completed intent, `team` with one open and one archived intent. */
async function aidlcProject() {
  const space = async (name, entries) => {
    await put(`aidlc/spaces/${name}/intents/intents.json`, JSON.stringify(entries));
    for (const e of entries) await fs.mkdir(path.join(root, `aidlc/spaces/${name}/intents/${e.dirName}`), { recursive: true });
  };
  await space('default', [
    { dirName: '261101-open', slug: 'open-work', status: 'active' },
    { dirName: '261102-done', slug: 'done-work', status: 'complete' }
  ]);
  await space('team', [
    { dirName: '261103-team', slug: 'team-work', status: null },
    { dirName: '261104-old', slug: 'old-work', status: 'archived' }
  ]);
}

/** `.specify/` with one feature that has open tasks and one that is done. */
async function speckitProject() {
  await put('.specify/init-options.json', JSON.stringify({ speckit_version: '1.4.3' }));
  await put('specs/001-open/tasks.md', '- [x] T001 first\n- [ ] T002 second\n');
  await put('specs/002-done/tasks.md', '- [x] T001 only\n');
}

/** Every file under `dir` with its bytes, so a test can tell what changed. */
async function snapshot(dir = root, rel = '', out = {}) {
  for (const e of await fs.readdir(path.join(dir, rel), { withFileTypes: true })) {
    const child = path.join(rel, e.name);
    if (e.isDirectory()) await snapshot(dir, child, out);
    else out[child] = await fs.readFile(path.join(dir, child), 'utf8');
  }
  return out;
}

/** Spies on every fs call that writes, renames or removes. */
function writeSpies() {
  return ['writeFile', 'appendFile', 'rename', 'rm', 'rmdir', 'unlink', 'mkdir', 'copyFile'].map((name) => vi.spyOn(fs, name));
}

describe('switchTarget (BR8.1, NFR3.5)', () => {
  it('accepts only the other framework', () => {
    expect(switchTarget('aidlc', 'speckit')).toBe('speckit');
    expect(switchTarget('speckit', 'aidlc')).toBe('aidlc');
  });

  it('refuses the current framework, an unknown value and a project with no framework, with a translated reason and no fs call', () => {
    const spies = writeSpies();
    const reads = [vi.spyOn(fs, 'readdir'), vi.spyOn(fs, 'lstat'), vi.spyOn(fs, 'readFile')];
    for (const to of ['aidlc', '', 'SPECKIT', '../x', { framework: 'speckit' }, undefined]) {
      expect(() => switchTarget('aidlc', to)).toThrow(/\S/);
      expect(() => switchTarget('aidlc', to)).not.toThrow('framework.switchInvalid');
    }
    expect(() => switchTarget(null, 'aidlc')).toThrow(/\S/);
    for (const spy of [...spies, ...reads]) expect(spy).not.toHaveBeenCalled();
  });
});

describe('switchPreview (BR8.2, BR8.3, NFR3.4)', () => {
  it('says setup is needed when Spec Kit is missing, keeps aidlc/, and lists the open intents of every space', async () => {
    await aidlcProject();
    const preview = await switchPreview(root, 'aidlc', 'speckit');
    expect(preview.setupNeeded).toBe(true);
    expect(preview.keeps).toEqual(['aidlc/']);
    expect(preview.inProgress).toEqual(
      expect.arrayContaining([
        { kind: 'intent', name: 'open-work' },
        { kind: 'intent', name: 'team-work' }
      ])
    );
    expect(preview.inProgress).toHaveLength(2); // the completed and the archived intent are not listed
    expect(preview.unread).toEqual([]);
  });

  it('needs no setup when both frameworks are there', async () => {
    await aidlcProject();
    await speckitProject();
    expect((await switchPreview(root, 'aidlc', 'speckit')).setupNeeded).toBe(false);
    expect((await switchPreview(root, 'speckit', 'aidlc')).setupNeeded).toBe(false);
  });

  it('lists the Spec Kit features with open tasks and keeps the fixed Spec Kit folder names', async () => {
    await speckitProject();
    const preview = await switchPreview(root, 'speckit', 'aidlc');
    expect(preview.setupNeeded).toBe(true);
    expect(preview.keeps).toEqual(['.specify/', 'specs/']);
    expect(preview.inProgress).toEqual([{ kind: 'feature', name: '001-open' }]);
  });

  it('leaves out an archived feature with open tasks (US-1411 FR3.7)', async () => {
    await speckitProject();
    await put('specs/003-hidden/tasks.md', '- [ ] T001 open\n');
    await put('.thadeus/archived/003-hidden.json', '{"version": 1}\n');
    expect((await switchPreview(root, 'speckit', 'aidlc')).inProgress).toEqual([{ kind: 'feature', name: '001-open' }]);
  });

  it('names a features list it could not read, logs it and does not throw', async () => {
    await speckitProject();
    const loadFeatures = vi.fn(async () => {
      throw new Error('disk gone');
    });
    const preview = await switchPreview(root, 'speckit', 'aidlc', { loadFeatures });
    expect(preview).toMatchObject({ inProgress: [], unread: ['feature'], keeps: ['.specify/', 'specs/'] });
    expect(console.warn).toHaveBeenCalled();
  });

  it('refuses a bad target before any read', async () => {
    const reads = vi.spyOn(fs, 'readdir');
    await expect(switchPreview(root, 'aidlc', 'aidlc')).rejects.toThrow(/\S/);
    expect(reads).not.toHaveBeenCalled();
  });

  it('writes, renames and removes nothing (NFR3.4)', async () => {
    await aidlcProject();
    await speckitProject();
    const before = await snapshot();
    const spies = writeSpies();
    await switchPreview(root, 'aidlc', 'speckit');
    await switchPreview(root, 'speckit', 'aidlc');
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    expect(await snapshot()).toEqual(before);
  });
});

describe('switchFramework (BR8.4, BR8.5, NFR3.7)', () => {
  it('refuses with setupNeeded and writes nothing when the target folder is missing', async () => {
    await aidlcProject();
    const before = await snapshot();
    const res = await switchFramework(root, 'speckit');
    expect(res).toMatchObject({ ok: false, error: { code: 'setupNeeded' } });
    expect(res.error.message).toMatch(/\S/);
    expect(await snapshot()).toEqual(before);
  });

  it('writes .thadeus/project.json once and returns the new detection; the framework folders are untouched', async () => {
    await aidlcProject();
    await speckitProject();
    const before = await snapshot();
    const res = await switchFramework(root, 'speckit');
    expect(res.ok).toBe(true);
    expect(res.detection).toMatchObject({ framework: 'speckit', source: 'file' });
    const after = await snapshot();
    const written = path.join('.thadeus', 'project.json');
    expect(JSON.parse(after[written])).toEqual({ version: 1, framework: 'speckit' });
    delete after[written];
    expect(after).toEqual(before); // nothing under aidlc/, .specify/ or specs/ changed, nothing deleted
  });

  it('switches back the same way', async () => {
    await aidlcProject();
    await speckitProject();
    await switchFramework(root, 'speckit');
    const res = await switchFramework(root, 'aidlc');
    expect(res.detection).toMatchObject({ framework: 'aidlc', source: 'file' });
  });

  it('gives writeFailed and leaves the file as it was when the write is refused', async () => {
    await aidlcProject();
    await speckitProject();
    await put('.thadeus/project.json', JSON.stringify({ version: 2, framework: 'aidlc' })); // a newer app's file
    const before = await snapshot();
    const res = await switchFramework(root, 'speckit');
    expect(res).toMatchObject({ ok: false, error: { code: 'writeFailed' } });
    expect(res.error.message).toMatch(/\S/);
    expect(await snapshot()).toEqual(before);
  });
});

describe('no program of its own (NFR4.5)', () => {
  it('imports no runner', async () => {
    const source = await fs.readFile(fileURLToPath(new URL('../../src/main/frameworkSwitch.js', import.meta.url)), 'utf8');
    expect(source).not.toMatch(/from '(node:)?child_process'|from '\.\/(exec|pty|setup|speckitSetup)\.js'/);
  });
});
