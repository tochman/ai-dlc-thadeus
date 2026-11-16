// US-0303: the velocity metrics, pure functions over merged audit events, the feature docs and the epic files' git history.
import { describe, expect, it } from 'vitest';
import { intentMetrics, isoWeek, parseMarkerHistory, projectMetrics, storyMetrics } from '../../src/main/parsers/velocity.js';

const H = 3600e3;
const T0 = new Date(2026, 10, 10, 9, 0).getTime(); // local time
const ev = (h, event, fields = {}) => ({ timeMs: T0 + h * H, event, fields });

const A = '2026-11-13T07:20:57+01:00';
const B = '2026-11-14T10:00:00+01:00';
const C = '2026-11-15T12:30:00+01:00';
const LOG = [
  `\0aaa\t${A}\n`,
  'diff --git a/docs/features/epic-03.md b/docs/features/epic-03.md',
  '+++ b/docs/features/epic-03.md',
  '@@ -0,0 +1,4 @@',
  '+**US-0301: Timeline** 🚧 In progress',
  '+**US-0302: Highlight** 📋 Planned',
  '+  - [ ] **Story:** time from 🚧 In progress to ✅ Done',
  `\0bbb\t${B}\n`,
  '@@ -1 +1 @@',
  '-**US-0301: Timeline** 🚧 In progress',
  '+**US-0301: Timeline** ✅ Released in v0.2.0',
  '+**US-0302: Highlight** 🚧 In progress, for v0.2.1',
  `\0ccc\t${C}\n`,
  '+**US-0301: Timeline** ✅ Done',
  '+**US-0303: Velocity** 🚀 Deployed'
].join('\n');

describe('parseMarkerHistory (US-0303 FR2.1, FR2.4)', () => {
  it('gives the first 🚧 and ✅ date per story from `git log -p`, and the commit range it read', () => {
    const h = parseMarkerHistory(LOG);
    expect(h.stories['US-0301']).toEqual({ progressMs: Date.parse(A), doneMs: Date.parse(B) });
    expect(h.stories['US-0302']).toEqual({ progressMs: Date.parse(B), doneMs: null });
    expect(h.stories['US-0303']).toEqual({ progressMs: null, doneMs: Date.parse(C) }); // 🚀 is past done
    expect(h).toMatchObject({ commits: 3, fromMs: Date.parse(A), toMs: Date.parse(C) });
  });

  it('gives no stories and no range for empty or missing output', () => {
    expect(parseMarkerHistory('')).toEqual({ stories: {}, commits: 0, fromMs: null, toMs: null });
    expect(parseMarkerHistory(null)).toEqual({ stories: {}, commits: 0, fromMs: null, toMs: null });
  });
});

// A finished intent: inception with a review, a rejection and two gate waits, a park, construction with a plan approval,
// and a build-and-test stage that never completed.
const FINISHED = [
  ev(0, 'WORKFLOW_STARTED'),
  ev(0, 'PHASE_STARTED', { Phase: 'inception' }),
  ev(0, 'STAGE_STARTED', { Stage: 'requirements-analysis' }),
  ev(1, 'REVIEW_COMPLETED', { Stage: 'requirements-analysis' }),
  ev(1, 'STAGE_AWAITING_APPROVAL', { Stage: 'requirements-analysis' }),
  ev(2, 'GATE_REJECTED', { Stage: 'requirements-analysis' }),
  ev(2, 'STAGE_AWAITING_APPROVAL', { Stage: 'requirements-analysis' }),
  ev(2.5, 'GATE_APPROVED', { Stage: 'requirements-analysis' }),
  ev(3, 'STAGE_COMPLETED', { Stage: 'requirements-analysis' }),
  ev(3, 'PHASE_COMPLETED', { 'From phase': 'inception', 'To phase': 'construction' }),
  ev(3, 'WORKFLOW_PARKED', { Stage: 'code-generation' }),
  ev(5, 'WORKFLOW_UNPARKED'),
  ev(5, 'PHASE_STARTED', { Phase: 'construction' }),
  ev(5, 'STAGE_STARTED', { Stage: 'code-generation' }),
  ev(5, 'QUESTION_ASKED', { 'Question Type': 'plan-approval', Stage: 'code-generation' }),
  ev(6, 'PLAN_APPROVAL_RECORDED', { Stage: 'code-generation' }),
  ev(7, 'STAGE_COMPLETED', { Stage: 'code-generation' }),
  ev(7, 'STAGE_STARTED', { Stage: 'build-and-test' }),
  ev(8, 'WORKFLOW_COMPLETED')
];

