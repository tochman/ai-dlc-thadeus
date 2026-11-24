// US-0508 FR1.1, FR1.3, FR1.4, NFR3: an intent's display name, kept by the app in `.thadeus/intent-names.json` as
// `{ "<dirName>": "<name>" }`. AI-DLC has no rename command, so its folder, slug and intents.json never change; the
// name only replaces the slug the app shows. The file is written atomically; an unreadable one counts as empty.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAtomic } from './fileWrite.js';
import { readJsonSafe, resolveInRoot } from './projectAccess.js';
import { t } from '../shared/i18n.js';

export const NAMES_PATH = '.thadeus/intent-names.json';
const SLUG = /^[a-z0-9-]{1,60}$/;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** US-0508 NFR3: the names by dirName; a missing file gives {}, a broken one is logged and gives {} too. Never throws. */
export async function readIntentNames(root) {
  const res = await readJsonSafe(root, NAMES_PATH);
  if (res.ok && isPlainObject(res.value)) return Object.fromEntries(Object.entries(res.value).filter(([, v]) => typeof v === 'string'));
  if (!res.missing) console.warn(`${NAMES_PATH} kunde inte läsas, mappnamnen visas:`, res.ok ? 'inget objekt' : res.error);
  return {};
}

/**
 * US-0508 FR1.3, FR1.4: sets the display name of `dirName` among `intents` (the space's list, each with `slug` and,
 * when named, `aidlcSlug`). The name is trimmed; an empty one removes the entry. A name breaking the slug rules or
 * used by another intent comes back as `{ok: false, error}` and nothing is written. Throws for an unknown intent.
 * @returns {Promise<{ok: true, name: string|null} | {ok: false, error: string}>}
 */
export async function setIntentName(root, dirName, name, { intents }) {
  if (typeof name !== 'string') throw new Error(t('errors.invalidValue', { what: 'name', value: typeof name }));
  if (!intents.some((i) => i.dirName === dirName)) throw new Error(t('intents.rename.unknown', { name: String(dirName) }));
  const next = name.trim();
  if (next && !SLUG.test(next)) return { ok: false, error: t('intents.rename.invalid', { name: next }) };
  const taken = intents.filter((i) => i.dirName !== dirName).some((i) => i.slug === next || i.aidlcSlug === next);
  if (next && taken) return { ok: false, error: t('intents.rename.taken', { name: next }) };

  const names = await readIntentNames(root);
  if (next) names[dirName] = next;
  else delete names[dirName];
  await fs.mkdir(path.join(root, path.dirname(NAMES_PATH)), { recursive: true });
  const abs = path.join(await resolveInRoot(root, path.dirname(NAMES_PATH)), path.basename(NAMES_PATH)); // a symlinked .thadeus out of the root is refused
  await writeAtomic(abs, Buffer.from(`${JSON.stringify(names, null, 2)}\n`, 'utf8'));
  return { ok: true, name: next || null };
}
