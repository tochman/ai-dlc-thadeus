import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadFeatures } from '../../src/main/features.js';
import { readRuleStatus, setStoryRelease } from '../../src/main/releases.js';
import { buildReleases, lifecycleTag, releaseOf, releaseOptions, ruleStatus, setReleaseMarker } from '../../src/main/parsers/releases.js';
import { parseEpic } from '../../src/main/parsers/features.js';

// Lines shaped like docs/features/epic-06-feature-docs.md and its docs/FEATURES.md row (US-0603).
const EPIC = [
  '# EPIC-06: Feature Docs',
  '',
  '**Status (2026-11-15):** ✅ US-0601 and US-0602 released in v0.2.0. 🚧 US-0603 in progress, for v0.2.5 (releases or continuous deployment). 📋 US-0604 Planned for v0.2.6 (filter epics and stories). Both stories are built.',
  '',
  '## User Stories',
  '',
  '**US-0601: Offer feature docs** ✅ Released in v0.2.0',
  '- [x] done',
  '',
  '**US-0603: Releases or continuous deployment** 🚧 In progress, for v0.2.5 (intent `261115-release-handling`, ultra-express)',
  '- [ ] picker',
  '',
  '**US-0604: Filter epics and user stories** 📋 Planned',
  '- [ ] filter',
  ''
].join('\n');
const ROW =
  '| [EPIC-06](features/epic-06-feature-docs.md) | Feature Docs: view epics | ✅ Released in v0.2.0 (US-0601, US-0602) · 🚧 US-0603 in progress, for v0.2.5 (releases) · 📋 US-0604 Planned (filter) |';
const OVERVIEW = `# Features\n\n| Epic | Topic | Status |\n|---|---|---|\n${ROW}\n`;

/** Only the lines that differ, as [before, after]. */
const changed = (a, b) => {
  const x = a.split('\n');
  const y = b.split('\n');
  expect(y).toHaveLength(x.length);
  return x.map((l, i) => [l, y[i]]).filter(([l, m]) => l !== m);
};

describe('releaseOf', () => {
  it('reads a planned and a released version, case-insensitive (FR2.1, FR3.2)', () => {
    expect(releaseOf('🚧 In progress, for v0.2.5 (intent x)')).toEqual({ planned: 'v0.2.5', released: null });
    expect(releaseOf('📋 Planned for v0.2.6')).toEqual({ planned: 'v0.2.6', released: null });
    expect(releaseOf('✅ Released in v0.2.0')).toEqual({ planned: null, released: 'v0.2.0' });
    expect(releaseOf('✅ US-0601 released in v0.2.0')).toEqual({ planned: null, released: 'v0.2.0' });
    expect(releaseOf('📋 Planned')).toEqual({ planned: null, released: null });
    expect(releaseOf(undefined)).toEqual({ planned: null, released: null });
  });
});

