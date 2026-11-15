// US-0506 u5 D2, D6, SD53 (LC53): the app shell opens the dialog per alertPlan and acts on a clicked notification.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

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
      detection: { isAidlc: true, activeSpace: 'default', spaces: ['default'] }
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
