// The request typed into the claude tab to set up feature docs (EPIC-06 FR4.4, FR4.5). The app writes no
// files itself (FR4.6): Claude does the work in the visible terminal once the person presses Enter.
// One line, since a newline in the terminal would send it. It follows the chosen language (EPIC-07 FR1.3).
import { t } from '../shared/i18n.js';
import { DELIVERY_DEFAULT, lifecycleTag } from '../main/parsers/releases.js';

/** US-0603 FR5.1: the story lifecycle rule for one delivery setting, ending with its tag. */
const ruleFor = (delivery) => t(delivery === 'continuous' ? 'features.prompt.ruleContinuous' : 'features.prompt.rule', { tag: lifecycleTag(delivery) });

/** US-0603 FR5.2: the add-or-update request the lifecycle rule notice types into the agent tab. */
export const lifecycleRulePrompt = (delivery = DELIVERY_DEFAULT) => t('features.prompt.update', { rule: ruleFor(delivery) });

/**
 * @param {{exists: boolean, path?: string, delivery?: string}} opts exists: the overview is already there, so only the
 *   rule is added; delivery: the project's setting, so a new project gets the rule for it (US-0603)
 */
export function featureDocsPrompt({ exists, path = 'docs/FEATURES.md', delivery = DELIVERY_DEFAULT }) {
  const rule = ruleFor(delivery);
  if (exists) return t('features.prompt.exists', { path, rule });
  return `${t('features.prompt.format')} ${rule}`;
}
