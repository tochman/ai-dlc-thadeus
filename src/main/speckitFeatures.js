// US-1402 FR6: a Spec Kit project's features, read from `specs/*`, `.specify/feature.json` and each `tasks.md`
// (contract C5). Read-only (BR6.6, NFR3.1): this module only calls readFile, readdir, lstat, stat and realpath.
// Paths stay in the project (NFR3.3, NFR3.4): linked entries are skipped, and feature.json is real-path checked.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseTasks } from './parsers/speckitTasks.js';
import { t } from '../shared/i18n.js';

export const MAX_READ_BYTES = 1024 * 1024; // NFR5.1: larger files go in errors, unread
/**
 * BR6.7: what the Spec Kit watcher follows; fixed, so a new feature folder is seen without a resync. US-1404 BR7.8 adds
 * the constitution, extensions.yml and the extension folders, so the rules section refreshes too.
 */
export const SPECKIT_WATCH_PATHS = [
  'specs/**',
  '.specify/feature.json',
  '.specify/init-options.json',
  '.specify/memory/constitution.md',
  '.specify/extensions.yml',
  '.specify/extensions/**'
];
const FEATURE_JSON = '.specify/feature.json';
const VERSION_FILES = [
  ['.specify/init-options.json', 'speckit_version'],
  ['.specify/integrations/speckit.manifest.json', 'version']
];
const TIMESTAMPED = /^(\d{8}-\d{6})-(.+)$/;
const NUMBERED = /^(\d{3,})-(.+)$/;
const CLARIFICATIONS = /^##\s+Clarifications\b/m;
const utf8 = new TextDecoder('utf-8', { fatal: true });
const reason = (key, values) => t(`speckit.reason.${key}`, values);
const NO_TASKS = { done: 0, total: 0, skipped: 0, phases: [] };

/**
 * `{ text }`, `{ missing: true }`, or `{ error: reason }` for a text file of at most 1 MB that is valid UTF-8 (NFR5.1).
 * Also used by US-1404's rules reader, after its own containment check.
 */
export async function readLimited(root, rel) {
  const abs = path.join(root, rel);
  try {
    if ((await fs.stat(abs)).size > MAX_READ_BYTES) return { error: reason('tooLarge') };
    const buf = await fs.readFile(abs);
    try {
      return { text: utf8.decode(buf) };
    } catch {
      return { error: reason('notUtf8') };
    }
  } catch (err) {
    return err.code === 'ENOENT' ? { missing: true } : { error: reason('unreadable', { code: err.code ?? err.message }) };
  }
}

/** BR6.1: number and name from the folder name; an unrecognised one keeps its whole name. */
export function featureName(dir) {
  const m = TIMESTAMPED.exec(dir) ?? NUMBERED.exec(dir);
  return m ? { number: m[1], name: m[2] } : { number: null, name: dir };
}

/** BR6.9: `speckit_version` in init-options.json, else `version` in the manifest; supported is 1.4.x. */
async function readVersion(root, errors) {
  for (const [rel, key] of VERSION_FILES) {
    const r = await readLimited(root, rel);
    if (r.missing) continue;
    if (r.error) {
      errors.push({ path: rel, reason: r.error });
      continue;
    }
    try {
      const found = JSON.parse(r.text)?.[key];
      if (typeof found === 'string' && found) return { found, supported: /^v?1\.4\.\d+/.test(found) };
    } catch {
      errors.push({ path: rel, reason: reason('invalid') });
    }
  }
  return { found: null, supported: false };
}

/** BR6.5: regular files in the folder and one level of subfolders, root-relative and sorted; links left out. */
async function listFiles(root, rel) {
  const files = [];
  for (const e of await fs.readdir(path.join(root, rel), { withFileTypes: true })) {
    if (e.isFile()) files.push(`${rel}/${e.name}`);
    else if (e.isDirectory()) {
      for (const s of await fs.readdir(path.join(root, rel, e.name), { withFileTypes: true })) if (s.isFile()) files.push(`${rel}/${e.name}/${s.name}`);
    }
  }
  return files.sort();
}

