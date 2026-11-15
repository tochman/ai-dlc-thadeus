import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadFeatures, loadStoryLinks } from '../../src/main/features.js';
import { epicStatusOf, parseEpic, parseOverview, statusOf, storyIdsIn } from '../../src/main/parsers/features.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
const FEATURES = path.join(FIXTURES, 'features');
const read = (rel) => fs.readFile(path.join(FEATURES, rel), 'utf8');

describe('feature docs parser', () => {
  it('reads epics from the overview table and stories, status and criteria from an epic file (FR1.2, FR1.3)', async () => {
    const overview = parseOverview(await read('FEATURES.md'));
    expect(overview.intro).toMatch(/^Översikt över alla epics/);
    expect(overview.epics.map((e) => [e.id, e.link, e.statusKind])).toEqual([
      ['EPIC-01', 'features/epic-01-alpha.md', 'progress'],
      ['EPIC-02', 'features/epic-02-odd.md', 'planned'],
      ['EPIC-03', '../../outside.md', 'done']
    ]);
    expect(overview.epics[0]).toMatchObject({ title: 'Alpha', topic: 'Alpha: grunden för appen', status: '🚧 Built, not released' });

    const epic = parseEpic(await read('features/epic-01-alpha.md'));
    expect(epic).toMatchObject({
      id: 'EPIC-01',
      title: 'Alpha',
      description: 'Alpha is the foundation: open a project and see what it contains.',
      storiesLine: 'US-0101, US-0102',
      statusLine: '🚧 Built, not released.',
      warnings: []
    });
    // The intro is everything between the title and `## User Stories`, kept as Markdown for the view.
    expect(epic.intro).toMatch(/^> Epic file — for an overview of all epics see \[FEATURES\.md\]\(\.\.\/FEATURES\.md\)\./);
    expect(epic.intro).toMatch(/\*\*Status \(2026-11-13\):\*\* 🚧 Built, not released\.$/);
    expect(epic.intro).not.toMatch(/User Stories|US-0101: Open/);
    const [first, second] = epic.stories;
    expect(first).toMatchObject({
      id: 'US-0101',
      title: 'Open a project',
      status: 'done',
      statusText: 'Done',
      priority: 'High',
      complexity: 'Low',
      done: 2,
      total: 2
    });
    expect(first).toMatchObject({ asA: 'developer', inOrderTo: 'see my work', wouldLike: 'open a project folder', dependencies: 'None', notes: null });
    expect(second).toMatchObject({ id: 'US-0102', status: 'progress', priority: 'Medium', notes: 'Read-only.', dependencies: 'US-0101', done: 1, total: 3 });
    expect(second.criteria[1]).toEqual({ checked: false, text: 'The list updates live' });
    expect(second.raw).toMatch(/^\*\*US-0102: Show the project contents\*\*/);
    expect(second.raw).not.toMatch(/US-0101: Open/);
  });

  it('gives an epic its badge from every marker in its status cell, not only the first', () => {
    const mixed = '✅ US-0401 released in v0.1.1. ✅ US-0405 done. 📋 US-0407 Planned for v0.2.3.';
    expect(statusOf(mixed)).toBe('done'); // the old first-marker reading that showed Done
    expect(epicStatusOf(mixed)).toBe('progress');
    expect(epicStatusOf('✅ US-0101 released. ✅ US-0102 released.')).toBe('done');
    expect(epicStatusOf('📋 US-0201 Planned. 📋 US-0202 Planned.')).toBe('planned');
    expect(epicStatusOf('✅ US-0301 released. 🚧 US-0302 in progress.')).toBe('progress');
    expect(epicStatusOf('🚧 Built, not released')).toBe('progress');
    expect(epicStatusOf('No markers here')).toBeNull();
    expect(epicStatusOf('')).toBeNull();
    expect(epicStatusOf(undefined)).toBeNull();

    const table = '| Epic | Topic | Status |\n|---|---|---|\n| EPIC-04 | Branding | ✅ US-0401 released · 📋 US-0407 Planned |';
    expect(parseOverview(table).epics[0].statusKind).toBe('progress');
  });

  it('reads 🚀 Deployed as the last status, after ✅ Done (US-0603 FR4.2, FR6)', () => {
    expect(statusOf('🚀 Deployed 2026-11-15')).toBe('deployed');
    expect(epicStatusOf('🚀 US-0101 deployed. 🚀 US-0102 deployed.')).toBe('deployed');
    expect(epicStatusOf('✅ US-0101 done. 🚀 US-0102 deployed.')).toBe('done');
    expect(epicStatusOf('🚀 US-0101 deployed. 🚧 US-0102 in progress.')).toBe('progress');
    const [story] = parseEpic('# EPIC-01: A\n\n**US-0101: Ship it** 🚀 Deployed\n- [x] x\n').stories;
    expect(story).toMatchObject({ status: 'deployed', statusText: 'Deployed' });
  });

  it('gives warnings instead of throwing for files that do not follow the format (FR1.4)', async () => {
    const odd = parseEpic(await read('features/epic-02-odd.md'));
    expect(odd.stories).toEqual([]);
    expect(odd.id).toBeNull();
    expect(odd.warnings).toEqual(['Epic-filen saknar rubrik.', 'Inga storys i formatet **US-XXYY: Titel** hittades.']);
    expect(odd.raw).toMatch(/A story written in another way/);

    for (const junk of [undefined, null, '', '| broken | table', '**US-1: x**', 42]) {
      expect(() => parseOverview(junk)).not.toThrow();
      expect(() => parseEpic(junk)).not.toThrow();
    }
    expect(parseOverview('# Title\n\nJust text.').warnings).toEqual(['Översikten har ingen tabell med epics.']);
  });

  it('loads the docs through projectAccess, reports a missing overview, and skips links outside the root (FR1.1, NFR2)', async () => {
    const root = await openRoot(FEATURES);
    const res = await loadFeatures(root, 'FEATURES.md');
    expect(res.available).toBe(true);
    expect(res.epics.map((e) => [e.id, e.file, e.parsed?.stories.length])).toEqual([
      ['EPIC-01', 'features/epic-01-alpha.md', 2],
      ['EPIC-02', 'features/epic-02-odd.md', 0]
    ]);
    expect(res.warnings).toEqual(['EPIC-03: länken ../../outside.md pekar utanför projektet och hoppas över.']);
    expect(res.overviewText).toMatch(/\| Epic \| Ämne \| Status \|/);

    expect(await loadFeatures(root)).toEqual({ available: false, overviewPath: 'docs/FEATURES.md' });
    expect((await loadFeatures(root, '../FEATURES.md')).reason).toMatch(/Ogiltig sökväg/);
    expect((await loadFeatures(root, '/etc/passwd.md')).available).toBe(false);
  });

  it('finds story ids and links stories to the intents that mention them (FR2.6)', async () => {
    expect(storyIdsIn('US-0201 and US-0201, US-0305; not US-12')).toEqual(['US-0201', 'US-0305']);
    expect(storyIdsIn(null)).toEqual([]);

    const root = await openRoot(path.join(FIXTURES, 'project'));
    const links = await loadStoryLinks(root, 'default', ['261110-epic02-finish', '261112-epic29-small-k2-fixes', '261105-ghost-intent']);
    expect(links['US-2939']).toEqual(['261112-epic29-small-k2-fixes']);
    expect(links['US-3711']).toEqual(['261110-epic02-finish']);
    expect(Object.values(links).flat()).not.toContain('261105-ghost-intent');
  });
});
