// US-0506 u5 D2, D6, SD53 (LC53): the app shell opens the dialog per alertPlan and acts on a clicked notification.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { viewFields } from '../../src/shared/frameworkViews.js';

vi.mock('../../src/renderer/ProjectView.jsx', () => ({
  default: function ProjectViewStub({ project }) {
    return <div data-testid={`project-view-${project.projectId}`} />;
  }
}));

window.bridge = {}; // App keeps this object from import; each test fills in its methods
const { default: App } = await import('../../src/renderer/App.jsx');

const question = (over = {}) => ({
  eventId: 'h1-q',
  sessionId: 's1',
  projectId: 'p1',
  tabId: 'agent:claude',
  harness: 'claude',
  source: 'hook',
  kind: 'question',
  state: 'shown',
  arrivedAt: '2026-11-14T10:00:00.000Z',
  arrivedAtMs: 5,
  seq: 2,
  context: null,
  questions: [{ header: 'Val', text: 'Vilken fil?', truncated: false, options: [{ label: 'A', description: null }], multiSelect: false, allowOwn: true }],
  lastError: null,
  ...over
});
const reply = (over = {}) =>
  question({ eventId: 'h2-r', kind: 'reply', questions: undefined, message: { text: 'Klart.', truncated: false, empty: false }, staleReason: null, ...over });

let changed, focus;
async function renderApp(settings = {}, lists = {}) {
  changed = new Set();
  focus = null;
  Object.assign(window.bridge, {
    isFullscreen: vi.fn(async () => false),
    onFullscreen: vi.fn(() => () => {}),
    onMenuCommand: vi.fn(() => () => {}),
    sendMenuState: vi.fn(async () => {}),
    getSettings: vi.fn(async () => ({
      openProjects: ['/p/proj-a', '/p/proj-b'],
      recentProjects: [],
      activeProject: '/p/proj-a',
      projectSettings: {},
      ...settings
    })),
    setSettings: vi.fn(async () => {}),
    openProject: vi.fn(async (dir) => ({
      projectId: dir.endsWith('a') ? 'p1' : 'p2',
      root: dir,
      name: dir.split('/').pop(),
      detection: { framework: 'aidlc', ...viewFields('aidlc'), activeSpace: 'default', spaces: ['default'] } // US-1401 C1
    })),
    onProjectDetected: vi.fn(() => () => {}),
    agentEvents: {
      list: vi.fn(async (projectId) => lists[projectId] ?? []),
      onChanged: vi.fn((cb) => (changed.add(cb), () => changed.delete(cb))),
      onFocus: vi.fn((cb) => ((focus = cb), () => (focus = null))),
      answer: vi.fn(),
      close: vi.fn(async () => ({ state: 'dismissed' })),
      latest: vi.fn(async () => null),
      reopen: vi.fn(async (eventId) => {
        push('p2', [reply({ eventId, projectId: 'p2', state: 'shown' })]);
        return { state: 'shown' };
      })
    }
  });
  render(<App />);
  await waitFor(() => expect(window.bridge.agentEvents.list).toHaveBeenCalledWith('p2'));
  await waitFor(() => expect(focus).toBeTypeOf('function'));
}
const push = (projectId, events) => act(() => changed.forEach((cb) => cb({ projectId, events })));
const dialogOpen = () => screen.getByTestId('agent-dialog').hasAttribute('open');
const activeTab = () => screen.getAllByTestId('project-tabs-tab').find((b) => b.getAttribute('aria-current') === 'true')?.textContent;

afterEach(() => {
  cleanup();
  for (const k of Object.keys(window.bridge)) delete window.bridge[k]; // App keeps this object from import
});

