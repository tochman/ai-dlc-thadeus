// US-0608 FR3.2, FR3.3: a feature-doc file is cut into story blocks (and table rows), so a story branch keeps only its own
// stories' changes and every other change goes to the app's branch, applied onto the target's text.
import { describe, expect, it } from 'vitest';
import { applyChange, overlayOwn, splitChange, storyBlocks } from '../../src/main/parsers/features.js';

const EPIC = [
  '# EPIC-06: Feature docs',
  '',
  '**Status (2026-11-18):** 🚧 US-0608 in progress.',
  '',
  '## User Stories',
  '',
  '**US-0608: Planning changes are kept** 🚧 In progress',
  '- [ ] AC1',
  '',
  '**US-0999: Another story** 📋 Planned',
  '- [ ] AC1',
  ''
].join('\n');
const OVERVIEW =
  '# Features\n\n| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-06](features/epic-06.md) | Docs | 🚧 US-0608 |\n| [EPIC-09](features/epic-09.md) | Nine | 📋 US-0901 |\n';

describe('storyBlocks (US-0608 FR3.2)', () => {
  it('cuts an epic into its text and one block per story, and joins back to the same text', () => {
    const blocks = storyBlocks(EPIC);
    expect(blocks.map((b) => b.key)).toEqual(['~', 'US-0608', 'US-0999']);
    expect(blocks[1].text).toBe('**US-0608: Planning changes are kept** 🚧 In progress\n- [ ] AC1\n');
    expect(blocks.map((b) => b.text).join('\n')).toBe(EPIC);
  });

  it('cuts the overview into one block per table row, keyed by the id it names', () => {
    const blocks = storyBlocks(OVERVIEW);
    expect(blocks.map((b) => b.key)).toEqual(['~', 'row:EPIC-06', 'row:EPIC-09', '~row:EPIC-09']);
    expect(blocks[1].ids).toEqual(['US-0608']);
    expect(blocks.map((b) => b.text).join('\n')).toBe(OVERVIEW);
  });
});

describe('splitChange and applyChange (US-0608 FR3.2, FR3.3, AC1.3.3)', () => {
  const work = EPIC.replace('- [ ] AC1\n\n**US-0999', '- [x] AC1\n\n**US-0999').replace(
    '**US-0999: Another story** 📋 Planned',
    '**US-0999: Another story** 📋 Planned, for v1.0.0'
  );

  it('keeps the own block in the story tree and returns only the other block as a change', () => {
    const { keep, changes } = splitChange(EPIC, work, ['US-0608']);
    expect(keep).toBe(EPIC.replace('- [ ] AC1\n\n**US-0999', '- [x] AC1\n\n**US-0999'));
    expect(changes).toEqual([expect.objectContaining({ key: 'US-0999', ids: ['US-0999'], after: expect.stringContaining('for v1.0.0') })]);
  });

  it('applies the other change onto a target that moved on elsewhere, and names a block that moved on as a conflict', () => {
    const { changes } = splitChange(EPIC, work, ['US-0608']);
    const target = EPIC.replace('**Status (2026-11-18):** 🚧 US-0608 in progress.', '**Status (2026-11-19):** moved on.');
    expect(applyChange(target, changes)).toEqual({ text: target.replace('📋 Planned\n', '📋 Planned, for v1.0.0\n'), conflicts: [] });
    const clash = EPIC.replace('**US-0999: Another story** 📋 Planned', '**US-0999: Another story** 🚧 In progress');
    expect(applyChange(clash, changes).conflicts).toEqual(['US-0999']);
  });

  it('a new story and a file that is not on the target are other changes; nothing changed gives no change', () => {
    const added = `${EPIC}\n**US-1000: New one** 📋 Planned\n`;
    const { keep, changes } = splitChange(EPIC, added, ['US-0608']);
    expect(keep).toBe(EPIC);
    expect(applyChange(EPIC, changes).text).toBe(added);
    expect(applyChange(null, splitChange('', '# Release plan v1.0.0\n', []).changes).text).toBe('# Release plan v1.0.0\n');
    expect(splitChange(EPIC, EPIC, []).changes).toEqual([]);
  });
});

// US-0036 FR2.1: on a story branch the view shows the target's text with the branch's own story blocks on top.
describe('overlayOwn (US-0036 FR2.1)', () => {
  const target = EPIC.replace('**Status (2026-11-18):** 🚧 US-0608 in progress.', '**Status (2026-11-20):** moved on.').replace(
    '**US-0999: Another story** 📋 Planned',
    '**US-0999: Another story** 📋 Planned, for v0.2.13'
  );

  it('an own block that differs replaces the target block', () => {
    const work = EPIC.replace('- [ ] AC1\n\n**US-0999', '- [x] AC1\n\n**US-0999');
    expect(overlayOwn(target, work, ['US-0608'])).toBe(target.replace('- [ ] AC1\n\n**US-0999', '- [x] AC1\n\n**US-0999'));
  });

  it('an own block the target lacks is inserted after the block it follows', () => {
    const work = EPIC.replace('**US-0999', '**US-1000: Mine** 🚧 In progress\n- [ ] AC1\n\n**US-0999');
    expect(overlayOwn(target, work, ['US-1000'])).toBe(target.replace('**US-0999', '**US-1000: Mine** 🚧 In progress\n- [ ] AC1\n\n**US-0999'));
  });

  it("other stories' blocks and the text between them keep the target's text", () => {
    const work = EPIC.replace('- [ ] AC1\n\n**US-0999', '- [x] AC1\n\n**US-0999');
    const out = overlayOwn(target, work, ['US-0608']);
    expect(out).toContain('**Status (2026-11-20):** moved on.');
    expect(out).toContain('**US-0999: Another story** 📋 Planned, for v0.2.13');
  });

  it('with no own ids the target comes back unchanged', () => {
    expect(overlayOwn(target, EPIC, [])).toBe(target);
    expect(overlayOwn(target, null, ['US-0608'])).toBe(target);
  });
});

