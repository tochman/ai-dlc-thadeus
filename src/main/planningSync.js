// Release planning is committed and pushed without disturbing the work (EPIC-06 US-0606 FR2, US-0607 FR1.3, FR3,
// US-0608). Every planning change is in the local record (planningRecord.js) before it is in a file, and stays there
// until it is on the target (`origin/main`, or origin's docs branch when `main` is protected): release-list actions,
// editor saves and writes the docs watcher sees. When the checkout is on the target branch the files are written and
// committed there; on any other branch the checkout keeps only the story's own blocks, and every other change is
// committed in a temporary worktree on the app's own branch `dash/planning`. A cycle records what is new, applies lost
// changes again (a conflict keeps both versions), commits once 30 seconds after the last change, rebases the app's
// commits onto origin and pushes them; on a protected `main` it opens and squash-merges the pull request with `gh`. Git
// and gh run without a shell (US-0607 NFR3, US-0608 NFR2).
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runFixed } from './exec.js';
import { openRoot, readText, resolveInRoot } from './projectAccess.js';
import { writeAtomic } from './fileWrite.js';
import { loadFeatures, plansDir } from './features.js';
import { applyChange, splitChange, storyIdsIn } from './parsers/features.js';
import { createRelease, deleteRelease, setStoryRelease } from './releases.js';
import { currentBranch, listReleaseTags, originUrl, pushRef, worktreeAdd, worktreeRemove } from './git.js';
import {
  addAction,
  addContent,
  markCommitted,
  markConflict,
  readRecord,
  removeActions,
  resolveEntry,
  setProtectedMain,
  validDocFile
} from './planningRecord.js';
import { t } from '../shared/i18n.js';

const posix = path.posix;
// ponytail: a fixed branch name and a fixed `main`; make both settings if a project's trunk is named otherwise.
const BRANCH = 'dash/planning';
const MAIN = 'main';
const AGENT_SUBJECT = 'docs: update the feature docs';
const GIT_TIMEOUT_MS = 30000;
const WINDOW_MS = 30000; // US-0608 FR6.1: one commit per burst, this long after its last change

const git = (cwd, args, ctx) => runFixed('git', args, { cwd, exec: ctx.exec, timeout: GIT_TIMEOUT_MS });
async function gitOk(cwd, args, ctx) {
  try {
    await git(cwd, args, ctx);
    return true;
  } catch {
    return false; // a ref that does not exist, or a step that may fail
  }
}
const lines = (out) =>
  String(out)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
/** git's own words: execFile's message is "Command failed: <command>" and then stderr. */
const reasonOf = (err) => {
  const message = String(err?.message ?? err);
  return message.split('\n').slice(1).join('\n').trim() || message;
};
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const hashOf = (text) => (text === null ? null : sha256(text));
const windowOf = (ctx) => ctx.windowMs ?? WINDOW_MS;

/** US-0606 FR2.5: the feature-doc paths the app commits, beside the overview: it, the epic folder and the plans folder. */
const docPaths = (featuresPath) => [featuresPath, posix.join(posix.dirname(featuresPath), 'features'), plansDir(featuresPath)];
const underDocs = (featuresPath, file) => validDocFile(file) && docPaths(featuresPath).some((p) => file === p || file.startsWith(`${p}/`));

