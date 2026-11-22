// US-0417 views on the shared pieces: the Intents list in the drawer, the intent head and the data views (Activity,
// Cost, Velocity) in the curved diagonal frame, readouts that never look like controls, and the entrance on entry.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18n from '../../src/shared/i18n.js';
import { summarizeLedger } from '../../src/main/parsers/ledger.js';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
vi.mock('@visx/responsive', () => ({ ParentSize: ({ children }) => children({ width: 800, height: 260 }) }));
const { default: IntentList } = await import('../../src/renderer/IntentList.jsx');
const { default: IntentDetail } = await import('../../src/renderer/IntentDetail.jsx');
const { default: TokenDetail } = await import('../../src/renderer/TokenDetail.jsx');
const { default: CostPanel } = await import('../../src/renderer/CostPanel.jsx');
const { default: VelocityView } = await import('../../src/renderer/VelocityView.jsx');
const { default: AgentProgress } = await import('../../src/renderer/AgentProgress.jsx');

const ledger = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const DIR = '261113-live';
const intent = {
  dirName: DIR,
  uuid: '01a1c625-50f3-7f83-9755-b096bf4025e6',
  slug: 'live',
  scope: 'feature',
  status: 'in-flight',
  date: '2026-11-13',
  active: true
};
const done = { ...intent, dirName: '261110-old', uuid: null, slug: 'old', status: 'complete', active: false };
const cost = () => ({ available: true, ...summarizeLedger(ledger, [intent]) });
const STAGES = ['functional-design', 'code-generation'];
const detail = {
  dirName: DIR,
  state: { currentStage: 'code-generation', plan: null, scope: 'feature', depth: 'standard', testStrategy: 'standard' },
  pipeline: {
    phases: [
      {
        name: 'construction',
        stages: [
          { slug: 'functional-design', status: 'done' },
          { slug: 'code-generation', status: 'in-progress' }
        ]
      }
    ],
    done: 1,
    executed: 2
  },
  files: [],
  request: null,
  warnings: [],
  events: [],
  graph: null,
  units: {}
};
const VELOCITY = {
  intents: [],
  stories: [],
  releases: [],
  project: { finished: 3, running: 1, avgActiveMs: 3600e3, storiesDone: 4, week: [], month: [] },
  sources: { intents: 4, shards: 4, epicFiles: [], git: null, missing: [] }
};

beforeEach(() => {
  document.documentElement.dataset.motion = 'full';
  window.bridge = {
    getSettings: vi.fn(async () => ({})),
    setSettings: vi.fn(async () => ({})),
    getTokenReadings: vi.fn(async () => []),
    getAgentProgress: vi.fn(async () => []),
    getVelocity: vi.fn(async () => VELOCITY),
    parkIntent: vi.fn(async () => ({ ok: true }))
  };
});
afterEach(async () => {
  cleanup();
  delete document.documentElement.dataset.motion;
  delete window.bridge;
  await i18n.changeLanguage('sv');
});

describe('Intents: the list column in the drawer', () => {
  it('ends the "Intents" heading row with the drawer toggle and folds to the stack with the count and a live segment', async () => {
    render(<IntentList intents={[intent, done]} selected={null} onSelect={() => {}} />);
    const drawer = screen.getByTestId('list-drawer');
    const heading = within(drawer).getByTestId('section-heading');
    expect(within(heading).getByRole('heading').textContent).toBe('Intents');
    expect(heading.lastElementChild).toBe(within(drawer).getByTestId('list-fold-toggle'));
    expect(within(heading).getByTestId('intent-list-sort')).toBeTruthy(); // the sort sits in the heading row
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());

    fireEvent.click(within(drawer).getByTestId('list-fold-toggle'));
    expect(drawer.className).toContain('is-folded');
    const stack = screen.getByTestId('list-drawer-stack');
    expect(stack.querySelector('.lcars-drawer-count').textContent).toBe('2');
    expect(stack.querySelector('.lcars-drawer-live')).toBeTruthy(); // one intent runs
    expect(screen.getByTestId('intent-list-search')).toBeTruthy(); // still mounted
  });

  it('has no live segment when nothing runs', () => {
    render(<IntentList intents={[done]} selected={null} onSelect={() => {}} />);
    expect(screen.getByTestId('list-drawer-stack').querySelector('.lcars-drawer-live')).toBeNull();
  });
});

describe('the intent head in the diagonal frame', () => {
  const head = () =>
    render(<IntentDetail projectId="p1" detail={detail} intent={intent} activeDirName={DIR} activeIntent={intent} cost={cost()} models={null} />);

  it('titles the frame with the intent, tags it with its folder, drops the readouts out of the arm, and uses pills and tiles', () => {
    head();
    const frame = screen.getByTestId('lcars-diagonal-frame');
    expect(within(frame).getByRole('heading', { level: 2 }).textContent).toBe('live');
    expect(within(frame).getByText(DIR, { selector: '.lcars-tagbox' })).toBeTruthy();
    const blocks = within(frame).getAllByTestId('lcars-diagonal-readout');
    expect(blocks.map((b) => b.querySelector('.lcars-dblk-k').textContent)).toEqual(['Kostnad', 'Modell', 'Läge']);
    expect(screen.getByTestId('intent-park').className).toContain('lcars-pill');
    expect(screen.getByTestId('intent-resume').className).toContain('lcars-pill');
    const tab = screen.getByTestId('intent-detail-tab-pipeline');
    expect(tab.getAttribute('role')).toBe('tab');
    expect(tab.className).toContain('lcars-tile');
    expect(tab.className).toContain('is-sel');
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
  });

  it('runs the entrance when an intent is shown', () => {
    head();
    expect(screen.getByTestId('intent-detail').className).toContain('is-entering');
  });
});