describe('setReleaseMarker', () => {
  it('changes a version on the story line, the epic status line and the FEATURES.md row, and nothing else (FR2.2, NFR1)', () => {
    const epic = setReleaseMarker(EPIC, 'US-0603', 'v0.2.6');
    expect(changed(EPIC, epic)).toEqual([
      [
        expect.stringContaining('**Status'),
        '**Status (2026-11-15):** ✅ US-0601 and US-0602 released in v0.2.0. 🚧 US-0603 in progress, for v0.2.6 (releases or continuous deployment). 📋 US-0604 Planned for v0.2.6 (filter epics and stories). Both stories are built.'
      ],
      [
        expect.stringContaining('**US-0603'),
        '**US-0603: Releases or continuous deployment** 🚧 In progress, for v0.2.6 (intent `261115-release-handling`, ultra-express)'
      ]
    ]);
    const overview = setReleaseMarker(OVERVIEW, 'US-0603', 'v0.2.6');
    expect(overview).toBe(OVERVIEW.replace('US-0603 in progress, for v0.2.5', 'US-0603 in progress, for v0.2.6'));
  });

  it('adds ", for vX.Y.Z" before any "(" or at the end, and None removes it with its lead (FR2.2)', () => {
    const added = setReleaseMarker(EPIC, 'US-0604', 'v0.3.0');
    expect(changed(EPIC, added).map(([, b]) => b)).toEqual([
      expect.stringContaining('📋 US-0604 Planned for v0.3.0 (filter epics and stories). Both'),
      '**US-0604: Filter epics and user stories** 📋 Planned, for v0.3.0'
    ]);
    expect(setReleaseMarker(OVERVIEW, 'US-0604', 'v0.3.0')).toBe(OVERVIEW.replace('US-0604 Planned (filter)', 'US-0604 Planned, for v0.3.0 (filter)'));

    const removed = setReleaseMarker(EPIC, 'US-0603', null);
    expect(changed(EPIC, removed).map(([, b]) => b)).toEqual([
      expect.stringContaining('🚧 US-0603 in progress (releases or continuous deployment). 📋 US-0604 Planned for v0.2.6'),
      '**US-0603: Releases or continuous deployment** 🚧 In progress (intent `261115-release-handling`, ultra-express)'
    ]);
    expect(setReleaseMarker(added, 'US-0604', null)).toBe(EPIC.replace('Planned for v0.2.6 (filter', 'Planned (filter'));
  });

  it('leaves released stories, other stories and unknown ids alone, and refuses a bad version', () => {
    expect(setReleaseMarker(EPIC, 'US-0601', 'v0.3.0')).toBe(EPIC);
    expect(setReleaseMarker(EPIC, 'US-0999', 'v0.3.0')).toBe(EPIC);
    expect(setReleaseMarker(EPIC, 'US-0603', 'v0.2.5')).toBe(EPIC);
    expect(() => setReleaseMarker(EPIC, 'US-0603', '0.2.6')).toThrow();
    expect(() => setReleaseMarker(EPIC, 'US-0603', 'v0.2.6; rm')).toThrow();
  });
});

const epicsOf = (md) => [{ id: 'EPIC-06', parsed: parseEpic(md) }];
const TAGS = [
  { name: 'v0.2.0', date: '2026-11-10' },
  { name: 'v0.2.4', date: '2026-11-14' },
  { name: 'v0.10.0-rc1', date: '2026-11-14' }
];

describe('releaseOptions', () => {
  it('offers planned versions, then the next patch and minor after the latest tag, newest first, deduplicated (FR2.1)', () => {
    const md = EPIC.replace('📋 Planned\n', '📋 Planned, for v0.2.5\n');
    expect(releaseOptions(epicsOf(md), TAGS)).toEqual(['v0.3.0', 'v0.2.5']);
    expect(releaseOptions(epicsOf(EPIC.replace('for v0.2.5 (intent', 'for v0.4.1 (intent')), TAGS)).toEqual(['v0.4.1', 'v0.3.0', 'v0.2.5']);
  });

  it('offers only planned versions without tags, and nothing for no docs (NFR2)', () => {
    expect(releaseOptions(epicsOf(EPIC), [])).toEqual(['v0.2.5']);
    expect(releaseOptions([], undefined)).toEqual([]);
  });
});

describe('buildReleases', () => {
  it('lists each release from markers and tags, newest first, with the tag date and its stories (FR3.2)', () => {
    const list = buildReleases(epicsOf(EPIC), TAGS);
    expect(list.map((r) => [r.version, r.released, r.date, r.stories.map((s) => s.story.id)])).toEqual([
      ['v0.2.5', false, null, ['US-0603']],
      ['v0.2.4', true, '2026-11-14', []],
      ['v0.2.0', true, '2026-11-10', ['US-0601']]
    ]);
    expect(list[0].stories[0]).toMatchObject({ epicId: 'EPIC-06', stale: false });
  });

  it('flags a story still marked "for vX.Y.Z" when that tag exists (FR7)', () => {
    const list = buildReleases(epicsOf(EPIC), [...TAGS, { name: 'v0.2.5', date: '2026-11-16' }]);
    expect(list[0]).toMatchObject({ version: 'v0.2.5', released: true, date: '2026-11-16' });
    expect(list[0].stories[0]).toMatchObject({ stale: true });
    expect(list.find((r) => r.version === 'v0.2.0').stories[0].stale).toBe(false);
  });
});