async function readOrNull(root, rel) {
  try {
    return await readText(root, rel);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** A checked doc path written atomically, its folder made when missing; the folder is resolved so a symlink out is refused. */
async function writeDoc(root, rel, text) {
  await fs.mkdir(path.join(root, posix.dirname(rel)), { recursive: true }); // rel is checked: relative, no `..`
  await writeAtomic(path.join(await resolveInRoot(root, posix.dirname(rel)), posix.basename(rel)), Buffer.from(text, 'utf8'));
}

/** A file as it is on `ref`, or null when it is not there (or there is no ref). */
export async function showAt(ctx, ref, file) {
  if (!ref) return null;
  try {
    return await git(ctx.root, ['show', `${ref}:./${file}`], ctx);
  } catch {
    return null;
  }
}

/** US-0036 FR2.1: a folder's entries on `ref` as `{name, isDir}` (as listDir gives them); [] when it is not there. */
export async function listAt(ctx, ref, dir) {
  const out = await git(ctx.root, ['ls-tree', ref, '--', `${dir}/`], ctx).catch(() => '');
  return lines(out).map((l) => {
    const [meta, file] = l.split('\t');
    return { name: posix.basename(file), isDir: meta.split(' ')[1] === 'tree' };
  });
}

// US-0608 D2, D3: per file, the hashes the app's own writes went through, newest last.
// ponytail: in memory only; after a restart the app's uncommitted writes are recorded once more as content, which
// replays as no change.
const trails = new Map();
const trailOf = (root, file) => trails.get(`${root}\0${file}`);

/** US-0608 FR2.1 (D2): the app wrote `file` from `from` to `to` (hashes; null: no file). */
export function noteAppWrite(root, file, from, to) {
  if (from === to) return;
  const trail = trailOf(root, file);
  trails.set(`${root}\0${file}`, [...(trail?.at(-1) === from ? trail : [from]), to].slice(-20));
}
/** US-0608 FR1.1 (D3): `given` was read before the app's own writes brought the file to `now`. */
const replacedByApp = (root, file, given, now) => trailOf(root, file)?.at(-1) === now && trailOf(root, file).includes(given);

/** The feature docs' hashes by file, to tell what an operation changed. */
async function docHashes(root, featuresPath) {
  const f = await loadFeatures(root, featuresPath);
  const map = new Map();
  if (!f.available) return map;
  map.set(featuresPath, f.overviewHash);
  for (const e of f.epics) if (e.file) map.set(e.file, e.hash);
  for (const p of f.plans) map.set(p.file, p.hash);
  return map;
}

async function freshHashes(root, featuresPath, storyId) {
  const f = await loadFeatures(root, featuresPath);
  const epic = f.available ? f.epics.find((e) => e.parsed?.stories.some((s) => s.id === storyId)) : null;
  return { epicHash: epic?.hash, overviewHash: f.overviewHash, epicFile: epic?.file };
}

/** US-0608 FR1.1: a hash the renderer read before one of the app's own writes counts as read now (the cause of US-0608 AC1). */
const ownHashes = (root, featuresPath, given, fresh) => ({
  epicHash: fresh.epicFile && replacedByApp(root, fresh.epicFile, given.epicHash, fresh.epicHash) ? fresh.epicHash : given.epicHash,
  overviewHash: replacedByApp(root, featuresPath, given.overviewHash, fresh.overviewHash) ? fresh.overviewHash : given.overviewHash
});

async function runAction(root, action, { featuresPath, tags, hashes }) {
  if (action.kind === 'setRelease') {
    for (const [i, storyId] of action.storyIds.entries()) {
      const fresh = await freshHashes(root, featuresPath, storyId);
      const given = i === 0 && hashes ? ownHashes(root, featuresPath, hashes, fresh) : fresh;
      const res = await setStoryRelease(root, featuresPath, { storyId, version: action.version, epicHash: given.epicHash, overviewHash: given.overviewHash });
      if (res.conflict) return { conflict: res.conflict };
    }
    return {};
  }
  const plan = (await loadFeatures(root, featuresPath)).plans?.find((p) => p.version === action.version);
  if (action.kind === 'createRelease' && !plan) await createRelease(root, featuresPath, action.version, tags);
  if (action.kind === 'deleteRelease' && plan) {
    const hash = !hashes?.hash || replacedByApp(root, plan.file, hashes.hash, plan.hash) ? plan.hash : hashes.hash;
    const res = await deleteRelease(root, featuresPath, { version: action.version, hash }, tags);
    if (res.conflict) return { conflict: res.conflict };
  }
  return {};
}

/**
 * US-0607 FR1.3: runs one recorded action's operation in `root` (the checkout or a worktree). An operation that is
 * already applied changes nothing, so it is safe to run again. `hashes` (as the renderer read them) guard the first
 * story against a file changed outside the app; the app's own writes since then do not count (US-0608 FR1.1).
 * @returns {Promise<{changed: boolean} | {conflict: string}>}
 */
export async function applyAction(root, action, { featuresPath, tags = [], hashes = null }) {
  const before = await docHashes(root, featuresPath);
  const res = await runAction(root, action, { featuresPath, tags, hashes });
  const after = await docHashes(root, featuresPath);
  const files = [...new Set([...before.keys(), ...after.keys()])].filter((f) => before.get(f) !== after.get(f));
  for (const f of files) noteAppWrite(root, f, before.get(f) ?? null, after.get(f) ?? null); // a partial write too
  return res.conflict ? res : { changed: files.length > 0 };
}

/** US-0608 FR4.1, FR5.2: a content entry written again where its file has a base it knows; another text is a conflict. */
async function applyContent(cwd, ctx, entry) {
  if (!underDocs(ctx.featuresPath, entry.file)) return { changed: false };
  const now = await readOrNull(cwd, entry.file);
  if (now === entry.content) return { changed: false };
  if (![entry.baseHash, ...(entry.earlier ?? [])].includes(hashOf(now))) return { conflict: true };
  await writeDoc(cwd, entry.file, entry.content);
  noteAppWrite(cwd, entry.file, hashOf(now), sha256(entry.content));
  return { changed: true };
}

/** Every entry again in `cwd`: file contents first (they hold the actions' writes made before them), then actions. */
async function replayIn(cwd, ctx, entries, tags) {
  const changed = [];
  const conflicts = [];
  const ordered = [...entries.filter((e) => e.kind === 'content'), ...entries.filter((e) => e.kind !== 'content')];
  for (const e of ordered) {
    let res;
    try {
      res = e.kind === 'content' ? await applyContent(cwd, ctx, e) : await applyAction(cwd, e, { featuresPath: ctx.featuresPath, tags });
    } catch (err) {
      console.warn(`Planeringsändringen ${e.kind} ${e.version ?? e.file} kunde inte göras igen:`, err.message);
      continue;
    }
    if (res.conflict && e.kind === 'content') conflicts.push(e.id);
    else if (res.conflict) console.warn(`Planeringsåtgärden ${e.kind} ${e.version} krockar med ${res.conflict}; den görs vid nästa cykel.`);
    else if (res.changed) changed.push(e);
  }
  return { changed, conflicts };
}

/** US-0033 AC4: ids joined by ", ", cut after five with "and N more". */
const idList = (ids) => (ids.length > 5 ? `${ids.slice(0, 5).join(', ')} and ${ids.length - 5} more` : ids.join(', '));

/**
 * US-0606 FR2.3, US-0608 FR6.2: `docs: plan US-XXXX[, …] for vX.Y.Z` per release and `update US-XXXX[, …]` for edits, joined
 * by "; ". US-0033 AC2, AC4: edits name the stories their changes are about (`named`), and each list stops after five.
 */
export function subjectOf(entries) {
  const planned = new Map();
  const parts = [];
  for (const a of entries.filter((e) => e.kind !== 'content')) {
    if (a.kind === 'setRelease' && a.version) {
      if (!planned.has(a.version)) parts.push(a.version);
      planned.set(a.version, [...(planned.get(a.version) ?? []), ...a.storyIds]);
    } else if (a.kind === 'setRelease') parts.push(`take ${idList(a.storyIds)} out of their release`);
    else parts.push(a.kind === 'createRelease' ? `plan ${a.version}` : `remove the plan for ${a.version}`);
  }
  const edits = entries.filter((e) => e.kind === 'content');
  const edited = [...new Set(edits.flatMap((e) => e.storyIds))];
  if (edited.length) parts.push(`update ${idList(edited)}`);
  else if (edits.length) parts.push('update the feature docs');
  if (!parts.length) return AGENT_SUBJECT;
  return `docs: ${parts.map((p) => (planned.has(p) ? `plan ${idList(planned.get(p))} for ${p}` : p)).join('; ')}`;
}

/** `git status --porcelain -z` paths; the second path of a rename or copy is skipped. */
function porcelainFiles(out) {
  const entries = String(out).split('\0');
  const files = [];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].length < 4) continue;
    files.push(entries[i].slice(3));
    if (entries[i][0] === 'R' || entries[i][0] === 'C') i++;
  }
  return files;
}

