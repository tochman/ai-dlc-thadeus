// US-0508 FR1.6: mergeIntents shows an intent's display name as its slug and keeps AI-DLC's slug as aidlcSlug.
import { describe, expect, it } from 'vitest';
import { mergeIntents } from '../../src/main/parsers/intents.js';

const index = [
  { dirName: '261123-rename-and-clean', slug: 'rename-and-clean' },
  { dirName: '261122-other', slug: 'other' }
];
const disk = ['261123-rename-and-clean', '261122-other', '261121-disk-only'];

describe('mergeIntents with display names (US-0508)', () => {
  it('sets slug to the display name and keeps the original as aidlcSlug; dirName is unchanged', () => {
    const list = mergeIntents(index, disk, null, { '261122-other': 'tidy-up', '261121-disk-only': 'found-it' });
    const by = Object.fromEntries(list.map((i) => [i.dirName, i]));
    expect(by['261122-other']).toMatchObject({ slug: 'tidy-up', aidlcSlug: 'other', dirName: '261122-other' });
    expect(by['261121-disk-only']).toMatchObject({ slug: 'found-it', aidlcSlug: 'disk-only', missingInIndex: true });
    expect(by['261123-rename-and-clean']).toMatchObject({ slug: 'rename-and-clean', aidlcSlug: 'rename-and-clean' });
  });

  it('with no names, the slugs are as before', () => {
    const list = mergeIntents(index, disk, null);
    expect(list.map((i) => [i.slug, i.aidlcSlug])).toEqual([
      ['rename-and-clean', 'rename-and-clean'],
      ['other', 'other'],
      ['disk-only', 'disk-only']
    ]);
  });

  it('ignores a name for an intent that does not exist', () => {
    const list = mergeIntents(index, disk, null, { '261101-gone': 'ghost' });
    expect(list.map((i) => i.dirName)).not.toContain('261101-gone');
    expect(list.map((i) => i.slug)).not.toContain('ghost');
  });
});
