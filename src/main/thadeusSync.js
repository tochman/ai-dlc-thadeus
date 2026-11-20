// The app's own files are kept in sync with `main` (EPIC-06 US-0609 FR3, ADR-002, ADR-003): every file the app writes
// under `.thadeus/`, and the harness hook files the installer writes, are recorded as `thadeus` entries (paths only, in
// planningRecord.js). A cycle takes what waits, builds one `chore: sync .thadeus` commit in a temporary worktree on the
// app's branch `dash/thadeus`, new at origin's target, and pushes it through planningSync's push path (`main`, or the
// docs branch when `main` is protected). The story's checkout, index and branch are never touched (FR3.4). Token logs
// are merged with origin's copy (FR3.6); `.claude/settings.json` is committed as origin's copy with only the app's spans
// changed (ADR-003). Git runs without a shell, with fixed arguments and a timeout (NFR4, NFR5).
import chokidar from 'chokidar';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runFixed } from './exec.js';
import { writeAtomic } from './fileWrite.js';
import { originUrl } from './git.js';
import { readText, resolveInRoot } from './projectAccess.js';
import { splice } from './agentHooks.js';
import { MAX_READINGS, TOKENS_DIR } from './tokenReadings.js';
import { HARNESS_FILES, isThadeusPath, readRecord, removeActions, setProtectedMain } from './planningRecord.js';
import { detectProtection, openPull, pushFrom, remoteBase, serial, targetOf, withWorktree } from './planningSync.js';

export { HARNESS_FILES, isThadeusPath };

const posix = path.posix;
const BRANCH = 'dash/thadeus';
const SUBJECT = 'chore: sync .thadeus';
const MAIN = 'main';
const GIT_TIMEOUT_MS = 30000;
const DEBOUNCE_MS = 300;

const git = (cwd, args, ctx) => runFixed('git', args, { cwd, exec: ctx.exec, timeout: GIT_TIMEOUT_MS });
const gitOk = (cwd, args, ctx) =>
  git(cwd, args, ctx).then(
    () => true,
    () => false // a ref that does not exist, or a step that may fail
  );
/** git's own words: execFile's message is "Command failed: <command>" and then stderr. */
const reasonOf = (err) => {
  const message = String(err?.message ?? err);
  return message.split('\n').slice(1).join('\n').trim() || message;
};