describe('App shell alerts (US-0506 u5)', () => {
  it('agentEvents.onFocus with an open event switches to its project and opens the dialog on it', async () => {
    await renderApp({ questionAlerts: 'off' }, { p2: [question({ projectId: 'p2' })] });
    await waitFor(() => expect(activeTab()).toBe('proj-a'));
    expect(dialogOpen()).toBe(false);
    act(() => focus({ eventId: 'h1-q' }));
    await waitFor(() => expect(activeTab()).toBe('proj-b'));
    expect(dialogOpen()).toBe(true);
    expect(screen.getByText('Vilken fil?')).toBeTruthy();
  });

  it('with a dismissed reply it calls agentEvents.reopen and opens the dialog on it', async () => {
    await renderApp({}, { p2: [reply({ projectId: 'p2', state: 'dismissed' })] });
    act(() => focus({ eventId: 'h2-r' }));
    await waitFor(() => expect(window.bridge.agentEvents.reopen).toHaveBeenCalledWith('h2-r'));
    await waitFor(() => expect(dialogOpen()).toBe(true));
    expect(activeTab()).toBe('proj-b');
  });

  it('opens nothing and never throws for an unknown id or a bad payload', async () => {
    await renderApp({ questionAlerts: 'off' }, { p2: [question({ projectId: 'p2' })] });
    for (const bad of [undefined, null, 'h1-q', {}, { eventId: '' }, { eventId: 7 }, { eventId: 'x'.repeat(65) }, { eventId: 'unknown' }]) {
      expect(() => act(() => focus(bad))).not.toThrow();
    }
    expect(dialogOpen()).toBe(false);
    expect(activeTab()).toBe('proj-a');
    expect(window.bridge.agentEvents.reopen).not.toHaveBeenCalled();
  });

  it('a new reply opens the dialog with replyAlerts dialog-notify even with questionAlerts off; a new question does not', async () => {
    await renderApp({ questionAlerts: 'off', replyAlerts: 'dialog-notify' });
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    push('p1', [question()]);
    expect(dialogOpen()).toBe(false);
    push('p1', [question(), reply()]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
  });
});

// US-0031: the dialog opens on the page that just arrived, and settled pages no longer hold it open.
const handoff = (over = {}) => ({
  ...question({ eventId: 'h3-h', kind: 'handoff', questions: undefined, arrivedAtMs: 9, seq: 3 }),
  handoff: { moment: 'threshold', tokens: 162_000, model: 'claude-opus-5-5', cost: 0.081, choices: ['compact', 'fresh', 'notNow'], gate: false },
  ...over
});
const header = () => screen.queryByTestId('agent-dialog-header')?.textContent;

describe('App shell: the newest page (US-0031)', () => {
  it('closed on an old page, a handoff page opens the dialog on itself; Previous reaches the old one (AC1.1.1, AC1.1.3, FR1, FR1.2)', async () => {
    await renderApp();
    push('p1', [question()]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    expect(dialogOpen()).toBe(false);
    push('p1', [question({ state: 'handedBack' }), handoff()]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    expect(screen.queryByTestId('agent-dialog-handoff-size')).toBeTruthy();
    fireEvent.click(screen.getByTestId('agent-dialog-prev'));
    expect(screen.getByText('Vilken fil?')).toBeTruthy();
  });

  it('two new pages in one push open the dialog on the first in pager order (AC1.1.2, FR1.1)', async () => {
    await renderApp();
    push('p1', [question()]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    const later = question({ eventId: 'h4-q', arrivedAtMs: 8, questions: [{ ...question().questions[0], header: 'Mapp', text: 'Vilken mapp?' }] });
    push('p1', [reply({ arrivedAtMs: 7 }), later, question({ state: 'handedBack' })]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    expect(header()).toBe('Mapp');
  });

  // US-0045 AC2: a new message shows when it arrives, also over a page that is still open; earlier pages stay reachable.
  it('open on an old question, a newer message moves the dialog to it; Previous reaches the question (US-0045 AC2)', async () => {
    await renderApp();
    push('p1', [question()]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    expect(header()).toBe('Val');
    push('p1', [question(), handoff()]);
    await waitFor(() => expect(screen.queryByTestId('agent-dialog-handoff-size')).toBeTruthy());
    fireEvent.click(screen.getByTestId('agent-dialog-prev'));
    expect(screen.getByText('Vilken fil?')).toBeTruthy();
  });

  it('closed with pages queued, the newest of several new pages opens the dialog (US-0045 AC2)', async () => {
    await renderApp();
    push('p1', [question()]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    const older = question({ eventId: 'h4-q', arrivedAtMs: 7, questions: [{ ...question().questions[0], header: 'Mapp', text: 'Vilken mapp?' }] });
    push('p1', [question({ state: 'handedBack' }), older, handoff({ arrivedAtMs: 9 })]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    expect(screen.queryByTestId('agent-dialog-handoff-size')).toBeTruthy();
  });

  it('only a sent page left closes the dialog by itself; a live page beside it keeps it open (AC1.4.1, AC1.4.2, FR4)', async () => {
    await renderApp();
    const other = question({ eventId: 'h4-q', arrivedAtMs: 8 });
    push('p1', [question(), other]);
    await waitFor(() => expect(dialogOpen()).toBe(true));
    push('p1', [question({ state: 'sent' }), other]);
    expect(dialogOpen()).toBe(true);
    push('p1', [question({ state: 'sent' }), { ...other, state: 'sent' }]);
    await waitFor(() => expect(dialogOpen()).toBe(false));
  });
});
