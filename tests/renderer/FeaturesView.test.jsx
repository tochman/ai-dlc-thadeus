import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadFeatures } from '../../src/main/features.js';
import { parseEpic } from '../../src/main/parsers/features.js';
import FeaturesView from '../../src/renderer/FeaturesView.jsx';
import { EditorCtx } from '../../src/renderer/editor/EditorContext.jsx';

// The same shape features:load returns, built by the real loader from the fixture docs.
let features;
beforeAll(async () => {
  features = await loadFeatures(await openRoot(path.resolve(__dirname, '../fixtures/features')), 'FEATURES.md');
  window.bridge = {
    platform: 'darwin',
    revealInFinder: vi.fn(async () => {}),
    openInEditor: vi.fn(async () => {}),
    getPlanningStatus: vi.fn(async () => ({ pending: 0, reapplied: 0, noRemote: false, prOffer: null, error: null }))
  };
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
  ],
  plans = []
) => ({
  available: true,
  overviewPath: 'docs/FEATURES.md',
  overviewText: '',
  overviewHash: 'oh',
  intro: '',
  warnings: [],
  tags,
  plans,
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

// US-0036 AC2.1.5: the view names where its planning comes from, a remote ref or the local branch.
describe('FeaturesView: planning source (US-0036 FR2.4, FR2.5)', () => {
  it('names origin/main when the planning is read from the remote', () => {
    render(<FeaturesView projectId="p1" features={{ ...features, source: { inPlace: false, branch: 'fix/US-9001', ref: 'origin/main', remote: true } }} />);
    expect(screen.getByTestId('features-source').textContent).toBe('Planering från origin/main');
  });

  it('says it is the local branch when there is no remote', () => {
    render(<FeaturesView projectId="p1" features={{ ...features, source: { inPlace: false, branch: 'fix/US-9001', ref: 'main', remote: false } }} />);
    expect(screen.getByTestId('features-source').textContent).toBe('Planering från main (lokalt, ingen fjärr hämtad)');
  });
});

describe('FeaturesView: releases (US-0603)', () => {
  it('a story picks a release among the planned and next versions, or None, through the bridge (FR2.1, FR2.2)', async () => {
    window.bridge.setStoryRelease = vi.fn(async () => ({ ok: true }));
    render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" />);
    openStory('US-0604');
    const picker = screen.getByTestId('features-view-release-picker');
    expect([...picker.options].map((o) => [o.value, o.textContent])).toEqual([
      ['v1.0.0', 'v1.0.0'],
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

// US-0605: plan files as features:load lists them; v0.2.7 holds only its heading, v0.2.8 has more text.
const PLANS = [
  { version: 'v0.2.7', file: 'docs/releases/0.2.7.md', hash: 'h7', headingOnly: true },
  { version: 'v0.2.8', file: 'docs/releases/0.2.8.md', hash: 'h8', headingOnly: false }
];
const releaseRow = (version) => screen.getAllByTestId('features-view-release').find((el) => el.textContent.startsWith(version));
const inRelease = (version) => within(releaseRow(version));

describe('FeaturesView: releases made by hand (US-0605)', () => {
  it('New release suggests the next patch, minor and major, refuses a bad or known version and creates a good one (FR1, FR1.1, FR1.2)', async () => {
    window.bridge.createRelease = vi.fn(async () => ({ ok: true, file: 'docs/releases/0.2.9.md' }));
    render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" tab="releases" />);
    fireEvent.click(screen.getByTestId('releases-new'));
    expect(texts('releases-new-suggestion')).toEqual(['v0.2.5', 'v0.3.0', 'v1.0.0']);
    const input = screen.getByTestId('releases-new-version');

    fireEvent.change(input, { target: { value: '1.2' } });
    fireEvent.click(screen.getByTestId('releases-new-create'));
    expect(screen.getByRole('alert').textContent).toBe('1.2 är inte en version på formen vX.Y.Z.');
    fireEvent.click(screen.getAllByTestId('releases-new-suggestion')[0]);
    expect(input.value).toBe('v0.2.5');
    fireEvent.click(screen.getByTestId('releases-new-create'));
    expect(screen.getByRole('alert').textContent).toBe('v0.2.5 finns redan.');
    expect(window.bridge.createRelease).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: ' v0.2.9 ' } });
    fireEvent.click(screen.getByTestId('releases-new-create'));
    await waitFor(() => expect(window.bridge.createRelease).toHaveBeenCalledWith('p1', 'v0.2.9'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('adds a story with no release, removes one, and keeps every action disabled until the view has reloaded (FR3.1–FR3.3)', async () => {
    // US-0608 FR1.2: a write that changed the docs in place keeps the lock until a load with other hashes.
    window.bridge.setStoryRelease = vi.fn(async () => ({ ok: true, inPlace: true, changed: true }));
    const { rerender } = render(<FeaturesView projectId="p1" features={releaseDocs(undefined, PLANS)} delivery="releases" tab="releases" />);
    const add = inRelease('v0.2.7').getByTestId('releases-add-story');
    expect([...add.options].map((o) => o.value)).toEqual(['', 'US-0604', 'US-0605']);
    expect(inRelease('v0.2.4').queryByTestId('releases-add-story')).toBeNull(); // released

    fireEvent.change(add, { target: { value: 'US-0604' } });
    await waitFor(() =>
      expect(window.bridge.setStoryRelease).toHaveBeenCalledWith('p1', { storyId: 'US-0604', version: 'v0.2.7', epicHash: 'eh', overviewHash: 'oh' })
    );
    expect(screen.getByTestId('releases-new').disabled).toBe(true);
    expect(inRelease('v0.2.8').getByTestId('releases-add-story').disabled).toBe(true);
    expect(inRelease('v0.2.5').getByTestId('releases-remove-story').disabled).toBe(true);

    rerender(<FeaturesView projectId="p1" features={{ ...releaseDocs(undefined, PLANS), overviewHash: 'oh2' }} delivery="releases" tab="releases" />);
    const remove = inRelease('v0.2.5').getByTestId('releases-remove-story');
    expect(remove.disabled).toBe(false);
    fireEvent.click(remove);
    await waitFor(() => expect(window.bridge.setStoryRelease).toHaveBeenLastCalledWith('p1', expect.objectContaining({ storyId: 'US-0603', version: null })));

    // A refused write unlocks the list at once and says so.
    window.bridge.setStoryRelease.mockResolvedValueOnce({ conflict: 'docs/FEATURES.md' });
    rerender(<FeaturesView projectId="p1" features={{ ...releaseDocs(undefined, PLANS), overviewHash: 'oh3' }} delivery="releases" tab="releases" />);
    fireEvent.change(inRelease('v0.2.7').getByTestId('releases-add-story'), { target: { value: 'US-0605' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/docs\/FEATURES\.md har ändrats på disken/);
    expect(screen.getByTestId('releases-new').disabled).toBe(false);
  });

  it('offers Delete only for an untagged, story-less, heading-only release and says a failure (FR4, FR4.1, NFR3)', async () => {
    window.bridge.deleteRelease = vi.fn(async () => ({ ok: true }));
    const { rerender } = render(<FeaturesView projectId="p1" features={releaseDocs(undefined, PLANS)} delivery="releases" tab="releases" />);
    expect(screen.getAllByTestId('releases-delete')).toHaveLength(1);
    fireEvent.click(inRelease('v0.2.7').getByTestId('releases-delete'));
    await waitFor(() => expect(window.bridge.deleteRelease).toHaveBeenCalledWith('p1', { version: 'v0.2.7', hash: 'h7' }));

    window.bridge.deleteRelease.mockRejectedValueOnce(new Error("Error invoking remote method 'features:deleteRelease': Error: trasig"));
    rerender(<FeaturesView projectId="p1" features={releaseDocs(undefined, PLANS)} delivery="releases" tab="releases" />);
    fireEvent.click(inRelease('v0.2.7').getByTestId('releases-delete'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Releasen kunde inte raderas: trasig'));
  });

  it('with continuous deployment shows none of the release actions (FR5)', () => {
    render(<FeaturesView projectId="p1" features={releaseDocs(undefined, PLANS)} delivery="continuous" tab="releases" />);
    for (const id of ['releases-new', 'releases-add-story', 'releases-remove-story', 'releases-delete']) expect(screen.queryByTestId(id)).toBeNull();
  });
});

// US-0607 FR4: the release list's planning line, from features:planningStatus.
describe('FeaturesView: planning sync (US-0607 FR4)', () => {
  const NONE = { pending: 0, reapplied: 0, noRemote: false, prOffer: null, error: null };
  const status = (s) => window.bridge.getPlanningStatus.mockResolvedValue({ ...NONE, ...s });
  const show = () => render(<FeaturesView projectId="p1" features={releaseDocs(undefined, PLANS)} delivery="releases" tab="releases" />);
  afterEach(() => window.bridge.getPlanningStatus.mockResolvedValue(NONE));

  it('shows the changes waiting to be pushed, and Push now pushes them (FR4.1)', async () => {
    status({ pending: 2 });
    window.bridge.pushPlanning = vi.fn(async () => NONE);
    show();
    expect((await screen.findByTestId('planning-pending')).textContent).toBe('2 planeringsändringar väntar på att pushas.');
    expect(window.bridge.getPlanningStatus).toHaveBeenCalledWith('p1', true); // the list just opened (FR1.3)
    fireEvent.click(screen.getByTestId('planning-push-now'));
    await waitFor(() => expect(window.bridge.pushPlanning).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(screen.queryByTestId('planning-pending')).toBeNull());
  });

  it('shows nothing while nothing waits, and says when lost changes were applied again (FR1.3)', async () => {
    show();
    await waitFor(() => expect(window.bridge.getPlanningStatus).toHaveBeenCalled());
    expect(screen.queryByTestId('planning-sync')).toBeNull();
    cleanup();
    status({ reapplied: 1 });
    show();
    expect((await screen.findByTestId('planning-reapplied')).textContent).toBe('1 planeringsändring hade gått förlorad och gjordes om.');
  });

  it('says there is no remote, without Push now (FR3.4)', async () => {
    status({ pending: 1, noRemote: true });
    show();
    expect((await screen.findByTestId('planning-no-remote')).textContent).toMatch(/inget origin/);
    expect(screen.queryByTestId('planning-push-now')).toBeNull();
  });

  it('names the files of a conflict, and offers the pull request by hand without gh (FR3.5, FR3.3)', async () => {
    status({ pending: 1, error: { kind: 'conflict', files: ['docs/features/epic-06.md'] } });
    show();
    expect((await screen.findByTestId('planning-error')).textContent).toBe(
      'Planeringen krockar med main i docs/features/epic-06.md. Inget pushades; appen försöker igen vid nästa intervall.'
    );
    cleanup();
    status({ prOffer: { branch: 'docs/planning' } });
    show();
    expect((await screen.findByTestId('planning-pr-offer')).textContent).toMatch(/docs\/planning/);
  });

  it('a commit a hook refuses names the reason and the files, and unlocks the list (FR4.2)', async () => {
    window.bridge.setStoryRelease = vi.fn(async () => ({
      ok: false,
      inPlace: true,
      error: { kind: 'commit', reason: 'lint failed', files: ['docs/FEATURES.md'] }
    }));
    show();
    fireEvent.change(inRelease('v0.2.7').getByTestId('releases-add-story'), { target: { value: 'US-0604' } });
    expect((await screen.findByRole('alert')).textContent).toBe('Planeringen kunde inte committas (lint failed): docs/FEATURES.md. Ändringen finns kvar.');
    expect(screen.getByTestId('releases-new').disabled).toBe(false);
  });
});

// US-0608: the shared lock, the waiting list with its target and stories, live updates and the conflict choices.
describe('FeaturesView: every planning change is kept (US-0608)', () => {
  const NONE = { pending: 0, reapplied: 0, noRemote: false, prOffer: null, error: null, target: 'origin/main', entries: [] };
  const ASSIGN = { id: 'a1', kind: 'setRelease', storyIds: ['US-0604'], version: 'v0.2.7', file: null, state: 'pending' };
  const CONFLICT = { id: 'c1', kind: 'content', storyIds: ['US-0603'], version: null, file: 'docs/features/e6.md', state: 'conflict', content: '# mine\n' };
  const waiting = (...entries) => window.bridge.getPlanningStatus.mockResolvedValue({ ...NONE, pending: entries.length, entries });
  let heard;
  beforeEach(() => {
    heard = null;
    window.bridge.onPlanningChanged = vi.fn((fn) => {
      heard = fn;
      return () => {};
    });
  });
  afterEach(() => window.bridge.getPlanningStatus.mockResolvedValue(NONE));
  const docs = releaseDocs(undefined, PLANS);

  it('shows waiting .thadeus files in the waiting list with their file names, counted in the pending line (US-0609 AC3.1.8)', async () => {
    const LOG = { id: 't1', kind: 'thadeus', file: '.thadeus/tokens/261120-i.json', state: 'pending', storyIds: [], version: null };
    const HOOKS = { id: 't2', kind: 'thadeus', file: '.claude/settings.json', state: 'pending', storyIds: [], version: null };
    waiting(ASSIGN, LOG, HOOKS);
    render(<WithTab initial="releases" projectId="p1" features={docs} delivery="releases" />);
    await waitFor(() => expect(screen.getAllByTestId('planning-entry')).toHaveLength(3));
    const texts = screen.getAllByTestId('planning-entry').map((li) => li.textContent);
    expect(texts[1]).toContain('.thadeus/tokens/261120-i.json');
    expect(texts[2]).toContain('.claude/settings.json');
    expect(texts[1]).not.toMatch(/undefined|features\.planning/);
    expect(screen.getByTestId('planning-pending').textContent).toMatch(/3/);
  });

  it('keeps the list and the story picker locked until a load with other hashes, and unlocks at once when no reload follows (FR1.2)', async () => {
    window.bridge.setStoryRelease = vi.fn(async () => ({ ok: true, inPlace: true, changed: true }));
    const { rerender } = render(<WithTab initial="releases" projectId="p1" features={docs} delivery="releases" />);
    fireEvent.change(inRelease('v0.2.7').getByTestId('releases-add-story'), { target: { value: 'US-0604' } });
    await waitFor(() => expect(window.bridge.setStoryRelease).toHaveBeenCalledTimes(1));
    rerender(<WithTab initial="releases" projectId="p1" features={{ ...docs }} delivery="releases" />); // a reload with the same hashes
    await waitFor(() => expect(screen.getByTestId('releases-new').disabled).toBe(true));

    fireEvent.click(inRelease('v0.2.5').getByRole('button', { name: /US-0603/ })); // the story detail shares the lock
    const picker = screen.getByTestId('features-view-release-picker');
    expect(picker.disabled).toBe(true);
    rerender(<WithTab initial="releases" projectId="p1" features={{ ...docs, epics: [{ ...docs.epics[0], hash: 'eh2' }] }} delivery="releases" />);
    expect(screen.getByTestId('features-view-release-picker').disabled).toBe(false);

    for (const reply of [
      { ok: true, inPlace: true, changed: false },
      { ok: true, inPlace: false, changed: true }
    ]) {
      window.bridge.setStoryRelease.mockResolvedValueOnce(reply);
      fireEvent.change(screen.getByTestId('features-view-release-picker'), { target: { value: 'v0.3.0' } });
      await waitFor(() => expect(screen.getByTestId('features-view-release-picker').disabled).toBe(false));
    }
    expect(window.bridge.setStoryRelease).toHaveBeenCalledTimes(3);
  });

  it('lists each waiting change with its stories and target and Push now, and follows every cycle, also a failed one (FR7, FR4.2)', async () => {
    waiting(ASSIGN);
    render(<FeaturesView projectId="p1" features={docs} delivery="releases" tab="releases" />);
    const entry = await screen.findByTestId('planning-entry');
    expect(entry.textContent).toMatch(/Release v0\.2\.7.*Storys: US-0604/);
    expect(screen.getByTestId('planning-target').textContent).toBe('Mål: origin/main');
    expect(screen.getByTestId('planning-push-now')).toBeTruthy();

    await act(async () => heard({ projectId: 'p2', status: { ...NONE, reapplied: 3 } })); // another project's list
    expect(screen.getByTestId('planning-entry')).toBeTruthy();
    await act(async () => heard({ projectId: 'p1', status: { ...NONE, reapplied: 2, error: { kind: 'offline' } } }));
    expect(screen.queryByTestId('planning-entry')).toBeNull(); // on the target: gone
    expect(screen.getByTestId('planning-reapplied').textContent).toBe('2 planeringsändringar hade gått förlorade och gjordes om.');
    expect(screen.getByTestId('planning-error').textContent).toMatch(/^Offline\./);
  });

  it('shows the waiting list beside the story-detail picker too (FR7.1)', async () => {
    waiting(ASSIGN);
    render(<FeaturesView projectId="p1" features={docs} delivery="releases" tab="epics" />);
    openStory('US-0604');
    const detail = within(screen.getByTestId('features-view-story-detail'));
    expect((await detail.findByTestId('planning-entry')).textContent).toMatch(/US-0604/);
  });

  it('a conflict names the file and offers Use mine, Keep theirs and Open both in the editor (FR5.3)', async () => {
    waiting(CONFLICT);
    window.bridge.resolvePlanning = vi.fn(async () => NONE);
    const open = vi.fn();
    render(
      <EditorCtx.Provider value={{ open }}>
        <FeaturesView projectId="p1" features={docs} delivery="releases" tab="releases" />
      </EditorCtx.Provider>
    );
    const entry = within(await screen.findByTestId('planning-entry'));
    expect(screen.getByTestId('planning-entry').textContent).toMatch(/docs\/features\/e6\.md har ändrats även på målet/);
    expect(screen.queryByTestId('planning-mine')).toBeNull();
    fireEvent.click(entry.getByTestId('planning-open-both'));
    expect(open).toHaveBeenCalledWith('docs/features/e6.md');
    expect(screen.getByTestId('planning-mine').textContent).toContain('# mine');

    window.bridge.resolvePlanning.mockRejectedValueOnce(new Error("Error invoking remote method 'features:resolvePlanning': Error: trasig"));
    fireEvent.click(entry.getByTestId('planning-keep-theirs'));
    await waitFor(() => expect(screen.getByTestId('planning-error').textContent).toBe('Planeringssynken misslyckades: trasig'));
    expect(window.bridge.resolvePlanning).toHaveBeenCalledWith('p1', 'c1', 'theirs');

    fireEvent.click(entry.getByTestId('planning-use-mine'));
    await waitFor(() => expect(window.bridge.resolvePlanning).toHaveBeenLastCalledWith('p1', 'c1', 'mine'));
    await waitFor(() => expect(screen.queryByTestId('planning-entry')).toBeNull());
  });

  // US-0038 FR1.4: the row names what holds a change back and what to choose.
  it('a change set aside from an app commit names that commit and what each choice does (US-0038 FR1.4)', async () => {
    waiting({ ...CONFLICT, from: '6502115 docs: update US-0035' });
    render(<FeaturesView projectId="p1" features={docs} delivery="releases" tab="releases" />);
    const text = (await screen.findByTestId('planning-entry')).textContent;
    expect(text).toContain('Från appens commit 6502115 docs: update US-0035.');
    expect(screen.getByTestId('planning-choose').textContent).toBe('Behåll deras släpper appens ändring; Använd min skriver den över målets text.');
  });

  it('a conflict without an app commit still offers the choice, and names no commit (US-0038 FR1.4)', async () => {
    waiting(CONFLICT);
    render(<FeaturesView projectId="p1" features={docs} delivery="releases" tab="releases" />);
    expect((await screen.findByTestId('planning-entry')).textContent).not.toMatch(/Från appens commit|undefined/);
    expect(screen.getByTestId('planning-choose')).toBeTruthy();
  });

  it('a push blocked by a commit that could not be set aside names it and what to do (US-0038 FR1.4)', async () => {
    window.bridge.getPlanningStatus.mockResolvedValue({
      ...NONE,
      pending: 1,
      error: { kind: 'conflict', files: ['docs/releases/0.2.13.md'], commit: '6502115 docs: update US-0035' }
    });
    render(<FeaturesView projectId="p1" features={docs} delivery="releases" tab="releases" />);
    expect((await screen.findByTestId('planning-error')).textContent).toBe(
      'Appens commit 6502115 docs: update US-0035 krockar med main i docs/releases/0.2.13.md och kunde inte läggas åt sidan. Inget pushades. Ta bort grenen dash/planning för att släppa den.'
    );
  });
});

// US-0604: a second epic next to EPIC-06, with priorities, a complexity and a released story.
const EPIC7 = [
  '# EPIC-07: Search',
  '',
  '## User Stories',
  '',
  '**US-0701: Filter by text** 🚧 In progress',
  '- **Priority:** High',
  '- **Complexity:** Low',
  '',
  '**US-0702: Text everywhere** ✅ Released in v0.2.4',
  '- **Priority:** Low',
  '',
  '**US-0703: Saved views** 📋 Planned',
  '- **Priority:** High',
  '- Remember the TEXT filter.',
  ''
].join('\n');
const twoEpics = () => {
  const docs = releaseDocs();
  return {
    ...docs,
    epics: [
      ...docs.epics,
      { id: 'EPIC-07', title: 'Search', topic: 'Search', status: '🚧', statusKind: 'progress', file: 'e7.md', parsed: parseEpic(EPIC7), hash: 'h7' }
    ]
  };
};
const allBar = () => within(screen.getByTestId('features-view-all-filters'));
const optionValues = (testId) => [...screen.getByTestId(testId).options].map((o) => o.value);

describe('FeaturesView: story filters (US-0604)', () => {
  it('on the Epics tab a filter replaces the epic list with the matching stories of every epic, with their count (FR1, FR1.1)', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    expect(texts('features-view-epic')).toHaveLength(2);
    expect(screen.queryByTestId('features-view-matches')).toBeNull();
    expect(allBar().getByTestId('features-view-all-filter-count').getAttribute('aria-live')).toBe('polite');

    fireEvent.change(screen.getByTestId('features-view-all-filter-status'), { target: { value: 'progress' } });
    expect(screen.queryAllByTestId('features-view-epic')).toEqual([]);
    const matches = texts('features-view-match');
    expect(matches).toEqual([expect.stringMatching(/US-0603.*🚧 Pågår.*EPIC-06/), expect.stringMatching(/US-0701.*🚧 Pågår.*EPIC-07/)]);
    expect(screen.getByTestId('features-view-all-filter-count').textContent).toBe('2 storys');
  });

  it('choosing a match opens the story on its epic page (FR1.1)', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    fireEvent.change(screen.getByTestId('features-view-all-filter-text'), { target: { value: 'saved' } });
    fireEvent.click(screen.getByTestId('features-view-match'));
    expect(screen.getByRole('heading', { level: 2, name: /EPIC-07: Search/ })).toBeTruthy();
    expect(screen.getByTestId('features-view-story-detail').getAttribute('aria-label')).toBe('US-0703');
  });

  it('Clear filters empties every filter and the epic list returns (FR1.2, FR3)', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    expect(screen.queryByTestId('features-view-all-filter-clear')).toBeNull();
    fireEvent.change(screen.getByTestId('features-view-all-filter-priority'), { target: { value: 'High' } });
    fireEvent.change(screen.getByTestId('features-view-all-filter-epic'), { target: { value: 'EPIC-07' } });
    fireEvent.change(screen.getByTestId('features-view-all-filter-release'), { target: { value: '-' } });
    expect(texts('features-view-match')).toEqual([expect.stringMatching(/^US-0701/), expect.stringMatching(/^US-0703/)]);

    fireEvent.click(screen.getByTestId('features-view-all-filter-clear'));
    for (const id of ['status', 'release', 'epic', 'priority', 'complexity', 'text'])
      expect(screen.getByTestId(`features-view-all-filter-${id}`).value).toBe('');
    expect(texts('features-view-epic')).toHaveLength(2);
    expect(screen.queryByTestId('features-view-matches')).toBeNull();
    expect(screen.queryByTestId('features-view-all-filter-clear')).toBeNull();
  });

  it('an epic page filters by state, release, priority, complexity and text, with no epic filter, and they combine (FR2, FR3)', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    fireEvent.click(screen.getAllByTestId('features-view-epic')[1]);
    const page = within(screen.getByTestId('features-view-filters'));
    expect(page.queryByTestId('features-view-filter-epic')).toBeNull();
    expect(optionValues('features-view-filter-status')).toEqual(['', 'planned', 'progress', 'done', 'released', 'deployed']);
    expect(optionValues('features-view-filter-priority')).toEqual(['', 'High', 'Low']);
    expect(optionValues('features-view-filter-complexity')).toEqual(['', 'Low']);

    fireEvent.change(screen.getByTestId('features-view-filter-text'), { target: { value: 'TEXT' } });
    expect(texts('features-view-story')).toEqual([expect.stringMatching(/^US-0701/), expect.stringMatching(/^US-0702/), expect.stringMatching(/^US-0703/)]);
    fireEvent.change(screen.getByTestId('features-view-filter-priority'), { target: { value: 'High' } });
    expect(texts('features-view-story')).toEqual([expect.stringMatching(/^US-0701/), expect.stringMatching(/^US-0703/)]);
    fireEvent.change(screen.getByTestId('features-view-filter-status'), { target: { value: 'released' } });
    expect(screen.queryAllByTestId('features-view-story')).toEqual([]);
    expect(screen.getByTestId('features-view-filter-count').textContent).toBe('0 storys');
    fireEvent.click(screen.getByTestId('features-view-filter-clear'));
    expect(texts('features-view-story')).toHaveLength(3);
  });

  it('offers the release filter, with every release and No release, only with the Releases setting (FR4.2)', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="continuous" />);
    expect(screen.queryByTestId('features-view-all-filter-release')).toBeNull();
    expect(screen.queryByTestId('features-view-filter-release')).toBeNull();
    cleanup();

    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    expect(optionValues('features-view-all-filter-release')).toEqual(['', 'v0.2.5', 'v0.2.4', 'v0.2.0', '-']);
    expect(optionValues('features-view-filter-release')).toEqual(['', 'v0.2.5', 'v0.2.4', 'v0.2.0', '-']);
    expect(screen.getByTestId('features-view-filter-release').options[4].textContent).toBe('Ingen release');
    fireEvent.change(screen.getByTestId('features-view-all-filter-release'), { target: { value: 'v0.2.4' } });
    expect(texts('features-view-match')).toEqual([expect.stringMatching(/^US-0702/)]);
  });

  it('starts with empty filters each time the view opens (FR5)', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    fireEvent.change(screen.getByTestId('features-view-all-filter-text'), { target: { value: 'saved' } });
    fireEvent.change(screen.getByTestId('features-view-filter-priority'), { target: { value: 'High' } });
    cleanup();

    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    expect(screen.getByTestId('features-view-all-filter-text').value).toBe('');
    expect(screen.getByTestId('features-view-filter-priority').value).toBe('');
    expect(texts('features-view-epic')).toHaveLength(2);
  });
});

describe('FeaturesView: the list folds away (US-0415, US-0417 drawer)', () => {
  afterEach(() => {
    delete window.bridge.getSettings;
    delete window.bridge.setSettings;
    delete document.documentElement.dataset.motion;
  });

  it('the epic list is a drawer: toggle last in its heading row, folded to the stack, and the stack opens it with the story and filter kept (AC5.1.2)', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    fireEvent.change(screen.getByTestId('features-view-all-filter-text'), { target: { value: 'saved' } });
    fireEvent.click(screen.getByTestId('features-view-match'));
    const drawer = screen.getByTestId('features-view-all-filters').closest('[data-testid="list-drawer"]');
    expect(drawer.closest('aside').getAttribute('aria-label')).toBe('Epics');
    const heading = within(drawer).getByTestId('section-heading');
    expect(heading.textContent).toMatch(/^Epics.*2 st/);
    const toggle = within(drawer).getByTestId('list-fold-toggle');
    expect(heading.lastElementChild).toBe(toggle);
    expect(document.getElementById(toggle.getAttribute('aria-controls')).contains(screen.getByTestId('features-view-all-filters'))).toBe(true);

    fireEvent.click(toggle);
    expect(drawer.className).toContain('is-folded');
    const stack = within(drawer).getByTestId('list-drawer-stack');
    expect(stack.textContent).toBe('›2Epics');
    expect(within(drawer).getByTestId('list-drawer-open').getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(stack); // the stack brings it back
    expect(drawer.className).not.toContain('is-folded');
    expect(screen.getByTestId('features-view-all-filter-text').value).toBe('saved');
    expect(screen.getByTestId('features-view-story-detail').getAttribute('aria-label')).toBe('US-0703');
  });

  it('the release list is its own drawer, and each list keeps its folded state per view', async () => {
    window.bridge.getSettings = vi.fn(async () => ({ listFolded: { features: true } }));
    window.bridge.setSettings = vi.fn(async () => {});
    render(<WithTab initial="releases" projectId="p1" features={releaseDocs()} delivery="releases" />);
    const drawer = screen.getAllByTestId('features-view-release')[0].closest('[data-testid="list-drawer"]');
    expect(within(drawer).getByTestId('section-heading').textContent).toMatch(/^Releaser.*3 st/);
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    expect(drawer.className).not.toContain('is-folded'); // the epics' saved fold is not the releases'

    fireEvent.click(within(drawer).getByTestId('list-fold-toggle'));
    expect(drawer.className).toContain('is-folded');
    expect(within(drawer).getByTestId('list-drawer-stack').textContent).toBe('›3Releaser');
    await waitFor(() => expect(window.bridge.setSettings).toHaveBeenCalledWith({ listFolded: { features: true, releases: true } }));
  });

  it('opens folded when the epic list was folded last time', async () => {
    window.bridge.getSettings = vi.fn(async () => ({ listFolded: { features: true } }));
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    const drawer = screen.getByTestId('features-view-all-filters').closest('[data-testid="list-drawer"]');
    await waitFor(() => expect(drawer.className).toContain('is-folded'));
  });
});

describe('FeaturesView: the US-0417 look', () => {
  afterEach(() => delete document.documentElement.dataset.motion);

  it('epic rows are square blocks with a state strip, selected by brightness', () => {
    render(<FeaturesView projectId="p1" features={twoEpics()} delivery="releases" />);
    const [first, second] = screen.getAllByTestId('features-view-epic');
    expect(first.classList.contains('lcars-nb')).toBe(true);
    expect(first.classList.contains('lcars-strip--live')).toBe(true); // in progress
    expect(first.classList.contains('is-sel')).toBe(true);
    expect(second.classList.contains('is-sel')).toBe(false);
    fireEvent.click(second);
    expect(screen.getAllByTestId('features-view-epic')[1].classList.contains('is-sel')).toBe(true);
    expect(screen.getAllByTestId('features-view-epic')[0].classList.contains('is-sel')).toBe(false);
  });

  it('release rows carry their state as a strip: planned live, released done', () => {
    render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" tab="releases" />);
    const strips = screen.getAllByTestId('features-view-release').map((el) => [...el.classList].find((c) => c.startsWith('lcars-strip--')));
    expect(strips).toEqual(['lcars-strip--live', 'lcars-strip--done', 'lcars-strip--done']);
  });

  it('runs the entrance when the view is entered and again on a switch to Releases, only with full motion', () => {
    vi.useFakeTimers();
    try {
      document.documentElement.dataset.motion = 'full';
      const root = () => screen.getByTestId('features-view');
      const { rerender } = render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" tab="epics" />);
      expect(root().classList.contains('is-entering')).toBe(true);
      act(() => vi.advanceTimersByTime(1000));
      expect(root().classList.contains('is-entering')).toBe(false);
      rerender(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" tab="releases" />);
      expect(root().classList.contains('is-entering')).toBe(true);
      cleanup();
      document.documentElement.dataset.motion = 'reduced';
      render(<FeaturesView projectId="p1" features={releaseDocs()} delivery="releases" tab="releases" />);
      expect(root().classList.contains('is-entering')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('filters have no rounded select caps: square blocks per the shape rule', async () => {
    const css = (await import('node:fs')).readFileSync(path.resolve(__dirname, '../../src/renderer/theme.css'), 'utf8');
    expect(css).toMatch(/\.features-view \.lcars-select\s*\{[^}]*border-radius: 0/);
    expect(css).toMatch(/\.features-view \.lcars-select::picker-icon\s*\{[^}]*border-radius: 0/);
  });
});
