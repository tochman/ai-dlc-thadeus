// US-1201 AC-4, US-1203: the story's pull request and AI-DLC's open questions; what needs you, the reviewers and the
// review threads.
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

// US-1203: a pull request with a change request, an open and a resolved review thread, and a plain comment.
const THREAD = (id, path, line, resolved) => ({ id, path, line, resolved });
const REVIEWED = {
  number: 61,
  title: 'feat(US-1203): review tab',
  branch: 'feat/US-1203',
  url: 'https://x/61',
  files: [],
  comments: [
    { author: 'anna', body: 'Nice.', time: '2026-11-22T08:00:00Z', url: 'https://x/61#c1' },
    { author: 'bo', body: 'Why a map here?', time: '2026-11-22T09:00:00Z', url: 'https://x/61#r1', thread: THREAD('t1', 'src/a.js', 12, false) },
    { author: 'me', body: 'Fewer lookups.', time: '2026-11-22T09:30:00Z', url: 'https://x/61#r2', thread: THREAD('t1', 'src/a.js', 12, false) },
    { author: 'anna', body: 'Typo.', time: '2026-11-22T10:00:00Z', url: 'https://x/61#r3', thread: THREAD('t2', 'src/b.js', 3, true) }
  ],
  reviews: [
    { author: 'bo', state: 'changes', time: '2026-11-22T09:05:00Z', body: '', url: 'https://x/61#rv1' },
    { author: 'bo', state: 'commented', time: '2026-11-22T11:00:00Z', body: 'Still one thing.', url: 'https://x/61#rv2' },
    { author: 'anna', state: 'approved', time: '2026-11-22T10:05:00Z', body: '', url: 'https://x/61#rv3' }
  ]
};
const REVIEW_EVENTS = [
  ev('REVIEW_COMPLETED', '2026-11-22T07:00:00Z', { Stage: 'requirements-analysis', Reviewer: 'lead', Verdict: 'NOT-READY', Iteration: '1' }),
  ev('REVIEW_COMPLETED', '2026-11-22T07:10:00Z', { Stage: 'requirements-analysis', Reviewer: 'lead', Verdict: 'READY', Iteration: '2' }),
  ev('GATE_APPROVED', '2026-11-22T07:20:00Z', { Stage: 'requirements-analysis' }),
  ev('REVIEW_COMPLETED', '2026-11-22T07:30:00Z', { Stage: 'code-generation', Reviewer: 'arch', Verdict: 'NOT-READY', Iteration: '2' })
];

describe('storyComments (US-1203)', () => {
  it('lists what needs you: open questions, NOT-READY findings still standing, change requests and unresolved threads', () => {
    const { needs } = storyComments({ stories: ['US-1203'] }, [REVIEWED], REVIEW_EVENTS, QUESTIONS);
    expect(needs).toEqual([
      { kind: 'question', text: 'Q1. Which profile?', file: QUESTIONS[0].file, time: QUESTIONS[0].time },
      { kind: 'finding', stage: 'code-generation', iteration: 2, author: 'arch', time: '2026-11-22T07:30:00.000Z' },
      { kind: 'changes', author: 'bo', time: '2026-11-22T09:05:00Z', url: 'https://x/61#rv1' },
      { kind: 'thread', path: 'src/a.js', line: 12, author: 'bo', text: 'Why a map here?', time: '2026-11-22T09:30:00Z', url: 'https://x/61#r1' }
    ]);
  });

  it('gives the pull request with its reviewers, each at their latest verdict, and repeats no approval', () => {
    const res = storyComments({ stories: ['US-1203'] }, [REVIEWED], REVIEW_EVENTS, []);
    expect(res.pull).toEqual({
      number: 61,
      title: 'feat(US-1203): review tab',
      url: 'https://x/61',
      reviewers: [
        { author: 'bo', state: 'changes' },
        { author: 'anna', state: 'approved' }
      ]
    });
    expect(JSON.stringify(res)).not.toMatch(/"approval"|GATE_APPROVED/);
  });

  it('groups review comments by thread with file and line, newest thread first, and marks the resolved ones', () => {
    const { threads } = storyComments({ stories: ['US-1203'] }, [REVIEWED], [], []);
    expect(threads.map((t) => [t.path, t.line, t.resolved, t.comments.map((c) => c.author)])).toEqual([
      [null, null, null, ['bo']], // the review body at 11:00
      ['src/b.js', 3, true, ['anna']],
      ['src/a.js', 12, false, ['bo', 'me']],
      [null, null, null, ['anna']] // the plain comment at 08:00
    ]);
    expect(threads[0].comments[0]).toMatchObject({ body: 'Still one thing.', state: 'commented', url: 'https://x/61#rv2' });
  });

  it('gives nothing for an intent with no pull request and nothing waiting', () => {
    expect(storyComments({ stories: ['US-0999'] }, [REVIEWED], [], [])).toEqual({ pull: null, needs: [], threads: [] });
    expect(storyComments({ stories: [] }, [], EVENTS.slice(2), [])).toEqual({ pull: null, needs: [], threads: [] });
  });
});
