import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot, readJsonSafe, readText, resolveInRoot } from '../../src/main/projectAccess.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
const TMP = path.resolve(__dirname, '../.tmp/projectAccess');
let root;

beforeAll(async () => {
  root = await openRoot(path.join(FIXTURES, 'project'));
  await fs.mkdir(TMP, { recursive: true });
});
afterAll(() => fs.rm(TMP, { recursive: true, force: true }));

describe('projectAccess', () => {
  it('resolves and reads a path inside the root', async () => {
    const abs = await resolveInRoot(root, 'aidlc/active-space');
    expect(abs).toBe(path.join(root, 'aidlc/active-space'));
    expect((await readText(root, 'aidlc/active-space')).trim()).toBe('default');
  });

  it('rejects ../, absolute paths and symlinks leading out of the root (FR10.2)', async () => {
    await expect(resolveInRoot(root, '../broken.json')).rejects.toThrow(/utanför projektroten/);
    await expect(resolveInRoot(root, 'aidlc/../../plain-folder/README.txt')).rejects.toThrow(/utanför/);
    await expect(resolveInRoot(root, path.join(FIXTURES, 'broken.json'))).rejects.toThrow(/Absoluta/);

    const linkRoot = await openRoot(TMP);
    await fs.symlink(path.join(FIXTURES, 'broken.json'), path.join(TMP, 'escape.json')).catch((e) => {
      if (e.code !== 'EEXIST') throw e;
    });
    await expect(resolveInRoot(linkRoot, 'escape.json')).rejects.toThrow(/pekar ut ur/);
  });

  it('readJsonSafe returns ok:false for half-written JSON without throwing (FR7.4)', async () => {
    const fixturesRoot = await openRoot(FIXTURES);
    const res = await readJsonSafe(fixturesRoot, 'broken.json');
    expect(res.ok).toBe(false);
    expect(res.missing).toBe(false);
    expect(res.error).toMatch(/Ogiltig JSON/);
    expect((await readJsonSafe(fixturesRoot, 'nope.json')).missing).toBe(true);
  });
});
