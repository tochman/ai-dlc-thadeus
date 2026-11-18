// US-0608 FR3.2, FR3.3: a feature-doc file is cut into story blocks (and table rows), so a story branch keeps only its own
// stories' changes and every other change goes to the app's branch, applied onto the target's text.
import { describe, expect, it } from 'vitest';
import { applyChange, splitChange, storyBlocks } from '../../src/main/parsers/features.js';

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
