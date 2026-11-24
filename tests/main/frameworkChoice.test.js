// US-1406 FR4 (BR4.2, BR4.3, BR4.5–BR4.8, NFR3.1, NFR3.2, NFR4.2): the choice screen's scan and its one write.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { locateTool, setToolPaths } from '../../src/main/tools.js';
import { chooseFramework, frameworkScan } from '../../src/main/frameworkChoice.js';
import { t } from '../../src/shared/i18n.js';

vi.mock('../../src/main/tools.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, locateTool: vi.fn(real.locateTool) };
});

let tmp;
let bin;

/** Every start fails: the login-shell read falls back to the app's PATH (stubbed to the temp bin folder), and no tool runs. */
const exec = async () => {
  throw new Error('nothing may be run');
};

/** found/cli objects, so the keys are written once. */
const found = (a, s) => ({ aidlc: a, speckit: s });
const cli = (a, s) => ({ aidlc: a, specify: s });

/** A project folder with `aidlc/spaces/default/`, `.specify/` and `.thadeus/project.json` as asked. */
async function project({ ai = false, kit = false, saved } = {}) {
  const dir = await fs.mkdtemp(path.join(tmp, 'p-'));
  if (ai) await fs.mkdir(path.join(dir, 'aidlc/spaces/default'), { recursive: true });
  if (kit) await fs.mkdir(path.join(dir, '.specify'));
  if (saved !== undefined) {
    await fs.mkdir(path.join(dir, '.thadeus'));
    await fs.writeFile(path.join(dir, '.thadeus/project.json'), JSON.stringify(saved));
  }
  return openRoot(dir);
}

async function tool(name) {
  const file = path.join(bin, name);
  await fs.writeFile(file, '#!/bin/sh\n');
  await fs.chmod(file, 0o755);
}

/** Spies on every fs call that writes, so a test can check none was made. */
function writeSpies() {
  return ['writeFile', 'mkdir', 'rename', 'rm', 'chmod', 'appendFile', 'copyFile'].map((m) => vi.spyOn(fs, m));
}

beforeEach(async () => {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-choice-')));
  bin = path.join(tmp, 'bin');
  await fs.mkdir(bin);
  vi.stubEnv('PATH', bin);
  setToolPaths({});
  vi.spyOn(console, 'warn').mockImplementation(() => {}); // the fallback PATH read says so
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  locateTool.mockClear();
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('frameworkScan (US-1406 BR4.2, BR4.3)', () => {
  it('one framework found is proposed, with each tool on the PATH or not', async () => {
    await tool('aidlc');
    expect(await frameworkScan(await project({ ai: true }), { exec })).toEqual({ found: found(true, false), cli: cli(true, false), proposal: 'aidlc' });
    await tool('specify');
    expect(await frameworkScan(await project({ kit: true }), { exec })).toEqual({ found: found(false, true), cli: cli(true, true), proposal: 'speckit' });
  });

  it('both or neither found gives no proposal', async () => {
    expect(await frameworkScan(await project({ ai: true, kit: true }), { exec })).toMatchObject({ found: found(true, true), proposal: null });
    expect(await frameworkScan(await project(), { exec })).toEqual({ found: found(false, false), cli: cli(false, false), proposal: null });
  });

  it('a saved tool path counts as on the PATH, a stale one does not', async () => {
    const saved = path.join(tmp, 'my-specify');
    await fs.writeFile(saved, '#!/bin/sh\n');
    await fs.chmod(saved, 0o755);
    setToolPaths({ specify: saved, aidlc: path.join(tmp, 'gone') });
    await tool('aidlc');
    expect((await frameworkScan(await project(), { exec })).cli).toEqual(cli(false, true));
  });

  it('a tool lookup that throws counts as not found, and the other still answers', async () => {
    await tool('specify');
    locateTool.mockImplementationOnce(async () => {
      throw new Error('EACCES');
    });
    expect((await frameworkScan(await project(), { exec })).cli).toEqual(cli(false, true));
  });

  it('reads only: no fs write call (BR4.7, NFR3.1)', async () => {
    const root = await project({ ai: true, kit: true });
    const spies = writeSpies();
    await frameworkScan(root, { exec });
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    await expect(fs.access(path.join(root, '.thadeus'))).rejects.toThrow();
  });
});

describe('chooseFramework (US-1406 BR4.5, BR4.6, BR4.8)', () => {
  const readSaved = async (root) => JSON.parse(await fs.readFile(path.join(root, '.thadeus/project.json'), 'utf8'));

  it('refuses an unknown framework before any file access (BR4.8, NFR3.2)', async () => {
    const root = await project({ ai: true });
    const reads = ['stat', 'lstat', 'readdir', 'open', 'access'].map((m) => vi.spyOn(fs, m));
    const spies = writeSpies();
    for (const bad of ['', 'AIDLC', '../x', { framework: 'aidlc' }, null]) {
      await expect(chooseFramework(root, bad)).rejects.toThrow(t('projectFile.errors.invalidFramework'));
    }
    for (const s of [...reads, ...spies]) expect(s).not.toHaveBeenCalled();
  });

  it('a found framework is written through U2 and needs nothing next (BR4.5)', async () => {
    const root = await project({ ai: true, kit: true });
    expect(await chooseFramework(root, 'speckit')).toEqual({ ok: true, file: '.thadeus/project.json', next: 'none' });
    expect(await readSaved(root)).toEqual({ version: 1, framework: 'speckit' });
  });

  it('a missing framework writes nothing, runs nothing and asks for its setup (BR4.6, NFR4.2)', async () => {
    const root = await project();
    const spies = writeSpies();
    expect(await chooseFramework(root, 'aidlc')).toEqual({ ok: true, file: null, next: 'setupAidlc' });
    expect(await chooseFramework(root, 'speckit')).toEqual({ ok: true, file: null, next: 'setupSpeckit' });
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    expect(locateTool).not.toHaveBeenCalled();
  });

  it('a newer-version file is refused with U2’s translated message', async () => {
    const root = await project({ ai: true, saved: { version: 3, framework: 'speckit' } });
    await expect(chooseFramework(root, 'aidlc')).rejects.toThrow(t('projectFile.errors.newerVersion', { file: '.thadeus/project.json', version: '3' }));
    expect(await readSaved(root)).toEqual({ version: 3, framework: 'speckit' });
  });

  it('a write that fails rejects with its reason', async () => {
    const root = await project({ ai: true });
    await fs.writeFile(path.join(root, '.thadeus'), 'a file, not a folder');
    await expect(chooseFramework(root, 'aidlc')).rejects.toThrow(/\.thadeus\/project\.json/);
  });

  it('a file that appeared after the scan is overwritten with the choice, its other keys kept', async () => {
    const root = await project({ ai: true, kit: true, saved: { version: 1, framework: 'speckit', note: 'kept' } });
    expect(await chooseFramework(root, 'aidlc')).toMatchObject({ ok: true, next: 'none' });
    expect(await readSaved(root)).toEqual({ version: 1, framework: 'aidlc', note: 'kept' });
  });
});
