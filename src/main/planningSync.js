// Release planning is committed and pushed without disturbing the work (EPIC-06 US-0606 FR2, US-0607 FR1.3, FR3).
// Every action is written to the local record first (planningRecord.js). When the checkout is on the target branch
// (`main`, or the project's docs branch when `main` is protected) the files are written and committed there; on any
// other branch the checkout is never touched: the action runs in a temporary worktree on the app's own branch
// `dash/planning`. A cycle applies lost actions again, commits agent edits to the feature docs on the target, rebases
// the app's commits onto origin and pushes them; on a protected `main` it opens and squash-merges the pull request
// with `gh`. Git and gh run without a shell (NFR3).
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runFixed } from './exec.js';
import { openRoot } from './projectAccess.js';
import { loadFeatures, plansDir } from './features.js';
import { createRelease, deleteRelease, setStoryRelease } from './releases.js';
import { currentBranch, listReleaseTags, originUrl, pushRef, worktreeAdd, worktreeRemove } from './git.js';
import { addAction, markCommitted, readRecord, removeActions, setProtectedMain } from './planningRecord.js';
import { t } from '../shared/i18n.js';

const posix = path.posix;
// ponytail: a fixed branch name and a fixed `main`; make both settings if a project's trunk is named otherwise.
const BRANCH = 'dash/planning';
const MAIN = 'main';
const AGENT_SUBJECT = 'docs: update the feature docs';
const GIT_TIMEOUT_MS = 30000;

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

/** US-0606 FR2.5: the feature-doc paths the app commits, beside the overview: it, the epic folder and the plans folder. */
const docPaths = (featuresPath) => [featuresPath, posix.join(posix.dirname(featuresPath), 'features'), plansDir(featuresPath)];

/** The feature docs' hashes, to tell whether an operation changed anything. */
async function fingerprint(root, featuresPath) {
  const f = await loadFeatures(root, featuresPath);
  return f.available ? [f.overviewHash, ...f.epics.map((e) => e.hash), ...f.plans.map((p) => `${p.file}:${p.hash}`)].join(',') : '';
}

async function freshHashes(root, featuresPath, storyId) {
  const f = await loadFeatures(root, featuresPath);
  const epic = f.available ? f.epics.find((e) => e.parsed?.stories.some((s) => s.id === storyId)) : null;
  return { epicHash: epic?.hash, overviewHash: f.overviewHash };
}

/**
 * US-0607 FR1.3: runs one recorded action's operation in `root` (the checkout or a worktree). An operation that is
 * already applied changes nothing, so it is safe to run again. `hashes` (the checkout's, as the renderer read them)
 * guard the first story against a file changed meanwhile, as before.
 * @returns {Promise<{changed: boolean} | {conflict: string}>}
 */
export async function applyAction(root, action, { featuresPath, tags = [], hashes = null }) {
  const before = await fingerprint(root, featuresPath);
  if (action.kind === 'setRelease') {
    for (const [i, storyId] of action.storyIds.entries()) {
      const given = i === 0 && hashes ? hashes : await freshHashes(root, featuresPath, storyId);
      const res = await setStoryRelease(root, featuresPath, { storyId, version: action.version, ...given });
      if (res.conflict) return { conflict: res.conflict };
    }
  } else {
    const plan = (await loadFeatures(root, featuresPath)).plans?.find((p) => p.version === action.version);
    if (action.kind === 'createRelease' && !plan) await createRelease(root, featuresPath, action.version, tags);
    if (action.kind === 'deleteRelease' && plan) {
      const res = await deleteRelease(root, featuresPath, { version: action.version, hash: hashes?.hash ?? plan.hash }, tags);
      if (res.conflict) return { conflict: res.conflict };
    }
  }
  return { changed: (await fingerprint(root, featuresPath)) !== before };
}

