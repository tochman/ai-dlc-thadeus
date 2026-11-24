// Files the person edits in the app (EPIC-10 US-1001). Every path is root-relative and goes through resolveInRoot,
// so absolute paths, `..` and symlinks out of the root are refused. AI-DLC's engine-owned files (workflow state,
// audit shards, intents.json, the engine's dot-folders and the harness folders) open read-only and are never
// written (NFR6). A write is atomic (a temp file in the same folder, then a rename) and happens only when the file
// on disk still has the hash the editor opened.
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { defaultExec, runFixed } from './exec.js';
import { resolveInRoot } from './projectAccess.js';
import { HARNESSES } from '../shared/harnesses.js';
import { t } from '../shared/i18n.js';

export const MAX_EDIT_BYTES = 2 * 1024 * 1024; // larger files open read-only
const MAX_READ_BYTES = 10 * 1024 * 1024; // larger ones show only their reason
const BINARY_PROBE_BYTES = 8 * 1024;
const MAX_TREE_FILES = 20000;
export const TREE_SKIP = new Set(['node_modules', 'out', 'dist', '.git']);

// The harness folders hold AI-DLC's installed engine (agents, hooks, tools, scopes): read-only as a whole, like .git/.
const ENGINE_DIRS = [...new Set([...HARNESSES.flatMap((h) => h.markers.dirs ?? []), '.opencode', '.github/skills/aidlc', '.git'])];
const ENGINE_FILES = [
  /^aidlc\/(.+\/)?aidlc-state\.md$/,
  /^aidlc\/(.+\/)?audit(\/|$)/,
  /^aidlc\/(.+\/)?intents\.json$/,
  /^aidlc\/(.+\/)?runtime-graph(\.[^/]+)?\.json$/,
  /^aidlc\/(.+\/)?(active-intent|active-space)$/,
  /(^|\/)\.aidlc-[^/]*(\/|$)/, // the engine's own dot-folders and files, at any depth
  /^\.github\/hooks\/aidlc\.json$/
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const posix = (rel) => rel.split(path.sep).join('/');

/** True for a root-relative path AI-DLC's engine owns. */
export function isEngineOwned(rel) {
  const p = posix(path.posix.normalize(posix(String(rel)))).replace(/^\.\//, '');
  return ENGINE_DIRS.some((d) => p === d || p.startsWith(`${d}/`)) || ENGINE_FILES.some((re) => re.test(p));
}

/** US-1402 NFR3.2: in a Spec Kit project, everything under specs/ and .specify/ is Spec Kit's, except the constitution. */
const isSpeckitOwned = (rel) => {
  const p = posix(path.posix.normalize(posix(String(rel)))).replace(/^\.\//, '');
  return (p.startsWith('specs/') || p.startsWith('.specify/')) && p !== '.specify/memory/constitution.md';
};

/** The real path, refused when it or its real target is engine-owned, or Spec Kit's in a Spec Kit project (US-1402 NFR3.2). */
async function resolveEditable(root, rel, { framework } = {}) {
  const abs = await resolveInRoot(root, rel);
  const real = posix(path.relative(root, abs));
  const speckit = framework === 'speckit' && (isSpeckitOwned(rel) || isSpeckitOwned(real));
  return { abs, engine: isEngineOwned(rel) || isEngineOwned(real), speckit };
}

/**
 * The file for the editor, with its mtime and hash, and `readOnly`: null, or the reason it can't be saved
 * ('engine', 'speckit', 'binary', 'tooLarge'). `content` is null for a binary file and one over 10 MB.
 * `framework` is the project's (US-1402 NFR3.2: 'speckit' makes Spec Kit's files read-only).
 */
export async function readForEdit(root, rel, { framework } = {}) {
  const { abs, engine, speckit } = await resolveEditable(root, rel, { framework });
  const stat = await fs.stat(abs);
  if (!stat.isFile()) throw new Error(t('errors.notAFile', { rel: String(rel) }));
  const buf = stat.size > MAX_READ_BYTES ? null : await fs.readFile(abs);
  const binary = buf ? buf.subarray(0, BINARY_PROBE_BYTES).includes(0) : false;
  const readOnly = engine ? 'engine' : speckit ? 'speckit' : binary ? 'binary' : stat.size > MAX_EDIT_BYTES ? 'tooLarge' : null;
  return {
    rel,
    content: buf && !binary ? buf.toString('utf8') : null,
    mtimeMs: stat.mtimeMs,
    hash: buf ? sha256(buf) : null,
    size: stat.size,
    readOnly
  };
}

/**
 * Writes `content` to `rel` when the file on disk still has `expectHash` (the hash it was opened or last saved with).
 * A file changed meanwhile comes back as `{conflict: true, disk}` with its text, mtime and hash. `expectMtime` is
 * compared first: an equal mtime and size skip the hashing. Throws for an engine-owned or out-of-root path, and for
 * Spec Kit's files when `framework` is 'speckit' (US-1402 NFR3.2).
 * @returns {Promise<{ok: true, mtimeMs: number, hash: string} | {conflict: true, disk: {content: string, mtimeMs: number, hash: string}}>}
 */
export async function writeFileSafe(root, rel, content, { expectMtime, expectHash, framework } = {}) {
  if (typeof content !== 'string') throw new Error(t('errors.invalidValue', { what: 'content', value: typeof content }));
  const { abs, engine, speckit } = await resolveEditable(root, rel, { framework });
  if (engine) throw new Error(t('errors.engineOwned', { rel: String(rel) }));
  if (speckit) throw new Error(t('errors.speckitReadOnly', { rel: String(rel) }));
  const stat = await fs.stat(abs);
  if (!stat.isFile()) throw new Error(t('errors.notAFile', { rel: String(rel) }));
  const next = Buffer.from(content, 'utf8');
  if (stat.mtimeMs !== expectMtime || typeof expectHash !== 'string') {
    const disk = await fs.readFile(abs);
    if (sha256(disk) !== expectHash) return { conflict: true, disk: { content: disk.toString('utf8'), mtimeMs: stat.mtimeMs, hash: sha256(disk) } };
  }
  await writeAtomic(abs, next, { mode: stat.mode & 0o7777 });
  return { ok: true, mtimeMs: (await fs.stat(abs)).mtimeMs, hash: sha256(next) };
}

/**
 * US-0506 u4 BR7.16, RD33, D1: writes `bytes` to the already-checked absolute path `abs` through a temp file in the
 * same folder and a rename, so a reader sees the old bytes or the new ones. `mode` is set with chmod (not masked by
 * the umask); without it a new file gets `0o666 & ~umask`. `expect` is the caller's last read and compare, run just
 * before the rename; when it throws, nothing is renamed. Not reachable from IPC: callers check the path first (SD36).
 * ponytail: no fsync before rename (as the editor); add it if a real loss case appears.
 */
export async function writeAtomic(abs, bytes, { mode, expect } = {}) {
  const tmp = path.join(path.dirname(abs), `.${path.basename(abs)}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(tmp, bytes, { flag: 'wx' });
    if (mode !== undefined) await fs.chmod(tmp, mode);
    if (expect) await expect();
    await fs.rename(tmp, abs);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch((e) => console.error(`Kunde inte ta bort ${path.basename(tmp)}:`, e.code));
    throw err;
  }
}

async function walk(root, rel, out) {
  if (out.length >= MAX_TREE_FILES) return;
  const entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  for (const e of entries) {
    if (TREE_SKIP.has(e.name)) continue;
    const child = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) await walk(root, child, out);
    else if (e.isFile() && out.length < MAX_TREE_FILES) out.push(child);
  }
}

/**
 * Every file of the project root as a sorted list of root-relative paths: `git ls-files` (tracked and untracked,
 * `.gitignore`d ones left out) in a git repository, else a walk. Both skip node_modules/, out/, dist/ and .git/.
 * @returns {Promise<{files: string[], truncated: boolean}>}
 */
export async function listTree(root, { exec = defaultExec } = {}) {
  let files;
  try {
    const out = await runFixed('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, exec, timeout: 10000 });
    files = [...new Set(out.split('\0').filter(Boolean))];
  } catch (err) {
    console.info('git ls-files gick inte, läser mappen i stället:', err.message);
    files = [];
    await walk(root, '', files);
  }
  files = files.filter((f) => !f.split('/').some((part) => TREE_SKIP.has(part))).sort();
  return { files: files.slice(0, MAX_TREE_FILES), truncated: files.length > MAX_TREE_FILES };
}