/** The changed feature-doc files in `cwd`; `--no-optional-locks` so a look never rewrites the index (US-0606 NFR1). */
const changedDocs = async (cwd, ctx) =>
  porcelainFiles(await git(cwd, ['--no-optional-locks', 'status', '--porcelain', '-z', '--untracked-files=all', '--', ...docPaths(ctx.featuresPath)], ctx));

/**
 * US-0606 FR2.2, FR2.5, FR4.2: commits every changed feature-doc file in `cwd`, and nothing else. A refused commit
 * (a hook) gives the reason and the files, and unstages them again, so the change stays as it was in the working tree.
 */
async function commitIn(cwd, ctx, subject) {
  const files = await changedDocs(cwd, ctx);
  if (!files.length) return { committed: false };
  try {
    await git(cwd, ['add', '-A', '--', ...files], ctx);
    await git(cwd, ['commit', '--quiet', '-m', subject, '--', ...files], ctx);
    return { committed: true };
  } catch (err) {
    await gitOk(cwd, ['reset', '--quiet', '--', ...files], ctx);
    return { committed: false, error: { kind: 'commit', reason: reasonOf(err), files } };
  }
}

const refExists = (ctx, ref) => gitOk(ctx.root, ['rev-parse', '--verify', '--quiet', ref], ctx);

async function firstRef(ctx, refs) {
  for (const [full, short] of refs) if (await refExists(ctx, full)) return short;
  return null;
}

/** US-0607 FR3.2: origin's target branch, else origin's main (a docs branch not pushed yet), else null. */
const remoteBase = (ctx, target) =>
  firstRef(ctx, [
    [`refs/remotes/origin/${target}`, `origin/${target}`],
    [`refs/remotes/origin/${MAIN}`, `origin/${MAIN}`]
  ]);

/** The target as the app knows it: origin's, else the local target or main (without a remote). */
const targetRef = async (ctx, target) =>
  (await remoteBase(ctx, target)) ??
  (await firstRef(ctx, [
    [`refs/heads/${target}`, target],
    [`refs/heads/${MAIN}`, MAIN]
  ]));

