import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/shared/i18n.js';
import { currentTip, formatCostPair, formatTime, formatTokens, stageStatusLabel, withSlots } from '../../src/renderer/format.js';

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

  it('US-0211: shows both figures from a $0.01 difference, only the recorded one below it (AC1.4.1, AC1.4.2)', async () => {
    expect(formatCostPair({ usd: 12.4, currentUsd: 9.8 })).toBe('registrerat $12.40 · till dagens priser $9.80');
    await i18n.changeLanguage('en');
    expect(formatCostPair({ usd: 12.4, currentUsd: 9.8 })).toBe('recorded $12.40 · at current prices $9.80');
    expect(formatCostPair({ usd: 12.4, currentUsd: 12.41 })).toBe('recorded $12.40 · at current prices $12.41');
    expect(formatCostPair({ usd: 12.4, currentUsd: 12.404 })).toBe('$12.40');
    expect(formatCostPair({ usd: 12.4 })).toBe('$12.40'); // no rate table: the recorded figure only
    expect(currentTip({ usd: 1, currentUsd: 2 })).toBe('At current prices: $2.00');
    expect(currentTip({ usd: 1, currentUsd: 1 })).toBeNull();
  });

  it('US-0211: keeps "price missing" when no table has a rate, and shows a current figure for a recorded one without price (AC1.3.3)', () => {
    expect(formatCostPair({ usd: 0, missingPrice: true, currentUsd: null })).toBe('pris saknas');
    expect(formatCostPair({ usd: 0, missingPrice: true, currentUsd: 2 })).toBe('registrerat pris saknas · till dagens priser $2.00');
    expect(formatCostPair(null)).toBe('–');
  });

  it('puts elements in place of placeholders without reading the text as markup (NFR4)', () => {
    const parts = withSlots('app.emptyText', { path: <code>aidlc/spaces/</code> });
    expect(parts[0]).toBe('Öppna en projektmapp som innehåller ');
    expect(parts[1].type).toBe('code');
    expect(parts[2]).toBe('.');
  });
});
