// US-0604: the shared story filter, over plain story objects shaped like the parser's.
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, NO_RELEASE, STATES, filterOptions, isActive, matches, storyRows, storyState } from '../../src/renderer/storyFilter.js';

const story = (id, fields = {}) => ({
  id,
  title: `Story ${id}`,
  raw: `**${id}: Story ${id}**`,
  status: 'planned',
  statusText: 'Planned',
  priority: null,
  complexity: null,
  ...fields
});
const released = story('US-0101', { title: 'Open a project', status: 'done', statusText: 'Released in v0.2.6', priority: 'High', complexity: 'Low' });
const done = story('US-0102', { status: 'done', statusText: 'Done', priority: 'Medium', complexity: 'High' });
const planned = story('US-0201', { statusText: 'Planned, for v0.2.7', priority: 'High', complexity: 'Medium', raw: 'Show the GIT branch' });
const progress = story('US-0202', { status: 'progress', statusText: 'In progress' }); // no priority, no complexity
const EPICS = [
  { id: 'EPIC-01', parsed: { title: 'Alpha', stories: [released, done] } },
  { id: 'EPIC-02', parsed: { title: 'Beta', stories: [planned, progress] } },
  { id: 'EPIC-03', parsed: null } // an unreadable epic has no stories
];
const rows = storyRows(EPICS);
const ids = (filters) => rows.filter((r) => matches(r, { ...EMPTY_FILTERS, ...filters })).map((r) => r.story.id);

describe('storyFilter (US-0604)', () => {
  it('gives released for a "Released in" story, done for a done one without it, the parser status otherwise (FR4.1)', () => {
    expect(STATES).toEqual(['planned', 'progress', 'done', 'released', 'deployed']);
    expect(storyState(released)).toBe('released');
    expect(storyState(done)).toBe('done');
    expect(storyState(planned)).toBe('planned');
    expect(storyState(story('US-0301', { status: 'deployed', statusText: 'Deployed' }))).toBe('deployed');
    expect(rows.map((r) => [r.epicId, r.epicTitle, r.story.id])).toEqual([
      ['EPIC-01', 'Alpha', 'US-0101'],
      ['EPIC-01', 'Alpha', 'US-0102'],
      ['EPIC-02', 'Beta', 'US-0201'],
      ['EPIC-02', 'Beta', 'US-0202']
    ]);
  });

  it('offers only the epics, priorities, complexities and versions that occur, plus No release (FR4.2, FR4.3)', () => {
    const opts = filterOptions(EPICS, [{ name: 'v0.2.6', date: '2026-11-15' }], [{ version: 'v0.2.8', file: 'docs/releases/0.2.8.md', hash: 'h' }]);
    expect(opts.epics).toEqual([
      { id: 'EPIC-01', title: 'Alpha' },
      { id: 'EPIC-02', title: 'Beta' }
    ]);
    expect(opts.priorities).toEqual(['High', 'Medium']);
    expect(opts.complexities).toEqual(['Low', 'High', 'Medium']);
    expect(opts.releases).toEqual(['v0.2.8', 'v0.2.7', 'v0.2.6', NO_RELEASE]);
    expect(opts.states).toBe(STATES);
  });

  it('matches each field on its own: state, release, No release, epic, priority, complexity (FR3)', () => {
    expect(ids({ state: 'released' })).toEqual(['US-0101']);
    expect(ids({ state: 'done' })).toEqual(['US-0102']);
    expect(ids({ release: 'v0.2.7' })).toEqual(['US-0201']);
    expect(ids({ release: 'v0.2.6' })).toEqual(['US-0101']);
    expect(ids({ release: NO_RELEASE })).toEqual(['US-0102', 'US-0202']);
    expect(ids({ epic: 'EPIC-02' })).toEqual(['US-0201', 'US-0202']);
    expect(ids({ priority: 'High' })).toEqual(['US-0101', 'US-0201']);
    expect(ids({ complexity: 'High' })).toEqual(['US-0102']);
  });

  it('combines two fields as AND (FR3)', () => {
    expect(ids({ priority: 'High', epic: 'EPIC-02' })).toEqual(['US-0201']);
    expect(ids({ priority: 'High', state: 'done' })).toEqual([]);
  });

  it('searches the title and the story text, ignoring case (FR4.4)', () => {
    expect(ids({ text: 'open A PROJECT' })).toEqual(['US-0101']);
    expect(ids({ text: 'git branch' })).toEqual(['US-0201']);
    expect(ids({ text: '  ' })).toEqual(['US-0101', 'US-0102', 'US-0201', 'US-0202']);
    expect(ids({ text: 'nowhere' })).toEqual([]);
  });

  it('a story without priority or complexity fails only when that filter is set (assumption 3)', () => {
    expect(ids({ state: 'progress' })).toEqual(['US-0202']);
    expect(ids({ state: 'progress', priority: 'High' })).toEqual([]);
    expect(ids({ state: 'progress', complexity: 'Low' })).toEqual([]);
  });

  it('isActive is false for the empty filters and whitespace, true for text or any set field', () => {
    expect(isActive(EMPTY_FILTERS)).toBe(false);
    expect(isActive({ ...EMPTY_FILTERS, text: '   ' })).toBe(false);
    expect(isActive({ ...EMPTY_FILTERS, text: 'x' })).toBe(true);
    for (const key of ['state', 'release', 'epic', 'priority', 'complexity']) expect(isActive({ ...EMPTY_FILTERS, [key]: 'v' })).toBe(true);
  });
});
