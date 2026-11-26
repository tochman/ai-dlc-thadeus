// US-0303 FR1.5, FR3.3, FR3.5, FR4.1–FR4.3, NFR2: the Velocity project view and the Velocity tab in the intent detail.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import { formatDuration } from '../../src/renderer/format.js';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
const { default: VelocityView } = await import('../../src/renderer/VelocityView.jsx');
const { default: IntentDetail } = await import('../../src/renderer/IntentDetail.jsx');

const H = 3600e3;
const T0 = new Date(2026, 10, 10, 9).getTime();
const MISSING = 'aidlc/spaces/default/intents/261112-c/audit';
const UNREADABLE = 'aidlc/spaces/default/intents/261113-d/audit';

// The shape project:velocity returns (loadVelocity).
const VELOCITY = {
  intents: [
    {
      dirName: '261110-a',
      slug: 'timeline',
      finished: true,
      archived: true,
      empty: false,
      totalMs: 5 * H,
      activeMs: 4 * H,
      parkedMs: H,
      waitingMs: 2 * H,
      reviews: 2,
      rejections: 1,
      endMs: T0 + 5 * H
    },
    {
      dirName: '261116-b',
      slug: 'velocity',
      finished: false,
      archived: false,
      empty: false,
      totalMs: 2 * H,
      activeMs: 2 * H,
      parkedMs: 0,
      waitingMs: 0,
      reviews: 0,
      rejections: 0,
      endMs: T0 + 7 * H
    }
  ],
  stories: [
    {
      id: 'US-0301',
      title: 'Timeline',
      epic: 'EPIC-03',
      status: 'done',
      startMs: T0,
      startSource: 'intent',
      doneMs: T0 + 26 * H,
      release: 'v0.2.0',
      releasedMs: null,
      toDoneMs: 26 * H,
      toReleaseMs: null
    }
  ],
  releases: [{ release: 'v0.2.0', dateMs: T0 + 48 * H, stories: ['US-0301'] }],
  project: {
    finished: 1,
    running: 1,
    storiesDone: 1,
    avgActiveMs: 4 * H,
    week: [{ key: '2026-W46', intents: 1, stories: 1, avgActiveMs: 4 * H }],
    month: [
      { key: '2026-10', intents: 2, stories: 0, avgActiveMs: 3 * H },
      { key: '2026-11', intents: 1, stories: 1, avgActiveMs: 4 * H }
    ]
  },
  sources: {
    intents: 2,
    shards: 3,
    epicFiles: ['docs/features/epic-03.md'],
    git: { commits: 12, fromMs: T0, toMs: T0 + 48 * H, dir: 'docs/features' },
    missing: [
      { kind: 'missing', path: MISSING },
      { kind: 'unreadable', path: UNREADABLE, error: 'EACCES' }
    ]
  }
};

let changed;
async function renderView(result = VELOCITY) {
  window.bridge = {
    getVelocity: vi.fn(async () => result),
    onProjectChanged: vi.fn((cb) => ((changed = cb), () => {})),
    onFeaturesChanged: vi.fn(() => () => {})
  };
  render(<VelocityView projectId="p1" space="default" />);
  await screen.findByTestId('velocity-chart');
}

afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('VelocityView (US-0303 FR3.3, FR3.5)', () => {
  it('shows the readouts and a week or month bar chart with the average as a line, and reloads on a project change', async () => {
    await renderView();
    expect(window.bridge.getVelocity).toHaveBeenCalledWith('p1', 'default');
    expect(screen.getByTestId('velocity-readout-finished').textContent).toContain('1');
    expect(screen.getByTestId('velocity-readout-average').textContent).toContain('4 h 0 min');
    const bars = () => screen.getByTestId('velocity-chart').querySelectorAll('rect');
    expect(screen.getByTestId('velocity-unit-week').getAttribute('aria-pressed')).toBe('true');
    expect(bars()).toHaveLength(2); // one week: intents and stories
    expect(screen.getByTestId('velocity-chart-average')).toBeTruthy();
    fireEvent.click(screen.getByTestId('velocity-unit-month'));
    expect(screen.getByTestId('velocity-unit-month').getAttribute('aria-pressed')).toBe('true');
    expect(bars()).toHaveLength(4);
    await act(async () => changed({ projectId: 'p1', space: 'default', dirNames: ['261116-b'] }));
    expect(window.bridge.getVelocity).toHaveBeenCalledTimes(2);
  });

  // US-0050 item 3: Week | Month changes the chart with the shared tab transition.
  it('slides the chart in on a Week | Month switch, with full motion only', async () => {
    const chart = () => screen.getByTestId('velocity-unit-content');
    try {
      document.documentElement.dataset.motion = 'full';
      await renderView();
      expect(chart().classList.contains('lcars-tab-in')).toBe(false);
      const week = chart();
      fireEvent.click(screen.getByTestId('velocity-unit-month'));
      expect(chart()).not.toBe(week);
      expect(chart().classList.contains('lcars-tab-in')).toBe(true);
      cleanup();
      document.documentElement.dataset.motion = 'reduced';
      await renderView();
      fireEvent.click(screen.getByTestId('velocity-unit-month'));
      expect(chart().classList.contains('lcars-tab-in')).toBe(false);
    } finally {
      delete document.documentElement.dataset.motion;
    }
  });

  it('marks an unfinished intent in text, shows an unknown span as unknown and names each missing record with its path (FR4.1, FR4.2, NFR2)', async () => {
    await renderView();
    const [a, b] = screen.getAllByTestId('velocity-intent-row');
    expect(within(a).queryByTestId('velocity-intent-unfinished')).toBeNull();
    expect(within(b).getByTestId('velocity-intent-unfinished').textContent).toBe(t('velocity.notFinished'));
    const story = screen.getByTestId('velocity-story-row');
    expect(within(story).getByTestId('velocity-story-release').textContent).toBe(t('velocity.unknown'));
    const missing = screen.getAllByTestId('velocity-missing').map((li) => li.textContent);
    expect(missing.some((x) => x.includes(MISSING))).toBe(true);
    expect(missing.some((x) => x.includes(UNREADABLE) && x.includes('EACCES'))).toBe(true);
  });

  it('lists the records it used in the sources footer (FR4.3)', async () => {
    await renderView();
    const sources = screen.getByTestId('velocity-sources').textContent;
    expect(sources).toContain('docs/features/epic-03.md');
    expect(sources).toContain('docs/features');
    expect(sources).toContain(t('velocity.sources.records', { intents: 2, shards: 3 }));
  });
});

describe('the Velocity tab in the intent detail (US-0303 FR1.5)', () => {
  const ev = (h, event, fields = {}) => ({ timeMs: T0 + h * H, event, fields, key: `s#${h}${event}`, category: 'stage' });
  const detail = {
    dirName: '261110-a',
    state: { currentStage: null },
    pipeline: { phases: [], done: 0, executed: 0 },
    files: [],
    warnings: [],
    graph: null,
    units: {},
    events: [
      ev(0, 'WORKFLOW_STARTED'),
      ev(0, 'PHASE_STARTED', { Phase: 'inception' }),
      ev(0, 'STAGE_STARTED', { Stage: 'requirements-analysis' }),
      ev(0.5, 'REVIEW_COMPLETED', { Stage: 'requirements-analysis' }),
      ev(1, 'STAGE_AWAITING_APPROVAL', { Stage: 'requirements-analysis' }),
      ev(2, 'GATE_APPROVED', { Stage: 'requirements-analysis' }),
      ev(3, 'STAGE_COMPLETED', { Stage: 'requirements-analysis' }),
      ev(3, 'PHASE_COMPLETED', { 'From phase': 'inception' }),
      ev(3, 'WORKFLOW_COMPLETED')
    ]
  };

  it("shows the intent's phases, stages, waiting and review numbers", () => {
    window.bridge = {};
    render(<IntentDetail projectId="p1" detail={detail} intent={{ dirName: '261110-a', slug: 'a', status: 'complete' }} cost={null} models={null} />);
    fireEvent.click(screen.getByTestId('intent-detail-tab-velocity'));
    const view = screen.getByTestId('velocity-intent');
    expect(within(view).getByTestId('velocity-readout-active').textContent).toContain('3 h 0 min');
    expect(within(view).queryByTestId('velocity-intent-unfinished')).toBeNull();
    expect(within(view).getAllByTestId('velocity-phase-row')[0].textContent).toContain('3 h 0 min');
    const [stage] = within(view).getAllByTestId('velocity-stage-row');
    expect(within(stage).getByTestId('velocity-stage-waiting').textContent).toBe('1 h 0 min');
    expect(within(stage).getByTestId('velocity-stage-reviews').textContent).toBe('1');
  });
});

