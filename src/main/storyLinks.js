// US-1303 FR1, FR5, NFR1: which stories each intent delivered, for the cost roll-up. The stories named in the intent's
// initial description, else in the first line of its requirements; a link made by hand, kept by the app in
// `.thadeus/story-links.json` as `{ "<dirName>": ["US-XXYY", ...] }`, replaces both. US-0604's story-detail links
// (features.js loadStoryLinks) are left as they are (FR1.4). The link file is the only write, made atomically.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAtomic } from './fileWrite.js';
import { readJsonSafe, readText, resolveInRoot } from './projectAccess.js';
import { storyIdsIn } from './parsers/features.js';
import { t } from '../shared/i18n.js';

export const LINKS_PATH = '.thadeus/story-links.json';
const DIR_NAME = /^[\w.-]{1,120}$/;
const STORY_ID = /^US-\d{4}$/;
const isDirName = (v) => typeof v === 'string' && DIR_NAME.test(v) && !v.includes('..');
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const validIds = (v) => (Array.isArray(v) ? [...new Set(v.filter((id) => typeof id === 'string' && STORY_ID.test(id)))] : []);

/** US-1303 FR1.1, FR1.2: the story ids in the description text, else those in the first line of requirements.md. */
export function deliveredStories(descText, reqText) {
  const named = storyIdsIn(descText);
  return named.length ? named : storyIdsIn(String(reqText ?? '').split('\n')[0]);
}

/** US-1303 FR5: the hand links by dirName; a missing file gives {}, a broken one is logged and gives {}. Never throws. */
export async function readHandLinks(root) {
  const res = await readJsonSafe(root, LINKS_PATH);
  if (res.ok && isPlainObject(res.value)) {
    return Object.fromEntries(
      Object.entries(res.value)
        .filter(([dir]) => isDirName(dir))
        .map(([dir, ids]) => [dir, validIds(ids)])
        .filter(([, ids]) => ids.length > 0)
    );
  }
  if (!res.missing) console.warn(`${LINKS_PATH} kunde inte läsas, inga storys är länkade för hand:`, res.ok ? 'inget objekt' : res.error);
  return {};
}

/**
 * US-1303 FR5, NFR1: links `dirName` to `ids` by hand; an empty list removes the link. A bad dir name or story id, or a
 * `.thadeus` leading out of the root, throws and writes nothing.
 * @returns {Promise<Record<string, string[]>>} the hand links after the change
 */
export async function setHandLink(root, dirName, ids) {
  if (!isDirName(dirName)) throw new Error(t('errors.invalidName', { what: 'intent', name: String(dirName) }));
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !STORY_ID.test(id))) {
    throw new Error(t('errors.invalidValue', { what: 'stories', value: String(ids) }));
  }
  const links = await readHandLinks(root);
  if (ids.length) links[dirName] = [...new Set(ids)];
  else delete links[dirName];
  await fs.mkdir(path.join(root, path.dirname(LINKS_PATH)), { recursive: true });
  const abs = path.join(await resolveInRoot(root, path.dirname(LINKS_PATH)), path.basename(LINKS_PATH)); // a symlinked .thadeus out of the root is refused
  await writeAtomic(abs, Buffer.from(`${JSON.stringify(links, null, 2)}\n`, 'utf8'));
  return links;
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
 * US-1303 FR1: each intent's delivered stories (every dir in `dirNames`, [] for none) and the hand links among them.
 * ponytail: two small files per intent on each call, as loadStoryLinks; cache per intent if spaces grow to hundreds.
 * @returns {Promise<{stories: Record<string, string[]>, hand: Record<string, string[]>}>}
 */
export async function loadDelivered(root, space, dirNames) {
  const hand = await readHandLinks(root);
  const stories = {};
  await Promise.all(
    dirNames.map(async (dir) => {
      if (hand[dir]) {
        stories[dir] = hand[dir]; // FR1.3: the hand link replaces both files
        return;
      }
      const base = `aidlc/spaces/${space}/intents/${dir}`;
      const [desc, req] = await Promise.all([
        readOrEmpty(root, `${base}/project-description.json`),
        readOrEmpty(root, `${base}/inception/requirements-analysis/requirements.md`)
      ]);
      stories[dir] = deliveredStories(desc, req);
    })
  );
  return { stories, hand: Object.fromEntries(dirNames.filter((d) => hand[d]).map((d) => [d, hand[d]])) };
}
