import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/shared/i18n.js';
import { formatTime, formatTokens, stageStatusLabel, withSlots } from '../../src/renderer/format.js';

const ISO = '2026-11-13T21:05:09Z';
afterEach(() => i18n.changeLanguage('sv'));

describe('format follows the language (EPIC-07 US-0701)', () => {
  it('formats a date as sv-SE under Swedish and as en under English (FR3.4, FR3.5)', async () => {
    const opts = { dateStyle: 'short', timeStyle: 'medium' };
    expect(formatTime(ISO)).toBe(new Date(ISO).toLocaleString('sv-SE', opts));
    await i18n.changeLanguage('en');
    expect(formatTime(ISO)).toBe(new Date(ISO).toLocaleString('en', opts));
    expect(formatTime(ISO)).not.toBe(new Date(ISO).toLocaleString('sv-SE', opts));
    expect(formatTime(null)).toBe('–');
    expect(formatTime('not a date')).toBe('not a date');
  });

  it('uses the language for numbers and labels, and shows an unknown status as null for the caller (FR1.1)', async () => {
    expect(formatTokens(1234)).toBe('1,2 k');
    expect(stageStatusLabel('done')).toBe('Klar');
    expect(stageStatusLabel('made-up')).toBeNull();
    await i18n.changeLanguage('en');
    expect(formatTokens(1234)).toBe('1.2 k');
    expect(stageStatusLabel('done')).toBe('Done');
  });

  it('puts elements in place of placeholders without reading the text as markup (NFR4)', () => {
    const parts = withSlots('app.emptyText', { path: <code>aidlc/spaces/</code> });
    expect(parts[0]).toBe('Öppna en projektmapp som innehåller ');
    expect(parts[1].type).toBe('code');
    expect(parts[2]).toBe('.');
  });
});
