// Reads the feature docs (EPIC-06) through the root-confined projectAccess. Read-only (FR4.6, NFR2); the writes, a
// story's release marker and a release plan file, are in releases.js and check the hashes given here (US-0603 FR2.3,
// US-0605 NFR1).
import { createHash } from 'node:crypto';
import path from 'node:path';
import { listDir, readText } from './projectAccess.js';
import { DEFAULT_FEATURES_PATH, isValidFeaturesPath, overlayOwn, parseEpic, parseOverview, storyIdsIn } from './parsers/features.js';
import { isHeadingOnly } from './parsers/releases.js';
import { listAt, ownStories, planningSource, showAt } from './planningSync.js';
import { t } from '../shared/i18n.js';

const posix = path.posix;
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** Epic link from the overview table -> root-relative path, or null for links that are not local files. */
function epicPath(overviewRel, link) {
  if (!link || /^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('#')) return null;
  let target = link.split('#')[0];
  try {
    target = decodeURI(target);
  } catch {
    // keep the link as written
  }
  if (target.startsWith('/')) return { outside: true, rel: target };
  const rel = posix.normalize(posix.join(posix.dirname(overviewRel), target));
  return { outside: rel === '..' || rel.startsWith('../'), rel };
}

/**
 * @returns {Promise<{available: false, overviewPath: string, reason?: string} |
 *   {available: true, overviewPath: string, overviewText: string, overviewHash: string, intro: string, epics: object[], warnings: string[]}>}
 *   each epic: the overview row plus `file` (root-relative), `parsed` (parseEpic result or null) and `hash` (sha256 of
 *   the text read, or null; US-0603 FR2.3)
 * `read` and `list` (US-0036 FR2.1) read a file and list a folder; by default the checkout, root-confined.
 */
export async function loadFeatures(root, overviewRel = DEFAULT_FEATURES_PATH, { read = readText, list = listDir } = {}) {
  if (!isValidFeaturesPath(overviewRel)) {
    return { available: false, overviewPath: String(overviewRel), reason: t('features.invalidPath', { path: String(overviewRel) }) };
  }
  let overviewText;
  try {
    overviewText = await read(root, overviewRel);
  } catch (err) {
    if (err.code === 'ENOENT') return { available: false, overviewPath: overviewRel };
    return { available: false, overviewPath: overviewRel, reason: t('features.overviewUnreadable', { error: err.message }) };
  }
  const overview = parseOverview(overviewText);
  const warnings = [...overview.warnings];
  const epics = [];
  for (const row of overview.epics) {
    const target = epicPath(overviewRel, row.link);
    if (target?.outside) {
      warnings.push(t('features.linkOutside', { id: row.id, link: row.link }));
      continue;
    }
    let parsed = null;
    let hash = null;
    if (target) {
      try {
        const text = await read(root, target.rel);
        hash = sha256(text);
        parsed = parseEpic(text);
      } catch (err) {
        const error = err.code === 'ENOENT' ? t('features.fileMissing') : err.message;
        warnings.push(t('features.epicFileUnreadable', { id: row.id, file: target.rel, error }));
      }
    }
    epics.push({ ...row, file: target?.rel ?? null, parsed, hash });
  }
  const plans = await loadPlans(root, overviewRel, warnings, { read, list });
  return { available: true, overviewPath: overviewRel, overviewText, overviewHash: sha256(overviewText), intro: overview.intro, epics, plans, warnings };
}

const missing = (rel) => Object.assign(new Error(`${rel}: ENOENT`), { code: 'ENOENT' });

/**
 * US-0036 FR2.1, FR2.5: the feature docs the planning views show, with `source` saying where they come from. On the
 * target (or without a ref to read) the checkout, as loadFeatures. On any other branch each file as it is on `source.ref`
 * (read with git, the checkout untouched) with the branch's own story blocks on top; the plans folder is the ref's alone.
 * A file only the branch has is shown as the branch has it.
 */
