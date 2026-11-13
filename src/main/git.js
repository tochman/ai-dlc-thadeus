// Read-only git for "Uppdatera från GitHub" (US-0502). Only fetch, rev-parse, rev-list, diff, status
// and show run here, with fixed arguments and no shell (FR3.1, NFR1). Anything that changes the
// working tree is typed into the visible shell tab by the renderer instead.
import { runFixed } from './exec.js';
import { readJsonSafe } from './projectAccess.js';

const FETCH_TIMEOUT_MS = 30000;
const FALLBACK_REF = 'origin/main';
const AIDLC_PREFIX = 'aidlc/';

/** An argument built from a value (ref, path, space) must not be read as an option. */
function safeArg(value, what) {
  if (typeof value !== 'string' || value === '' || value.startsWith('-') || /[\0\n\r]/.test(value)) {
    throw new Error(`Ogiltigt värde för ${what}: ${value}`);
  }
  return value;
}

const git = (root, args, exec, timeout) => runFixed('git', args, { cwd: root, timeout, exec });

async function gitOrNull(root, args, exec) {
  try {
    return (await git(root, args, exec)).trim();
  } catch {
    return null; // e.g. no upstream configured, or the ref does not exist
  }
}

export function parseRevCount(stdout) {
  const n = Number.parseInt(String(stdout).trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

/** `git status --porcelain` lines, split into aidlc/ and the rest. A rename counts by its new path. */
export function splitPorcelain(stdout) {
  const files = String(stdout)
    .split('\n')
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
  return splitPaths(files);
}

/** { aidlc: paths under aidlc/, other: the rest } */
function splitPaths(files) {
  const underAidlc = files.filter((f) => f.startsWith(AIDLC_PREFIX));
  return { aidlc: underAidlc, other: files.filter((f) => !f.startsWith(AIDLC_PREFIX)) };
}

const lines = (stdout) => String(stdout).split('\n').map((l) => l.trim()).filter(Boolean);

/** Remote intents.json entries whose dirName is not in the local index. */
export function diffIntents(local, remote) {
  const known = new Set((Array.isArray(local) ? local : []).map((e) => e?.dirName));
  return (Array.isArray(remote) ? remote : []).filter((e) => e && typeof e.dirName === 'string' && !known.has(e.dirName));
}

export async function isGitRepo(root, { exec } = {}) {
  return (await gitOrNull(root, ['rev-parse', '--is-inside-work-tree'], exec)) === 'true';
}

/** The branch's upstream, else origin/main when it exists, else null. */
async function compareRef(root, exec) {
  const upstream = await gitOrNull(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], exec);
  if (upstream) return { ref: upstream, tracking: true };
  const main = await gitOrNull(root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${FALLBACK_REF}`], exec);
  return { ref: main ? FALLBACK_REF : null, tracking: false };
}

async function assertCompareRef(root, ref, exec) {
  safeArg(ref, 'ref');
  if ((await compareRef(root, exec)).ref !== ref) throw new Error(`Bara upstream eller ${FALLBACK_REF} kan läsas: ${ref}`);
}

/**
 * Local status before a fetch (FR3.5). `upstream` is the branch's upstream or the origin/main fallback;
 * `tracking` says which. dirty* are counts of uncommitted paths.
 */
export async function getGitStatus(root, { exec } = {}) {
  if (!(await isGitRepo(root, { exec }))) return { isRepo: false };
  const branch = await gitOrNull(root, ['rev-parse', '--abbrev-ref', 'HEAD'], exec);
  const { ref, tracking } = await compareRef(root, exec);
  let ahead = 0;
  let behind = 0;
  if (ref) {
    const [a, b] = (await git(root, ['rev-list', '--left-right', '--count', `HEAD...${ref}`], exec)).trim().split(/\s+/);
    ahead = parseRevCount(a);
    behind = parseRevCount(b);
  }
  // ponytail: porcelain paths are repo-root relative; a project root below the repo root counts everything as "other".
  const dirty = splitPorcelain(await git(root, ['status', '--porcelain'], exec));
  return { isRepo: true, branch, upstream: ref, tracking, ahead, behind, dirtyAidlc: dirty.aidlc.length, dirtyOther: dirty.other.length };
}

export async function fetchRemote(root, { exec } = {}) {
  await git(root, ['fetch', '--quiet'], exec, FETCH_TIMEOUT_MS);
}

/** Sums added lines in audit shards from `git diff --numstat` output ("added\tremoved\tpath"). */
function countAuditLines(stdout) {
  return lines(stdout)
    .map((l) => l.split('\t'))
    .filter(([, , file]) => file && /\/audit\/[^/]+\.md$/.test(file))
    .reduce((sum, [added]) => sum + parseRevCount(added), 0);
}

/** What is on `ref` and not here, under aidlc/ and elsewhere (FR3.3, FR3.4). */
export async function getRemoteChanges(root, ref, { space = 'default', exec } = {}) {
  await assertCompareRef(root, ref, exec);
  safeArg(space, 'space');
  if (space.includes('/') || space.includes('..')) throw new Error(`Ogiltig space: ${space}`);
  const range = `HEAD...${ref}`;
  const commits = parseRevCount(await git(root, ['rev-list', '--count', `HEAD..${ref}`, '--', AIDLC_PREFIX], exec));
  const files = splitPaths(lines(await git(root, ['diff', '--name-only', '--relative', range], exec)));
  const auditLines = countAuditLines(await git(root, ['diff', '--numstat', '--relative', range, '--', AIDLC_PREFIX], exec));

  const indexPath = `aidlc/spaces/${space}/intents/intents.json`;
  let newIntents = [];
  const remoteIndex = await gitOrNull(root, ['show', `${ref}:./${indexPath}`], exec);
  if (remoteIndex) {
    try {
      const local = await readJsonSafe(root, indexPath);
      newIntents = diffIntents(local.ok ? local.value : [], JSON.parse(remoteIndex));
    } catch (err) {
      console.warn(`Fjärrens ${indexPath} kunde inte tolkas:`, err.message);
    }
  }
  return { ref, aidlcCommits: commits, aidlcFiles: files.aidlc, otherFiles: files.other, auditLines, newIntents };
}

/** A file under aidlc/ as it is on `ref`, read from git objects without touching the working tree (FR3.4). */
export async function showRemoteFile(root, ref, rel, { exec } = {}) {
  safeArg(rel, 'sökväg');
  if (!rel.startsWith(AIDLC_PREFIX) || rel.split('/').includes('..')) throw new Error(`Bara filer under aidlc/ kan visas: ${rel}`);
  await assertCompareRef(root, ref, exec);
  return git(root, ['show', `${ref}:./${rel}`], exec);
}

/** Files with unresolved conflicts after a pull, rebase or merge (FR3.8). */
export async function listConflicts(root, { exec } = {}) {
  return lines(await git(root, ['diff', '--name-only', '--relative', '--diff-filter=U'], exec));
}
