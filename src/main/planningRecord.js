// The local record of release planning actions (EPIC-06 US-0607 FR1.1, FR1.2): one JSON file per project in
// `<userData>/planning/`, outside the working tree, so a discarded checkout cannot lose an action. An action holds the
// operation (kind, stories, version), not file text, so running it again is harmless. US-0608 FR2, FR5: every other
// feature-doc change (an editor save, an agent's write) is a `content` entry: the file's new text and the hash it was
// based on. An entry is `pending`, `committed` or, when its file or target moved on, `conflict`. US-0609 FR3: a changed
// app file (`.thadeus/`, a harness file) is a `thadeus` entry: only its path, committed by thadeusSync.js.
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAtomic } from './fileWrite.js';

export const KINDS = ['setRelease', 'createRelease', 'deleteRelease'];
const VERSION = /^v\d+\.\d+\.\d+$/;
const STORY = /^US-\d{4}$/;
const HASH = /^[0-9a-f]{64}$/;
const STATES = ['pending', 'committed', 'conflict'];
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** US-0607 FR1.1: the record file of one project root. */
export const recordFile = (userData, root) => path.join(userData, 'planning', `${createHash('sha1').update(String(root)).digest('hex')}.json`);

const validIds = (ids) => Array.isArray(ids) && ids.every((s) => typeof s === 'string' && STORY.test(s));
const validBase = (h) => h === null || (typeof h === 'string' && HASH.test(h));
const relPath = (f) =>
  typeof f === 'string' && !f.startsWith('/') && !f.includes('\\') && !/^[a-zA-Z]:/.test(f) && !f.split('/').some((s) => s === '..' || s === '');
/** US-0608 FR2.2: a root-relative Markdown path without `..`; planningSync also checks it is under the docs paths. */
export const validDocFile = (f) => relPath(f) && f.endsWith('.md');

/**
 * US-0609 FR3.2: the harness files the app commits, one row each; `splice`: only the app's spans of it are committed
 * (ADR-003). A later harness joins by one row. Lives here, not in thadeusSync.js (which re-exports it), so the record
 * can check its paths without a circular import.
 */
