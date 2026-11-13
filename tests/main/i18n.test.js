import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { resolveLanguage, t } from '../../src/shared/i18n.js';

afterEach(() => i18n.changeLanguage('sv'));

describe('i18n (EPIC-07 US-0701)', () => {
  it('picks the ICU plural form for n = 1 and n = 2 in Swedish and English (FR3.3, FR3.5)', async () => {
    expect(t('intents.timeline.newCount', { n: 1 })).toBe('1 ny händelse');
    expect(t('intents.timeline.newCount', { n: 2 })).toBe('2 nya händelser');
    await i18n.changeLanguage('en');
    expect(t('intents.timeline.newCount', { n: 1 })).toBe('1 new event');
    expect(t('intents.timeline.newCount', { n: 2 })).toBe('2 new events');
  });

  it('fills {placeholders} (FR3.2)', async () => {
    expect(t('intents.resume.atStage', { stage: 'Code Generation' })).toBe('Fortsätt vid Code Generation');
    await i18n.changeLanguage('en');
    expect(t('intents.step', { step: 3, total: 7 })).toBe('Step 3 of 7');
  });

  it('falls back to English for a key missing in Swedish, then to the key, never to an empty text (FR5.1)', () => {
    i18n.addResource('en', 'translation', 'test.onlyEnglish', 'Only in English');
    i18n.addResource('sv', 'translation', 'test.empty', '');
    i18n.addResource('en', 'translation', 'test.empty', 'Empty in Swedish');
    expect(i18n.language).toBe('sv');
    expect(t('test.onlyEnglish')).toBe('Only in English');
    expect(t('test.empty')).toBe('Empty in Swedish');
    expect(t('test.nowhere')).toBe('test.nowhere');
  });

  it('logs a missing key once per key and language in development (FR5.2)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    t('test.devMissing');
    t('test.devMissing');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/test\.devMissing.*sv/);
    await i18n.changeLanguage('en');
    t('test.devMissing');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('resolves auto from the OS locale and keeps an explicit choice (FR4.2, FR4.3)', () => {
    expect(resolveLanguage('auto', 'sv-SE')).toBe('sv');
    expect(resolveLanguage('auto', 'sv')).toBe('sv');
    expect(resolveLanguage('auto', 'de-DE')).toBe('en');
    expect(resolveLanguage('en', 'sv-SE')).toBe('en');
    expect(resolveLanguage('sv', 'en-US')).toBe('sv');
    // Anything invalid or missing is treated as auto.
    expect(resolveLanguage('klingon', 'sv-SE')).toBe('sv');
    expect(resolveLanguage(undefined, 'en-GB')).toBe('en');
    expect(resolveLanguage(undefined, undefined)).toBe('en');
  });
});
