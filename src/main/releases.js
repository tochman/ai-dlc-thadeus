// Releases in the feature docs (EPIC-06 US-0603): the one write the Features view makes, a story's "for vX.Y.Z"
// marker (FR2.2, FR2.3), and the lifecycle rule check in the project's AI-DLC memory (FR5.2). The renderer names
// only a story id, a version and the hashes it read; the files are found here from the project's own overview.
import { readText } from './projectAccess.js';
import { writeFileSafe } from './fileWrite.js';
import { loadFeatures } from './features.js';
import { DELIVERY, releaseOf, ruleStatus, setReleaseMarker } from './parsers/releases.js';
import { t } from '../shared/i18n.js';

const STORY_ID = /^US-\d{4}$/;

/** One file with the marker set; a file whose text would not change is not written. */
async function writeMarked(root, rel, text, hash, storyId, version) {
  const next = setReleaseMarker(text, storyId, version);
  if (next === text) return null;
  const res = await writeFileSafe(root, rel, next, { expectHash: hash });
  return res.conflict ? { conflict: rel } : null;
}

/**
 * US-0603 FR2.2–FR2.4: sets (or with `version` null removes) the story's release in its epic file and in the
 * overview. A file changed since `epicHash`/`overviewHash` were read is refused as `{conflict: rel}`; a released or
 * unknown story throws.
 * ponytail: the epic and the overview are two writes, not one transaction; a refused overview write leaves the
 * epic written, and the refusal is shown so the person can try again.
 * @returns {Promise<{ok: true} | {conflict: string}>}
 */
export async function setStoryRelease(root, overviewRel, { storyId, version, epicHash, overviewHash }) {
  if (typeof storyId !== 'string' || !STORY_ID.test(storyId)) throw new Error(t('errors.invalidValue', { what: 'storyId', value: String(storyId) }));
  const features = await loadFeatures(root, overviewRel);
  const epic = features.available ? features.epics.find((e) => e.parsed?.stories.some((s) => s.id === storyId)) : null;
  if (!epic) throw new Error(t('features.release.noStory', { id: storyId }));
  const { released } = releaseOf(epic.parsed.stories.find((s) => s.id === storyId).statusText);
  if (released) throw new Error(t('features.release.released', { id: storyId, version: released }));

  const refused =
    (await writeMarked(root, epic.file, epic.parsed.raw, epicHash, storyId, version)) ??
    (await writeMarked(root, overviewRel, features.overviewText, overviewHash, storyId, version));
  return refused ?? { ok: true };
}

/** US-0603 FR5.2: the lifecycle rule status in `aidlc/spaces/<space>/memory/project.md`; a missing file is 'missing'. */
export async function readRuleStatus(root, space, delivery) {
  if (typeof space !== 'string' || !/^[\w.-]+$/.test(space) || space.includes('..')) throw new Error(t('errors.invalidSpace', { space: String(space) }));
  if (!DELIVERY.includes(delivery)) throw new Error(t('errors.unknownDelivery', { value: String(delivery) }));
  let text;
  try {
    text = await readText(root, `aidlc/spaces/${space}/memory/project.md`);
  } catch (err) {
    if (err.code === 'ENOENT') return 'missing';
    throw err;
  }
  return ruleStatus(text, delivery);
}
