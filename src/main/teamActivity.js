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

/** AI-DLC's approvals (by the machine whose shard has them) and review findings (by the reviewer). */
function auditRows(events) {
  return (events ?? []).flatMap((e) => {
    if (e.event === 'GATE_APPROVED') return [{ source: 'approval', author: shardName(e.source).host, time: iso(e.timeMs), stage: e.fields?.Stage ?? null }];
    if (e.event === 'REVIEW_COMPLETED') {
      return [{ source: 'finding', author: e.fields?.Reviewer ?? null, time: iso(e.timeMs), stage: e.fields?.Stage ?? null, text: e.fields?.Verdict ?? '' }];
    }
    return [];
  });
}

/**
 * US-1201 AC-4: the story's pull request (matched on the intent's story ids, carrying its `comments` and `reviews`) and
 * one list of rows: its comments and reviews, the intent's open questions, approvals and review findings, oldest first
 * and rows without a time last. Each row has `source` (pull, review, question, approval, finding), `author` and `time`.
 * @param {{stories?: string[]}} intent
 * @param {Array<object>} pulls from listPulls; the matched one with `comments` and `reviews` from the platform
 * @param {Array<object>} events the intent's audit events
 * @param {Array<{text: string, file: string, time: string|null}>} questions from openQuestions, with their file's time
 */
export function storyComments(intent, pulls, events, questions) {
  const pull = matchPull(pulls, intent?.stories);
  const rows = [
    ...(pull?.comments ?? []).map((c) => ({ source: 'pull', author: c.author, time: c.time, text: c.body, url: c.url })),
    ...(pull?.reviews ?? []).map((r) => ({ source: 'review', author: r.author, time: r.time, text: r.body, state: r.state, url: r.url })),
    ...(questions ?? []).map((q) => ({ source: 'question', author: 'AI-DLC', time: q.time ?? null, text: q.text, file: q.file })),
    ...auditRows(events)
  ];
  const at = (r) => (r.time ? Date.parse(r.time) : Infinity);
  rows.sort((a, b) => at(a) - at(b) || 0); // two rows without a time give NaN: keep their order
  return { pull: pull && { number: pull.number, title: pull.title, url: pull.url ?? null }, rows };
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
