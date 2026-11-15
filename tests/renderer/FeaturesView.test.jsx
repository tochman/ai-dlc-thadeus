import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadFeatures } from '../../src/main/features.js';
import { parseEpic } from '../../src/main/parsers/features.js';
import FeaturesView from '../../src/renderer/FeaturesView.jsx';

// The same shape features:load returns, built by the real loader from the fixture docs.
let features;
beforeAll(async () => {
  features = await loadFeatures(await openRoot(path.resolve(__dirname, '../fixtures/features')), 'FEATURES.md');
  window.bridge = { platform: 'darwin', revealInFinder: vi.fn(async () => {}), openInEditor: vi.fn(async () => {}) };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const texts = (testId) => screen.getAllByTestId(testId).map((el) => el.textContent);

// Epics | Releases is chosen in the arm (US-0012); here a parent holds the choice as App does.
function WithTab({ initial, ...props }) {
  const [tab, setTab] = useState(initial);
  return <FeaturesView {...props} tab={tab} onTab={setTab} />;
}

describe('FeaturesView', () => {
  it('lists epics with stories done, and an epic with criteria counts and the full story text (FR2.2–FR2.4, FR2.6)', () => {
    const onOpenIntent = vi.fn();
    render(<FeaturesView projectId="p1" features={features} links={{ 'US-0102': ['261113-feature-docs'] }} onOpenIntent={onOpenIntent} />);

    const epics = texts('features-view-epic');
    expect(epics[0]).toMatch(/EPIC-01: Alpha.*🚧 Pågår.*1\/2 storys klara/);
    expect(epics[1]).toMatch(/EPIC-02.*0\/0 storys klara/);
    expect(screen.getByRole('status').textContent).toMatch(/EPIC-03: länken \.\.\/\.\.\/outside\.md pekar utanför/);

    const stories = texts('features-view-story');
    expect(stories[0]).toMatch(/US-0101: Open a project.*✅ Klar.*Prioritet: High.*Komplexitet: Low.*2\/2 kriterier/);
    expect(stories[1]).toMatch(/US-0102.*🚧 Pågår.*1\/3 kriterier.*1 intent/);

    // The intro before `## User Stories` is Markdown, not flattened text.
    const intro = screen.getByTestId('features-view-epic-intro');
    expect(intro.querySelectorAll('blockquote')).toHaveLength(2);
    expect(intro.querySelector('strong').textContent).toBe('Stories:');
    expect(intro.querySelector('table td').textContent).toBe('Projects');
    expect(intro.querySelector('ol > li > ul > li').textContent).toBe('then read it');

    const row = screen.getAllByTestId('features-view-story')[1];
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('features-view-story-detail')).toBeNull();
    fireEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    const detail = screen.getByTestId('features-view-story-detail');
    expect(row.closest('li').contains(detail)).toBe(true); // under its own row, not under the list
    expect(row.getAttribute('aria-controls')).toBe(detail.id);
    const boxes = within(detail).getAllByRole('checkbox');
    expect(boxes.map((b) => b.checked)).toEqual([true, false, false]);
    expect(boxes.every((b) => b.disabled)).toBe(true);
    expect(detail.textContent).toMatch(/Read-only\./);

    fireEvent.click(screen.getByTestId('features-view-intent-link'));
    expect(onOpenIntent).toHaveBeenCalledWith('261113-feature-docs');
    fireEvent.click(screen.getByTestId('features-view-open-editor'));
    expect(window.bridge.openInEditor).toHaveBeenCalledWith('p1', 'features/epic-01-alpha.md');

    fireEvent.click(row); // a second click closes it
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('features-view-story-detail')).toBeNull();
  });

  it('a story link from an intent opens that story under its row and scrolls it into view (FR2.6)', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<FeaturesView projectId="p1" features={features} focusStory={{ id: 'US-0102' }} />);
      const row = screen.getAllByTestId('features-view-story')[1];
      expect(row.getAttribute('aria-expanded')).toBe('true');
      expect(row.closest('li').contains(screen.getByTestId('features-view-story-detail'))).toBe(true);
      expect(scrollIntoView).toHaveBeenCalled();
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(row.closest('li'));
    } finally {
      delete Element.prototype.scrollIntoView;
    }
  });

  it('filters stories by status and priority (FR2.5)', () => {
    render(<FeaturesView projectId="p1" features={features} />);
    fireEvent.change(screen.getByTestId('features-view-filter-status'), { target: { value: 'done' } });
    expect(texts('features-view-story')).toEqual([expect.stringMatching(/^US-0101/)]);

    fireEvent.change(screen.getByTestId('features-view-filter-status'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('features-view-filter-priority'), { target: { value: 'Medium' } });
    expect(texts('features-view-story')).toEqual([expect.stringMatching(/^US-0102/)]);

    fireEvent.change(screen.getByTestId('features-view-filter-status'), { target: { value: 'planned' } });
    expect(screen.queryAllByTestId('features-view-story')).toEqual([]);
    expect(screen.getByText('Inga storys matchar filtret.')).toBeTruthy();
  });

  it('falls back to Markdown or the format help instead of a blank view (FR1.4, FR3.2, FR4.5)', () => {
    render(<FeaturesView projectId="p1" features={features} />);
    fireEvent.click(screen.getAllByTestId('features-view-epic')[1]);
    expect(screen.getByTestId('features-view-fallback').textContent).toMatch(/A story written in another way/);
    cleanup();

    render(<FeaturesView projectId="p1" features={{ ...features, epics: [], overviewText: '# Bara text\n\nIngen tabell.' }} />);
    expect(screen.getByTestId('features-view-fallback').querySelector('h1').textContent).toBe('Bara text');
    cleanup();

    const onSetup = vi.fn();
    render(<FeaturesView projectId="p1" features={{ available: false, overviewPath: 'docs/FEATURES.md' }} onSetup={onSetup} />);
    expect(screen.getByTestId('features-view-empty').textContent).toMatch(/ingen översikt i docs\/FEATURES\.md.*📋 Planerad/);
    fireEvent.click(screen.getByTestId('features-view-setup'));
    expect(onSetup).toHaveBeenCalledTimes(1);
  });
});

