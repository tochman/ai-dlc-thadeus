// Read-only, root-confined file access. Every path the renderer can name goes
// through resolveInRoot. This module intentionally contains no fs write calls.
import { promises as fs } from 'node:fs';
import path from 'node:path';

function isInside(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Validates a folder the user picked and returns its real (symlink-free) path. */
export async function openRoot(dir) {
  if (typeof dir !== 'string' || dir.trim() === '') throw new Error('Ingen mapp angiven');
  const real = await fs.realpath(dir);
  const stat = await fs.stat(real);
  if (!stat.isDirectory()) throw new Error(`Inte en mapp: ${dir}`);
  return real;
}

/**
 * Resolves a root-relative path and rejects anything that escapes the root:
 * absolute paths, `..` segments and symlinks pointing outside (checked via realpath).
 * `root` must be a value returned by openRoot.
 */
export async function resolveInRoot(root, rel) {
  if (typeof rel !== 'string') throw new Error('Sökvägen måste vara en sträng');
  if (path.isAbsolute(rel)) throw new Error(`Absoluta sökvägar tillåts inte: ${rel}`);
  const candidate = path.resolve(root, rel);
  if (!isInside(root, candidate)) throw new Error(`Sökvägen ligger utanför projektroten: ${rel}`);
  const real = await fs.realpath(candidate);
  if (!isInside(root, real)) throw new Error(`Sökvägen pekar ut ur projektroten: ${rel}`);
  return real;
}

export async function readText(root, rel) {
  return fs.readFile(await resolveInRoot(root, rel), 'utf8');
}

/** Never throws: half-written or missing JSON yields {ok:false} so callers can keep the last good value. */
export async function readJsonSafe(root, rel) {
  let text;
  try {
    text = await readText(root, rel);
  } catch (err) {
    return { ok: false, missing: err.code === 'ENOENT', error: err.message };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, missing: false, error: `Ogiltig JSON i ${rel}: ${err.message}` };
  }
}

/** Lists a directory; a missing directory yields []. Other errors propagate. */
export async function listDir(root, rel) {
  let abs;
  try {
    abs = await resolveInRoot(root, rel);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const entries = await fs.readdir(abs, { withFileTypes: true });
  return entries.map((e) => ({ name: e.name, isDir: e.isDirectory() }));
}

export async function exists(root, rel) {
  try {
    await resolveInRoot(root, rel);
    return true;
  } catch {
    return false;
  }
}
