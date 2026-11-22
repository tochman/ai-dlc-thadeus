// US-1201 AC-2, AC-3, AC-4: collisions between pull requests, who works on what across machines, and comments per story.
// The machine of an audit event is the name of the shard it came from (`<host>-<clone id>.md`). Pure except
// loadMachines, which reads the shards one by one, so a shard that cannot be read is skipped instead of hiding the rest.
import { promises as fs } from 'node:fs';
import { listDir, readText, resolveInRoot } from './projectAccess.js';
import { mergeAudits } from './parsers/audit.js';
import { shardName } from './parsers/auditCost.js';
import { intentsDir } from './projectService.js';

/**
 * US-1201 AC-3: the machines in one intent's events (time order, as mergeAudits gives them): host and clone from the
 * shard name, the last stage it worked on and when, newest first. An event without a valid time is left out.
 * @returns {Array<{host: string, cloneId: string, lastStage: string|null, lastAt: string}>}
 */
export function machinesOf(events) {
  const bySource = new Map();
  for (const e of events ?? []) {
    if (!Number.isFinite(e.timeMs)) continue;
    const m = bySource.get(e.source) ?? { ...shardName(e.source), lastStage: null, lastMs: 0 };
    m.lastMs = Math.max(m.lastMs, e.timeMs);
    if (e.fields?.Stage) m.lastStage = e.fields.Stage;
    bySource.set(e.source, m);
  }
  return [...bySource.values()]
    .sort((a, b) => b.lastMs - a.lastMs)
    .map(({ host, cloneId, lastStage, lastMs }) => ({ host, cloneId, lastStage, lastAt: new Date(lastMs).toISOString() }));
}

/** One intent's audit events, each shard read on its own; one that cannot be read is skipped with a warning. */
async function shardEvents(root, dir) {
  const files = (await listDir(root, dir)).filter((e) => !e.isDir && e.name.endsWith('.md'));
  const texts = await Promise.all(
    files.map(async (f) => {
      try {
        return { source: f.name, text: await readText(root, `${dir}/${f.name}`) };
      } catch (err) {
        console.warn(`Audit-sharden ${f.name} kunde inte läsas och hoppas över:`, err.code ?? err.message);
        return null;
      }
    })
  );
  return mergeAudits(texts.filter(Boolean));
}

/**
 * US-1201 AC-3: the machines of each intent. `intents` carry their dirName and, from the caller, the stories they
 * build and whether they are in progress; both come back unchanged for possibleCollisions.
 */
export async function loadMachines(root, space, intents) {
  return Promise.all(
    intents.map(async (i) => ({
      dirName: i.dirName,
      slug: i.slug ?? null,
      stories: i.stories ?? [],
      inProgress: i.inProgress === true,
      machines: machinesOf(await shardEvents(root, `${intentsDir(space)}/${i.dirName}/audit`))
    }))
  );
}

const group = (map, key, value) => (map.get(key) ?? map.set(key, new Set()).get(key)).add(value);

/**
 * US-1201 AC-3: a story in progress on two machines (two hosts among the in-progress intents that build it), or on two
 * of origin's story branches, is a possible collision.
 * ponytail: "in progress on two machines" counts every machine that ever wrote to an in-progress intent, so a story moved
 * from one machine to another also shows; add a recency window if that turns out to be noise.
 * @returns {Array<{story: string, kind: 'machines'|'branches', where: string[]}>}
 */
export function possibleCollisions(intents, branches) {
  const hosts = new Map();
  for (const i of intents ?? []) {
    if (!i.inProgress) continue;
    for (const story of i.stories ?? []) for (const m of i.machines ?? []) group(hosts, story, m.host);
  }
  const onBranches = new Map();
  for (const b of branches ?? []) group(onBranches, b.story, b.branch);
  const flags = [
    ...[...hosts].map(([story, set]) => ({ story, kind: 'machines', where: [...set].sort() })),
    ...[...onBranches].map(([story, set]) => ({ story, kind: 'branches', where: [...set].sort() }))
  ];
  return flags.filter((f) => f.where.length >= 2).sort((a, b) => a.story.localeCompare(b.story) || a.kind.localeCompare(b.kind));
}

/** US-1201 AC-4: the first pull request with one of the story ids in its branch or title (any case), or null. */
export function matchPull(pulls, stories) {
  const ids = (stories ?? []).map((s) => s.toUpperCase());
  return (pulls ?? []).find((p) => ids.some((id) => `${p.branch ?? ''} ${p.title ?? ''}`.toUpperCase().includes(id))) ?? null;
}

/** US-1201 AC-4: the questions of an AI-DLC question file whose `[Answer]:` is still empty, by their `#` heading. */
export function openQuestions(text) {
  const open = [];
  let heading = null;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const h = /^#+\s+(.+?)\s*$/.exec(line);
    if (h) heading = h[1];
    else if (/^\[Answer\]:\s*$/.test(line) && heading) open.push(heading);
  }
  return open;
}

/**
 * US-1201 AC-4: the open questions of an intent's `*questions.md` files (the groups loadIntentDetail lists), each at its
 * file's modification time. A file that cannot be read is skipped with a warning.
 * @returns {Promise<Array<{text: string, file: string, time: string}>>}
 */
