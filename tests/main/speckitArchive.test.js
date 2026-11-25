// US-1411 FR2.2, FR4.1, FR4.4, FR4.5, NFR1: the archive marks in `.thadeus/archived/`, on real temp folders.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { t } from '../../src/shared/i18n.js';
import { addMark, readMarks, removeMark } from '../../src/main/speckitArchive.js';
import { isThadeusPath } from '../../src/main/planningRecord.js';

const DIR = '.thadeus/archived';
const NFC = '001-fotoalbum-å'.normalize('NFC');
const NFD = NFC.normalize('NFD');
const reason = (key, values) => t(`speckit.reason.${key}`, values);
let tmp;
let root;
let outside;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-archive-'));
  root = path.join(tmp, 'project');
  outside = path.join(tmp, 'outside');
  await fs.mkdir(root);
  await fs.mkdir(outside);
});
afterEach(async () => {
  await fs.chmod(path.join(root, DIR), 0o755).catch(() => {});
  await fs.rm(tmp, { recursive: true, force: true });
});

const at = (rel) => path.join(root, rel);
const names = async (dir = at(DIR)) => (await fs.readdir(dir)).sort();
const marked = async () => [...(await readMarks(root)).marked].sort();
async function put(rel, text = '') {
  await fs.mkdir(path.dirname(at(rel)), { recursive: true });
  await fs.writeFile(at(rel), text);
}

describe('marks (FR4.1, FR2.2)', () => {
  it('has none, and no error, without .thadeus or without .thadeus/archived', async () => {
    expect(await readMarks(root)).toEqual({ marked: new Set(), error: null });
    await fs.mkdir(at('.thadeus'));
    expect(await readMarks(root)).toEqual({ marked: new Set(), error: null });
  });

  it('writes one file with a fixed content, the same when written again, and leaves nothing else', async () => {
    await addMark(root, '001-albums');
    const first = await fs.readFile(at(`${DIR}/001-albums.json`), 'utf8');
    await addMark(root, '001-albums');
    expect(JSON.parse(first)).toEqual({ version: 1 });
    expect(await fs.readFile(at(`${DIR}/001-albums.json`), 'utf8')).toBe(first);
    expect(await names()).toEqual(['001-albums.json']);
    expect(await marked()).toEqual(['001-albums']);
  });

  it('removes only the named mark, and one already gone is done', async () => {
    await removeMark(root, '001-albums'); // no folder at all
    await addMark(root, '001-albums');
    await addMark(root, '002-search');
    await removeMark(root, '001-albums');
    expect(await marked()).toEqual(['002-search']);
    await removeMark(root, '001-albums');
    expect(await marked()).toEqual(['002-search']);
  });

  it('takes odd names, compared in NFC: spaces, and a mark stored in NFD', async () => {
    await addMark(root, 'my notes.v2');
    await addMark(root, NFD);
    expect(await marked()).toEqual([NFC, 'my notes.v2']);
    await removeMark(root, 'my notes.v2');
    await removeMark(root, NFC);
    expect(await names()).toEqual([]);
    await put(`${DIR}/${NFD}.json`, '{"version": 1}\n'); // as another clone may have stored it
    expect(await marked()).toEqual([NFC]);
    await removeMark(root, NFC);
    expect(await names()).toEqual([]);
  });

  it('counts only the presence of a regular .json file: no content is read, and other files are ignored', async () => {
    await put(`${DIR}/001-a.json`, 'not json');
    await put(`${DIR}/.002-b.json`);
    await put(`${DIR}/003-c.txt`);
    await fs.mkdir(at(`${DIR}/004-d.json`));
    await fs.writeFile(path.join(outside, 'x.json'), '{}');
    await fs.symlink(path.join(outside, 'x.json'), at(`${DIR}/005-e.json`));
    expect(await readMarks(root)).toEqual({ marked: new Set(['001-a']), error: null });
  });

  it('is a path the .thadeus sync takes (FR4.5)', () => {
    expect(isThadeusPath(`${DIR}/001-albums.json`)).toBe(true);
    expect(isThadeusPath(`${DIR}/${NFC}.json`)).toBe(true);
  });
});

describe('what is refused (NFR1, FR4.4)', () => {
  /** Archive and unarchive both refuse, `rel` is the read error's path, and nothing lands outside the project. */
  async function refused(rel, why) {
    expect(await readMarks(root)).toEqual({ marked: new Set(), error: { path: rel, reason: why } });
    await expect(addMark(root, '001-a')).rejects.toThrow(t('projectFile.notPlain'));
    await expect(removeMark(root, '001-a')).rejects.toThrow(t('projectFile.notPlain'));
  }

  it('a linked .thadeus, also one that points nowhere', async () => {
    await fs.mkdir(path.join(outside, 'archived'));
    await fs.writeFile(path.join(outside, 'archived/001-a.json'), '{}');
    await fs.symlink(outside, at('.thadeus'));
    await refused('.thadeus', reason('link'));
    expect(await names(path.join(outside, 'archived'))).toEqual(['001-a.json']);
    await fs.rm(at('.thadeus'));
    await fs.symlink(path.join(tmp, 'nowhere'), at('.thadeus'));
    await refused('.thadeus', reason('link'));
    expect(await names(tmp)).toEqual(['outside', 'project']);
  });

  it('a linked .thadeus/archived', async () => {
    await fs.mkdir(at('.thadeus'));
    await fs.writeFile(path.join(outside, '001-a.json'), '{}');
    await fs.symlink(outside, at(DIR));
    await refused(DIR, reason('link'));
    expect(await names(outside)).toEqual(['001-a.json']);
  });

  it('a .thadeus or .thadeus/archived that is a file', async () => {
    await put('.thadeus', 'x');
    await refused('.thadeus', reason('notFolder'));
    await fs.rm(at('.thadeus'));
    await put(DIR, 'x');
    await refused(DIR, reason('notFolder'));
  });

  it('a mark that is a link or a folder: neither written, followed nor removed', async () => {
    await fs.mkdir(at(`${DIR}/002-b.json`), { recursive: true });
    await fs.writeFile(path.join(outside, 'x.json'), 'outside');
    await fs.symlink(path.join(outside, 'x.json'), at(`${DIR}/001-a.json`));
    for (const dir of ['001-a', '002-b']) {
      await expect(addMark(root, dir)).rejects.toThrow(t('projectFile.notPlain'));
      await expect(removeMark(root, dir)).rejects.toThrow(t('projectFile.notPlain'));
    }
    expect(await names()).toEqual(['001-a.json', '002-b.json']);
    expect(await fs.readFile(path.join(outside, 'x.json'), 'utf8')).toBe('outside');
  });

  it('leaves no mark and no temporary file when the write fails, and keeps the mark when the removal fails', async () => {
    await put(`${DIR}/002-b.json`);
    await fs.chmod(at(DIR), 0o555);
    await expect(addMark(root, '001-a')).rejects.toMatchObject({ code: 'EACCES' });
    await expect(removeMark(root, '002-b')).rejects.toMatchObject({ code: 'EACCES' });
    expect(await names()).toEqual(['002-b.json']);
  });

  it('names an unreadable .thadeus/archived with its code', async () => {
    await put(`${DIR}/001-a.json`);
    await fs.chmod(at(DIR), 0o000);
    expect(await readMarks(root)).toEqual({ marked: new Set(), error: { path: DIR, reason: reason('unreadable', { code: 'EACCES' }) } });
  });
});
