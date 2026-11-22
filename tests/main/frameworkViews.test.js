// US-1401 FR1.2, FR1.4: the one shared views table, keyed by the project's framework (BR1.5, BR1.6).
import { describe, expect, it } from 'vitest';
import { AIDLC_SECTIONS, PROJECT_SECTIONS, sectionsFor, shownViews, viewFields, viewsFor } from '../../src/shared/frameworkViews.js';

// The views an AI-DLC project offers since v0.2.14 (the old `offered` maps; US-0905 moved Plans under Configuration).
const V0212_AIDLC = ['intents', 'features', 'config', 'cost', 'velocity', 'github', 'editor'];
const AIDLC_ONLY = ['intents', 'plans', 'cost', 'velocity', 'github'];

describe('frameworkViews', () => {
  it('gives an AI-DLC project exactly the views it had in v0.2.14 (AC1.1.1)', () => {
    expect([...viewsFor('aidlc')].sort()).toEqual([...V0212_AIDLC].sort());
  });

  it('gives a Spec Kit project the specs view and no AI-DLC view (AC1.1.2)', () => {
    const views = viewsFor('speckit');
    expect(views).toEqual(['specs', 'features', 'config', 'editor']);
    for (const id of AIDLC_ONLY) expect(views).not.toContain(id);
  });

  it('gives a project with no framework the setup view, features, config and editor', () => {
    expect(viewsFor(null)).toEqual(['setup', 'features', 'config', 'editor']);
    expect(viewsFor('unknown')).toEqual(viewsFor(null)); // an unknown value is treated as no framework
  });

  it('names a default view per framework (R-01)', () => {
    expect(viewFields('aidlc')).toEqual({ views: viewsFor('aidlc'), defaultView: 'intents', isAidlc: true });
    expect(viewFields('speckit')).toMatchObject({ defaultView: 'specs', isAidlc: false });
    expect(viewFields(null)).toMatchObject({ defaultView: 'setup', isAidlc: false });
  });

  it('shows features only when the feature docs are shown, for every framework', () => {
    for (const fw of ['aidlc', 'speckit', null]) {
      expect(shownViews(viewsFor(fw), false)).not.toContain('features');
      expect(shownViews(viewsFor(fw), true)).toEqual(viewsFor(fw));
    }
    expect(shownViews(undefined, true)).toEqual([]);
  });

  it('keeps the AI-DLC configuration sections to AI-DLC projects', () => {
    expect(sectionsFor('aidlc')).toEqual(PROJECT_SECTIONS);
    expect(sectionsFor('speckit')).toEqual(['docs', 'agent']);
    expect(sectionsFor(null)).toEqual(['docs', 'agent']);
    for (const id of AIDLC_SECTIONS) expect(PROJECT_SECTIONS).toContain(id);
  });

  it('returns a fresh list each time, so a caller cannot change the table', () => {
    viewsFor('aidlc').push('x');
    expect(viewsFor('aidlc')).not.toContain('x');
  });
});
