// Release markers in the feature docs (EPIC-06 US-0603). A story is planned for a release when its status text says
// "for vX.Y.Z" and released when it says "Released in vX.Y.Z". Pure functions without Node imports, so the renderer
// can use them too.
import { storyIdsIn } from './features.js';

const VERSION = /^v\d+\.\d+\.\d+$/;
const PLANNED = /\bfor (v\d+\.\d+\.\d+)\b/i;
const RELEASED = /\breleased in (v\d+\.\d+\.\d+)\b/i;
const PLANNED_WITH_LEAD = /(,\s*|\s+)for v\d+\.\d+\.\d+\b/i;
const STORY_HEAD = /^(\*\*(US-\d{4})\s*[:–-]\s*.+?\*\*)(.*)$/;
const STATUS_LINE = /^\*\*Status(\s*\([^)]*\))?:\*\*/i;
// Segment boundaries, as featureDocsStatus.test.js splits a status text, plus table cells.
const DELIMITER = /·|\.\s|\|/g;

/** US-0603 FR1.1: the per-project delivery setting; unset means Releases. */
export const DELIVERY = ['releases', 'continuous'];
export const DELIVERY_DEFAULT = 'releases';
export const LIFECYCLE_RULE_VERSION = 1;

const semver = (v) => v.slice(1).split('.').map(Number);
/** Newest first. */
const byVersionDesc = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
};

/** US-0603 FR2.1, FR3.2: the planned and the released version in a status text, each 'vX.Y.Z' or null. */
export function releaseOf(text) {
  const s = String(text ?? '');
  return { planned: s.match(PLANNED)?.[1] ?? null, released: s.match(RELEASED)?.[1] ?? null };
}

/** One segment with its "for vX.Y.Z" set to `version`, or removed when it is null. A released segment is kept. */
function markSegment(seg, version) {
  if (RELEASED.test(seg)) return seg;
  if (!version) return seg.replace(PLANNED_WITH_LEAD, '');
  if (PLANNED.test(seg)) return seg.replace(/(\bfor )v\d+\.\d+\.\d+\b/i, `$1${version}`);
  // Insert after the status words: before the space ahead of the first "(", else at the end (before a final ".").
  const paren = seg.indexOf('(');
  let at = paren === -1 ? seg.trimEnd().length : paren;
  if (paren === -1 && seg[at - 1] === '.') at--;
  while (paren !== -1 && at > 0 && seg[at - 1] === ' ') at--;
  return `${seg.slice(0, at)}, for ${version}${seg.slice(at)}`;
}

/** The segments of `text` that name `storyId` and no other story get `version`; the rest is kept as it is. */
function markSegments(text, storyId, version) {
  let out = '';
  let start = 0;
  for (const m of [...text.matchAll(DELIMITER), { index: text.length, 0: '' }]) {
    const seg = text.slice(start, m.index);
    const ids = storyIdsIn(seg);
    // ponytail: a segment that names several stories ("US-0601 and US-0602 released") is left alone; split it by
    // hand if two stories in one segment ever need different releases.
    out += ids.length === 1 && ids[0] === storyId ? markSegment(seg, version) : seg;
    out += m[0];
    start = m.index + m[0].length;
  }
  return out;
}

/**
 * US-0603 FR2.2, NFR1: sets the story's "for vX.Y.Z" (or removes it for null) on its head line, in the epic's
 * `**Status (…)**` line and in a table row (FEATURES.md) that names it. Every other byte stays as it was.
 * Throws for a version that is not 'vX.Y.Z'.
 */
export function setReleaseMarker(text, storyId, version) {
  if (version !== null && !(typeof version === 'string' && VERSION.test(version))) throw new Error(`Invalid version: ${String(version)}`);
  return String(text)
    .split('\n')
    .map((line) => {
      const head = line.match(STORY_HEAD);
      if (head) return head[2] === storyId ? head[1] + markSegment(head[3], version) : line;
      return STATUS_LINE.test(line) || /^\s*\|/.test(line) ? markSegments(line, storyId, version) : line;
    })
    .join('\n');
}

const allStories = (epics) => (epics ?? []).flatMap((e) => (e.parsed?.stories ?? []).map((story) => ({ epicId: e.id, story })));
const releaseTags = (tags) => (tags ?? []).filter((t) => VERSION.test(t?.name ?? ''));