/** US-0606 FR2.1, US-0607 FR3.3: `main`, or the docs branch (checked against git's ref rules, NFR3) once `main` is protected. */
async function targetOf(ctx, record) {
  if (!record.protectedMain) return MAIN;
  const branch = ctx.planningBranch || 'docs/planning';
  if (branch === MAIN || branch.startsWith('-') || !(await gitOk(ctx.root, ['check-ref-format', '--branch', branch], ctx))) {
    throw new Error(t('errors.invalidValue', { what: 'branch', value: branch }));
  }
  return branch;
}

/** Where changes go now: the target, and whether it is checked out here. */
async function placeOf(ctx, record) {
  const target = await targetOf(ctx, record);
  const branch = await currentBranch(ctx.root, { exec: ctx.exec });
  return { target, branch, inPlace: branch === target };
}

/**
 * US-0036 FR2.1, FR2.5: where the planning views read from. On the target the checkout (`inPlace`); elsewhere `ref`:
 * origin's target, else origin's main, else the local target or main, and `remote` says whether it is origin's.
 * @returns {Promise<{inPlace: boolean, branch: string|null, ref: string|null, remote: boolean}>}
 */
export async function planningSource(ctx) {
  const place = await placeOf(ctx, await readRecord(ctx.userData, ctx.root));
  const ref = await targetRef(ctx, place.target);
  return { inPlace: place.inPlace, branch: place.branch, ref, remote: Boolean(ref?.startsWith('origin/')) };
}

/** US-0606 FR2.1: runs `fn` in a temporary worktree under the app's data folder, removed again whatever happens. */
async function withWorktree(ctx, spec, fn) {
  const dir = path.join(ctx.userData, 'planning', `wt-${createHash('sha1').update(String(ctx.root)).digest('hex').slice(0, 12)}`);
  await fs.rm(dir, { recursive: true, force: true }); // left over from a crash
  await git(ctx.root, ['worktree', 'prune'], ctx);
  await fs.mkdir(path.dirname(dir), { recursive: true });
  await worktreeAdd(ctx.root, dir, spec, { exec: ctx.exec });
  try {
    return await fn(await openRoot(dir));
  } finally {
    await worktreeRemove(ctx.root, dir, { exec: ctx.exec }).catch((err) => console.warn('Planeringens worktree kunde inte tas bort:', err.message));
  }
}

/** The app's branch as it is, or new at the target. */
async function planningSpec(ctx, target) {
  if (await refExists(ctx, `refs/heads/${BRANCH}`)) return { branch: BRANCH };
  const base = await targetRef(ctx, target);
  if (!base) throw new Error(t('errors.invalidValue', { what: 'ref', value: MAIN }));
  return { branch: BRANCH, base };
}

// ponytail: one operation at a time per project, in this process; a second app instance could interleave.
const chains = new Map();
function serial(key, fn) {
  const run = (chains.get(key) ?? Promise.resolve()).then(fn);
  chains.set(
    key,
    run.catch(() => {})
  ); // a failure reaches its caller and does not block the next operation
  return run;
}

// US-0608 FR6.1 (D6): per project, the commit waits until 30 s after the last change; the push still follows the scheduler.
const commitTimers = new Map();
function scheduleCommit(ctx) {
  if (!windowOf(ctx)) return; // 0: the next cycle commits at once
  clearTimeout(commitTimers.get(ctx.root));
  const timer = setTimeout(() => {
    commitTimers.delete(ctx.root);
    serial(ctx.root, () => replayStep(ctx))
      .then((res) => ctx.onCommitted?.(res))
      .catch((err) => console.warn('Planeringens commit misslyckades:', err.message));
  }, windowOf(ctx));
  timer.unref?.();
  commitTimers.set(ctx.root, timer);
}

/** US-0608 FR3.1: the story branch's own stories: the id in its name, and every id the active intent's description names. */
export const ownStories = (ctx, branch) => [...new Set([...storyIdsIn(branch), ...(ctx.ownStoryIds ?? [])])];
const contentOf = (record, file) => record.actions.find((a) => a.kind === 'content' && a.file === file);

/** US-0608 FR2.1: on the target, a changed file not yet in the record is kept whole, against HEAD (and the app's last write). */
async function recordOnTarget(ctx, record, file, work, { base, by }) {
  const hash = sha256(work);
  const known = contentOf(record, file);
  if (trailOf(ctx.root, file)?.at(-1) === hash || (known && sha256(known.content) === hash)) return null; // the app's own write (D2)
  const head = await showAt(ctx, 'HEAD', file);
  const storyIds = [...new Set(splitChange(head ?? '', work, []).changes.flatMap((c) => c.named))]; // US-0033
  const baseHash = base === undefined ? hashOf(head) : base;
  return addContent(ctx.userData, ctx.root, { file, baseHash, content: work, storyIds, by, earlier: [hashOf(head), trailOf(ctx.root, file)?.at(-1) ?? null] });
}

