// The local record of release planning actions (EPIC-06 US-0607 FR1.1, FR1.2): one JSON file per project in
// `<userData>/planning/`, outside the working tree, so a discarded checkout cannot lose an action. An action holds the
// operation (kind, stories, version), not file text, so running it again is harmless.
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAtomic } from './fileWrite.js';

export const KINDS = ['setRelease', 'createRelease', 'deleteRelease'];
const VERSION = /^v\d+\.\d+\.\d+$/;
const STORY = /^US-\d{4}$/;

/** US-0607 FR1.1: the record file of one project root. */
export const recordFile = (userData, root) => path.join(userData, 'planning', `${createHash('sha1').update(String(root)).digest('hex')}.json`);

const validAction = (a) =>
  a &&
  typeof a.id === 'string' &&
  KINDS.includes(a.kind) &&
  Array.isArray(a.storyIds) &&
  a.storyIds.every((s) => typeof s === 'string' && STORY.test(s)) &&
  (a.version === null || (typeof a.version === 'string' && VERSION.test(a.version))) &&
  (a.state === 'pending' || a.state === 'committed');

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

/** US-0607 FR1.2: actions leave the record only once their change is on the remote target. */
export const removeActions = (userData, root, ids) => update(userData, root, (r) => ({ ...r, actions: r.actions.filter((a) => !ids.includes(a.id)) }));

/** US-0606 FR2.1: actions whose change is in a local commit. */
export const markCommitted = (userData, root, ids) =>
  update(userData, root, (r) => ({ ...r, actions: r.actions.map((a) => (ids.includes(a.id) ? { ...a, state: 'committed' } : a)) }));

/** US-0607 FR3.3: whether the project's `main` is protected, once known. */
export const setProtectedMain = (userData, root, value) => update(userData, root, (r) => ({ ...r, protectedMain: value }));