export async function loadPlanningFeatures(ctx) {
  let source;
  try {
    source = await planningSource(ctx);
  } catch (err) {
    console.warn('Planeringens källa kunde inte avgöras; vyerna läser utcheckningen:', err.message);
    return loadFeatures(ctx.root, ctx.featuresPath);
  }
  if (source.inPlace || !source.ref) return { ...(await loadFeatures(ctx.root, ctx.featuresPath)), source };
  const own = ownStories(ctx, source.branch ?? '');
  const plans = plansDir(ctx.featuresPath);
  const read = async (root, rel) => {
    const target = await showAt(ctx, source.ref, rel);
    const disk = rel.startsWith(`${plans}/`)
      ? null
      : await readText(root, rel).catch((err) => {
          if (err.code === 'ENOENT') return null;
          throw err;
        });
    if (target === null && disk === null) throw missing(rel);
    return target === null ? disk : overlayOwn(target, disk, own);
  };
  const list = (_root, dir) => listAt(ctx, source.ref, dir);
  return { ...(await loadFeatures(ctx.root, ctx.featuresPath, { read, list })), source };
}

/** US-0605 FR2: the release plans folder beside the overview's own folder, e.g. docs/releases/. */
export const plansDir = (overviewRel) => posix.join(posix.dirname(overviewRel), 'releases');
const PLAN_FILE = /^(\d+\.\d+\.\d+)\.md$/;

/**
 * US-0605 FR2: each `X.Y.Z.md` in the plans folder as `{version: 'vX.Y.Z', file, hash, headingOnly}`, by name; other
 * names are ignored and a missing folder gives []. An unreadable file is a warning.
 */
async function loadPlans(root, overviewRel, warnings, { read, list }) {
  const dir = plansDir(overviewRel);
  let entries;
  try {
    entries = await list(root, dir);
  } catch (err) {
    warnings.push(t('features.release.planUnreadable', { file: dir, error: err.message }));
    return [];
  }
  const names = entries.filter((e) => !e.isDir && PLAN_FILE.test(e.name)).map((e) => e.name);
  const plans = [];
  for (const name of names.sort()) {
    const version = `v${name.match(PLAN_FILE)[1]}`;
    const file = `${dir}/${name}`;
    try {
      const text = await read(root, file);
      plans.push({ version, file, hash: sha256(text), headingOnly: isHeadingOnly(text, version) });
    } catch (err) {
      warnings.push(t('features.release.planUnreadable', { file, error: err.message }));
    }
  }
  return plans;
}

/** Paths to watch for one overview: the overview itself, the folders its epic files live in (FR2.7) and the plans folder (US-0605 FR2.2). */
export function featureWatchPaths(overviewRel, features) {
  const dirs = new Set((features?.epics ?? []).filter((e) => e.file).map((e) => posix.dirname(e.file)));
  if (dirs.size === 0) dirs.add(posix.join(posix.dirname(overviewRel), 'features'));
  return [overviewRel, ...dirs, plansDir(overviewRel)];
}

async function readOrEmpty(root, rel) {
  try {
    return await readText(root, rel);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Kunde inte läsa ${rel}:`, err.message);
    return '';
  }
}

/**
 * Story ids mentioned in each intent's description and requirements (FR2.6).
 * @param {string[]} dirNames intent folders in the space
 * @returns {Promise<Record<string, string[]>>} storyId -> intent dirNames
 */
export async function loadStoryLinks(root, space, dirNames) {
  const links = {};
  // ponytail: reads two small files per intent on each call; cache per intent if spaces grow to hundreds.
  await Promise.all(
    dirNames.map(async (dir) => {
      const base = `aidlc/spaces/${space}/intents/${dir}`;
      const text =
        (await readOrEmpty(root, `${base}/project-description.json`)) + (await readOrEmpty(root, `${base}/inception/requirements-analysis/requirements.md`));
      for (const id of storyIdsIn(text)) (links[id] ??= []).push(dir);
    })
  );
  for (const id of Object.keys(links)) links[id].sort();
  return links;
}
