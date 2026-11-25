// US-0513 FR5: one commit on `main` of exactly the files an archive or an unarchive changed, in the planning sync's own
// queue for the project. There is no push here: the planning sync's push takes the commit to origin (FR5.2).
import { runFixed } from './exec.js';
import { currentBranch, originUrl } from './git.js';
import { readRecord } from './planningRecord.js';
import { MAIN, commitFiles, serial } from './planningSync.js';
import { intentsDir } from './projectService.js';

/**
 * US-0513 FR5.3, FR5.4: what decides about the commit, read before the first command: the branch, and whether
 * intents.json already has changes of its own (an untracked one counts).
 * @param {{root: string, exec?: Function}} ctx
 * @returns {Promise<{branch: string|null, dirtyIndex: boolean}>}
 */
export async function beforeArchive(ctx, space) {
  const branch = await currentBranch(ctx.root, { exec: ctx.exec });
  if (branch !== MAIN) return { branch, dirtyIndex: false };
  const args = ['--no-optional-locks', 'status', '--porcelain', '--untracked-files=all', '--', `${intentsDir(space)}/intents.json`];
  return { branch, dirtyIndex: (await runFixed('git', args, { cwd: ctx.root, exec: ctx.exec })).trim() !== '' };
}

/** US-0513 FR5.2: where the commit stands now; every answer but `waiting` means that it stays local. */
async function standing(ctx) {
  if (ctx.planningOff) return 'syncOff';
  if (!(await originUrl(ctx.root, { exec: ctx.exec }))) return 'noRemote';
  if ((await readRecord(ctx.userData, ctx.root)).protectedMain) return 'protected';
  return ctx.online() ? 'waiting' : 'offline';
}

/**
 * US-0513 FR5.1–FR5.5: the commit after a run. The archive itself stands whatever the answer is.
 * @param {{root: string, userData: string, online: () => boolean, planningOff: boolean, exec?: Function}} ctx
 * @param {{branch: string|null, dirtyIndex: boolean}} before beforeArchive's answer
 * @param {{verb: 'archive'|'unarchive', slugs: string[], files: string[]}} what AI-DLC's slugs of the intents that were
 *   archived (not the refused ones), and the changed files
 * @returns {Promise<null | {state: 'waiting'|'syncOff'|'noRemote'|'protected'|'offline'|'notMain'|'dirtyIndex'} |
 *   {state: 'refused', reason: string}>} null: nothing to commit
 */
export async function commitArchive(ctx, before, { verb, slugs, files }) {
  if (!slugs.length || !files.length) return null;
  if (before.branch !== MAIN) return { state: 'notMain' };
  if (before.dirtyIndex) return { state: 'dirtyIndex' };
  return serial(ctx.root, async () => {
    if ((await currentBranch(ctx.root, { exec: ctx.exec })) !== MAIN) return { state: 'notMain' }; // switched meanwhile
    const what = slugs.length === 1 ? slugs[0] : `${slugs.length} intents`;
    const res = await commitFiles(ctx.root, ctx, files, `chore: ${verb} ${what}`);
    return res.committed ? { state: await standing(ctx) } : { state: 'refused', reason: res.error.reason };
  });
}