describe('Activity: the renamed token detail', () => {
  it('the intent head names it Activity, in both languages, and it opens in the diagonal frame', async () => {
    const { unmount } = render(<IntentDetail projectId="p1" detail={detail} intent={intent} activeDirName={DIR} cost={cost()} models={null} />);
    expect(screen.getByTestId('intent-detail-tokens').textContent).toBe('Aktivitet');
    fireEvent.click(screen.getByTestId('intent-detail-tokens'));
    const view = await screen.findByTestId('token-detail');
    expect(within(view).getByRole('heading', { level: 2 }).textContent).toBe('Aktivitet · live');
    expect(within(view).getByTestId('lcars-diagonal-frame')).toBeTruthy();
    expect(view.className).toContain('is-entering');
    unmount();

    await i18n.changeLanguage('en');
    render(<IntentDetail projectId="p1" detail={detail} intent={done} activeDirName={null} cost={cost()} models={null} />);
    expect(screen.getByTestId('intent-detail-tokens').textContent).toBe('Activity');
    expect(screen.getByTestId('token-view-open').textContent).toBe('Activity ›');
  });

  it('shows the run readouts as blocks in the arm, and no slider anywhere', async () => {
    render(<TokenDetail projectId="p1" dirName={DIR} intent={intent} cost={cost()} live stageOrder={STAGES} onBack={() => {}} />);
    await act(async () => {});
    const frame = screen.getByTestId('lcars-diagonal-frame');
    const keys = within(frame)
      .getAllByTestId('lcars-diagonal-readout')
      .map((b) => b.querySelector('.lcars-dblk-k').textContent);
    expect(keys).toEqual(expect.arrayContaining(['Läge', 'Tokens', 'Kostnad']));
    expect(within(frame).getByTestId('token-detail-mode').textContent).toBe('Live');
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
  });
});

describe('agent progress as a readout table', () => {
  it('puts each audit row in a readout table row with a state strip', () => {
    const rows = [
      { key: 'a', kind: 'build', unit: 'U1', stage: 'code-generation', agent: 'developer', status: 'running', minutes: 3 },
      { key: 'b', kind: 'build', unit: 'U2', stage: 'code-generation', agent: 'developer', status: 'done', minutes: 9 }
    ];
    render(<AgentProgress projectId="p1" rows={rows} />);
    const [running, finished] = screen.getAllByTestId('agent-progress-row');
    expect(running.tagName).toBe('TR');
    expect(running.closest('table').className).toContain('lcars-rt');
    expect(running.className).toContain('lcars-strip--live');
    expect(finished.className).toContain('lcars-strip--done');
  });
});

describe('Cost in the diagonal frame', () => {
  it('shows the summary figures as readout blocks, the token mix as flat meters, the share as a segmented meter, no knobs', () => {
    render(<CostPanel cost={cost()} models={null} open onToggle={() => {}} />);
    const panel = screen.getByTestId('cost-panel');
    expect(panel.className).toContain('is-entering');
    const frame = within(panel).getByTestId('lcars-diagonal-frame');
    expect(within(frame).getByRole('heading', { level: 2 }).textContent).toBe('Kostnad');
    const keys = within(frame)
      .getAllByTestId('lcars-diagonal-readout')
      .map((b) => b.querySelector('.lcars-dblk-k').textContent);
    expect(keys).toEqual(['Intents', 'Snitt', 'Tokens', 'Scopes']);
    const meters = within(frame).getAllByTestId('lcars-meter');
    expect(meters.map((m) => m.getAttribute('role'))).toEqual(['img', 'img', 'img', 'img']);
    expect(meters[0].getAttribute('aria-label')).toMatch(/^Cache read: \d+ %$/);
    expect(within(frame).getByTestId('lcars-segmeter')).toBeTruthy();
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
    expect(within(frame).getByTestId('cost-panel-scopes').querySelector('table.lcars-rt')).toBeTruthy();
  });
});

describe('Velocity in the diagonal frame', () => {
  it('shows its readouts as blocks under the elbow and runs the entrance', async () => {
    render(<VelocityView projectId="p1" space="default" />);
    const view = screen.getByTestId('velocity-view');
    expect(view.className).toContain('is-entering');
    await screen.findByTestId('velocity-readout-finished');
    const frame = within(view).getByTestId('lcars-diagonal-frame');
    expect(within(frame).getAllByTestId('lcars-diagonal-readout')).toHaveLength(4);
    expect(within(frame).getByTestId('velocity-readout-finished').textContent).toBe('3');
  });
});