/**
 * US-0608 FR3.2, FR3.3: on a story branch, the blocks of other stories (and any release file) are recorded as the
 * target's text with them applied; with `restore` the story's tree and index then keep only its own blocks.
 */
async function recordOnStory(ctx, record, place, file, work, { by, restore }) {
  const head = await showAt(ctx, 'HEAD', file);
  const own = file.startsWith(`${plansDir(ctx.featuresPath)}/`) ? [] : ownStories(ctx, place.branch);
  const { keep, changes } = splitChange(head ?? '', work, own);
  if (!changes.length) return null;
  const known = contentOf(record, file);
  const onto = known ? known.content : await showAt(ctx, await targetRef(ctx, place.target), file);
  const { text, conflicts } = applyChange(onto, changes);
  let entry = null;
  if (known?.content !== text) {
    const state = conflicts.length || known?.state === 'conflict' ? 'conflict' : 'pending';
    const storyIds = [...new Set(changes.flatMap((c) => c.named))]; // US-0033
    entry = await addContent(ctx.userData, ctx.root, { file, baseHash: known ? known.baseHash : hashOf(onto), content: text, storyIds, by, state });
  }
  if (restore && keep !== work) await restoreKeep(ctx, file, head, keep, work);
  return entry;
}

/**
 * US-0608 FR3.3: the story's file back to its own blocks; a file only other changes made is removed. A staged file is
 * unstaged, so its index entry is HEAD's again.
 * ponytail: the person's staged own blocks in that file are unstaged too; they stay in the working tree.
 */
async function restoreKeep(ctx, file, head, keep, work) {
  const staged = !(await gitOk(ctx.root, ['diff', '--cached', '--quiet', '--', file], ctx));
  const gone = head === null && keep === '';
  if (gone) await fs.rm(await resolveInRoot(ctx.root, file));
  else await writeDoc(ctx.root, file, keep);
  noteAppWrite(ctx.root, file, sha256(work), gone ? null : sha256(keep));
  if (staged) await gitOk(ctx.root, ['reset', '--quiet', '--', file], ctx);
}

/** US-0608 FR2.1, FR3: every changed feature doc in the checkout that the record does not hold yet. */
async function recordStep(ctx) {
  const record = await readRecord(ctx.userData, ctx.root);
  const place = await placeOf(ctx, record);
  if (!place.branch) return { recorded: 0 }; // a detached HEAD: nothing is the story's or the target's
  let recorded = 0;
  for (const file of (await changedDocs(ctx.root, ctx)).filter((f) => underDocs(ctx.featuresPath, f))) {
    const work = await readOrNull(ctx.root, file);
    if (work === null) continue; // ponytail: a removed feature doc is not recorded; git shows it as removed
    const entry = place.inPlace
      ? await recordOnTarget(ctx, record, file, work, { by: 'watcher' })
      : await recordOnStory(ctx, record, place, file, work, { by: 'watcher', restore: true });
    if (entry) recorded++;
  }
  if (recorded) scheduleCommit(ctx);
  return { recorded };
}

/** US-0608 FR2.1, FR3: records what the docs watcher saw (and splits it on a story branch). */
export const recordTree = (ctx) => serial(ctx.root, () => recordStep(ctx));

/**
 * US-0608 FR2.2, AC1.2.1: an editor save of a feature doc, recorded before the file is written; null when it is not a
 * feature doc, or the file no longer has `expectHash` (the write is then refused). On a story branch the split follows
 * the write, through the watcher.
 */
export function recordContent(ctx, file, content, { expectHash } = {}) {
  return serial(ctx.root, async () => {
    if (!underDocs(ctx.featuresPath, file) || typeof content !== 'string') return null;
    const disk = await readOrNull(ctx.root, file);
    if (hashOf(disk) !== (expectHash ?? null)) return null;
    const record = await readRecord(ctx.userData, ctx.root);
    const place = await placeOf(ctx, record);
    if (!place.branch) return null;
    const entry = place.inPlace
      ? await recordOnTarget(ctx, record, file, content, { base: hashOf(disk), by: 'editor' })
      : await recordOnStory(ctx, record, place, file, content, { by: 'editor', restore: false });
    if (entry) scheduleCommit(ctx);
    return entry;
  });
}

/**
 * US-0607 FR1.1, US-0606 FR2, US-0608 FR1.3, FR6: records the action and applies it at once, in place on the target,
 * else as a trial in a worktree (the commit waits for the window). An operation that throws (an unknown or released
 * story) leaves no record; a file changed outside the app is named and the action keeps waiting in the record.
 * @param {{root: string, userData: string, featuresPath: string, planningBranch?: string, exec?: Function, windowMs?: number}} ctx
 * @returns {Promise<{ok: true, inPlace: boolean, changed: boolean} | {conflict: string, kept: true}>}
 */
