// Reads the feature docs (EPIC-06) through the root-confined projectAccess. Read-only (FR4.6, NFR2).
import path from 'node:path';
import { readText } from './projectAccess.js';
import { DEFAULT_FEATURES_PATH, isValidFeaturesPath, parseEpic, parseOverview, storyIdsIn } from './parsers/features.js';
import { t } from '../shared/i18n.js';

const posix = path.posix;

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
 *   {available: true, overviewPath: string, overviewText: string, intro: string, epics: object[], warnings: string[]}>}
 *   each epic: the overview row plus `file` (root-relative) and `parsed` (parseEpic result or null)
 */
export async function loadFeatures(root, overviewRel = DEFAULT_FEATURES_PATH) {
  if (!isValidFeaturesPath(overviewRel)) {
    return { available: false, overviewPath: String(overviewRel), reason: t('features.invalidPath', { path: String(overviewRel) }) };
  }
  let overviewText;
  try {
    overviewText = await readText(root, overviewRel);
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
    if (target) {
      try {
        parsed = parseEpic(await readText(root, target.rel));
      } catch (err) {
        const error = err.code === 'ENOENT' ? t('features.fileMissing') : err.message;
        warnings.push(t('features.epicFileUnreadable', { id: row.id, file: target.rel, error }));
      }
    }
    epics.push({ ...row, file: target?.rel ?? null, parsed });
  }
  return { available: true, overviewPath: overviewRel, overviewText, intro: overview.intro, epics, warnings };
}

/** Paths to watch for one overview: the overview itself and the folders its epic files live in (FR2.7). */
export function featureWatchPaths(overviewRel, features) {
  const dirs = new Set((features?.epics ?? []).filter((e) => e.file).map((e) => posix.dirname(e.file)));
  if (dirs.size === 0) dirs.add(posix.join(posix.dirname(overviewRel), 'features'));
  return [overviewRel, ...dirs];
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