describe('ruleStatus', () => {
  const tagged = (d, v = 1) => `## Mandated\n\n- ALWAYS follow the story lifecycle. (story-lifecycle: ${d} v${v}) (affirmed 2026-11-15)\n`;
  it('tells current, missing, older and other apart (FR5.1, FR5.2)', () => {
    expect(lifecycleTag('releases')).toBe('(story-lifecycle: releases v1)');
    expect(lifecycleTag('continuous')).toBe('(story-lifecycle: continuous v1)');
    expect(ruleStatus(tagged('releases'), 'releases')).toBe('current');
    expect(ruleStatus(tagged('continuous'), 'continuous')).toBe('current');
    expect(ruleStatus(tagged('releases'), 'continuous')).toBe('other');
    expect(ruleStatus(tagged('releases', 0), 'releases')).toBe('older');
    // The untagged rule from v0.2.3 names the three markers.
    expect(ruleStatus('- ALWAYS följa storyns livscykel: 📋, 🚧 Pågående, ✅ Klar, "for vX.Y.Z".', 'releases')).toBe('older');
    expect(ruleStatus('# Project rules\n\nNothing here.', 'releases')).toBe('missing');
    expect(ruleStatus('', 'releases')).toBe('missing');
    expect(ruleStatus(null, 'continuous')).toBe('missing');
  });
});

describe('setStoryRelease and readRuleStatus in a project (US-0603 FR2.3, FR2.4, FR5.2)', () => {
  const EPIC_REL = 'docs/features/epic-06-feature-docs.md';
  let tmp;
  let root;
  const put = async (rel, text) => {
    await fs.mkdir(path.dirname(path.join(tmp, rel)), { recursive: true });
    await fs.writeFile(path.join(tmp, rel), text);
  };
  const get = (rel) => fs.readFile(path.join(tmp, rel), 'utf8');
  const hashes = async () => {
    const f = await loadFeatures(root);
    return { overviewHash: f.overviewHash, epicHash: f.epics[0].hash };
  };

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'releases-'));
    await put('docs/FEATURES.md', OVERVIEW);
    await put(EPIC_REL, EPIC);
    root = await openRoot(tmp);
  });
  afterEach(() => fs.rm(tmp, { recursive: true, force: true }));

  it('writes the marker into the epic file and the overview, byte for byte as setReleaseMarker gives it', async () => {
    expect(await setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0604', version: 'v0.3.0', ...(await hashes()) })).toEqual({ ok: true });
    expect(await get(EPIC_REL)).toBe(setReleaseMarker(EPIC, 'US-0604', 'v0.3.0'));
    expect(await get('docs/FEATURES.md')).toBe(setReleaseMarker(OVERVIEW, 'US-0604', 'v0.3.0'));
    expect(await setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0604', version: null, ...(await hashes()) })).toEqual({ ok: true });
    expect(await get(EPIC_REL)).toBe(EPIC.replace('Planned for v0.2.6 (filter', 'Planned (filter'));
  });

  it('refuses a file changed since it was read, and leaves it as it is on disk', async () => {
    const old = await hashes();
    const edited = EPIC.replace('- [ ] filter', '- [x] filter');
    await put(EPIC_REL, edited);
    expect(await setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0603', version: 'v0.2.6', ...old })).toEqual({ conflict: EPIC_REL });
    expect(await get(EPIC_REL)).toBe(edited);
    expect(await get('docs/FEATURES.md')).toBe(OVERVIEW);
  });

  it('refuses a released story, an unknown story and a bad version', async () => {
    const h = await hashes();
    await expect(setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0601', version: 'v0.3.0', ...h })).rejects.toThrow(/v0\.2\.0/);
    await expect(setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0999', version: 'v0.3.0', ...h })).rejects.toThrow(/US-0999/);
    await expect(setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0603', version: '1.0', ...h })).rejects.toThrow();
    expect(await get(EPIC_REL)).toBe(EPIC);
  });

  it('reads the rule status from the space memory; a missing file is missing and a bad space is refused', async () => {
    expect(await readRuleStatus(root, 'default', 'releases')).toBe('missing');
    await put('aidlc/spaces/default/memory/project.md', `- ALWAYS keep stories current. ${lifecycleTag('releases')}\n`);
    expect(await readRuleStatus(root, 'default', 'releases')).toBe('current');
    expect(await readRuleStatus(root, 'default', 'continuous')).toBe('other');
    await expect(readRuleStatus(root, '../x', 'releases')).rejects.toThrow();
    await expect(readRuleStatus(root, 'default', 'weekly')).rejects.toThrow();
  });
});