// US-0603: the same shape features:load returns, with hashes and tags, from lines shaped like EPIC-06.
const EPIC6 = [
  '# EPIC-06: Feature Docs',
  '',
  '**Status (2026-11-15):** ✅ US-0601 released in v0.2.0. 🚧 US-0603 in progress, for v0.2.5. 📋 US-0604 Planned. 🚀 US-0605 deployed.',
  '',
  '## User Stories',
  '',
  '**US-0601: Offer feature docs** ✅ Released in v0.2.0',
  '- [x] done',
  '',
  '**US-0603: Releases or continuous deployment** 🚧 In progress, for v0.2.5',
  '- [ ] picker',
  '',
  '**US-0604: Filter epics and user stories** 📋 Planned',
  '- [ ] filter',
  '',
  '**US-0605: Shipped on merge** 🚀 Deployed',
  '- [x] shipped',
  ''
].join('\n');
const releaseDocs = (
  tags = [
    { name: 'v0.2.0', date: '2026-11-10' },
    { name: 'v0.2.4', date: '2026-11-14' }
  ]
) => ({
  available: true,
  overviewPath: 'docs/FEATURES.md',
  overviewText: '',
  overviewHash: 'oh',
  intro: '',
  warnings: [],
  tags,
  epics: [
    {
      id: 'EPIC-06',
      title: 'Feature Docs',
      topic: 'Feature Docs',
      status: '🚧',
      statusKind: 'progress',
      file: 'docs/features/e6.md',
      parsed: parseEpic(EPIC6),
      hash: 'eh'
    }
  ]
});
const openStory = (id) => fireEvent.click(screen.getAllByTestId('features-view-story').find((el) => el.textContent.startsWith(id)));

