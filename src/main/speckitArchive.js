// US-1411 FR4, NFR1: the app's own marks for archived Spec Kit features: one file per feature folder in
// `.thadeus/archived/`, synced with the rest of `.thadeus/` (FR4.5). Only a mark's presence counts (FR4.1), so reading is
// one folder listing (NFR2). The layout comes from a cloned repository and is not trusted: the two folders must be plain
// folders and a mark a regular file, else writing and removing refuse, and reading ignores them (NFR1). A feature's name
// is checked by the caller (main's IPC); nothing here knows about Spec Kit.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAtomic } from './fileWrite.js';
import { t } from '../shared/i18n.js';

const MARKS_DIR = '.thadeus/archived';
const FOLDERS = ['.thadeus', MARKS_DIR];
const EXT = '.json';
const CONTENT = '{"version": 1}\n'; // no time and no person, so two clones write the same file (FR4.1)
const nfc = (name) => name.normalize('NFC'); // git and macOS may store a name differently

/** US-1411 FR4.1: the mark's root-relative path. */
export const markFile = (dir) => `${MARKS_DIR}/${nfc(dir)}${EXT}`;

/** `lstat` of a root-relative path, null when it is missing. */
async function lstat(root, rel) {
  try {
    return await fs.lstat(path.join(root, rel));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** Throws unless `rel` is a plain folder. False when it is missing. */
async function assertFolder(root, rel) {
  const st = await lstat(root, rel);
  if (st && !st.isDirectory()) throw new Error(t('projectFile.notPlain')); // a link is not a directory to lstat
  return st !== null;
}

/** Throws unless both folders are there and plain, and the mark, when there, is a regular file (NFR1). */
async function assertPlain(root, dir) {
  for (const rel of FOLDERS) if (!(await assertFolder(root, rel))) throw new Error(t('projectFile.notPlain'));
  const st = await lstat(root, markFile(dir));
  if (st && !st.isFile()) throw new Error(t('projectFile.notPlain'));
}

/**
 * US-1411 FR4.3, FR4.4, NFR2: the marked folder names in NFC, and why they could not be read (no name is marked then).
 * Never throws, never writes.
 * @returns {Promise<{marked: Set<string>, error: {path: string, reason: string}|null}>}
 */
export async function readMarks(root) {
  const none = (rel, key, values) => ({ marked: new Set(), error: rel ? { path: rel, reason: t(`speckit.reason.${key}`, values) } : null });
  let at;
  try {
    for (at of FOLDERS) {
      const st = await lstat(root, at);
      if (!st) return none();
      if (st.isSymbolicLink()) return none(at, 'link');
      if (!st.isDirectory()) return none(at, 'notFolder');
    }
    const files = (await fs.readdir(path.join(root, MARKS_DIR), { withFileTypes: true })).filter((e) => e.isFile());
    const marks = files.map((e) => e.name).filter((n) => n.endsWith(EXT) && !n.startsWith('.'));
    return { marked: new Set(marks.map((n) => nfc(n.slice(0, -EXT.length)))), error: null };
  } catch (err) {
    return none(at, 'unreadable', { code: err.code ?? err.message });
  }
}

/** US-1411 FR1.4, NFR1: marks the feature folder `dir`, the folders made when missing. Throws when it is refused or fails. */
export async function addMark(root, dir) {
  // One folder at a time, so nothing is made behind a linked `.thadeus`.
  for (const rel of FOLDERS) {
    if (!(await assertFolder(root, rel))) await fs.mkdir(path.join(root, rel));
  }
  await assertPlain(root, dir);
  // ponytail: as projectFile.js, `expect` closes the window up to the rename, not inside it; that needs openat-style calls.
  await writeAtomic(path.join(root, markFile(dir)), CONTENT, { expect: () => assertPlain(root, dir) });
}

/** US-1411 FR2.2, NFR1: removes every mark of `dir` (NFC and NFD); one already gone is done. Throws when refused or failing. */
export async function removeMark(root, dir) {
  for (const rel of FOLDERS) if (!(await assertFolder(root, rel))) return;
  const name = nfc(dir) + EXT;
  const marks = (await fs.readdir(path.join(root, MARKS_DIR), { withFileTypes: true })).filter((e) => nfc(e.name) === name);
  if (marks.some((e) => !e.isFile())) throw new Error(t('projectFile.notPlain'));
  for (const e of marks) await fs.rm(path.join(root, MARKS_DIR, e.name), { force: true });
}
