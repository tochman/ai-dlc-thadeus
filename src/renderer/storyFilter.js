// Story filter (EPIC-06 US-0604): one pure filter, shared by the Epics tab's filter bar and each epic's page, so
// the two always agree (FR3). No React, so it is tested on its own.
import { buildReleases, releaseOf } from '../main/parsers/releases.js';

/** US-0604 FR4.1: the five states a story can be filtered by. */
export const STATES = ['planned', 'progress', 'done', 'released', 'deployed'];
/** US-0604 FR4.2: the release filter's value for a story with no planned or released version. */
export const NO_RELEASE = '-';
/** US-0604 FR5: every filter empty; the view starts from this each time it opens. */
export const EMPTY_FILTERS = Object.freeze({ state: '', release: '', epic: '', priority: '', complexity: '', text: '' });

/** US-0604 FR4.1: 'released' for a "Released in vX.Y.Z" story, else the parser's status. */
export const storyState = (story) => (releaseOf(story.statusText).released ? 'released' : story.status);

/** US-0604 FR1.1: every story of every epic, with the epic it belongs to. */
export const storyRows = (epics) =>
  (epics ?? []).flatMap((e) => (e.parsed?.stories ?? []).map((story) => ({ epicId: e.id, epicTitle: e.parsed.title || e.title, story })));

const distinct = (values) => [...new Set(values.filter(Boolean))];

/** US-0604 FR4.2, FR4.3: only the epics, priorities, complexities and versions found in the docs, and the states. */
export function filterOptions(epics, tags, plans = []) {
  const rows = storyRows(epics);
  return {
    states: STATES,
    epics: (epics ?? []).filter((e) => e.parsed?.stories?.length).map((e) => ({ id: e.id, title: e.parsed.title || e.title })),
    priorities: distinct(rows.map((r) => r.story.priority)),
    complexities: distinct(rows.map((r) => r.story.complexity)),
    releases: [...buildReleases(epics, tags, plans).map((r) => r.version), NO_RELEASE]
  };
}

/** US-0604 FR1.2: whether any filter is set; whitespace alone is no text. */
export const isActive = (filters) => Object.entries(filters).some(([key, value]) => (key === 'text' ? value.trim() : value) !== '');

const versionOf = (story) => {
  const { planned, released } = releaseOf(story.statusText);
  return released ?? planned ?? NO_RELEASE;
};

/** US-0604 FR3, FR4.4: every set filter must equal the story's own value; text is a case-insensitive search. */
export function matches({ epicId, story }, filters) {
  const { state, release, epic, priority, complexity } = filters;
  const text = filters.text.trim().toLowerCase();
  if (state && storyState(story) !== state) return false;
  if (release && versionOf(story) !== release) return false;
  if (epic && epicId !== epic) return false;
  if (priority && story.priority !== priority) return false;
  if (complexity && story.complexity !== complexity) return false;
  return !text || `${story.title}\n${story.raw}`.toLowerCase().includes(text);
}