/** US-0605 FR1.1: the next patch, minor and major after the latest vX.Y.Z tag; none without a tag. */
export function nextVersions(tags) {
  const latest = releaseTags(tags)
    .map((t) => t.name)
    .sort(byVersionDesc)[0];
  if (!latest) return [];
  const [major, minor, patch] = semver(latest);
  return [`v${major}.${minor}.${patch + 1}`, `v${major}.${minor + 1}.0`, `v${major + 1}.0.0`];
}

/**
 * US-0603 FR2.1, US-0605 FR1.1, FR2.1: planned versions (markers and plan files) without a tag, then the next
 * versions after the latest tag; newest first.
 */
export function releaseOptions(epics, tags, plans = []) {
  const tagged = new Set(releaseTags(tags).map((t) => t.name));
  const planned = [...allStories(epics).map(({ story }) => releaseOf(story.statusText).planned), ...plans.map((p) => p.version)];
  const versions = new Set([...planned.filter((v) => v && !tagged.has(v)), ...nextVersions(tags)]);
  return [...versions].sort(byVersionDesc);
}

/**
 * US-0603 FR3.2, FR7, US-0605 FR2.1: one entry per version from the markers, the tags and the plan files in
 * docs/releases/, newest first. `released` comes from the tag or a "Released in" marker (a shallow checkout has no
 * tags), `date` from the tag, `plan` from the plan file (or null). A story still marked "for vX.Y.Z" when the tag
 * exists is `stale`.
 * @returns {{version: string, released: boolean, date: string|null, plan: {file: string, hash: string, headingOnly: boolean}|null,
 *   stories: {epicId: string, story: object, stale: boolean}[]}[]}
 */
export function buildReleases(epics, tags, plans = []) {
  const dates = new Map(releaseTags(tags).map((t) => [t.name, t.date || null]));
  const planOf = new Map(
    plans.filter((p) => VERSION.test(p?.version ?? '')).map(({ version, file, hash, headingOnly }) => [version, { file, hash, headingOnly }])
  );
  const map = new Map([...dates.keys(), ...planOf.keys()].map((v) => [v, []]));
  for (const { epicId, story } of allStories(epics)) {
    const { planned, released } = releaseOf(story.statusText);
    const version = released ?? planned;
    if (!version) continue;
    if (!map.has(version)) map.set(version, []);
    map.get(version).push({ epicId, story, stale: !released && dates.has(version) });
  }
  return [...map.keys()].sort(byVersionDesc).map((version) => ({
    version,
    released: dates.has(version) || map.get(version).some(({ story }) => releaseOf(story.statusText).released === version),
    date: dates.get(version) ?? null,
    plan: planOf.get(version) ?? null,
    stories: map.get(version)
  }));
}

/** US-0605 FR1.2: null for a new 'vX.Y.Z', 'format' for another shape, 'exists' for a version in `releases`. */
export function newReleaseError(version, releases) {
  if (typeof version !== 'string' || !VERSION.test(version)) return 'format';
  return (releases ?? []).some((r) => r.version === version) ? 'exists' : null;
}

/** US-0605 FR4, FR4.1: only an untagged release with no stories and a plan file that holds just its heading. */
export const canDelete = (entry) => Boolean(entry && !entry.released && entry.stories.length === 0 && entry.plan?.headingOnly);

/** US-0605 FR1.3: the whole text of a new plan file, and the test for a file that holds nothing else. */
export const planHeading = (version) => `# Release plan ${version}\n`;
export const isHeadingOnly = (text, version) => String(text).trim() === planHeading(version).trim();

const SLICE_HEAD = /^\|\s*story\s*\|/i;
const NEW_TABLE = ['| Story | Epic | Title | Priority | Complexity | Depends on |', '|---|---|---|---|---|---|'];
const cellsOf = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim().toLowerCase());
const cell = (v) =>
  v
    ? String(v)
        .replace(/\|/g, '\\|')
        .replace(/\s*\n\s*/g, ' ')
    : '–';

/** One slice-table row for `story`, with the columns the table's header names, in its order. */
function planRow(header, story) {
  const epic = story.epicLink ? `[${String(story.epicId).replace(/^EPIC-/, '')}](${story.epicLink})` : story.epicId;
  const value = {
    story: story.id,
    epic,
    title: story.title,
    priority: story.priority,
    complexity: story.complexity,
    'depends on': story.dependencies,
    dependencies: story.dependencies,
    status: story.status
  };
  return `| ${header.map((name) => cell(value[name])).join(' | ')} |`;
}

