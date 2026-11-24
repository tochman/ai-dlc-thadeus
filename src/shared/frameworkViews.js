// US-1401 FR1.2, FR1.4: the one shared views table, keyed by the project's framework (BR1.5, BR1.6). Pure, so main
// (the Detection) and the renderer (the left arm, ProjectView) read the same lists. No component builds its own.

// The first entry is the framework's default view: the one shown when the chosen view is not offered (R-01).
const VIEWS = {
  aidlc: ['intents', 'features', 'config', 'cost', 'velocity', 'github', 'editor'],
  speckit: ['specs', 'features', 'config', 'editor'],
  none: ['setup', 'features', 'config', 'editor']
};

/**
 * The project's own sections in Configuration (US-0012); `aidlc`, `costRules` and `modelProfiles` are AI-DLC's, and
 * `speckit` is Spec Kit's (US-1404 BR7.9).
 */
export const PROJECT_SECTIONS = ['docs', 'agent', 'aidlc', 'costRules', 'modelProfiles', 'speckit'];
export const AIDLC_SECTIONS = ['aidlc', 'costRules', 'modelProfiles'];
export const SPECKIT_SECTIONS = ['speckit'];
const OWN = { aidlc: AIDLC_SECTIONS, speckit: SPECKIT_SECTIONS };

/** US-1401 FR1.4: the views a framework offers ('aidlc', 'speckit', or null for none); an unknown value is none. */
export function viewsFor(framework) {
  return [...(VIEWS[framework] ?? VIEWS.none)];
}

/** US-1401 FR1.2: the Detection's view fields (C1), with `isAidlc` kept for one release (BR1.7). */
export function viewFields(framework) {
  const views = viewsFor(framework);
  return { views, defaultView: views[0], isAidlc: framework === 'aidlc' };
}

/** US-1401 FR1.2: the views to show; Features needs the feature docs, for every framework (US-0901 FR1.1). */
export function shownViews(views, showFeatures) {
  return (views ?? []).filter((id) => id !== 'features' || showFeatures);
}

/** US-1401 FR1.6, US-1404 BR7.9: the Configuration sections a framework offers: the shared ones and its own. */
export function sectionsFor(framework) {
  const own = OWN[framework] ?? [];
  return PROJECT_SECTIONS.filter((id) => own.includes(id) || !(AIDLC_SECTIONS.includes(id) || SPECKIT_SECTIONS.includes(id)));
}