export const HARNESS_FILES = [
  { harness: 'claude', path: '.claude/settings.json', splice: true },
  { harness: 'opencode', path: '.opencode/plugins/thadeus-dialog.js', splice: false }
];
// US-0047: the last one is writeAtomic's temporary file, `.<name>.<uuid>.tmp` (fileWrite.js).
const JUNK = /^(\.DS_Store|\.#.*|.*\.swp|.*~|\..+\.[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.tmp)$/;
/** US-0609 FR3.1, US-0047: a file under `.thadeus/` the app syncs; editor swap files, `.DS_Store` and temporary files are not. */
export const isThadeusPath = (f) => relPath(f) && f.startsWith('.thadeus/') && !JUNK.test(path.posix.basename(f));
const validThadeus = (a) => (isThadeusPath(a.file) || HARNESS_FILES.some((h) => h.path === a.file)) && typeof a.at === 'string';

const validPlanning = (a) =>
  validIds(a.storyIds) &&
  (a.kind === 'content'
    ? validDocFile(a.file) &&
      validBase(a.baseHash) &&
      typeof a.content === 'string' &&
      (a.earlier === undefined || (Array.isArray(a.earlier) && a.earlier.every(validBase))) &&
      (a.from === undefined || typeof a.from === 'string')
    : KINDS.includes(a.kind) && (a.version === null || (typeof a.version === 'string' && VERSION.test(a.version))));

const validAction = (a) => a && typeof a.id === 'string' && STATES.includes(a.state) && (a.kind === 'thadeus' ? validThadeus(a) : validPlanning(a));

/** US-0607 FR1.1: the project's record; a missing or unreadable file is an empty one, and invalid actions are dropped. */
export async function readRecord(userData, root) {
  let raw;
  try {
    raw = JSON.parse(await fs.readFile(recordFile(userData, root), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('Planeringsposten kunde inte läsas, börjar tom:', err.message);
    return { actions: [] };
  }
  const actions = Array.isArray(raw?.actions) ? raw.actions.filter(validAction) : [];
  return { ...(typeof raw?.protectedMain === 'boolean' ? { protectedMain: raw.protectedMain } : {}), actions };
}

// ponytail: one write queue for every project in this process; per-project queues if planning ever gets busy.
let queue = Promise.resolve();

function update(userData, root, change) {
  const run = queue.then(async () => {
    const next = change(await readRecord(userData, root));
    const file = recordFile(userData, root);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await writeAtomic(file, Buffer.from(JSON.stringify(next, null, 2)));
    return next;
  });
  queue = run.catch(() => {}); // a failed write reaches its caller and does not block the next one
  return run;
}

/** US-0607 FR1.1: records a new pending action before any file changes; returns it. An invalid action throws. */
export async function addAction(userData, root, { kind, storyIds = [], version = null }) {
  const action = { id: randomUUID(), kind, storyIds: [...storyIds], version, at: new Date().toISOString(), state: 'pending' };
  if (!validAction(action)) throw new Error(`Ogiltig planeringsåtgärd: ${String(kind)} ${String(version)}`);
  await update(userData, root, (r) => ({ ...r, actions: [...r.actions, action] }));
  return action;
}

/**
 * US-0608 FR2.2, FR5.1: records a file's new content and the hash it was based on (null: the file did not exist), before
 * the file is written. A later change of the same file replaces its entry; the earlier bases stay acceptable, so a replay
 * onto any of them still writes the newest text. US-0038 FR1.3: its stories are the newest change's alone. US-0038 FR1.4:
 * `from` names the app commit an entry was set aside from. Returns the entry; an invalid one throws.
 */
export async function addContent(userData, root, { file, baseHash, content, storyIds = [], by = 'watcher', state = 'pending', earlier: also = [], from }) {
  const entry = { id: randomUUID(), kind: 'content', file, baseHash, content, storyIds: [...storyIds], by, at: new Date().toISOString(), state };
  if (also.length) entry.earlier = also.filter((h) => h !== baseHash);
  if (from !== undefined) entry.from = from;
  if (!validAction(entry)) throw new Error(`Ogiltig planeringsändring: ${String(file)}`);
  const next = await update(userData, root, (r) => {
    const i = r.actions.findIndex((a) => a.kind === 'content' && a.file === file);
    if (i === -1) return { ...r, actions: [...r.actions, entry] };
    const old = r.actions[i];
    // The old entry's text is a base too: its commit may already be on the app's branch.
    const earlier = [...new Set([...also, old.baseHash, ...(old.earlier ?? []), sha256(old.content)])].filter((h) => h !== baseHash);
    const merged = { ...entry, earlier };
    return { ...r, actions: r.actions.map((a, j) => (j === i ? merged : a)) };
  });
  return next.actions.find((a) => a.id === entry.id);
}

/**
 * US-0609 FR3.1, FR3.2: a changed app file waits to be committed: only its path (the text is read from disk at commit
 * time). One entry per file; a newer change replaces it with a new id, so a cycle that took the old one leaves it.
 */
export async function addThadeus(userData, root, { file, harness }) {
  const entry = { id: randomUUID(), kind: 'thadeus', file, ...(harness ? { harness } : {}), at: new Date().toISOString(), state: 'pending' };
  if (!validAction(entry)) throw new Error(`Ogiltig .thadeus-ändring: ${String(file)}`);
  await update(userData, root, (r) => ({ ...r, actions: [...r.actions.filter((a) => !(a.kind === 'thadeus' && a.file === file)), entry] }));
  return entry;
}

/** US-0608 FR5.2: entries whose file or target moved on; the file keeps the target's text, the record keeps the app's. */
export const markConflict = (userData, root, ids) =>
  update(userData, root, (r) => ({ ...r, actions: r.actions.map((a) => (ids.includes(a.id) ? { ...a, state: 'conflict' } : a)) }));

/** US-0608 FR5.3: "Use mine": the entry waits again with `patch` (a new base) merged in. */
export const resolveEntry = (userData, root, id, patch) =>
  update(userData, root, (r) => ({ ...r, actions: r.actions.map((a) => (a.id === id ? { ...a, ...patch, state: 'pending' } : a)) }));

/** US-0607 FR1.2: actions leave the record only once their change is on the remote target. */
export const removeActions = (userData, root, ids) => update(userData, root, (r) => ({ ...r, actions: r.actions.filter((a) => !ids.includes(a.id)) }));

/** US-0606 FR2.1: actions whose change is in a local commit. US-0055 FR1: a commit drops the reason it waited for. */
export const markCommitted = (userData, root, ids) =>
  update(userData, root, (r) => ({ ...r, actions: r.actions.map((a) => (ids.includes(a.id) ? { ...a, state: 'committed', reason: undefined } : a)) })); // undefined is not written

/** US-0055 FR1: changes that could not be done again wait, each with its reason (`reasons`: id → text). */
export const markWaiting = (userData, root, ids, reasons) =>
  update(userData, root, (r) => ({ ...r, actions: r.actions.map((a) => (ids.includes(a.id) ? { ...a, state: 'pending', reason: reasons[a.id] } : a)) }));

/** US-0607 FR3.3: whether the project's `main` is protected, once known. */
export const setProtectedMain = (userData, root, value) => update(userData, root, (r) => ({ ...r, protectedMain: value }));