/**
 * US-0606 FR2.4: `planText` with a slice-table row for each story it does not list yet (epic, title, priority,
 * complexity and dependencies). The rows go after the last row of the first table whose header starts with "Story";
 * a file without one gets a new table at its end. Every other line stays as it was.
 * @param {{id: string, epicId: string, epicLink?: string, title: string, priority?: string, complexity?: string,
 *   dependencies?: string, status?: string}[]} stories
 */
export function addPlanRows(planText, stories) {
  const lines = String(planText).replace(/\n$/, '').split('\n');
  const head = lines.findIndex((l) => SLICE_HEAD.test(l));
  if (head === -1) {
    const header = cellsOf(NEW_TABLE[0]);
    return [...lines, '', ...NEW_TABLE, ...stories.map((s) => planRow(header, s)), ''].join('\n');
  }
  let end = head + 1;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const listed = new Set(lines.slice(head + 2, end).map((l) => cellsOf(l)[0]?.toUpperCase()));
  const header = cellsOf(lines[head]);
  const rows = stories.filter((s) => !listed.has(s.id)).map((s) => planRow(header, s));
  if (!rows.length) return planText;
  return [...lines.slice(0, end), ...rows, ...lines.slice(end), ''].join('\n');
}

/**
 * US-0029 FR1, FR2: `planText` without the slice-table rows (the table `addPlanRows` writes) whose story is in `ids`.
 * A table left with no rows goes with its header and separator, and the blank line before it, so a heading-plus-table
 * file comes back as the heading only. Text without such a row comes back unchanged.
 * @param {string[]} ids
 */
export function removePlanRows(planText, ids) {
  const lines = String(planText).replace(/\n$/, '').split('\n');
  const head = lines.findIndex((l) => SLICE_HEAD.test(l));
  if (head === -1) return planText;
  let end = head + 1;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const drop = new Set(ids);
  const rows = lines.slice(head + 2, end);
  const kept = rows.filter((l) => !drop.has(cellsOf(l)[0]?.toUpperCase()));
  if (kept.length === rows.length) return planText;
  if (kept.length) return [...lines.slice(0, head + 2), ...kept, ...lines.slice(end), ''].join('\n');
  const before = lines.slice(0, head);
  if (before.at(-1)?.trim() === '' && (lines[end] ?? '').trim() === '') before.pop();
  return [...before, ...lines.slice(end), ''].join('\n');
}

/** US-0607 FR3.3: the docs branch for a protected `main`, until the project sets one. */
export const PLANNING_BRANCH_DEFAULT = 'docs/planning';

/**
 * US-0607 NFR3: git's ref rules for a branch name (as `git check-ref-format --branch`, which planningSync.js runs again
 * before use), and never `main`, the branch it stands in for.
 */
export function isValidBranchName(name) {
  if (typeof name !== 'string' || name === '' || name === 'main' || name === '@' || name.length > 200) return false;
  if (name.startsWith('-') || name.startsWith('/') || name.endsWith('/') || name.endsWith('.')) return false;
  if (/[\0-\x20\x7f~^:?*[\\]|\.\.|\/\/|@\{/.test(name)) return false;
  return name.split('/').every((part) => !part.startsWith('.') && !part.endsWith('.lock'));
}

/** US-0603 FR5.1: the tag that ends the lifecycle rule for one delivery setting. */
export const lifecycleTag = (delivery) => `(story-lifecycle: ${delivery} v${LIFECYCLE_RULE_VERSION})`;

/**
 * US-0603 FR5.2: whether the project's memory holds the lifecycle rule for `delivery`: 'current', 'older' (a lower
 * version, or the untagged rule from before), 'other' (the other setting's rule) or 'missing'.
 */
export function ruleStatus(memoryText, delivery) {
  const text = String(memoryText ?? '');
  const tags = [...text.matchAll(/\(story-lifecycle: (\w+) v(\d+)\)/g)].map(([, d, v]) => ({ d, v: Number(v) }));
  const own = tags.filter((x) => x.d === delivery);
  if (own.some((x) => x.v >= LIFECYCLE_RULE_VERSION)) return 'current';
  if (own.length) return 'older';
  if (tags.length) return 'other';
  // ponytail: an untagged rule is recognised by its progress markers (US-0016): 🚧 and ✅ are enough, because an
  // older rule in other words may never name 📋. A memory file that names both for another reason reads as 'older'.
  return text.includes('🚧') && text.includes('✅') ? 'older' : 'missing';
}