// US-1304 FR1.2, FR6.1, FR6.2, NFR4: the Delivery section, every status as text.
const D = 24 * H;
const DELIVERED = {
  ...VELOCITY,
  delivery: {
    readouts: { leadMs: 3 * D, perMonth: 1.5, failureRate: 0.5, recoverMs: 2 * D },
    pulls: { count: 4, medianOpenMs: 5 * H, medianRounds: 2 },
    withoutFaultIn: 3,
    releases: [
      {
        release: 'v0.1.0',
        dateMs: T0,
        stories: 2,
        leadMs: 3 * D,
        failed: true,
        prerelease: true,
        fixes: ['US-0057'],
        recoverMs: 2 * D,
        recovered: true,
        pulls: 2,
        medianOpenMs: 5 * H
      },
      {
        release: 'v0.2.0',
        dateMs: T0 + D,
        stories: 1,
        leadMs: null,
        failed: true,
        prerelease: false,
        fixes: ['US-0058'],
        recoverMs: null,
        recovered: false,
        pulls: 1,
        medianOpenMs: H
      },
      {
        release: 'v0.3.0',
        dateMs: T0 + 2 * D,
        stories: 0,
        leadMs: null,
        failed: false,
        prerelease: false,
        fixes: [],
        recoverMs: null,
        recovered: null,
        pulls: null,
        medianOpenMs: null
      }
    ],
    missing: [{ kind: 'releases', path: 'GitLab', error: null }]
  }
};

describe('the Delivery section (US-1304 FR6)', () => {
  it('shows median lead time, releases per month, change failure rate and median time to recover', async () => {
    await renderView(DELIVERED);
    expect(screen.getByTestId('velocity-delivery-lead').textContent).toContain(formatDuration(3 * D));
    expect(screen.getByTestId('velocity-delivery-frequency').textContent).toContain('1,5');
    expect(screen.getByTestId('velocity-delivery-failure').textContent).toContain('50');
    expect(screen.getByTestId('velocity-delivery-recover').textContent).toContain(formatDuration(2 * D));
  });

  it('shows the pull request medians, and says when the pull requests are missing', async () => {
    await renderView(DELIVERED);
    const pulls = screen.getByTestId('velocity-delivery-pulls').textContent;
    expect(pulls).toContain(t('velocity.delivery.pulls', { count: 4, open: formatDuration(5 * H), rounds: '2' }));
    cleanup();
    await renderView({ ...DELIVERED, delivery: { ...DELIVERED.delivery, pulls: null } });
    expect(screen.getByTestId('velocity-delivery-pulls').textContent).toBe(t('velocity.delivery.noPulls'));
  });

  it('gives one row per release with failed and why, time to recover and "not recovered yet" as text', async () => {
    await renderView(DELIVERED);
    const [a, b, c] = screen.getAllByTestId('velocity-delivery-release');
    expect(a.textContent).toContain(t('velocity.delivery.prerelease'));
    expect(a.textContent).toContain('US-0057');
    expect(a.textContent).toContain(formatDuration(2 * D));
    expect(b.textContent).toContain(t('velocity.delivery.notRecovered'));
    expect(b.textContent).toContain(t('velocity.unknown')); // no lead time
    expect(c.textContent).toContain(t('velocity.delivery.ok'));
  });

  it('counts the fix stories without a Fault in line and names a missing source', async () => {
    await renderView(DELIVERED);
    expect(screen.getByTestId('velocity-delivery-nofault').textContent).toBe(t('velocity.delivery.withoutFaultIn', { n: 3 }));
    const missing = screen.getByTestId('velocity-delivery-missing').textContent;
    expect(missing).toContain(t('velocity.missing.releases'));
    expect(missing).toContain('GitLab');
    expect(screen.getByTestId('velocity-delivery-sources').textContent).toBe(t('velocity.delivery.sources'));
  });

  it('calls the story column "Lead time", and shows no Delivery section without delivery figures', async () => {
    await renderView();
    expect(screen.getByTestId('velocity-stories').querySelector('thead').textContent).toContain(t('velocity.stories.leadTime'));
    expect(screen.queryByTestId('velocity-delivery')).toBeNull();
  });
});
