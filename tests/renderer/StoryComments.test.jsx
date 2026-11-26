// US-1203 (was US-1201 AC-4): the intent's Review tab: what needs you first, each row with what to do and its action,
// then the pull request as a readout and its review threads, newest first, resolved ones folded. No approvals here.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import StoryComments from '../../src/renderer/StoryComments.jsx';

const QFILE = 'aidlc/spaces/default/intents/261122-a/inception/requirements-analysis/requirements-analysis-questions.md';
const REVIEW = 'aidlc/spaces/default/intents/261122-a/construction/code-generation/reviews/review-02.md';
const FILES = [{ dir: 'construction', files: [{ name: 'review-02.md', rel: REVIEW }] }];
const c = (author, body, time, url, state) => ({ author, body, time, url, ...(state ? { state } : {}) });

// The shape team:comments returns.
const DATA = {
  pull: {
    number: 61,
    title: 'feat(US-1203): review tab',
    url: 'https://x/61',
    reviewers: [
      { author: 'bo', state: 'changes' },
      { author: 'anna', state: 'approved' }
    ]
  },
  stories: ['US-1203'],
  platform: { id: 'github', name: 'GitHub', host: 'github.com', path: 'o/r' },
  error: null,
  needs: [
    { kind: 'question', text: 'Q2. Vad mäter vi?', file: QFILE, time: null },
    { kind: 'finding', stage: 'code-generation', iteration: 2, author: 'arch', time: '2026-11-22T07:30:00.000Z' },
    { kind: 'changes', author: 'bo', time: '2026-11-22T09:05:00Z', url: 'https://x/61#rv1' },
    { kind: 'thread', path: 'src/a.js', line: 12, author: 'bo', text: 'Why a map here?', time: '2026-11-22T09:30:00Z', url: 'https://x/61#r1' }
  ],
  threads: [
    {
      id: 'rv2',
      path: null,
      line: null,
      resolved: null,
      url: 'https://x/61#rv2',
      comments: [c('bo', 'Still one thing.', '2026-11-22T11:00:00Z', 'https://x/61#rv2', 'commented')]
    },
    { id: 't2', path: 'src/b.js', line: 3, resolved: true, url: 'https://x/61#r3', comments: [c('anna', 'Typo.', '2026-11-22T10:00:00Z', 'https://x/61#r3')] },
    {
      id: 't1',
      path: 'src/a.js',
      line: 12,
      resolved: false,
      url: 'https://x/61#r1',
      comments: [c('bo', 'Why a map here?', '2026-11-22T09:00:00Z', 'https://x/61#r1'), c('me', 'Fewer lookups.', '2026-11-22T09:30:00Z', 'https://x/61#r2')]
    }
  ]
};