describe('intentMetrics (US-0303 FR1.1–FR1.4, FR4.1)', () => {
  const m = intentMetrics(FINISHED);

  it('takes the parked span out of the active time and shows it as its own figure (FR1.1)', () => {
    expect(m).toMatchObject({ finished: true, totalMs: 8 * H, parkedMs: 2 * H, activeMs: 6 * H });
  });

  it('pairs phase and stage starts with their completion, and leaves an unpaired start open (FR1.2)', () => {
    expect(m.phases).toEqual([
      { name: 'inception', ms: 3 * H, open: false },
      { name: 'construction', ms: null, open: true }
    ]);
    expect(m.stages.map((s) => [s.name, s.ms, s.open])).toEqual([
      ['requirements-analysis', 3 * H, false],
      ['code-generation', 2 * H, false],
      ['build-and-test', null, true]
    ]);
  });

  it('sums gate waits and the plan approval per stage and per intent, and counts reviews and rejections (FR1.3, FR1.4)', () => {
    const ra = m.stages.find((s) => s.name === 'requirements-analysis');
    expect(ra).toMatchObject({ waitingMs: 1.5 * H, reviews: 1, rejections: 1 });
    expect(m.stages.find((s) => s.name === 'code-generation')).toMatchObject({ waitingMs: H, reviews: 0, rejections: 0 });
    expect(m).toMatchObject({ waitingMs: 2.5 * H, reviews: 1, rejections: 1 });
  });

  it('shows a running intent so far, marked not finished, unless its state says it is complete (FR4.1)', () => {
    const running = [ev(0, 'WORKFLOW_STARTED'), ev(1, 'WORKFLOW_PARKED'), ev(2, 'WORKFLOW_UNPARKED'), ev(3, 'STAGE_STARTED', { Stage: 'x' })];
    expect(intentMetrics(running)).toMatchObject({ finished: false, totalMs: 3 * H, parkedMs: H, activeMs: 2 * H });
    expect(intentMetrics(running, { finished: true }).finished).toBe(true);
    expect(intentMetrics([])).toMatchObject({ finished: false, totalMs: null, activeMs: null, parkedMs: 0, stages: [], phases: [] });
  });
});

describe('storyMetrics (US-0303 FR2.1–FR2.3)', () => {
  const day = (d, h = 12) => new Date(2026, 10, d, h).getTime();
  const story = (id, status, statusText) => ({ id, title: id, status, statusText });
  const features = {
    available: true,
    epics: [
      {
        id: 'EPIC-03',
        parsed: {
          stories: [
            story('US-0301', 'done', 'Released in v0.2.0'),
            story('US-0302', 'done', 'Done, for v0.2.1'),
            story('US-0303', 'progress', 'In progress'),
            story('US-0304', 'done', 'Released in v0.2.0')
          ]
        }
      }
    ]
  };
  const intents = [
    { dirName: '261103-later', request: 'more on us-0301', startMs: day(3) },
    { dirName: '261101-timeline', request: 'US-0301: timeline', startMs: day(1) }
  ];
  const history = {
    'US-0301': { progressMs: day(2), doneMs: day(5) },
    'US-0302': { progressMs: day(4), doneMs: day(6) },
    'US-0304': { progressMs: day(7), doneMs: day(7) }
  };
  const tags = [
    { name: 'v0.2.0', date: '2026-11-12' },
    { name: 'v0.2.1', date: null }
  ];
  const { stories, releases } = storyMetrics({ features, intents, history, tags });
  const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
  const released = new Date(2026, 10, 12).getTime();

  it('starts a story at the earliest intent that names it, ends it at the git ✅ and releases it at its tag (FR2.1)', () => {
    expect(byId['US-0301']).toMatchObject({
      epic: 'EPIC-03',
      startMs: day(1),
      startSource: 'intent',
      doneMs: day(5),
      release: 'v0.2.0',
      releasedMs: released,
      toDoneMs: day(5) - day(1),
      toReleaseMs: released - day(1)
    });
  });

  it('falls back to the git 🚧 without a naming intent, and shows a zero or sourceless span as unknown (FR2.2)', () => {
    expect(byId['US-0302']).toMatchObject({ startMs: day(4), startSource: 'git', toDoneMs: 2 * 24 * H, release: null, toReleaseMs: null });
    expect(byId['US-0303']).toMatchObject({ startMs: null, startSource: null, doneMs: null, toDoneMs: null });
    expect(byId['US-0304'].toDoneMs).toBeNull(); // 🚧 and ✅ in the same commit
  });

  it('groups the stories marked "Released in vX.Y.Z" by release (FR2.3)', () => {
    expect(releases).toEqual([{ release: 'v0.2.0', dateMs: released, stories: ['US-0301', 'US-0304'] }]);
  });
});

