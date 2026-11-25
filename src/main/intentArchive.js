// US-0513 FR1.3–FR1.5, FR2.2, FR4.3, NFR1: archive and unarchive through AI-DLC's own commands, one at a time, never by
// editing its files. The files a command changed are found by looking before and after it, so a refused or timed-out
// one is known too; archiveCommit.js commits them.
import { promises as fs } from 'node:fs';
import { defaultExec } from './exec.js';
import { aidlc, assertKnownIntent } from './intentPark.js';
import { listDir, resolveInRoot } from './projectAccess.js';
import { intentsDir, readActiveSpace } from './projectService.js';
import { checkReason } from '../shared/intentArchive.js';
import { t } from '../shared/i18n.js';

/** A file's size and time, or null when it is not there. */
async function stampOf(root, rel) {
  try {
    const s = await fs.stat(await resolveInRoot(root, rel));
    return `${s.size}:${s.mtimeMs}`;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Every file the command may write for one intent, with its stamp: intents.json, the state and the audit shards.
 * ponytail: size and time, not content; a write that keeps both would be missed, and the command's writes never do.
 */
async function stampsOf(root, space, dirName) {
  const base = `${intentsDir(space)}/${dirName}`;
  const audit = (await listDir(root, `${base}/audit`)).filter((e) => !e.isDir && e.name.endsWith('.md')).map((e) => `${base}/audit/${e.name}`);
  const files = [`${intentsDir(space)}/intents.json`, `${base}/aidlc-state.md`, ...audit];
  return new Map(await Promise.all(files.map(async (f) => [f, await stampOf(root, f)])));
}

/** Runs one command and adds the files it changed to `changed`. */
async function runOne({ root, space, dirName, args, exec }, changed) {
  const before = await stampsOf(root, space, dirName);
  const res = await aidlc(root, args, exec);
  for (const [file, stamp] of await stampsOf(root, space, dirName)) if (stamp !== null && before.get(file) !== stamp) changed.add(file);
  return res;
}

/** Throws for a name that is not one of the space's intents (NFR1); the reason when AI-DLC works in another space. */
async function refusedAtOnce(root, space, dirNames, intents) {
  const known = intents.filter((i) => !i.missingOnDisk && !i.missingInIndex).map((i) => i.dirName);
  for (const dirName of dirNames) assertKnownIntent(dirName, known);
  const active = await readActiveSpace(root);
  return active === space ? null : t('intents.archive.otherSpace', { space, active });
}

/**
 * US-0513 FR1.3, FR1.5, FR4.3: archives one intent, or several complete ones, in the order given and one at a time. A
 * refused, blocked or timed-out one never stops the rest. Throws before anything runs for an unknown name.
 * @param {string[]} dirNames
 * @param {string} [reason] one reason for all of them
 * @param {{space: string, intents: object[], blocked?: (dirName: string) => Promise<string|null>,
 *   onProgress?: (p: {n: number, total: number}) => void, exec?: Function}} opts
 *   intents: the space's list; blocked: why this intent cannot be archived now (FR1.4), asked before each command
 * @returns {Promise<{ok: false, error: string} |
 *   {ok: true, archived: string[], refused: {dirName: string, error: string}[], files: string[]}>} files: what changed
 */
export async function archiveIntents(root, dirNames, reason, { space, intents, blocked = async () => null, onProgress, exec = defaultExec }) {
  const names = [...new Set(dirNames)];
  const error = await refusedAtOnce(root, space, names, intents);
  if (error) return { ok: false, error };
  const checked = checkReason(reason);
  if (checked.error) return { ok: false, error: t(`intents.archive.reasonError.${checked.error}`) };
  if (names.length > 1 && names.some((n) => intents.find((i) => i.dirName === n).status !== 'complete')) {
    return { ok: false, error: t('intents.archive.onlyComplete') };
  }
  const archived = [];
  const refused = [];
  const changed = new Set();
  for (const [i, dirName] of names.entries()) {
    onProgress?.({ n: i + 1, total: names.length });
    const args = ['engine', 'intent', 'archive', dirName, ...(checked.reason ? ['--reason', checked.reason] : [])];
    let res;
    try {
      const why = await blocked(dirName);
      res = why ? { ok: false, error: why } : await runOne({ root, space, dirName, args, exec }, changed);
    } catch (err) {
      console.warn(`Arkiveringen av ${dirName} misslyckades:`, err.message);
      res = { ok: false, error: err.message }; // a file that cannot be read: the rest goes on
    }
    if (res.ok) archived.push(dirName);
    else refused.push({ dirName, error: res.error });
  }
  return { ok: true, archived, refused, files: [...changed].sort() };
}

/** US-0513 FR2.2: brings one archived intent back; a refusal comes with AI-DLC's words. Throws for an unknown name. */
export async function unarchiveIntent(root, dirName, { space, intents, exec = defaultExec }) {
  const error = await refusedAtOnce(root, space, [dirName], intents);
  if (error) return { ok: false, error };
  const changed = new Set();
  const res = await runOne({ root, space, dirName, args: ['engine', 'intent', 'unarchive', dirName], exec }, changed);
  return { ...res, files: [...changed].sort() };
}