describe('FeaturesView: releases (US-0603)', () => {
  it('a story picks a release among the planned and next versions, or None, through the bridge (FR2.1, FR2.2)', async () => {
    window.bridge.setStoryRelease = vi.fn(async () => ({ ok: true }));
    render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" />);
    openStory('US-0604');
    const picker = screen.getByTestId('features-view-release-picker');
    expect([...picker.options].map((o) => [o.value, o.textContent])).toEqual([
      ['v0.3.0', 'v0.3.0'],
      ['v0.2.5', 'v0.2.5'],
      ['', 'Ingen']
    ]);
    expect(picker.value).toBe('');
    fireEvent.change(picker, { target: { value: 'v0.3.0' } });
    await waitFor(() =>
      expect(window.bridge.setStoryRelease).toHaveBeenCalledWith('p1', { storyId: 'US-0604', version: 'v0.3.0', epicHash: 'eh', overviewHash: 'oh' })
    );

    openStory('US-0603');
    const current = screen.getByTestId('features-view-release-picker');
    expect(current.value).toBe('v0.2.5');
    fireEvent.change(current, { target: { value: '' } });
    await waitFor(() => expect(window.bridge.setStoryRelease).toHaveBeenLastCalledWith('p1', expect.objectContaining({ storyId: 'US-0603', version: null })));
  });

  it('shows a refused write and a failed one, and offers no picker for a released story (FR2.3, FR2.4)', async () => {
    window.bridge.setStoryRelease = vi.fn(async () => ({ conflict: 'docs/FEATURES.md' }));
    render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" />);
    openStory('US-0604');
    fireEvent.change(screen.getByTestId('features-view-release-picker'), { target: { value: 'v0.2.5' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/docs\/FEATURES\.md har ändrats på disken/);
    window.bridge.setStoryRelease.mockRejectedValueOnce(new Error("Error invoking remote method 'features:setRelease': Error: trasig"));
    fireEvent.change(screen.getByTestId('features-view-release-picker'), { target: { value: 'v0.3.0' } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Releasen kunde inte sättas: trasig'));

    openStory('US-0601');
    expect(screen.queryByTestId('features-view-release-picker')).toBeNull();
    expect(screen.getByTestId('features-view-story-detail').textContent).toMatch(/Släppt i v0\.2\.0/);
  });

  it('lists releases newest first with their dates and stories, and a story opens its detail (FR3.1–FR3.3)', () => {
    render(<WithTab initial="releases" projectId="p1" features={releaseDocs()} delivery="releases" />);
    expect(screen.queryByTestId('features-view-story')).toBeNull();
    const releases = texts('features-view-release');
    expect(releases).toHaveLength(3);
    expect(releases[0]).toMatch(/v0\.2\.5.*Planerad.*US-0603/);
    expect(releases[1]).toMatch(/v0\.2\.4.*Släppt 2026-11-14.*0 storys/);
    expect(releases[2]).toMatch(/v0\.2\.0.*Släppt 2026-11-10.*US-0601/);
    expect(screen.queryByTestId('features-view-release-stale')).toBeNull();

    fireEvent.click(within(screen.getAllByTestId('features-view-release')[0]).getByRole('button', { name: /US-0603/ }));
    expect(screen.getByTestId('features-view-story-detail').getAttribute('aria-label')).toBe('US-0603');
  });

  it('flags a story still marked for a release whose tag exists, in the Releases view and the story (FR7)', () => {
    const docs = releaseDocs([{ name: 'v0.2.5', date: '2026-11-16' }]);
    render(<FeaturesView projectId="p1" features={docs} delivery="releases" tab="releases" />);
    expect(screen.getByTestId('features-view-release-stale').textContent).toMatch(/Taggen v0\.2\.5 finns/);
    cleanup();
    render(<FeaturesView projectId="p1" features={docs} delivery="releases" tab="epics" />);
    openStory('US-0603');
    expect(within(screen.getByTestId('features-view-story-detail')).getByTestId('features-view-release-stale')).toBeTruthy();
  });

  it('with continuous deployment hides the picker and the Releases view, and shows 🚀 Deployed with its filter (FR4, FR6)', () => {
    render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="continuous" />);
    expect(screen.queryByTestId('features-view-tab-releases')).toBeNull();
    openStory('US-0603');
    expect(screen.queryByTestId('features-view-release-picker')).toBeNull();

    expect(texts('features-view-story')[3]).toMatch(/US-0605.*🚀 Driftsatt/);
    fireEvent.change(screen.getByTestId('features-view-filter-status'), { target: { value: 'deployed' } });
    expect(texts('features-view-story')).toEqual([expect.stringMatching(/^US-0605/)]);
  });
});