export function planAction(ctx, { kind, storyIds = [], version = null }, hashes = null) {
  return serial(ctx.root, async () => {
    const action = await addAction(ctx.userData, ctx.root, { kind, storyIds, version });
    let res;
    let inPlace;
    try {
      const place = await placeOf(ctx, await readRecord(ctx.userData, ctx.root));
      inPlace = place.inPlace;
      const tags = await listReleaseTags(ctx.root, { exec: ctx.exec });
      const opts = { featuresPath: ctx.featuresPath, tags };
      res = inPlace
        ? await applyAction(ctx.root, action, { ...opts, hashes })
        : await withWorktree(ctx, await planningSpec(ctx, place.target), (wt) => applyAction(wt, action, opts));
    } catch (err) {
      await removeActions(ctx.userData, ctx.root, [action.id]);
      throw err;
    }
    scheduleCommit(ctx);
    // `changed`: the view keeps its lock until the reload with the new hashes, which only a change in place sends (FR1.2).
    return res.conflict ? { conflict: res.conflict, kept: true } : { ok: true, inPlace, changed: res.changed };
  });
}

/**
 * US-0036 FR2.3: an entry whose text the read ref's file already had at an earlier commit is an older copy, nothing newer.
 * ponytail: only the last 20 commits of the file are compared; an older copy than that still becomes a conflict.
 */
async function olderCopy(ctx, ref, entry) {
  if (!ref) return false;
  const commits = lines(await git(ctx.root, ['log', '-n', '20', '--format=%H', ref, '--', entry.file], ctx).catch(() => ''));
  for (const commit of commits) if ((await showAt(ctx, commit, entry.file)) === entry.content) return true;
  return false;
}

/**
 * US-0607 FR1.3, US-0608 FR4, FR5.2, FR6: every waiting change again, where it belongs; once the window has passed since
 * the last change, one commit. A content entry whose file moved on is marked a conflict and left alone, unless it only
 * holds an older copy of the file, which is dropped (US-0036 FR2.3).
 */
async function replayStep(ctx) {
  const record = await readRecord(ctx.userData, ctx.root);
  const live = record.actions.filter((a) => a.state !== 'conflict');
  const pending = live.filter((a) => a.state === 'pending');
  const quiet = pending.every((a) => Date.now() - Date.parse(a.at) >= windowOf(ctx));
  const place = await placeOf(ctx, record);
  if (!place.inPlace && !(quiet && pending.length)) return { reapplied: 0 };
  const tags = await listReleaseTags(ctx.root, { exec: ctx.exec });
  const readRef = await targetRef(ctx, place.target);
  const work = async (cwd) => {
    const { changed, conflicts: clashes } = await replayIn(cwd, ctx, live, tags);
    const entryOf = (id) => live.find((a) => a.id === id);
    const stale = [];
    for (const id of clashes) if (await olderCopy(ctx, readRef, entryOf(id))) stale.push(id);
    const conflicts = clashes.filter((id) => !stale.includes(id));
    if (stale.length) await removeActions(ctx.userData, ctx.root, stale);
    if (conflicts.length) await markConflict(ctx.userData, ctx.root, conflicts);
    const going = live.filter((a) => !clashes.includes(a.id) && (a.state === 'pending' || changed.includes(a)));
    const commit = quiet ? await commitIn(cwd, ctx, subjectOf(going)) : { committed: false };
    if (commit.committed)
      await markCommitted(
        ctx.userData,
        ctx.root,
        going.map((a) => a.id)
      );
    // In a worktree a waiting change is always new there; only a committed one was lost.
    const reapplied = place.inPlace ? changed.length : changed.filter((a) => a.state === 'committed').length;
    return { reapplied, ...(commit.error ? { error: commit.error } : {}) };
  };
  return place.inPlace ? work(ctx.root) : withWorktree(ctx, await planningSpec(ctx, place.target), work);
}

/** US-0607 FR1.3: at app start and when the release list opens. */
export const reapplyLost = (ctx) =>
  serial(ctx.root, async () => {
    await recordStep(ctx);
    return replayStep(ctx);
  });

/**
 * US-0608 FR5.3: "Use mine" (`mine`) takes the file as it is where the entry goes as its new base, so the next replay
 * writes the record's text; "Keep theirs" (`theirs`) drops the entry.
 */
export function resolvePlanning(ctx, id, choice) {
  return serial(ctx.root, async () => {
    const record = await readRecord(ctx.userData, ctx.root);
    const entry = record.actions.find((a) => a.id === id && a.kind === 'content');
    if (!entry || !['mine', 'theirs'].includes(choice)) throw new Error(t('errors.invalidValue', { what: 'choice', value: String(choice) }));
    if (choice === 'theirs') {
      await removeActions(ctx.userData, ctx.root, [id]);
      return { ok: true };
    }
    const place = await placeOf(ctx, record);
    const ref = (await refExists(ctx, `refs/heads/${BRANCH}`)) ? BRANCH : await targetRef(ctx, place.target);
    const now = place.inPlace ? await readOrNull(ctx.root, entry.file) : await showAt(ctx, ref, entry.file);
    await resolveEntry(ctx.userData, ctx.root, id, { baseHash: hashOf(now) });
    return { ok: true, ...(place.inPlace ? await replayStep(ctx) : {}) };
  });
}

