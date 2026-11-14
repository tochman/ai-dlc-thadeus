import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/shared/i18n.js';
import { featureDocsPrompt } from '../../src/renderer/featureDocsPrompt.js';

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

  it('keeps the existing path in the "already there" prompt', async () => {
    await i18n.changeLanguage('en');
    expect(featureDocsPrompt({ exists: true, path: 'notes/FEATURES.md' })).toContain('notes/FEATURES.md');
  });
});
