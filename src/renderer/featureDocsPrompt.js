// The request typed into the claude tab to set up feature docs (EPIC-06 FR4.4, FR4.5). The app writes no
// files itself (FR4.6): Claude does the work in the visible terminal once the person presses Enter.
// One line, since a newline in the terminal would send it. It follows the chosen language (EPIC-07 FR1.3).
import { t } from '../shared/i18n.js';

/** @param {{exists: boolean, path?: string}} opts exists: the overview is already there, so only the rule is added */
export function featureDocsPrompt({ exists, path = 'docs/FEATURES.md' }) {
  const rule = t('features.prompt.rule');
  if (exists) return t('features.prompt.exists', { path, rule });
  return `${t('features.prompt.format')} ${rule}`;
}
