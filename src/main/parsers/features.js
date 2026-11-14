// Feature docs (EPIC-06): docs/FEATURES.md with an epic table, and one file per epic with user stories.
// Pure functions without Node imports, so the renderer can use them too. They never throw (FR1.4):
// what cannot be read gives empty fields and a warning. Warnings are texts in the current language (EPIC-07);
// status labels are the keys `features.status.<status>`.
import { t } from '../../shared/i18n.js';

export const DEFAULT_FEATURES_PATH = 'docs/FEATURES.md';
export const STATUS_MARKER = { planned: '📋', progress: '🚧', done: '✅' };
const MARKERS = [
  ['✅', 'done'],
  ['🚧', 'progress'],
  ['📋', 'planned']
];

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
    const topic = stripMd(iTopic === -1 ? '' : cells[iTopic] ?? '');
    const status = stripMd(iStatus === -1 ? '' : cells[iStatus] ?? '');
    if (!label) continue;
    epics.push({
      id: label.match(/EPIC-\d+/i)?.[0].toUpperCase() ?? label,
      title: topic.split(':')[0].trim() || label,
      link: m ? m[2] : null,
      topic,
      status,
      statusKind: statusOf(status)
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
    statusText: rest.replace(/[📋🚧✅]/gu, '').trim(),
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

/** @returns {{id: string|null, title: string, description: string, intro: string, storiesLine: string|null, statusLine: string|null, stories: object[], raw: string, warnings: string[]}} */
export function parseEpic(md) {
  const raw = String(md ?? '');
  const lines = raw.split(/\r?\n/);
  const warnings = [];
  const heading = lines.find((l) => /^#\s/.test(l))?.replace(/^#\s+/, '').trim() ?? '';
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
