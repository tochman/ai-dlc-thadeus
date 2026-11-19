// Feature docs (EPIC-06): docs/FEATURES.md with an epic table, and one file per epic with user stories.
// Pure functions without Node imports, so the renderer can use them too. They never throw (FR1.4):
// what cannot be read gives empty fields and a warning. Warnings are texts in the current language (EPIC-07);
// status labels are the keys `features.status.<status>`.
import { t } from '../../shared/i18n.js';

export const DEFAULT_FEATURES_PATH = 'docs/FEATURES.md';
// 🚀 Deployed is the last status, after ✅ Done, for projects with continuous deployment (US-0603 FR4.2, FR6).
export const STATUS_MARKER = { planned: '📋', progress: '🚧', done: '✅', deployed: '🚀' };
const MARKERS = [
  ['🚀', 'deployed'],
  ['✅', 'done'],
  ['🚧', 'progress'],
  ['📋', 'planned']
];
const MARKER_RE = /[🚀✅🚧📋]/gu;

/** Overview path from the settings: relative, ending in .md, without `..` segments (FR3.3, NFR2). */
export function isValidFeaturesPath(p) {
  if (typeof p !== 'string' || p.trim() !== p || !p.toLowerCase().endsWith('.md')) return false;
  if (p.startsWith('/') || p.startsWith('\\') || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split(/[\\/]/).some((seg) => seg === '..' || seg === '');
}

/** The first status marker in the text: planned | progress | done, or null. */
export function statusOf(text) {
  const s = String(text ?? '');
  let best = null;
  for (const [marker, status] of MARKERS) {
    const i = s.indexOf(marker);
    if (i !== -1 && (best === null || i < best.i)) best = { i, status };
  }
  return best?.status ?? null;
}

/**
 * An epic's status from every marker in its overview cell, which lists one marker per story:
 * done only when all are ✅ (or ✅ and 🚀, US-0603), deployed when all are 🚀, planned when all are 📋, progress for
 * any 🚧 or another mix, null without markers.
 */
export function epicStatusOf(text) {
  const kinds = new Set((String(text ?? '').match(MARKER_RE) ?? []).map((m) => MARKERS.find(([k]) => k === m)[1]));
  if (kinds.size === 0) return null;
  if (kinds.size === 1) return [...kinds][0];
  return kinds.size === 2 && kinds.has('done') && kinds.has('deployed') ? 'done' : 'progress';
}

/** Every distinct story id (US-XXYY) in a text, in order of appearance. */
export function storyIdsIn(text) {
  return [...new Set(String(text ?? '').match(/US-\d{4}/g) ?? [])];
}

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
const isSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
const stripMd = (s) => s.replace(/\*\*|__|`/g, '').trim();

/** @returns {{intro: string, epics: {id: string, title: string, link: string|null, topic: string, status: string, statusKind: string|null}[], warnings: string[]}} */
export function parseOverview(md) {
  const lines = String(md ?? '').split(/\r?\n/);
  const warnings = [];
  const head = lines.findIndex((l, i) => l.includes('|') && isSeparator(lines[i + 1] ?? ''));
  const intro = (head === -1 ? lines : lines.slice(0, head))
    .filter((l) => !/^#\s/.test(l))
    .join('\n')
    .trim();
  if (head === -1) return { intro, epics: [], warnings: [t('features.warn.noTable')] };

  const cols = splitRow(lines[head]).map((c) => c.toLowerCase());
  const col = (re) => cols.findIndex((c) => re.test(c));
  const iEpic = col(/epic/);
  const iTopic = col(/topic|ämne|amne|beskrivning/);
  const iStatus = col(/status/);
  if (iEpic === -1) warnings.push(t('features.warn.noEpicColumn'));

  const epics = [];
  for (const line of lines.slice(head + 2)) {
    if (!line.includes('|')) break;
    const cells = splitRow(line);
    const cell = cells[iEpic === -1 ? 0 : iEpic] ?? '';
    const m = cell.match(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/);
    const label = stripMd(m ? m[1] : cell);
    const topic = stripMd(iTopic === -1 ? '' : (cells[iTopic] ?? ''));
    const status = stripMd(iStatus === -1 ? '' : (cells[iStatus] ?? ''));
    if (!label) continue;
    epics.push({
      id: label.match(/EPIC-\d+/i)?.[0].toUpperCase() ?? label,
      title: topic.split(':')[0].trim() || label,
      link: m ? m[2] : null,
      topic,
      status,
      statusKind: epicStatusOf(status)
    });
  }
  if (epics.length === 0) warnings.push(t('features.warn.noRows'));
  return { intro, epics, warnings };
}

const FIELD = {
  priority: /^(priority|prioritet)$/,
  complexity: /^(complexity|komplexitet)$/,
  dependencies: /^(dependencies|beroenden)$/,
  notes: /^(notes|anteckningar)$/,
  epic: /^epic$/
};

function parseStory(id, title, rest, body) {
  const story = {
    id,
    title: title.trim(),
    status: statusOf(rest),
    statusText: rest.replace(MARKER_RE, '').trim(),
    asA: null,
    inOrderTo: null,
    wouldLike: null,
    priority: null,
    complexity: null,
    dependencies: null,
    notes: null,
    criteria: [],
    done: 0,
    total: 0,
    raw: body.join('\n').trim()
  };
  for (const line of body) {
    const crit = line.match(/^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    if (crit) {
      story.criteria.push({ checked: crit[1] !== ' ', text: crit[2].trim() });
      continue;
    }
    const field = line.match(/^[-*+]\s+\*\*(.+?):?\*\*:?\s*(.*)$/);
    if (field) {
      const label = field[1].replace(/:$/, '').trim().toLowerCase();
      const key = Object.keys(FIELD).find((k) => FIELD[k].test(label));
      if (key && key !== 'epic') story[key] = field[2].trim() || null;
    }
    const narrative =
      line.match(/as an? \*\*(.+?)\*\*.*?in order to \*\*(.+?)\*\*.*?i would like to \*\*(.+?)\*\*/i) ??
      line.match(/som \*\*(.+?)\*\*.*?för att \*\*(.+?)\*\*.*?vill \*\*(.+?)\*\*/i);
    if (narrative && !story.asA) [, story.asA, story.inOrderTo, story.wouldLike] = narrative;
  }
  story.total = story.criteria.length;
  story.done = story.criteria.filter((c) => c.checked).length;
  return story;
}

const STORY_HEAD = /^\*\*(US-\d{4})\s*[:–-]\s*(.+?)\*\*\s*(.*)$/;

/**
 * US-0608 FR3.2: a feature-doc text cut into blocks that join back (with '\n') to the same text: one per story (from its
 * `**US-XXXX: …**` line to the next story, heading or `---`), one per table row outside a story, keyed `row:<id>` by the
 * first epic or story id it names, and the text between them, keyed `~<the key before it>`. `ids`: the stories a block is about.
 * @returns {{key: string, ids: string[], text: string}[]}
 */
export function storyBlocks(text) {
  const blocks = [];
  const seen = new Map();
  let story = false;
  const push = (key, line, ids) => {
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    blocks.push({ key: n > 1 ? `${key}#${n}` : key, lines: [line], ids });
  };
  for (const line of String(text ?? '').split('\n')) {
    const head = line.match(STORY_HEAD);
    const last = blocks.at(-1);
    if (head) {
      story = true;
      push(head[1], line, [head[1]]);
    } else if (story && !/^#{1,2}\s/.test(line) && !/^---\s*$/.test(line)) last.lines.push(line);
    else if (/^\s*\|/.test(line) && /EPIC-\d+|US-\d{4}/.test(line)) {
      story = false;
      push(`row:${line.match(/EPIC-\d+/)?.[0] ?? line.match(/US-\d{4}/)[0]}`, line, null);
    } else if (last && last.key.startsWith('~')) last.lines.push(line);
    else {
      story = false;
      blocks.push({ key: `~${last?.key ?? ''}`, lines: [line], ids: null });
    }
  }
  return blocks.map(({ key, lines, ids }) => {
    const joined = lines.join('\n');
    return { key, ids: ids ?? storyIdsIn(joined), text: joined };
  });
}

// US-0033: a text cut into clauses: on `·`, `|`, line breaks and `, ` `. ` `; ` `: ` (bold markers dropped first, so
// "**Status (…):**" is a clause of its own).
const clausesOf = (text) =>
  String(text ?? '')
    .replace(/\*\*/g, '')
    .split(/\s*(?:[·|\n]|[,.;:]\s)\s*/);

/**
 * US-0033 AC1, AC2: the stories a changed block is about, for the commit subject: a story block's or story row's own id
 * (from its key), else each id whose clauses differ between `before` and `after`.
 * ponytail: a clause names every id in it, so a changed range "US-0001–US-0020" names both ends.
 */
function namedIn(key, before, after) {
  const own = key.match(/^(?:row:)?(US-\d{4})/)?.[1];
  if (own) return [own];
  const clauses = (text, id) => clausesOf(text).filter((c) => c.includes(id));
  return storyIdsIn(`${before ?? ''}\n${after ?? ''}`).filter((id) => JSON.stringify(clauses(before, id).sort()) !== JSON.stringify(clauses(after, id).sort()));
}

/**
 * US-0608 FR3.2, FR3.3, AC1.3.3: a change of one file split by story block. `keep` is `work` with every block that is not
 * about an `own` story put back as it is in `head`; `changes` are those other blocks, each `{key, ids, named, before, after,
 * prev}` (null `before`: a new block, null `after`: a removed one; `prev`: the key it follows). `ids` decide what is own;
 * `named` are the stories the change is about, for the commit subject (US-0033 AC1–AC3).
 */
export function splitChange(head, work, own) {
  const H = storyBlocks(head);
  const W = storyBlocks(work);
  const byKey = (list) => new Map(list.map((b, i) => [b.key, { ...b, prev: list[i - 1]?.key ?? null }]));
  const h = byKey(H);
  const w = byKey(W);
  const isOwn = (b) => b.ids.some((id) => own.includes(id));
  const changes = [];
  for (const key of new Set([...w.keys(), ...h.keys()])) {
    const before = h.get(key) ?? null;
    const after = w.get(key) ?? null;
    if (before?.text === after?.text || [before, after].some((b) => b && isOwn(b))) continue;
    const ids = [...new Set([...(before?.ids ?? []), ...(after?.ids ?? [])])];
    const named = namedIn(key, before?.text, after?.text);
    changes.push({ key, ids, named, before: before?.text ?? null, after: after?.text ?? null, prev: (after ?? before).prev });
  }
  const other = new Map(changes.map((c) => [c.key, c]));
  const keep = W.flatMap((b) => (!other.has(b.key) ? [b.text] : other.get(b.key).before === null ? [] : [other.get(b.key).before]));
  return { keep: insertRemoved(keep, W, changes).join('\n'), changes };
}

/** The removed other blocks back in `keep`, after the block they followed (else first). */
function insertRemoved(keep, W, changes) {
  const out = W.filter((b) => !changes.some((c) => c.key === b.key && c.before === null)).map((b, i) => ({ key: b.key, text: keep[i] }));
  for (const c of changes.filter((x) => x.after === null)) out.splice(out.findIndex((b) => b.key === c.prev) + 1, 0, { key: c.key, text: c.before });
  return out.map((b) => b.text);
}

/**
 * US-0608 FR3.3, FR5.2: `changes` (from splitChange) applied onto `target` (null: no such file). A block the target
 * changed itself is still given the app's text and named in `conflicts`, so the caller keeps the target's file.
 * @returns {{text: string, conflicts: string[]}}
 */
export function applyChange(target, changes) {
  const blocks = storyBlocks(target ?? '').map(({ key, text }) => ({ key, text }));
  const conflicts = [];
  for (const c of changes) {
    const i = blocks.findIndex((b) => b.key === c.key);
    if ((i === -1 ? null : blocks[i].text) !== c.before) conflicts.push(c.key);
    if (i !== -1 && c.after === null) blocks.splice(i, 1);
    else if (i !== -1) blocks[i].text = c.after;
    else if (c.after !== null) {
      const at = blocks.findIndex((b) => b.key === c.prev);
      blocks.splice(at === -1 ? blocks.length : at + 1, 0, { key: c.key, text: c.after });
    }
  }
  return { text: blocks.map((b) => b.text).join('\n'), conflicts };
}

/** @returns {{id: string|null, title: string, description: string, intro: string, storiesLine: string|null, statusLine: string|null, stories: object[], raw: string, warnings: string[]}} */
export function parseEpic(md) {
  const raw = String(md ?? '');
  const lines = raw.split(/\r?\n/);
  const warnings = [];
  const heading =
    lines
      .find((l) => /^#\s/.test(l))
      ?.replace(/^#\s+/, '')
      .trim() ?? '';
  const hm = heading.match(/^(EPIC-\d+)\s*[:–-]\s*(.*)$/i);
  if (!heading) warnings.push(t('features.warn.noHeading'));

  const quote = [];
  for (const l of lines) {
    if (/^>\s?/.test(l)) quote.push(l.replace(/^>\s?/, ''));
    else if (quote.length && !/^epic file/i.test(quote[0])) break;
    else quote.length = 0;
  }
  const lineAfter = (re) => {
    const l = lines.find((x) => re.test(x));
    return l ? l.replace(re, '').trim() : null;
  };

  const stories = [];
  let current = null;
  for (const l of lines) {
    const m = l.match(STORY_HEAD);
    if (m) {
      if (current) stories.push(parseStory(...current));
      current = [m[1], m[2], m[3], [l]];
    } else if (current && (/^#{1,2}\s/.test(l) || /^---\s*$/.test(l))) {
      stories.push(parseStory(...current));
      current = null;
    } else if (current) {
      current[3].push(l);
    }
  }
  if (current) stories.push(parseStory(...current));
  if (stories.length === 0) warnings.push(t('features.warn.noStories'));

  // Everything between the title and `## User Stories` (else the first story), as Markdown for the view.
  const start = lines.findIndex((l) => /^#\s/.test(l)) + 1;
  let end = lines.findIndex((l) => /^##\s+(user stories|användarberättelser|storys)\b/i.test(l));
  if (end === -1) end = lines.findIndex((l) => STORY_HEAD.test(l));
  const intro = lines
    .slice(start, end === -1 ? lines.length : end)
    .join('\n')
    .replace(/^(\s*---\s*\n)+|(\n\s*---\s*)+$/g, '')
    .trim();

  return {
    id: hm ? hm[1].toUpperCase() : null,
    title: (hm ? hm[2] : heading).trim(),
    description: quote.join('\n').trim(),
    intro,
    storiesLine: lineAfter(/^\*\*(Stories|Storys):\*\*/i),
    statusLine: lineAfter(/^\*\*Status(\s*\([^)]*\))?:\*\*/i),
    stories,
    raw,
    warnings
  };
}