/** US-0608 FR7.1: what waits, each with its stories and where it goes; a conflict carries the app's text ("Open both"). */
export async function waitingList(ctx) {
  const record = await readRecord(ctx.userData, ctx.root);
  const target = await targetOf(ctx, record).catch(() => MAIN);
  const entries = record.actions.map((a) => ({
    id: a.id,
    kind: a.kind,
    storyIds: a.storyIds,
    version: a.version ?? null,
    file: a.file ?? null,
    state: a.state,
    ...(a.state === 'conflict' ? { content: a.content } : {})
  }));
  return { target: `origin/${target}`, entries };
}

const aheadOf = async (ctx, ref, base) => !base || Number(await git(ctx.root, ['rev-list', '--count', `${base}..${ref}`], ctx)) > 0;

/** The app's branch, and the target itself when it is checked out here, each when it has commits origin lacks. */
async function sourcesOf(ctx, target) {
  const base = await remoteBase(ctx, target);
  const list = [];
  if ((await refExists(ctx, `refs/heads/${BRANCH}`)) && (await aheadOf(ctx, BRANCH, base))) list.push({ branch: BRANCH });
  if ((await currentBranch(ctx.root, { exec: ctx.exec })) === target && (await aheadOf(ctx, target, base))) list.push({ base: target, detach: true });
  return list;
}

/** US-0607 FR3.2, FR3.5: in a worktree, rebases onto origin and pushes; a conflict is aborted and names the files. */
async function pushFrom(ctx, wt, target) {
  const base = await remoteBase(ctx, target);
  if (base && !(await gitOk(wt, ['rebase', '--quiet', base], ctx))) {
    const files = lines(await git(wt, ['diff', '--name-only', '--diff-filter=U'], ctx).catch(() => ''));
    await gitOk(wt, ['rebase', '--abort'], ctx);
    return { error: { kind: 'conflict', files } };
  }
  const subjects = lines(await git(wt, ['log', '--format=%s', base ? `${base}..HEAD` : 'HEAD'], ctx));
  try {
    await pushRef(wt, 'HEAD', target, { exec: ctx.exec });
  } catch (err) {
    const reason = reasonOf(err);
    if (target === MAIN && /protected branch/i.test(reason)) return { protected: true }; // FR3.3: learned from the refusal
    return { error: { kind: 'push', reason } };
  }
  return { subjects, head: (await git(wt, ['rev-parse', 'HEAD'], ctx)).trim() };
}

async function pushAll(ctx, target) {
  const subjects = [];
  const sources = await sourcesOf(ctx, target);
  for (const source of sources) {
    const res = await withWorktree(ctx, source, (wt) => pushFrom(ctx, wt, target));
    if (res.error || res.protected) return res;
    subjects.push(...res.subjects);
    // ponytail: the checked-out target only fast-forwards; after a rebase it keeps its own copy of the commit until the
    // person pulls with --rebase (git drops it then as already applied).
    if (source.detach && !(await gitOk(ctx.root, ['merge', '--ff-only', '--quiet', res.head], ctx))) {
      console.info(`${target} här är inte i fas med origin efter planeringens push; en pull --rebase rättar det.`);
    }
  }
  return { pushed: sources.length > 0, subjects };
}

/** US-0607 FR3.3: true for a protected `main`, false for an unprotected one, undefined when gh cannot say. */
async function detectProtection(ctx) {
  try {
    await ctx.gh(['api', `repos/{owner}/{repo}/branches/${MAIN}/protection`], { cwd: ctx.root });
    return true;
  } catch (err) {
    return /HTTP 404|not protected/i.test(String(err?.message)) ? false : undefined;
  }
}

/**
 * US-0607 FR3.3: opens the pull request from the docs branch and squash-merges it; without gh, or when gh fails, the
 * release list offers it by hand.
 * ponytail: the docs branch is not deleted after the merge, so a later pull request can show earlier, already merged
 * changes again; delete it after each merge if that confuses anyone.
 */
async function openPull(ctx, target, subjects) {
  if (!ctx.gh) return { prOffer: { branch: target } };
  const title = subjects.length === 1 ? subjects[0] : 'docs: release planning';
  try {
    await ctx
      .gh(['pr', 'create', '--base', MAIN, '--head', target, '--title', title, '--body', subjects.join('\n') || title], { cwd: ctx.root })
      .catch((err) => {
        if (!/already exists/i.test(reasonOf(err))) throw err;
      });
    await ctx.gh(['pr', 'merge', target, '--squash'], { cwd: ctx.root });
    return { merged: true };
  } catch (err) {
    return { prOffer: { branch: target, reason: reasonOf(err) } };
  }
}

