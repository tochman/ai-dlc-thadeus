// Releases in the feature docs (EPIC-06 US-0603): the writes the Features view makes, a story's "for vX.Y.Z"
// marker (FR2.2, FR2.3) and a release plan file in docs/releases/ (US-0605 FR1.3, FR4), and the lifecycle rule check
// in the project's AI-DLC memory (FR5.2). The renderer names only a story id, a version and the hashes it read; the
// files are found here from the project's own overview.
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readText, resolveInRoot } from './projectAccess.js';
import { writeFileSafe } from './fileWrite.js';
import { loadFeatures, plansDir } from './features.js';
import { DELIVERY, addPlanRows, buildReleases, canDelete, newReleaseError, planHeading, releaseOf, ruleStatus, setReleaseMarker } from './parsers/releases.js';
import { t } from '../shared/i18n.js';

const STORY_ID = /^US-\d{4}$/;
const posix = path.posix;

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
  if (refused) return refused;
  // US-0606 FR2.4: a story added to a release is listed in its plan file too; a removed one leaves the plan file alone.
  if (version)
    await writePlanRow(
      root,
      overviewRel,
      epic,
      epic.parsed.stories.find((s) => s.id === storyId),
      version
    );
  return { ok: true };
}

const MARKER = { planned: '📋', progress: '🚧', done: '✅', deployed: '🚀' };
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** US-0606 FR2.4: adds the story's row to `docs/releases/X.Y.Z.md`, creating the file (and its folder) when missing. */
async function writePlanRow(root, overviewRel, epic, story, version) {
  const dir = plansDir(overviewRel);
  const rel = `${dir}/${version.slice(1)}.md`; // the version is checked by setReleaseMarker, so the name is safe
  const row = {
    ...story,
    epicId: epic.id,
    epicLink: posix.relative(dir, epic.file),
    status: story.status ? `${MARKER[story.status]} ${story.statusText.split(',')[0].trim()}` : null
  };
  let text = null;
  try {
    text = await readText(root, rel);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (text === null) {
    await fs.mkdir(path.join(await resolveInRoot(root, posix.dirname(dir)), posix.basename(dir)), { recursive: true });
    await fs.writeFile(path.join(await resolveInRoot(root, dir), posix.basename(rel)), addPlanRows(planHeading(version), [row]), { flag: 'wx' });
    return;
  }
  const next = addPlanRows(text, [row]);
  if (next !== text) await writeFileSafe(root, rel, next, { expectHash: sha256(text) });
}

/** The releases as the release list shows them, from the docs read now and the given vX.Y.Z tags. */
async function currentReleases(root, overviewRel, tags) {
  const features = await loadFeatures(root, overviewRel);
  return buildReleases(features.epics ?? [], tags, features.plans ?? []);
}

/**
 * US-0605 FR1.2, FR1.3, NFR1: creates `docs/releases/X.Y.Z.md` (beside the overview's folder) holding only
 * `# Release plan vX.Y.Z`, and the folder when it is missing. A version not shaped 'vX.Y.Z', or one already known from
 * a tag, a marker or a plan file, throws; so does any file already at that name, which is never replaced.
 * @param {{name: string, date?: string}[]} tags the project's vX.Y.Z tags
 * @returns {Promise<{ok: true, file: string}>}
 */
export async function createRelease(root, overviewRel, version, tags = []) {
  const error = newReleaseError(version, await currentReleases(root, overviewRel, tags));
  if (error) throw new Error(t(`features.release.new.${error}`, { version: String(version) }));
  const dir = plansDir(overviewRel);
  const name = `${version.slice(1)}.md`; // the version is checked, so the name is safe
  await fs.mkdir(path.join(await resolveInRoot(root, posix.dirname(dir)), posix.basename(dir)), { recursive: true });
  // The folder is resolved again so a symlink out of the root is refused; 'wx' fails when anything is at the name.
  await fs.writeFile(path.join(await resolveInRoot(root, dir), name), planHeading(version), { flag: 'wx' });
  return { ok: true, file: `${dir}/${name}` };
}

/**
 * US-0605 FR4, FR4.1, NFR1: removes the plan file of a release that `canDelete` allows, when the file still has the
 * `hash` it was read with; a changed file is refused as `{conflict: file}`. Any other release throws.
 * ponytail: the hash is read and the file removed in two steps; a write in between is lost. Fine for a heading-only file.
 * @returns {Promise<{ok: true} | {conflict: string}>}
 */
export async function deleteRelease(root, overviewRel, { version, hash }, tags = []) {
  const entry = (await currentReleases(root, overviewRel, tags)).find((r) => r.version === version);
  if (!canDelete(entry)) throw new Error(t('features.release.delete.refused', { version: String(version) }));
  if (entry.plan.hash !== hash) return { conflict: entry.plan.file };
  await fs.unlink(await resolveInRoot(root, entry.plan.file));
  return { ok: true };
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
