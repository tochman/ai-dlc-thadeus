import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/shared/i18n.js';
import { featureDocsPrompt, lifecycleRulePrompt } from '../../src/renderer/featureDocsPrompt.js';
import { lifecycleTag } from '../../src/main/parsers/releases.js';

afterEach(() => i18n.changeLanguage('sv'));

// The rule the app asks the agent to save must carry the whole story lifecycle, for every harness (v0.2.3).
describe('feature-docs prompt carries the story lifecycle rule', () => {
  for (const lang of ['sv', 'en']) {
    it(`asks for 🚧 at start, ✅ when done and the release, through AI-DLC's rules (${lang})`, async () => {
      await i18n.changeLanguage(lang);
      for (const prompt of [featureDocsPrompt({ exists: false }), featureDocsPrompt({ exists: true, path: 'docs/FEATURES.md' })]) {
        expect(prompt).toContain('🚧');
        expect(prompt).toContain('✅');
        expect(prompt).toContain('for vX.Y.Z');
        expect(prompt).toContain('Released in vX.Y.Z');
        expect(prompt).toMatch(/AI-DLC/);
        expect(prompt).toMatch(/opencode/);
        expect(prompt).not.toMatch(/\n/); // a newline would send it in the terminal
      }
    });
  }

  for (const lang of ['sv', 'en']) {
    it(`the rule follows the delivery setting and ends with its tag, also in the setup prompt (US-0603 FR5.1, ${lang})`, async () => {
      await i18n.changeLanguage(lang);
      const releases = lifecycleRulePrompt('releases');
      const continuous = lifecycleRulePrompt('continuous');
      expect(releases).toContain(lifecycleTag('releases'));
      expect(releases).toContain('Released in vX.Y.Z');
      expect(releases).not.toContain('🚀');
      expect(continuous).toContain(lifecycleTag('continuous'));
      expect(continuous).toContain('🚀 Deployed');
      expect(continuous).not.toContain('for vX.Y.Z');
      for (const p of [releases, continuous]) expect(p).not.toMatch(/\n/);
      expect(featureDocsPrompt({ exists: true })).toContain(lifecycleTag('releases'));
      expect(featureDocsPrompt({ exists: false, delivery: 'continuous' })).toContain(lifecycleTag('continuous'));
    });
  }

  // US-0014: AI-DLC's save command only adds rules, so the old lifecycle rule is the one line taken out by hand.
  for (const [lang, byHand] of [
    ['sv', 'för hand'],
    ['en', 'by hand']
  ]) {
    it(`says how to take out an older lifecycle rule, which the save command cannot (US-0014, ${lang})`, async () => {
      await i18n.changeLanguage(lang);
      for (const p of [lifecycleRulePrompt('releases'), lifecycleRulePrompt('continuous'), featureDocsPrompt({ exists: true })]) {
        expect(p).toContain('(story-lifecycle:');
        expect(p).toContain(byHand);
        expect(p).not.toMatch(/\n/);
      }
    });
  }

  it('keeps the existing path in the "already there" prompt', async () => {
    await i18n.changeLanguage('en');
    expect(featureDocsPrompt({ exists: true, path: 'notes/FEATURES.md' })).toContain('notes/FEATURES.md');
  });
});
