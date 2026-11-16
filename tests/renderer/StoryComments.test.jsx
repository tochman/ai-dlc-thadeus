// US-1201 AC-4: the intent's comments tab: the story's pull request comments and reviews with AI-DLC's open questions,
// approvals and review findings, each row with its source, author and time.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import StoryComments from '../../src/renderer/StoryComments.jsx';

// The shape team:comments returns.
const COMMENTS = {
  pull: { number: 59, title: 'US-0414 one tooltip', url: 'https://x/59' },
  stories: ['US-0414'],
  error: null,
  rows: [
    { source: 'question', author: 'AI-DLC', time: '2026-11-16T09:30:00.000Z', text: 'Q2. Vad mäter vi?', file: 'q.md' },
    { source: 'finding', author: 'aidlc-architecture-reviewer-agent', time: '2026-11-16T10:00:00.000Z', stage: 'code-generation', text: 'NOT-READY' },
    { source: 'pull', author: 'anna', time: '2026-11-16T10:30:00Z', text: 'Snyggt.', url: null },
    { source: 'approval', author: 'macbookpro', time: '2026-11-16T11:00:00.000Z', stage: 'code-generation' },
    { source: 'review', author: 'anna', time: '2026-11-16T12:00:00Z', text: '', state: 'approved', url: null }
  ]
};

function setup(result = COMMENTS) {
  window.bridge = { getStoryComments: vi.fn(async () => result) };
  render(<StoryComments projectId="p1" space="default" dirName="261116-a" />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StoryComments (US-1201 AC-4)', () => {
  it('shows every row with its source, author and time, and names the pull request', async () => {
    setup();
    const rows = await screen.findAllByTestId('story-comments-row');
    expect(window.bridge.getStoryComments).toHaveBeenCalledWith('p1', 'default', '261116-a');
    expect(screen.getByTestId('story-comments-pull').textContent).toBe('Pull request #59: US-0414 one tooltip');
    expect(rows.map((r) => within(r).getByTestId('story-comments-source').textContent)).toEqual([
      'Öppen fråga',
      'Granskningsfynd',
      'Pull request',
      'Godkännande',
      'Granskning'
    ]);
    expect(rows[1].textContent).toContain('aidlc-architecture-reviewer-agent');
    expect(rows[1].textContent).toContain('Code Generation: NOT-READY');
    expect(rows[3].textContent).toContain('Godkände Code Generation');
    expect(rows[4].textContent).toContain('Godkände');
    expect(rows[2].querySelector('time').getAttribute('datetime')).toBe('2026-11-16T10:30:00Z');
    expect(rows[0].closest('.lcars-card')).toBeTruthy();
  });

  it("says when no pull request was found and shows AI-DLC's rows anyway", async () => {
    setup({ ...COMMENTS, pull: null, rows: COMMENTS.rows.slice(0, 2) });
    expect(await screen.findByText(/Ingen öppen pull request har storynumret/)).toBeTruthy();
    expect(screen.getAllByTestId('story-comments-row')).toHaveLength(2);
  });

  it('shows the empty view, and a platform failure beside the rows it could read', async () => {
    setup({ pull: null, stories: [], rows: [], error: null });
    expect((await screen.findByTestId('story-comments-empty')).textContent).toBe('Inga kommentarer, frågor eller godkännanden för intenten ännu.');
    cleanup();
    setup({ ...COMMENTS, error: { code: 'timeout', message: 'GitHub svarade inte inom 15 sekunder.' } });
    expect((await screen.findByTestId('story-comments-error')).textContent).toBe('GitHub svarade inte inom 15 sekunder.');
    expect(screen.getAllByTestId('story-comments-row')).toHaveLength(5);
  });

  it('shows a failed read as an alert', async () => {
    window.bridge = { getStoryComments: vi.fn(async () => Promise.reject(new Error('gone'))) };
    render(<StoryComments projectId="p1" space="default" dirName="261116-a" />);
    expect((await screen.findByRole('alert')).textContent).toBe('Kommentarerna kunde inte läsas: gone');
  });
});