describe('projectMetrics (US-0303 FR3.1–FR3.4, FR4.1)', () => {
  const at = (y, mo, d, h, mi = 0) => new Date(y, mo, d, h, mi).getTime();
  const rows = [
    { dirName: 'a', finished: true, endMs: at(2026, 10, 15, 23, 30), activeMs: 2 * H }, // Sunday, ISO week 46
    { dirName: 'b', finished: true, archived: true, endMs: at(2026, 10, 16, 0, 30), activeMs: 4 * H }, // Monday, week 47
    { dirName: 'c', finished: false, endMs: at(2026, 10, 16, 10), activeMs: 10 * H }, // still running
    { dirName: 'd', finished: true, endMs: at(2027, 0, 1, 12), activeMs: 6 * H } // Friday 1 January 2027: 2026-W53
  ];
  const stories = [
    { id: 'US-1', doneMs: at(2026, 10, 16, 9) },
    { id: 'US-2', doneMs: null }
  ];
  const p = projectMetrics(rows, stories);

  it('names ISO weeks in local time, across a year boundary', () => {
    expect(isoWeek(at(2026, 10, 15, 23, 30))).toBe('2026-W46');
    expect(isoWeek(at(2026, 10, 16, 0, 30))).toBe('2026-W47');
    expect(isoWeek(at(2027, 0, 1, 12))).toBe('2026-W53');
  });

  it('counts finished intents and stories per week and month, archived ones included, unfinished ones left out (FR3.1, FR3.4, FR4.1)', () => {
    expect(p.week).toEqual([
      { key: '2026-W46', intents: 1, stories: 0, avgActiveMs: 2 * H },
      { key: '2026-W47', intents: 1, stories: 1, avgActiveMs: 4 * H },
      { key: '2026-W53', intents: 1, stories: 0, avgActiveMs: 6 * H }
    ]);
    expect(p.month).toEqual([
      { key: '2026-11', intents: 2, stories: 1, avgActiveMs: 3 * H },
      { key: '2027-01', intents: 1, stories: 0, avgActiveMs: 6 * H }
    ]);
  });

  it('averages the finished intents only (FR3.2, FR4.1)', () => {
    expect(p).toMatchObject({ finished: 3, running: 1, storiesDone: 1, avgActiveMs: 4 * H });
    expect(projectMetrics([], [])).toMatchObject({ finished: 0, avgActiveMs: null, week: [], month: [] });
  });
});

describe('performance (US-0303 NFR3)', () => {
  it('computes 100 intents with 20 000 audit events and 100 stories in under 1 s', () => {
    const kinds = [
      'STAGE_STARTED',
      'STAGE_AWAITING_APPROVAL',
      'GATE_APPROVED',
      'REVIEW_COMPLETED',
      'STAGE_COMPLETED',
      'ARTIFACT_CREATED',
      'HUMAN_TURN',
      'QUESTION_REPLIED'
    ];
    const intents = Array.from({ length: 100 }, (_, i) => [
      ev(i * 10, 'WORKFLOW_STARTED'),
      ...Array.from({ length: 198 }, (_, n) => ev(i * 10 + n / 100, kinds[n % kinds.length], { Stage: `stage-${Math.floor(n / 8)}` })),
      ev(i * 10 + 5, 'WORKFLOW_COMPLETED')
    ]);
    expect(intents.flat()).toHaveLength(20000);
    const features = {
      epics: [{ id: 'EPIC-01', parsed: { stories: Array.from({ length: 100 }, (_, i) => ({ id: `US-${String(1000 + i)}`, statusText: '' })) } }]
    };
    const started = performance.now();
    const rows = intents.map((events) => intentMetrics(events));
    const named = rows.map((r, i) => ({ dirName: `d${i}`, request: `US-${1000 + i}`, startMs: r.startMs }));
    const { stories } = storyMetrics({ features, intents: named });
    const p = projectMetrics(rows, stories);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(p.finished).toBe(100);
  });
});