/** US-0606 FR2.3: `docs: plan US-XXXX[, …] for vX.Y.Z`, one part per release, joined by "; ". */
export function subjectOf(actions) {
  if (!actions.length) return AGENT_SUBJECT;
  const planned = new Map();
  const parts = [];
  for (const a of actions) {
    if (a.kind === 'setRelease' && a.version) {
      if (!planned.has(a.version)) parts.push(a.version);
      planned.set(a.version, [...(planned.get(a.version) ?? []), ...a.storyIds]);
    } else if (a.kind === 'setRelease') parts.push(`take ${a.storyIds.join(', ')} out of their release`);
    else parts.push(a.kind === 'createRelease' ? `plan ${a.version}` : `remove the plan for ${a.version}`);
  }
  return `docs: ${parts.map((p) => (planned.has(p) ? `plan ${planned.get(p).join(', ')} for ${p}` : p)).join('; ')}`;
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

/**
 * US-0606 FR2.2, FR2.5, FR4.2: commits every changed feature-doc file in `cwd`, and nothing else. A refused commit
 * (a hook) gives the reason and the files, and unstages them again, so the change stays as it was in the working tree.
 */
async function commitIn(cwd, ctx, subject) {
  const files = porcelainFiles(await git(cwd, ['status', '--porcelain', '-z', '--untracked-files=all', '--', ...docPaths(ctx.featuresPath)], ctx));
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

/** US-0606 FR2.1, US-0607 FR3.3: `main`, or the docs branch (checked against git's ref rules, NFR3) once `main` is protected. */
async function targetOf(ctx, record) {
  if (!record.protectedMain) return MAIN;
  const branch = ctx.planningBranch || 'docs/planning';
  if (branch === MAIN || branch.startsWith('-') || !(await gitOk(ctx.root, ['check-ref-format', '--branch', branch], ctx))) {
    throw new Error(t('errors.invalidValue', { what: 'branch', value: branch }));
  }
  return branch;
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

/** The app's branch as it is, or new at origin's target (else the local target or main, without a remote). */
async function planningSpec(ctx, target) {
  if (await refExists(ctx, `refs/heads/${BRANCH}`)) return { branch: BRANCH };
  const base =
    (await remoteBase(ctx, target)) ??
    (await firstRef(ctx, [
      [`refs/heads/${target}`, target],
      [`refs/heads/${MAIN}`, MAIN]
    ]));
  if (!base) throw new Error(t('errors.invalidValue', { what: 'ref', value: MAIN }));
  return { branch: BRANCH, base };
}

/**
 * US-0606 FR2.1–FR2.5: applies `actions` where they belong and commits once: in place when the checkout is on the
 * target (with any other changed feature-doc file), else in the worktree. `skipFailing` (a re-apply) logs an action
 * whose operation throws and goes on; otherwise the error is thrown.
 */
async function commitActions(ctx, actions, { hashes = null, skipFailing = false } = {}) {
  const target = await targetOf(ctx, await readRecord(ctx.userData, ctx.root));
  const tags = await listReleaseTags(ctx.root, { exec: ctx.exec });
  const inPlace = (await currentBranch(ctx.root, { exec: ctx.exec })) === target;
  const work = async (cwd) => {
    const changed = [];
    for (const action of actions) {
      let res;
      try {
        res = await applyAction(cwd, action, { featuresPath: ctx.featuresPath, tags, hashes: inPlace ? hashes : null });
      } catch (err) {
        if (!skipFailing) throw err;
        console.warn(`Planeringsåtgärden ${action.kind} ${action.version} kunde inte göras igen:`, err.message);
        continue;
      }
      if (res.conflict) return { conflict: res.conflict };
      if (res.changed) changed.push(action);
    }
    return { changed, ...(await commitIn(cwd, ctx, subjectOf(changed))) };
  };
  if (inPlace) return { inPlace, ...(await work(ctx.root)) };
  if (!actions.length) return { inPlace, changed: [], committed: false };
  return { inPlace, ...(await withWorktree(ctx, await planningSpec(ctx, target), work)) };
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

/**
 * US-0607 FR1.1, US-0606 FR2: records the action, then applies and commits it. An operation that throws (an unknown
 * or released story) or a file changed since it was read leaves no record; a refused commit keeps it (FR4.2).
 * @param {{root: string, userData: string, featuresPath: string, planningBranch?: string, exec?: Function}} ctx
 * @returns {Promise<{ok: boolean, inPlace: boolean, error?: object} | {conflict: string}>}
 */
export function planAction(ctx, { kind, storyIds = [], version = null }, hashes = null) {
  return serial(ctx.root, async () => {
    const action = await addAction(ctx.userData, ctx.root, { kind, storyIds, version });
    let res;
    try {
      res = await commitActions(ctx, [action], { hashes });
    } catch (err) {
      await removeActions(ctx.userData, ctx.root, [action.id]);
      throw err;
    }
    if (res.conflict) {
      await removeActions(ctx.userData, ctx.root, [action.id]);
      return { conflict: res.conflict };
    }
    if (!res.error) await markCommitted(ctx.userData, ctx.root, [action.id]);
    return { ok: !res.error, inPlace: res.inPlace, ...(res.error ? { error: res.error } : {}) };
  });
}

/** US-0607 FR1.3: every recorded action again; one whose change was lost is applied and committed, and counted. */
async function reapplyStep(ctx) {
  const { actions } = await readRecord(ctx.userData, ctx.root);
  const res = await commitActions(ctx, actions, { skipFailing: true });
  if (res.conflict) return { reapplied: 0, error: { kind: 'conflict', files: [res.conflict] } };
  if (!res.error)
    await markCommitted(
      ctx.userData,
      ctx.root,
      actions.map((a) => a.id)
    );
  return { reapplied: res.changed.length, ...(res.error ? { error: res.error } : {}) };
}

/** US-0607 FR1.3: at app start and when the release list opens. */
export const reapplyLost = (ctx) => serial(ctx.root, () => reapplyStep(ctx));

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

async function pushStep(ctx) {
  if (!(await originUrl(ctx.root, { exec: ctx.exec }))) return { noRemote: true }; // FR3.4: the commits stay local
  let record = await readRecord(ctx.userData, ctx.root);
  if (!(await sourcesOf(ctx, await targetOf(ctx, record))).length) return {};
  if (!ctx.online()) return { error: { kind: 'offline' } };
  try {
    await git(ctx.root, ['fetch', '--quiet', '--prune', 'origin'], ctx);
  } catch (err) {
    return { error: { kind: 'push', reason: reasonOf(err) } };
  }
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
  if (out.error) return { error: out.error };
  if (!out.pushed) return {};
  // FR1.2: the actions committed before this push are on the remote target now.
  await removeActions(
    ctx.userData,
    ctx.root,
    record.actions.filter((a) => a.state === 'committed').map((a) => a.id)
  );
  await gitOk(ctx.root, ['branch', '-D', BRANCH], ctx); // the next action starts again from origin
  return target === MAIN ? { pushed: true } : { pushed: true, ...(await openPull(ctx, target, out.subjects)) };
}

/**
 * US-0607 FR1.3, FR2.5, FR3: one cycle for one project: applies lost actions again, commits agent edits on the target,
 * then pushes. Offline, a refused push or a conflict keeps everything and answers the same way each time (FR3.5).
 * @param {{root: string, userData: string, featuresPath: string, planningBranch?: string, exec?: Function,
 *   gh: ((args: string[], opts: {cwd: string}) => Promise<string>) | null, online: () => boolean}} ctx
 * @returns {Promise<{reapplied: number, pending: number, pushed?: boolean, noRemote?: boolean, merged?: boolean,
 *   prOffer?: {branch: string, reason?: string}, error?: {kind: string, reason?: string, files?: string[]}}>}
 */
export function runCycle(ctx) {
  return serial(ctx.root, async () => {
    const re = await reapplyStep(ctx);
    const out = re.error ? { error: re.error } : await pushStep(ctx);
    // The record is read again, so `pending` counts what is left.
    return { reapplied: re.reapplied, ...out, pending: (await readRecord(ctx.userData, ctx.root)).actions.length };
  });
}

/**
 * US-0607 FR3.1, FR4.1: when to run a project's cycle. `kick` right after an action, only when idle; `tick` (each
 * minute) runs a project that is idle, never ran, or waited the interval; `pushNow` ignores idle. A failing cycle
 * becomes an error result, never a throw. `status` is the last result.
 */
export function createScheduler({ run, idle, intervalMs, now = Date.now }) {
  const last = new Map();
  const go = async (key) => {
    let result;
    try {
      result = await run(key);
    } catch (err) {
      result = { error: { kind: 'git', reason: reasonOf(err) } };
    }
    last.set(key, { at: now(), result });
    return result;
  };
  const due = (key) => idle() || !last.has(key) || now() - last.get(key).at >= intervalMs();
  return {
    status: (key) => last.get(key)?.result ?? null,
    pushNow: go,
    kick: async (key) => (idle() ? go(key) : null),
    tick: (keys) => Promise.all(keys.filter(due).map(go))
  };
}
