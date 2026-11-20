// US-1408 FR2: the project's framework, kept in the repository at `.thadeus/project.json` (contract C2), so every
// clone follows the same one. The bytes and the folder layout come from a cloned repository and are not trusted:
// symlinks and anything that is not a plain folder and a regular file are refused (NFR3.1), at most 64 KiB is read
// (NFR3.2) and only JSON.parse looks at the bytes (NFR3.3). Reading never writes (NFR3.6); writing is atomic (BR2.6).
import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAtomic } from './fileWrite.js';
import { t } from '../shared/i18n.js';

export const PROJECT_FILE = '.thadeus/project.json';
export const FRAMEWORKS = ['aidlc', 'speckit'];
const MAX_BYTES = 64 * 1024;

/** `lstat` of `abs`: null when it is missing, else whether it is the wanted kind and not a symlink. */
async function kindOf(abs, wantDir) {
  try {
    const st = await fs.lstat(abs);
    return !st.isSymbolicLink() && (wantDir ? st.isDirectory() : st.isFile());
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    return false;
  }
}

/** At most MAX_BYTES + 1 bytes, counted on what is read, not on the `lstat` size (NFR3.2). */
async function readCapped(abs) {
  const handle = await fs.open(abs, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const buf = Buffer.alloc(MAX_BYTES + 1);
    let size = 0;
    while (size < buf.length) {
      const { bytesRead } = await handle.read(buf, size, buf.length - size, size);
      if (bytesRead === 0) break;
      size += bytesRead;
    }
    return size > MAX_BYTES ? null : buf.subarray(0, size);
  } finally {
    await handle.close();
  }
}

/** BR1.2's order, on a parsed value. A version above 1 wins before any other field, so a newer file is never "broken". */
function classify(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return 'invalid';
  const { version } = value;
  // 1e400 parses to Infinity: still a newer app's number, not a broken file.
  if (typeof version === 'number' && version > 1 && (Number.isInteger(version) || version === Infinity)) return 'unknownVersion';
  if (version !== 1 || !Object.hasOwn(value, 'framework')) return 'invalid';
  return FRAMEWORKS.includes(value.framework) ? null : 'unknownFramework';
}

/** The read with the parsed value kept for every reason after the parse, which the write needs (BR2.3). */
async function inspect(root) {
  const dir = await kindOf(path.join(root, '.thadeus'), true);
  if (dir === null) return { reason: 'missing' };
  if (!dir) return { reason: 'unreadable' };
  const abs = path.join(root, PROJECT_FILE);
  const kind = await kindOf(abs, false);
  if (kind === null) return { reason: 'missing' };
  if (!kind) return { reason: 'unreadable' };
  let value;
  try {
    const bytes = await readCapped(abs);
    if (bytes === null) return { reason: 'unreadable' };
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    return { reason: 'unreadable' }; // a read error, bad JSON, or a RangeError from deep nesting
  }
  return { reason: classify(value), value };
}

/**
 * US-1408 FR2.2, FR2.3 (BR1.1, BR1.2): reads the project file of `root` (a value from openRoot).
 * @returns {Promise<{ok: true, value: object} | {ok: false, reason: 'missing'|'unreadable'|'invalid'|'unknownVersion'|'unknownFramework'}>}
 */
export async function readProjectFile(root) {
  const { reason, value } = await inspect(root);
  return reason ? { ok: false, reason } : { ok: true, value };
}

const refuse = (code, key, values) => ({ ok: false, error: { code, message: t(key, { file: PROJECT_FILE, ...values }) } });

/** Throws unless `.thadeus/` is a plain folder and the file, when there, a regular file (BR1.1, NFR3.1). */
async function assertPlain(root) {
  const dir = await kindOf(path.join(root, '.thadeus'), true);
  const file = await kindOf(path.join(root, PROJECT_FILE), false);
  if (dir !== true || file === false) throw new Error(t('projectFile.notPlain'));
}

/**
 * US-1408 FR2.1 (BR2.1–BR2.6): writes a framework the person confirmed (U4, U8) to `.thadeus/project.json` of `root`,
 * keeping the other keys of a readable file. Never throws; nothing is written when it fails. A message never shows a
 * value from the file (NFR1.1).
 * @returns {Promise<{ok: true, file: string, replaced: boolean} | {ok: false, error: {code: 'invalidFramework'|'newerVersion'|'writeFailed', message: string}}>}
 */
export async function writeProjectFile(root, framework) {
  if (!FRAMEWORKS.includes(framework)) return refuse('invalidFramework', 'projectFile.errors.invalidFramework');
  const { reason, value } = await inspect(root);
  if (reason === 'unknownVersion') {
    if (!Number.isSafeInteger(value.version)) return refuse('newerVersion', 'projectFile.errors.newerVersionUnknown');
    return refuse('newerVersion', 'projectFile.errors.newerVersion', { version: String(value.version) });
  }
  const replaced = reason === 'unreadable' || reason === 'invalid';
  // Spread defines keys, so a `__proto__` key stays an own key and nothing reaches Object.prototype (BR2.3, NFR3.3).
  const next = replaced || reason === 'missing' ? { version: 1, framework } : { ...value, version: 1, framework };
  const dir = path.join(root, '.thadeus');
  try {
    if ((await kindOf(dir, true)) === null) await fs.mkdir(dir);
    await assertPlain(root);
    // ponytail: the recheck in `expect` closes the window up to the rename, not inside it; that needs openat-style
    // calls Node lacks, and on a person's own clone a racing attacker is unlikely.
    await writeAtomic(path.join(root, PROJECT_FILE), `${JSON.stringify(next, null, 2)}\n`, { expect: () => assertPlain(root) });
  } catch (err) {
    return refuse('writeFailed', 'projectFile.errors.writeFailed', { reason: err.code ?? err.message });
  }
  return { ok: true, file: PROJECT_FILE, replaced };
}
