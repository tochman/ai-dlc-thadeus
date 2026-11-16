// US-1201 AC-4: one list per story: the pull request's comments and reviews with AI-DLC's open questions, approvals and
// review findings, in time order, each row with its source, author and time.
import { afterAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadOpenQuestions, matchPull, openQuestions, storyComments } from '../../src/main/teamActivity.js';

const TMP = path.resolve(__dirname, '../.tmp/story-comments');
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const PULLS = [
  { number: 58, title: 'feat(US-0209): cost', branch: 'feat/US-0209', url: 'https://x/58', files: [] },
  {
    number: 59,
    title: 'fix(us-0414): one tooltip',
    branch: 'fix/tooltip',
    url: 'https://x/59',
    files: [],
    comments: [{ author: 'anna', body: 'Nice.', time: '2026-11-16T10:30:00Z', url: 'https://x/59#c1' }],
    reviews: [{ author: 'anna', state: 'approved', time: '2026-11-16T12:00:00Z', body: '', url: null }]
  }
];

const ev = (event, iso, fields, source = 'mac-aaaaaaaaaaaa.md') => ({ event, timeMs: Date.parse(iso), timestamp: iso, fields, source });
const EVENTS = [
  ev('STAGE_STARTED', '2026-11-16T09:00:00Z', { Stage: 'code-generation' }),
  ev('REVIEW_COMPLETED', '2026-11-16T10:00:00Z', { Stage: 'code-generation', Reviewer: 'aidlc-architecture-reviewer-agent', Verdict: 'NOT-READY' }),
  ev('GATE_APPROVED', '2026-11-16T11:00:00Z', { Stage: 'code-generation' }, 'pc-bbbbbbbbbbbb.md')
];
const QUESTIONS = [{ text: 'Q1. Which profile?', file: 'ideation/scope-definition/scope-definition-questions.md', time: '2026-11-16T09:30:00Z' }];

describe('matchPull (US-1201 AC-4)', () => {
  it("finds the story's pull request by the story number in its branch or its title", () => {
    expect(matchPull(PULLS, ['US-0209'])?.number).toBe(58);
    expect(matchPull(PULLS, ['US-0414'])?.number).toBe(59); // title, either case
    expect(matchPull(PULLS, ['US-0999'])).toBeNull();
    expect(matchPull(PULLS, [])).toBeNull();
  });
});

describe('openQuestions (US-1201 AC-4)', () => {
  it('lists the questions whose [Answer]: is still empty, by their heading', () => {
    const text = [
      '# Scope Definition',
      '## Q1. [Produktägare] Vilken profil?',
      'A. Du',
      'X. Other (please specify)',
      '',
      '[Answer]: A (2026-11-16)',
      '## Q2. Vad mäter vi?',
      'A. Krockar',
      '[Answer]:',
      '## Q3. Och sedan?',
      '[Answer]:   '
    ].join('\n');
    expect(openQuestions(text)).toEqual(['Q2. Vad mäter vi?', 'Q3. Och sedan?']);
    expect(openQuestions('')).toEqual([]);
  });

  it("reads only the intent's question files, each question at its file's time, and skips one that is gone", async () => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(path.join(TMP, 'q'), { recursive: true });
    writeFileSync(path.join(TMP, 'q/scope-questions.md'), '## Q1. Open?\n[Answer]:\n');
    writeFileSync(path.join(TMP, 'q/notes.md'), '## Not a question file\n[Answer]:\n');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = await openRoot(TMP);
    const groups = [
      {
        dir: 'q',
        files: [
          { name: 'scope-questions.md', rel: 'q/scope-questions.md' },
          { name: 'notes.md', rel: 'q/notes.md' },
          { name: 'gone-questions.md', rel: 'q/gone-questions.md' }
        ]
      }
    ];
    const questions = await loadOpenQuestions(root, groups);
    expect(questions).toEqual([{ text: 'Q1. Open?', file: 'q/scope-questions.md', time: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) }]);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});

describe('storyComments (US-1201 AC-4)', () => {
  it("merges the pull request's comments and reviews with AI-DLC's questions, approvals and findings in time order", () => {
    const { pull, rows } = storyComments({ stories: ['US-0414'] }, PULLS, EVENTS, QUESTIONS);
    expect(pull).toEqual({ number: 59, title: 'fix(us-0414): one tooltip', url: 'https://x/59' });
    expect(rows.map((r) => [r.source, r.author, r.time])).toEqual([
      ['question', 'AI-DLC', '2026-11-16T09:30:00Z'],
      ['finding', 'aidlc-architecture-reviewer-agent', '2026-11-16T10:00:00.000Z'],
      ['pull', 'anna', '2026-11-16T10:30:00Z'],
      ['approval', 'pc', '2026-11-16T11:00:00.000Z'],
      ['review', 'anna', '2026-11-16T12:00:00Z']
    ]);
    expect(rows[1]).toMatchObject({ stage: 'code-generation', text: 'NOT-READY' });
    expect(rows[3]).toMatchObject({ stage: 'code-generation' });
    expect(rows[4]).toMatchObject({ state: 'approved' });
  });

  it('gives only the AI-DLC rows without a pull request, and nothing for an intent with nothing yet', () => {
    const { pull, rows } = storyComments({ stories: ['US-0999'] }, PULLS, EVENTS, QUESTIONS);
    expect(pull).toBeNull();
    expect(rows.map((r) => r.source)).toEqual(['question', 'finding', 'approval']);
    expect(storyComments({ stories: [] }, [], [], [])).toEqual({ pull: null, rows: [] });
  });

  it('keeps a row without a time last', () => {
    const { rows } = storyComments({ stories: [] }, [], EVENTS.slice(2), [{ text: 'Q9', file: 'x.md', time: null }]);
    expect(rows.map((r) => r.source)).toEqual(['approval', 'question']);
  });
});
