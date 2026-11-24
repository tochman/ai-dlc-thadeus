// US-1407 FR8 (contract C10): switching a project from one framework to the other. The check of `to` (BR8.1) comes
// before any file access (NFR3.5); the preview only reads (BR8.2, BR8.3, NFR3.4); the switch writes only
// `.thadeus/project.json`, through U2's atomic write, and deletes nothing (BR8.5, NFR3.7). The setup itself is run by
// the renderer through the existing setup handlers; this module imports no runner (NFR4.5).
import { detectProject, inProgress, listSpaces, loadIntentList } from './projectService.js';
import { loadSpeckitFeatures } from './speckitFeatures.js';
import { FRAMEWORKS, writeProjectFile } from './projectFile.js';
import { t } from '../shared/i18n.js';

// BR8.2, NFR3.6: fixed names, never a path read from disk.
const KEEPS = { aidlc: ['aidlc/'], speckit: ['.specify/', 'specs/'] };
const frameworkName = (id) => t(`setup.framework.${id}`);

/** US-1407 BR8.1: `to` when it is the framework the project is not on; otherwise throws a translated reason. */
export function switchTarget(from, to) {
  if (!FRAMEWORKS.includes(from) || !FRAMEWORKS.includes(to) || to === from) throw new Error(t('framework.switchInvalid', { to: String(to) }));
  return to;
}

/** BR8.3: the intents of every space that are not completed or archived; one space that fails to read is `unread`. */
async function openIntents(root, unread) {
  const lists = await Promise.all(
    (await listSpaces(root)).map((space) =>
      loadIntentList(root, space).catch((err) => {
        console.warn(`Intenterna i ${space} kunde inte läsas för bytet av ramverk:`, err.message);
        unread.add('intent');
        return { intents: [] };
      })
    )
  );
  return lists.flatMap(({ intents }) => intents.filter(inProgress).map((i) => ({ kind: 'intent', name: i.slug ?? i.dirName })));
}

/** BR8.3: the Spec Kit features with open tasks (done < total). */
async function openFeatures(root, loadFeatures) {
  const { features } = await loadFeatures(root);
  return features.filter((f) => f.tasks.done < f.tasks.total).map((f) => ({ kind: 'feature', name: f.dir }));
}

/**
 * US-1407 BR8.2, BR8.3, NFR7.3 (C10): what a switch from `from` to `to` does. `unread` (additive) names a list that
 * could not be read; it adds no item. Read-only.
 * @returns {Promise<{setupNeeded: boolean, inProgress: Array<{kind: 'intent'|'feature', name: string}>, keeps: string[], unread: string[]}>}
 */
export async function switchPreview(root, from, to, { loadFeatures = loadSpeckitFeatures } = {}) {
  switchTarget(from, to);
  const { found } = await detectProject(root);
  const unread = new Set();
  const kind = from === 'aidlc' ? 'intent' : 'feature';
  let items = [];
  try {
    items = from === 'aidlc' ? await openIntents(root, unread) : await openFeatures(root, loadFeatures);
  } catch (err) {
    console.warn('Pågående arbete kunde inte läsas för bytet av ramverk:', err.message);
    unread.add(kind);
  }
  return { setupNeeded: !found[to], inProgress: items, keeps: found[from] ? KEEPS[from] : [], unread: [...unread] };
}

/**
 * US-1407 BR8.4, BR8.5 (C10): re-checks the target's folder, then writes `.thadeus/project.json` through U2. A
 * re-detection that fails after the write keeps the write: the reply is `{ ok: true, detection: null }`.
 * @returns {Promise<{ok: true, detection: object|null} | {ok: false, error: {code: 'setupNeeded'|'writeFailed', message: string}}>}
 */
export async function switchFramework(root, to) {
  const { found } = await detectProject(root);
  if (!found[to]) return { ok: false, error: { code: 'setupNeeded', message: t('framework.switch.setupNeeded', { framework: frameworkName(to) }) } };
  const written = await writeProjectFile(root, to);
  if (!written.ok) return { ok: false, error: { code: 'writeFailed', message: written.error.message } };
  try {
    return { ok: true, detection: await detectProject(root) };
  } catch (err) {
    console.error(`Omdetektering efter bytet av ramverk misslyckades för ${root}:`, err);
    return { ok: true, detection: null };
  }
}
