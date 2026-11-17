// US-0606 FR2.4: stories added to a release are written into the slice table of docs/releases/X.Y.Z.md.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadFeatures } from '../../src/main/features.js';
import { setStoryRelease } from '../../src/main/releases.js';
import { addPlanRows } from '../../src/main/parsers/releases.js';

const STORY = {
  id: 'US-0607',
  epicId: 'EPIC-06',
  epicLink: '../features/epic-06-feature-docs.md',
  title: 'Release planning is kept | pushed',
  priority: 'High',
  complexity: 'Medium',
  dependencies: 'US-0606',
  status: '📋 Planned'
};

const PLAN = [
  '# Release plan v0.2.9',
  '',
  '## The v0.2.9 slice',
  '',
  '| Story | Epic | Title | Priority | Complexity | Depends on | Status |',
  '|-------|------|-------|----------|------------|------------|--------|',
  '| US-0303 | [03](../features/epic-03-audit-timeline.md) | Velocity | Medium | Large | US-0104 ✅ | ✅ Done |',
  '',
  'US-0607 waits for US-0606.',
  '',
  '| # | Story | Why |',
  '|---|-------|-----|',
  '| 1 | US-0303 | first |',
  ''
].join('\n');

describe('addPlanRows (US-0606 FR2.4)', () => {
  it('adds a row to the slice table with epic, title, priority, complexity and dependencies', () => {
    const lines = addPlanRows(PLAN, [STORY]).split('\n');
    expect(lines[7]).toBe(
      '| US-0607 | [06](../features/epic-06-feature-docs.md) | Release planning is kept \\| pushed | High | Medium | US-0606 | 📋 Planned |'
    );
  });

  it('leaves every other line of the file as it was', () => {
    const before = PLAN.split('\n');
    const after = addPlanRows(PLAN, [STORY, { ...STORY, id: 'US-0606', priority: null }]).split('\n');
    expect(after).toHaveLength(before.length + 2);
    expect([...after.slice(0, 7), ...after.slice(9)]).toEqual(before);
    expect(after[8]).toContain('| US-0606 |');
    expect(after[8]).toContain('| – |');
  });

  it('creates the table under a heading-only file', () => {
    expect(addPlanRows('# Release plan v1.0.0\n', [STORY])).toBe(
      [
        '# Release plan v1.0.0',
        '',
        '| Story | Epic | Title | Priority | Complexity | Depends on |',
        '|---|---|---|---|---|---|',
        '| US-0607 | [06](../features/epic-06-feature-docs.md) | Release planning is kept \\| pushed | High | Medium | US-0606 |',
        ''
      ].join('\n')
    );
  });

  it('skips a story the slice table already lists', () => {
    expect(addPlanRows(PLAN, [{ ...STORY, id: 'US-0303' }])).toBe(PLAN);
  });
});

describe('setStoryRelease and the plan file (US-0606 FR2.4)', () => {
  let tmp;
  let root;
  const put = async (rel, text) => {
    await fs.mkdir(path.dirname(path.join(tmp, rel)), { recursive: true });
    await fs.writeFile(path.join(tmp, rel), text);
  };
  const get = (rel) => fs.readFile(path.join(tmp, rel), 'utf8');
  const hashes = async () => {
    const f = await loadFeatures(root, 'docs/FEATURES.md');
    return { epicHash: f.epics[0].hash, overviewHash: f.overviewHash };
  };

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'releases-plan-'));
    await put('docs/FEATURES.md', '# Features\n\n| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-01](features/epic-01.md) | One | 📋 US-0101 Planned |\n');
    await put(
      'docs/features/epic-01.md',
      '# EPIC-01: One\n\n## User Stories\n\n**US-0101: First story** 📋 Planned\n- **Priority:** High\n- **Complexity:** Low\n- **Dependencies:** US-0001\n'
    );
    root = await openRoot(tmp);
  });
  afterEach(() => fs.rm(tmp, { recursive: true, force: true }));

  it('writes the story into the plan file when a version is set, creating the file when it is missing', async () => {
    await setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0101', version: 'v1.0.0', ...(await hashes()) });
    expect(await get('docs/releases/1.0.0.md')).toBe(
      '# Release plan v1.0.0\n\n| Story | Epic | Title | Priority | Complexity | Depends on |\n|---|---|---|---|---|---|\n' +
        '| US-0101 | [01](../features/epic-01.md) | First story | High | Low | US-0001 |\n'
    );
  });

  it('leaves the plan file alone when a story is removed from its release', async () => {
    await setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0101', version: 'v1.0.0', ...(await hashes()) });
    const plan = await get('docs/releases/1.0.0.md');
    await setStoryRelease(root, 'docs/FEATURES.md', { storyId: 'US-0101', version: null, ...(await hashes()) });
    expect(await get('docs/releases/1.0.0.md')).toBe(plan);
    expect(await get('docs/features/epic-01.md')).toContain('**US-0101: First story** 📋 Planned\n');
  });
});