/** One feature: its files, the flow worked out from them (BR6.3) and its tasks (BR6.4). */
async function readFeature(root, dir, active) {
  const rel = `specs/${dir}`;
  const errors = [];
  let files = [];
  try {
    files = await listFiles(root, rel);
  } catch (err) {
    errors.push({ path: rel, reason: reason('unreadable', { code: err.code ?? err.message }) });
  }
  const read = async (name) => {
    if (!files.includes(`${rel}/${name}`)) return null;
    const r = await readLimited(root, `${rel}/${name}`);
    if (r.error) errors.push({ path: `${rel}/${name}`, reason: r.error });
    return r.text ?? null;
  };
  const [spec, tasksText] = await Promise.all([read('spec.md'), read('tasks.md')]);
  const tasks = tasksText === null ? NO_TASKS : parseTasks(tasksText);
  const work = tasks.phases.filter((p) => p.round === null).flatMap((p) => p.items);
  const rounds = tasks.phases.filter((p) => p.round !== null).flatMap((p) => p.items);
  const flow = {
    spec: spec !== null,
    clarify: spec !== null && CLARIFICATIONS.test(spec),
    plan: files.includes(`${rel}/plan.md`),
    tasks: tasksText !== null,
    implement: work.length > 0 && work.every((i) => i.done),
    converge: rounds.length > 0 && rounds.every((i) => i.done)
  };
  return { feature: { dir, ...featureName(dir), active: dir === active, flow, tasks, files }, errors };
}

/**
 * BR6.2: the folder `.specify/feature.json` names, when it is a listed feature folder reached without a link.
 * ponytail: with SPECIFY_FEATURE_NO_PERSIST set, Spec Kit does not write feature.json, so no feature shows active;
 * the folder itself still shows through the `specs/**` watch. Read the branch name if that is ever asked for.
 */
async function readActive(root, realRoot, dirs, errors) {
  const r = await readLimited(root, FEATURE_JSON);
  if (r.missing) return null;
  const fail = (key) => {
    errors.push({ path: FEATURE_JSON, reason: reason(key) });
    return null;
  };
  if (r.error) {
    errors.push({ path: FEATURE_JSON, reason: r.error });
    return null;
  }
  let target;
  try {
    target = JSON.parse(r.text)?.feature_directory;
  } catch {
    return fail('invalid');
  }
  if (typeof target !== 'string' || !target) return fail('invalid');
  const abs = path.resolve(root, target);
  let real;
  try {
    if ((await fs.lstat(abs)).isSymbolicLink()) return fail('link');
    real = await fs.realpath(abs);
  } catch (err) {
    return fail(err.code === 'ENOENT' ? 'missing' : 'invalid');
  }
  const dir = dirs.find((d) => path.join(realRoot, 'specs', d) === real);
  if (dir) return dir;
  const inside = path.relative(realRoot, real);
  return fail(inside.startsWith('..') || path.isAbsolute(inside) ? 'outsideRoot' : 'missing');
}

/** The feature folders: real directories directly under a real `specs/`; linked ones go in errors (NFR3.4). */
async function listFeatureDirs(root, errors) {
  let entries;
  try {
    if ((await fs.lstat(path.join(root, 'specs'))).isSymbolicLink()) {
      errors.push({ path: 'specs', reason: reason('link') });
      return [];
    }
    entries = await fs.readdir(path.join(root, 'specs'), { withFileTypes: true });
  } catch (err) {
    if (err.code !== 'ENOENT') errors.push({ path: 'specs', reason: reason('unreadable', { code: err.code ?? err.message }) });
    return [];
  }
  const dirs = [];
  for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    if (e.name.startsWith('.')) continue;
    if (e.isSymbolicLink()) errors.push({ path: `specs/${e.name}`, reason: reason('link') });
    else if (e.isDirectory()) dirs.push(e.name);
  }
  return dirs;
}

/**
 * US-1402 FR6 (contract C5): `{ version: { found, supported }, features: [...], active, errors: [{ path, reason }] }`.
 * Every failed read goes in errors and never hides the rest (BR6.10). Nothing is written (BR6.6).
 * @param {string} root the project root
 */
export async function loadSpeckitFeatures(root) {
  const errors = [];
  const realRoot = await fs.realpath(root);
  const version = await readVersion(root, errors);
  const dirs = await listFeatureDirs(root, errors);
  const active = await readActive(root, realRoot, dirs, errors);
  const read = await Promise.all(dirs.map((d) => readFeature(root, d, active)));
  return { version, features: read.map((r) => r.feature), active, errors: [...errors, ...read.flatMap((r) => r.errors)] };
}