/** US-0607 FR1.2, US-0608 FR2.3: the committed entries, once their commits are on the target. */
const dropCommitted = (ctx, record) =>
  removeActions(
    ctx.userData,
    ctx.root,
    record.actions.filter((a) => a.state === 'committed').map((a) => a.id)
  );

async function pushStep(ctx) {
  if (!(await originUrl(ctx.root, { exec: ctx.exec }))) return { noRemote: true }; // FR3.4: the commits stay local
  let record = await readRecord(ctx.userData, ctx.root);
  if (!(await sourcesOf(ctx, await targetOf(ctx, record))).length) {
    await dropCommitted(ctx, record); // nothing is ahead of origin, so every committed change is there
    return {};
  }
  if (!ctx.online()) return { error: { kind: 'offline' } };
  const readRef = await targetRef(ctx, await targetOf(ctx, record));
  const commitOf = async () => (readRef ? (await git(ctx.root, ['rev-parse', '--verify', '--quiet', readRef], ctx).catch(() => '')).trim() : '');
  const before = await commitOf();
  try {
    await git(ctx.root, ['fetch', '--quiet', '--prune', 'origin'], ctx);
  } catch (err) {
    return { error: { kind: 'push', reason: reasonOf(err) } };
  }
  const moved = before !== (await commitOf()) ? { moved: true } : {}; // US-0036 FR2.2: the views reload
  if (record.protectedMain === undefined && ctx.gh) {
    const known = await detectProtection(ctx);
    if (known !== undefined) record = await setProtectedMain(ctx.userData, ctx.root, known);
  }
  let target = await targetOf(ctx, record);
  let out = await pushAll(ctx, target);
  if (out.protected) {
    record = await setProtectedMain(ctx.userData, ctx.root, true);
    target = await targetOf(ctx, record);
    out = await pushAll(ctx, target);
  }
  if (out.error) return { error: out.error, ...moved };
  if (!out.pushed) return moved;
  await dropCommitted(ctx, record);
  await gitOk(ctx.root, ['branch', '-D', BRANCH], ctx); // the next action starts again from origin
  return target === MAIN ? { pushed: true, ...moved } : { pushed: true, ...moved, ...(await openPull(ctx, target, out.subjects)) };
}

/**
 * US-0607 FR1.3, FR2.5, FR3, US-0608: one cycle for one project: records what is new in the checkout, applies lost
 * changes again (and commits after the window), then pushes. Offline, a refused push or a conflict keeps everything and
 * answers the same way each time (FR3.5).
 * @param {{root: string, userData: string, featuresPath: string, planningBranch?: string, exec?: Function, windowMs?: number,
 *   ownStoryIds?: string[], onCommitted?: (res: object) => void,
 *   gh: ((args: string[], opts: {cwd: string}) => Promise<string>) | null, online: () => boolean}} ctx
 * @returns {Promise<{reapplied: number, pending: number, conflicts: number, pushed?: boolean, noRemote?: boolean, merged?: boolean,
 *   prOffer?: {branch: string, reason?: string}, error?: {kind: string, reason?: string, files?: string[]}}>}
 */
export function runCycle(ctx) {
  return serial(ctx.root, async () => {
    await recordStep(ctx);
    const re = await replayStep(ctx);
    const out = re.error ? { error: re.error } : await pushStep(ctx);
    // The record is read again, so `pending` counts what is left.
    const { actions } = await readRecord(ctx.userData, ctx.root);
    return { reapplied: re.reapplied, ...out, pending: actions.length, conflicts: actions.filter((a) => a.state === 'conflict').length };
  });
}

/**
 * US-0607 FR3.1, FR4.1: when to run a project's cycle. `kick` right after an action, only when idle; `tick` (each
 * minute) runs a project that is idle, never ran, or waited the interval; `pushNow` ignores idle and asks `run` to commit
 * at once (`{force: true}`, US-0608 FR7.1). A failing cycle becomes an error result, never a throw. `status` is the last result.
 */
export function createScheduler({ run, idle, intervalMs, now = Date.now }) {
  const last = new Map();
  const go = async (key, opts) => {
    let result;
    try {
      result = await run(key, opts);
    } catch (err) {
      result = { error: { kind: 'git', reason: reasonOf(err) } };
    }
    last.set(key, { at: now(), result });
    return result;
  };
  const due = (key) => idle() || !last.has(key) || now() - last.get(key).at >= intervalMs();
  return {
    status: (key) => last.get(key)?.result ?? null,
    pushNow: (key) => go(key, { force: true }),
    kick: async (key) => (idle() ? go(key) : null),
    tick: (keys) => Promise.all(keys.filter(due).map((k) => go(k)))
  };
}