async function readOrNull(root, rel) {
  try {
    return await readText(root, rel);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}
const showAt = (ctx, ref, file) => git(ctx.root, ['show', `${ref}:./${file}`], ctx).catch(() => null);
const rowOf = (file) => HARNESS_FILES.find((h) => h.path === file);
const isTokenLog = (file) => file.startsWith(`${TOKENS_DIR}/`) && file.endsWith('.json');

/** A checked root-relative path written atomically, its folder made when missing; a symlink out of the root is refused. */
async function writeIn(root, rel, text) {
  await fs.mkdir(path.join(root, posix.dirname(rel)), { recursive: true }); // rel is checked by the record: no `..`
  await writeAtomic(path.join(await resolveInRoot(root, posix.dirname(rel)), posix.basename(rel)), Buffer.from(text, 'utf8'));
}

/**
 * US-0609 FR3.6: both copies of a token log as one: readings united by `at` (this machine's wins a tie), oldest first,
 * the newest MAX_READINGS kept. null when either copy is not a list of readings.
 */
export function mergeReadings(mine, theirs) {
  const parse = (text) => {
    try {
      const v = JSON.parse(text);
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };
  const a = parse(mine);
  const b = theirs === null ? [] : parse(theirs);
  if (!a || !b) return null;
  const byAt = new Map([...b, ...a].filter((r) => Number.isFinite(r?.at)).map((r) => [r.at, r]));
  return JSON.stringify([...byAt.values()].sort((x, y) => x.at - y.at).slice(-MAX_READINGS));
}

// US-0609 FR3.6: per file, the text the app pushed last, so origin holding it is no conflict.
// ponytail: in memory only; after a restart a file origin got from this app (and the checkout's HEAD lacks) reads as a
// conflict once. Keep it in the record if that ever bites.
const pushed = new Map();
const pushedOf = (ctx, file) => pushed.get(`${ctx.root}\0${file}`);

/**
 * One waiting file into the worktree `wt`, which is at origin's target. Returns `{conflict}` when origin moved on from
 * the copy the app's file came from, `{left}` when the working tree keeps other edits than the app's (ADR-003).
 */
async function copyIn(ctx, wt, file) {
  const disk = await readOrNull(ctx.root, file);
  const theirs = await readOrNull(wt, file);
  const row = rowOf(file);
  if (disk === null) {
    if (theirs !== null && !row) await git(wt, ['rm', '--quiet', '--', file], ctx); // ponytail: a harness file removed by hand stays at origin
    return {};
  }
  if (row?.splice) {
    const out = splice(theirs === null ? null : Buffer.from(theirs, 'utf8'), 'update');
    if (out.reason) return { conflict: true };
    const next = out.change === 'none' ? theirs : out.bytes.toString('utf8');
    if (out.change !== 'none') await writeIn(wt, file, next);
    return next === disk ? {} : { left: true };
  }
  if (isTokenLog(file)) {
    const merged = mergeReadings(disk, theirs);
    if (merged === null) return { conflict: true };
    await writeIn(wt, file, merged);
    return {};
  }
  if (theirs !== disk && !row) {
    const bases = [await showAt(ctx, 'HEAD', file), pushedOf(ctx, file) ?? null];
    if (!bases.includes(theirs)) return { conflict: true };
  }
  await writeIn(wt, file, disk); // the opencode plugin is the app's own file, committed whole
  return {};
}

/** Steps 2–4 in the worktree: copy, commit, rebase and push; returns the outcome and the texts that went out. */
async function commitAndPush(ctx, wt, files, record) {
  const conflicts = [];
  const left = [];
  for (const file of files) {
    const res = await copyIn(ctx, wt, file);
    if (res.conflict) conflicts.push(file);
    if (res.left) left.push(file);
  }
  if (conflicts.length) return { error: { kind: 'conflict', files: conflicts } }; // FR3.6: nothing is pushed
  await git(wt, ['add', '-A', '--', ...files], ctx);
  if (await gitOk(wt, ['diff', '--cached', '--quiet'], ctx)) return { empty: true, left };
  try {
    await git(wt, ['commit', '--quiet', '-m', SUBJECT], ctx);
  } catch (err) {
    return { error: { kind: 'commit', reason: reasonOf(err), files } };
  }
  let target = await targetOf(ctx, record);
  // ponytail: origin moving between the fetch and the push makes the rebase meet a token log as a conflict; the record
  // keeps it and the next cycle merges again from a fresh fetch.
  let out = await pushFrom(ctx, wt, target);
  if (out.protected) {
    target = await targetOf(ctx, await setProtectedMain(ctx.userData, ctx.root, true));
    out = await pushFrom(ctx, wt, target);
  }
  if (out.error) return { error: out.error };
  const texts = await Promise.all(files.map(async (f) => [f, await readOrNull(wt, f)]));
  return { pushed: true, target, subjects: out.subjects, left, texts };
}

async function cycle(ctx) {
  let record = await readRecord(ctx.userData, ctx.root);
  const entries = record.actions.filter((a) => a.kind === 'thadeus');
  if (!entries.length) return { pending: 0 };
  if (!(await originUrl(ctx.root, { exec: ctx.exec }))) return { noRemote: true };
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
  const base = await remoteBase(ctx, await targetOf(ctx, record));
  if (!base) return { error: { kind: 'push', reason: `origin/${MAIN}` } };
  const files = [...new Set(entries.map((e) => e.file))];
  await gitOk(ctx.root, ['branch', '-D', BRANCH], ctx); // left over from a crash
  let out;
  try {
    out = await withWorktree(ctx, { branch: BRANCH, base }, (wt) => commitAndPush(ctx, wt, files, record));
  } finally {
    await gitOk(ctx.root, ['branch', '-D', BRANCH], ctx); // FR3.1: the next cycle starts again from origin
  }
  if (out.error) return { error: out.error };
  await removeActions(
    ctx.userData,
    ctx.root,
    entries.map((e) => e.id)
  ); // a change made meanwhile has a new id and waits
  for (const [file, text] of out.texts ?? []) pushed.set(`${ctx.root}\0${file}`, text);
  const pr = out.pushed && out.target !== MAIN ? await openPull(ctx, out.target, out.subjects) : {};
  return { ...(out.pushed ? { pushed: true } : {}), ...(out.left.length ? { left: out.left } : {}), ...pr };
}

/**
 * US-0609 FR3.1–FR3.6: one cycle for one project, only when `thadeus` entries wait (else nothing runs, not even a
 * fetch). Runs on planningSync's per-root chain, as it shares the worktree folder. A conflict, a refused push or
 * offline keeps every entry.
 * @param {{root: string, userData: string, planningBranch?: string, exec?: Function,
 *   gh: ((args: string[], opts: {cwd: string}) => Promise<string>) | null, online: () => boolean}} ctx
 * @returns {Promise<{pending: number, pushed?: boolean, left?: string[], noRemote?: boolean, merged?: boolean,
 *   prOffer?: {branch: string, reason?: string}, error?: {kind: string, reason?: string, files?: string[]}}>}
 */
export function syncCycle(ctx) {
  return serial(ctx.root, async () => {
    const out = await cycle(ctx);
    const { actions } = await readRecord(ctx.userData, ctx.root);
    return { ...out, pending: actions.filter((a) => a.kind === 'thadeus').length };
  });
}

/**
 * US-0609 FR3.1, FR3.2: follows `.thadeus/` and the harness files; `onChange([{file, harness?}])` gets the changed
 * app files, 300 ms after the last change (as watcher.js).
 */
export function watchThadeus(root, onChange, { onError = console.error, debounceMs = DEBOUNCE_MS } = {}) {
  const base = path.resolve(root);
  const relOf = (p) => path.relative(base, path.resolve(p)).split(path.sep).join('/');
  const ours = (rel) => isThadeusPath(rel) || Boolean(rowOf(rel));
  const keep = (rel) =>
    rel === '' || rel === '.thadeus' || rel.startsWith('.thadeus/') || HARNESS_FILES.some((h) => h.path === rel || h.path.startsWith(`${rel}/`));
  const seen = new Set();
  let timer = null;
  const watcher = chokidar.watch(base, { ignoreInitial: true, ignored: (p) => !keep(relOf(p)) });
  watcher.on('all', (_event, p) => {
    const rel = relOf(p);
    if (!ours(rel)) return;
    seen.add(rel);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const files = [...seen].map((file) => ({ file, ...(rowOf(file) ? { harness: rowOf(file).harness } : {}) }));
      seen.clear();
      onChange(files);
    }, debounceMs);
  });
  watcher.on('error', onError);
  return {
    ready: new Promise((resolve) => watcher.once('ready', resolve)),
    close: async () => {
      clearTimeout(timer);
      await watcher.close();
    }
  };
}