function setup(result = DATA) {
  const onOpenFile = vi.fn();
  window.bridge = { getStoryComments: vi.fn(async () => result) };
  render(<StoryComments projectId="p1" space="default" dirName="261122-a" files={FILES} onOpenFile={onOpenFile} />);
  return onOpenFile;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StoryComments as the Review tab (US-1203)', () => {
  it('is titled Review with a line saying what it shows', async () => {
    setup();
    await screen.findByTestId('review');
    expect(screen.getByRole('heading', { name: 'Granskning' })).toBeTruthy();
    expect(screen.getByTestId('review-description').textContent).toBe('Det som väntar på dig, och vad granskarna sa i storyns pull request.');
    expect(window.bridge.getStoryComments).toHaveBeenCalledWith('p1', 'default', '261122-a');
  });

  it('leads with what needs you, each row saying what to do and opening the right place', async () => {
    const onOpenFile = setup();
    const rows = await screen.findAllByTestId('review-needs-row');
    expect(rows.map((r) => r.dataset.kind)).toEqual(['question', 'finding', 'changes', 'thread']);
    expect(rows[0].textContent).toContain('AI-DLC väntar på ditt svar: Q2. Vad mäter vi?');
    expect(rows[1].textContent).toContain('Granskaren sa NOT-READY om Code Generation. Läs granskningen och ändra.');
    expect(rows[2].textContent).toContain('bo bad om ändringar. Svara eller skicka en rättelse.');
    expect(rows[3].textContent).toContain('Olöst tråd i src/a.js:12 av bo: svara eller lös den.');
    expect(rows.every((r) => r.className.includes('lcars-strip--alert'))).toBe(true);

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Svara i filen' }));
    expect(onOpenFile).toHaveBeenLastCalledWith(QFILE);
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Läs granskningen' }));
    expect(onOpenFile).toHaveBeenLastCalledWith(REVIEW);
    expect(within(rows[2]).getByRole('link', { name: 'Öppna på GitHub' }).getAttribute('href')).toBe('https://x/61#rv1');
    const link = within(rows[3]).getByRole('link', { name: 'Öppna på GitHub' });
    expect([link.getAttribute('href'), link.getAttribute('target')]).toEqual(['https://x/61#r1', '_blank']);
  });

  it('says in one line when nothing waits for you', async () => {
    setup({ ...DATA, needs: [] });
    expect((await screen.findByTestId('review-needs-none')).textContent).toBe('Inget väntar på dig.');
    expect(screen.queryAllByTestId('review-needs-row')).toHaveLength(0);
  });

  it('shows the pull request as a readout: number, state and reviewers', async () => {
    setup();
    const pull = await screen.findByTestId('review-pull');
    expect(pull.querySelector('table.lcars-rt')).toBeTruthy();
    const cells = [...pull.querySelectorAll('tbody td')].map((td) => td.textContent);
    expect(cells).toEqual(['#61', 'Öppen · ändringar begärda', 'bo (Bad om ändringar), anna (Godkände)']);
  });

  // US-0050 item 7: the resolved threads open with the shared fold (theme.css: details.lcars-reveal[open]).
  it('folds the resolved threads with the shared fold', async () => {
    setup();
    await screen.findByTestId('review');
    expect(screen.getByTestId('review-resolved').classList.contains('lcars-reveal')).toBe(true);
  });

  it('groups review comments by thread with file and line, newest first, and folds the resolved ones', async () => {
    setup();
    await screen.findByTestId('review');
    const resolved = screen.getByTestId('review-resolved');
    expect(resolved.tagName).toBe('DETAILS');
    expect(resolved.open).toBe(false);
    expect(within(resolved).getByText('1 löst tråd')).toBeTruthy();
    const all = screen.getAllByTestId('review-thread');
    const open = all.filter((el) => !resolved.contains(el));
    expect(open.map((el) => within(el).getByTestId('review-thread-where').textContent)).toEqual(['Samtal', 'src/a.js:12']);
    expect(
      within(open[1])
        .getAllByTestId('review-comment')
        .map((el) => el.textContent)
    ).toEqual([expect.stringContaining('Why a map here?'), expect.stringContaining('Fewer lookups.')]);
    expect(within(resolved).getByTestId('review-thread-where').textContent).toBe('src/b.js:3');
    expect(screen.queryByText(/Godkände Code Generation|Godkännande/)).toBeNull(); // approvals stay in Timeline
  });

  it('says which story number it looked for and how to link a pull request when none matches', async () => {
    setup({ ...DATA, pull: null, threads: [] });
    const none = await screen.findByTestId('review-no-pull');
    expect(none.textContent).toBe(
      'Ingen öppen pull request har US-1203 i grenen eller titeln. Länka en genom att sätta storynumret i grenens namn (till exempel feat/US-1203) eller i titeln.'
    );
    cleanup();
    setup({ ...DATA, pull: null, threads: [], stories: [] });
    expect((await screen.findByTestId('review-no-pull')).textContent).toBe('Intenten är inte kopplad till någon story, så ingen pull request kan hittas.');
  });

  it('shows a platform failure beside what it could read, and a failed read as an alert', async () => {
    setup({ ...DATA, error: { code: 'timeout', message: 'GitHub svarade inte inom 15 sekunder.' } });
    expect((await screen.findByTestId('review-error')).textContent).toBe('GitHub svarade inte inom 15 sekunder.');
    expect(screen.getAllByTestId('review-needs-row')).toHaveLength(4);
    cleanup();
    window.bridge = { getStoryComments: vi.fn(async () => Promise.reject(new Error('gone'))) };
    render(<StoryComments projectId="p1" space="default" dirName="261122-a" />);
    expect((await screen.findByRole('alert')).textContent).toBe('Granskningen kunde inte läsas: gone');
  });
});