// US-0033: `named` is what the commit subject names: a story by its heading, a story row by its key, and for any other
// block only the stories whose own clause changed. The cases are commits 3349d29 and b2ed89e.
describe('splitChange names only the stories that changed (US-0033)', () => {
  const namedOf = (head, work, own = []) => [...new Set(splitChange(head, work, own).changes.flatMap((c) => c.named))];
  const E0 = [
    '# EPIC-00: Fixes',
    '',
    '**Stories:** US-0001, US-0002, US-0031',
    '',
    '**Status (2026-11-19):** ✅ US-0001–US-0002 released (v0.2.3). ✅ US-0031 released in v0.2.10. Each story names its release.',
    '',
    '## User Stories',
    '',
    '**US-0031: The dialog opens on the newest page** ✅ Released in v0.2.10',
    '- **Dependencies:** US-0506, US-0026',
    ''
  ].join('\n');
  const lines = E0.replace('US-0002, US-0031', 'US-0002, US-0031, US-0032').replace('v0.2.10. Each', 'v0.2.10. 🚧 US-0032 in progress. Each');
  const added = `${lines}\n**US-0032: The app never commits a change it did not make** 📋 Planned\n- **Dependencies:** US-0608\n`;
  const ROW = (s) => `| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-00](features/epic-00-fixes.md) | Fixes | ✅ US-0031 released in v0.2.10 · ${s} |\n`;

  it('AC1: a changed story block names its heading, not the stories its Background or Dependencies mention', () => {
    const head = '**US-1405: Set up Spec Kit** 📋 Planned\n- [ ] AC1\n- **Background:** follows US-1401.\n- **Dependencies:** US-0503\n';
    expect(namedOf(head, head.replace('- [ ] AC1', '- [x] AC1'))).toEqual(['US-1405']);
  });

  it('AC1 (3349d29): a new release plan names its story rows, not the stories in their Depends on cell', () => {
    const plan = [
      '# Release plan v0.2.11',
      '',
      '> Previous release: v0.2.10.',
      '',
      '| Story | Epic | Title | Priority | Complexity | Depends on |',
      '|---|---|---|---|---|---|',
      '| US-1401 | [14](../features/epic-14-spec-kit.md) | One framework per project | High | Medium | — |',
      '| US-1405 | [14](../features/epic-14-spec-kit.md) | Set up Spec Kit | Medium | Medium | US-0503 |',
      ''
    ].join('\n');
    expect(namedOf('', plan)).toEqual(['US-1401', 'US-1405']);
    const row = plan.split('\n')[7];
    expect(namedOf(plan, plan.replace(row, row.replace('Medium | Medium', 'High | Medium')))).toEqual(['US-1405']);
  });

  it('AC2, AC3 (b2ed89e): the Stories and Status lines, a FEATURES.md row and a new story name the new story alone', () => {
    expect(splitChange(E0, lines, []).changes.map((c) => c.named)).toEqual([['US-0032']]);
    expect(namedOf(ROW('🚧 US-0032 in progress, for v0.2.11'), ROW('✅ US-0032 done, for v0.2.11'))).toEqual(['US-0032']);
    expect(namedOf(E0, added)).toEqual(['US-0032']);
  });

  it('AC2: a changed block where no clause with a story changed names nothing', () => {
    expect(splitChange(E0, E0.replace('(2026-11-19)', '(2026-11-20)'), []).changes.map((c) => c.named)).toEqual([[]]);
    expect(namedOf(ROW('🚧 US-0032 in progress'), ROW('🚧 US-0032 in progress').replace('| Fixes |', '| Fixes and chores |'))).toEqual([]);
  });

  it('AC5: the story-branch split keeps deciding by `ids`, as before', () => {
    expect(splitChange(E0, added, ['US-0032'])).toEqual({ keep: added, changes: [] });
    const { keep, changes } = splitChange(E0, added, ['US-0999']);
    expect(keep).toBe(E0);
    expect(changes.map((c) => [c.key, c.ids])).toEqual([
      ['~', ['US-0001', 'US-0002', 'US-0031', 'US-0032']],
      ['US-0032', ['US-0032']]
    ]);
  });
});
