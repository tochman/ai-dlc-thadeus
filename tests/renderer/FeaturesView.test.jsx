import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadFeatures } from '../../src/main/features.js';
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
