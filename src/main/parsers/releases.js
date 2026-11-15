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

/** US-0603 FR2.1: planned versions without a tag, then the next patch and minor after the latest tag; newest first. */
export function releaseOptions(epics, tags) {
  const tagged = new Set(releaseTags(tags).map((t) => t.name));
  const versions = new Set(
    allStories(epics)
      .map(({ story }) => releaseOf(story.statusText).planned)
      .filter((v) => v && !tagged.has(v))
  );
  const latest = [...tagged].sort(byVersionDesc)[0];
  if (latest) {
    const [major, minor, patch] = semver(latest);
    versions.add(`v${major}.${minor}.${patch + 1}`).add(`v${major}.${minor + 1}.0`);
  }
  return [...versions].sort(byVersionDesc);
}

/**
 * US-0603 FR3.2, FR7: one entry per version from the markers and the tags, newest first. `released` comes from the
 * tag or a "Released in" marker (a shallow checkout has no tags), `date` from the tag. A story still marked
 * "for vX.Y.Z" when the tag exists is `stale`.
 * @returns {{version: string, released: boolean, date: string|null, stories: {epicId: string, story: object, stale: boolean}[]}[]}
 */
export function buildReleases(epics, tags) {
  const dates = new Map(releaseTags(tags).map((t) => [t.name, t.date || null]));
  const map = new Map([...dates.keys()].map((v) => [v, []]));
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
    stories: map.get(version)
  }));
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