export async function loadOpenQuestions(root, groups) {
  const files = (groups ?? []).flatMap((g) => g.files ?? []).filter((f) => f.name.endsWith('questions.md'));
  const lists = await Promise.all(
    files.map(async (f) => {
      try {
        const [text, stat] = await Promise.all([readText(root, f.rel), resolveInRoot(root, f.rel).then((abs) => fs.stat(abs))]);
        return openQuestions(text).map((q) => ({ text: q, file: f.rel, time: stat.mtime.toISOString() }));
      } catch (err) {
        console.warn(`Frågefilen ${f.rel} kunde inte läsas:`, err.code ?? err.message);
        return [];
      }
    })
  );
  return lists.flat();
}

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);

const at = (time) => (time ? Date.parse(time) : -Infinity);
const byTime = (a, b) => at(a.time) - at(b.time) || 0; // two rows without a time give NaN: keep their order

/**
 * US-1203: the review findings still standing at NOT-READY: the last verdict per stage (and unit), unless that stage
 * was approved after it. Approvals themselves are not shown here; they stay in Timeline.
 */
function standingFindings(events) {
  const last = new Map();
  const approved = new Map();
  for (const e of events ?? []) {
    const stage = e.fields?.Stage ?? null;
    if (e.event === 'GATE_APPROVED') approved.set(stage, Math.max(approved.get(stage) ?? -Infinity, e.timeMs));
    if (e.event === 'REVIEW_COMPLETED') last.set(`${stage}|${e.fields?.Unit ?? ''}`, e);
  }
  return [...last.values()]
    .filter((e) => e.fields?.Verdict === 'NOT-READY' && !(approved.get(e.fields.Stage ?? null) > e.timeMs))
    .map((e) => ({
      kind: 'finding',
      stage: e.fields.Stage ?? null,
      iteration: Number(e.fields.Iteration) || null,
      author: e.fields.Reviewer ?? null,
      time: iso(e.timeMs)
    }));
}

/** US-1203: each reviewer at their latest verdict; a later plain comment does not undo an approval or a change request. */
function reviewersOf(reviews) {
  const by = new Map();
  for (const r of [...(reviews ?? [])].sort(byTime)) if (!by.has(r.author) || r.state !== 'commented') by.set(r.author, r);
  return [...by.values()];
}

/** US-1203: comments grouped by review thread (a comment or review body outside one is its own), newest thread first. */
function threadsOf(pull) {
  const map = new Map();
  const reviewBodies = (pull?.reviews ?? []).filter((r) => r.body).map((r) => ({ author: r.author, body: r.body, time: r.time, url: r.url, state: r.state }));
  [...(pull?.comments ?? []), ...reviewBodies].forEach((c, i) => {
    const key = c.thread ? `t:${c.thread.id}` : `c:${i}`;
    if (!map.has(key))
      map.set(key, { id: key, path: c.thread?.path ?? null, line: c.thread?.line ?? null, resolved: c.thread?.resolved ?? null, comments: [] });
    map.get(key).comments.push({ author: c.author, body: c.body, time: c.time, url: c.url, ...(c.state ? { state: c.state } : {}) });
  });
  const latest = (th) => Math.max(...th.comments.map((c) => at(c.time)));
  return [...map.values()].map((th) => ({ ...th, comments: th.comments.sort(byTime), url: th.comments[0].url ?? null })).sort((a, b) => latest(b) - latest(a));
}

/**
 * US-1201 AC-4, US-1203: the story's pull request (matched on the intent's story ids, carrying its `comments` and
 * `reviews`) with its reviewers; what needs you (open questions, NOT-READY findings still standing, change requests,
 * unresolved threads, in that order); and its review threads, newest first.
 * @param {{stories?: string[]}} intent
 * @param {Array<object>} pulls from listPulls; the matched one with `comments` and `reviews` from the platform
 * @param {Array<object>} events the intent's audit events
 * @param {Array<{text: string, file: string, time: string|null}>} questions from openQuestions, with their file's time
 */
export function storyComments(intent, pulls, events, questions) {
  const pull = matchPull(pulls, intent?.stories);
  const reviewers = reviewersOf(pull?.reviews);
  const threads = pull ? threadsOf(pull) : [];
  const needs = [
    ...(questions ?? []).map((q) => ({ kind: 'question', text: q.text, file: q.file, time: q.time ?? null })),
    ...standingFindings(events),
    ...reviewers.filter((r) => r.state === 'changes').map((r) => ({ kind: 'changes', author: r.author, time: r.time ?? null, url: r.url ?? null })),
    ...threads
      .filter((th) => th.resolved === false)
      .map((th) => ({
        kind: 'thread',
        path: th.path,
        line: th.line,
        author: th.comments[0].author,
        text: th.comments[0].body,
        time: th.comments.at(-1).time,
        url: th.url
      }))
  ];
  return {
    pull: pull && { number: pull.number, title: pull.title, url: pull.url ?? null, reviewers: reviewers.map((r) => ({ author: r.author, state: r.state })) },
    needs,
    threads
  };
}

/**
 * US-1201 AC-2: the other open pull requests that change files the local branch changes, with the shared files. The
 * branch's own files are those of its pull request, else `ownFiles` (its diff against main) when it has none yet.
 * @returns {Array<{number: number, title: string, branch: string|null, shared: string[]}>}
 */
export function collisions(pulls, localBranch, ownFiles = null) {
  const own = (pulls ?? []).find((p) => p.branch === localBranch);
  const files = new Set(own?.files ?? ownFiles ?? []);
  return (pulls ?? [])
    .filter((p) => p !== own)
    .map((p) => ({ number: p.number, title: p.title, branch: p.branch, shared: (p.files ?? []).filter((f) => files.has(f)) }))
    .filter((c) => c.shared.length > 0);
}
