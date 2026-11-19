import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import { viewFields } from '../../src/shared/frameworkViews.js';

// The project view has its own tests; here it only reports what the left arm needs, as the real one does.
// It renders the real latest-message strip (US-0506 u3), as the real one does above its terminal.
vi.mock('../../src/renderer/ProjectView.jsx', async () => {
  const { default: LatestMessageStrip } = await import('../../src/renderer/LatestMessageStrip.jsx');
  return {
    default: function ProjectViewStub({ project, view, onMeta, onOpenReply }) {
      useEffect(() => onMeta(project.projectId, { showFeatures: true, intentCount: 7 }), [project.projectId, onMeta]);
      return (
        <div data-testid={`project-view-${project.projectId}`} data-view={view}>
          <LatestMessageStrip projectId={project.projectId} onOpenReply={onOpenReply} />
        </div>
      );
    }
  };
});

// Same shapes as settings:get and project:open; the Detection as detectProject builds it (US-1401 C1).
const detectionOf = (framework) => ({
  framework,
  source: 'detected',
  reason: null,
  ...viewFields(framework),
  activeSpace: framework === 'aidlc' ? 'default' : null,
  spaces: framework === 'aidlc' ? ['default'] : []
});
const projectInfo = (root, projectId) => ({ projectId, root, name: root.split('/').pop(), detection: detectionOf('aidlc') });
/** Opens every project of the next render with this framework. */
const openAs = (framework) => {
  window.bridge.openProject = vi.fn(async (dir) => ({ ...projectInfo(dir, 'p1'), detection: detectionOf(framework) }));
};
let saved;
let push; // the main -> renderer channels the test fires: fullscreen, menuCommand
window.bridge = {}; // App keeps this object from import; each test fills in its methods
const { default: App } = await import('../../src/renderer/App.jsx');

function mockBridge(settings) {
  saved = [];
  push = {};
  const listen = (name) => vi.fn((cb) => ((push[name] = cb), () => delete push[name]));
  Object.assign(window.bridge, {
    isFullscreen: vi.fn(async () => false),
    toggleFullscreen: vi.fn(async () => {}),
    onFullscreen: listen('fullscreen'),
    onMenuCommand: listen('menuCommand'),
    sendMenuState: vi.fn(async () => {}),
    readFile: vi.fn(async () => {
      throw new Error('ENOENT');
    }),
    openDocsUrl: vi.fn(async () => {}),
    getSettings: vi.fn(async () => ({ openProjects: [], recentProjects: [], activeProject: null, projectSettings: {}, ...settings })),
    setSettings: vi.fn(async (partial) => saved.push(partial)),
    openProject: vi.fn(async (dir) => projectInfo(dir, dir.endsWith('a') ? 'p1' : 'p2')),
    closeProject: vi.fn(async () => {}),
    pickProject: vi.fn(async () => null),
    onProjectDetected: vi.fn(() => () => {}),
    getGitStatus: vi.fn(async () => ({ isRepo: true, branch: 'feat/epic04-living-lcars' })),
    onGitHeadChanged: listen('gitHeadChanged'),
    // The Settings view (US-0405) reads these as it opens.
    getTools: vi.fn(async () => [
      { id: 'aidlc', path: '/usr/local/bin/aidlc', source: 'auto', found: true, version: '0.9.1' },
      { id: 'claude', path: '/usr/local/bin/claude', source: 'auto', found: true, version: '2.1.0' },
      { id: 'shell', path: '/bin/zsh', source: 'auto', found: true, version: 'zsh 5.9' }
    ]),
    pickTool: vi.fn(async () => null),
    saveTool: vi.fn(async () => ({ ok: true, version: '2.1.0' })),
    resetTool: vi.fn(async () => {}),
    pickDefaultFolder: vi.fn(async () => null),
    clearDefaultFolder: vi.fn(async () => {}),
    getAppInfo: vi.fn(async () => ({ version: '0.2.3', aidlc: { found: true, version: '0.9.1' } })),
    openExternal: vi.fn(async () => {})
  });
}

function mockReducedMotion(matches) {
  window.matchMedia = vi.fn((q) => ({ matches: matches && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
}

async function renderApp(settings) {
  mockBridge(settings);
  render(<App />);
}

beforeEach(() => mockReducedMotion(false));
afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.motion;
});

describe('App shell', () => {
  it('lists projects and views in the left arm with aria-current, settings and close per project (FR2.2, NFR1)', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a', '/p/demo-app'], activeProject: '/p/aidlc-dash-a' });
    const arm = screen.getByTestId('project-tabs');
    expect(arm.tagName).toBe('NAV');
    await waitFor(() => expect(within(arm).getAllByTestId('project-tabs-tab')).toHaveLength(2));

    const [first, second] = within(arm).getAllByTestId('project-tabs-tab');
    await waitFor(() => expect(first.getAttribute('aria-current')).toBe('true'));
    expect(second.hasAttribute('aria-current')).toBe(false);
    expect(within(arm).getAllByTestId('project-settings-open')).toHaveLength(2);
    expect(
      within(arm)
        .getAllByTestId('project-tabs-close')
        .map((b) => b.getAttribute('aria-label'))
    ).toEqual(['Stäng aidlc-dash-a', 'Stäng demo-app']);

    // Views: Intents is the current page; Features shows because the project offers it (EPIC-06 rule).
    const intents = await screen.findByTestId('project-view-switch-intents');
    expect(intents.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/aidlc-dash-a.*Intents/);
    fireEvent.click(await screen.findByTestId('project-view-switch-features'));
    expect(screen.getByTestId('project-view-switch-features').getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('project-view-switch-intents').hasAttribute('aria-current')).toBe(false);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Features/);
    expect(within(arm).getByText('7 intents')).toBeTruthy();

    fireEvent.click(second);
    await waitFor(() => expect(second.getAttribute('aria-current')).toBe('true'));
    expect(screen.getByTestId('project-view-switch-intents').getAttribute('aria-current')).toBe('page'); // views are per project
  });

  it('opens Configuration from its arm block and the menu, with the AI-DLC section only in an AI-DLC project (US-0901 FR1.1, US-0012)', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    const block = await screen.findByTestId('project-view-switch-config');
    expect(block.textContent).toBe('Konfiguration');
    fireEvent.click(block);
    expect(screen.getByTestId('project-view-switch-config').getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/aidlc-dash-a.*Konfiguration/);
    // Its sections sit under it in the arm, like the Settings tabs (US-0012).
    expect(screen.getByTestId('config-section-docs').getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByTestId('config-section-aidlc'));
    expect(screen.getByTestId('config-section-aidlc').getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('config-section-costRules').textContent).toBe('Kostnadsregler'); // US-0212 FR1.1

    act(() => push.menuCommand({ command: 'view', view: 'intents' }));
    expect(screen.getByTestId('project-view-switch-intents').getAttribute('aria-current')).toBe('page');
    act(() => push.menuCommand({ command: 'view', view: 'config' }));
    expect(screen.getByTestId('project-view-switch-config').getAttribute('aria-current')).toBe('page');
    cleanup();

    mockBridge({ openProjects: ['/p/plain-a'], activeProject: '/p/plain-a' });
    openAs(null);
    render(<App />);
    fireEvent.click(await screen.findByTestId('project-view-switch-config'));
    expect(screen.getByTestId('config-section-agent')).toBeTruthy();
    expect(screen.queryByTestId('config-section-aidlc')).toBeNull();
    expect(screen.queryByTestId('config-section-costRules')).toBeNull();
  });

  it('makes Kostnad and Github views of their own, one at a time, from the arm and the menu; disabled without AI-DLC', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    await screen.findByTestId('project-view-switch-features');
    const current = () =>
      screen
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-current') === 'page')
        .map((b) => b.dataset.testid);
    const shownView = () => screen.getByTestId('project-view-p1').dataset.view;

    fireEvent.click(screen.getByTestId('arm-github'));
    expect(current()).toEqual(['arm-github', 'team-section-refresh']); // US-1201 AC-3: Update | Machines under the block
    expect(shownView()).toBe('github');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/aidlc-dash-a.*Github/);
    expect(screen.getByTestId('arm-github').hasAttribute('aria-expanded')).toBe(false); // a view, no longer a fold-out
    fireEvent.click(screen.getByTestId('team-section-machines'));
    expect(current()).toEqual(['arm-github', 'team-section-machines']);
    fireEvent.click(screen.getByTestId('team-section-refresh'));

    fireEvent.click(screen.getByTestId('arm-cost'));
    expect(current()).toEqual(['arm-cost']);
    expect(shownView()).toBe('cost');
    fireEvent.click(screen.getByTestId('arm-cost')); // clicking the current view again keeps it
    expect(shownView()).toBe('cost');

    act(() => push.menuCommand({ command: 'panel', panel: 'github' }));
    expect(current()).toEqual(['arm-github', 'team-section-refresh']);
    act(() => push.menuCommand({ command: 'view', view: 'config' }));
    expect(current()).toEqual(['project-view-switch-config', 'config-section-docs']);
    expect(shownView()).toBe('config');
    act(() => push.menuCommand({ command: 'panel', panel: 'cost' }));
    expect(current()).toEqual(['arm-cost']);
    act(() => push.menuCommand({ command: 'panel', panel: 'nope' }));
    expect(shownView()).toBe('cost');
    act(() => push.menuCommand({ command: 'view', view: 'intents' }));
    expect(current()).toEqual(['project-view-switch-intents']);
    expect(shownView()).toBe('intents');
    cleanup();

    mockBridge({ openProjects: ['/p/plain-a'], activeProject: '/p/plain-a' });
    openAs(null);
    render(<App />);
    await screen.findByTestId('project-view-switch-setup');
    expect(screen.getByTestId('arm-cost').disabled).toBe(true);
    expect(screen.getByTestId('arm-github').disabled).toBe(true);
    act(() => push.menuCommand({ command: 'panel', panel: 'github' }));
    expect(screen.getByTestId('project-view-switch-setup').getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('arm-github').hasAttribute('aria-current')).toBe(false);
  });

  it('opens the Velocity view from its own arm block beside Cost; disabled without AI-DLC (US-0303 FR3.5)', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    await screen.findByTestId('project-view-switch-features');
    fireEvent.click(screen.getByTestId('arm-velocity'));
    expect(screen.getByTestId('arm-velocity').getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('project-view-p1').dataset.view).toBe('velocity');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(t('app.velocity'));
    cleanup();

    mockBridge({ openProjects: ['/p/plain-a'], activeProject: '/p/plain-a' });
    openAs(null);
    render(<App />);
    await screen.findByTestId('project-view-switch-setup');
    expect(screen.getByTestId('arm-velocity').disabled).toBe(true);
  });

  it('US-1401: a Spec Kit project shows the specs view and no Intents, Kostnad, Velocity, Planer or Github (AC1.1.2)', async () => {
    mockBridge({ openProjects: ['/p/kit-a'], activeProject: '/p/kit-a' });
    openAs('speckit');
    render(<App />);
    const specs = await screen.findByTestId('project-view-switch-specs');
    expect(specs.textContent).toBe(t('app.specs'));
    expect(specs.getAttribute('aria-current')).toBe('page'); // the fallback view is specs, not intents (R-01)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(new RegExp(`kit-a.*${t('app.specs')}`));
    for (const id of ['project-view-switch-intents', 'project-view-switch-plans', 'arm-cost', 'arm-velocity', 'arm-github']) {
      expect(screen.queryByTestId(id), id).toBeNull();
    }
    expect(within(screen.getByTestId('project-tabs')).getByText(t('app.featureCount', { n: 0 }))).toBeTruthy(); // U6 counts them
    await waitFor(() => expect(window.bridge.sendMenuState).toHaveBeenLastCalledWith({ hasProject: true, framework: 'speckit', showFeatures: true }));

    act(() => push.menuCommand({ command: 'panel', panel: 'cost' })); // AI-DLC's menu items do nothing here
    expect(screen.getByTestId('project-view-p1').dataset.view).not.toBe('cost');
    expect(screen.getByTestId('project-view-switch-specs').getAttribute('aria-current')).toBe('page');
    act(() => push.menuCommand({ command: 'view', view: 'config' }));
    expect(screen.getByTestId('config-section-agent')).toBeTruthy();
    expect(screen.queryByTestId('config-section-aidlc')).toBeNull();
    act(() => push.menuCommand({ command: 'view', view: 'intents' })); // goes to the framework's first view
    expect(screen.getByTestId('project-view-switch-specs').getAttribute('aria-current')).toBe('page');
  });

  it('sets data-motion from the setting, Dämpad under prefers-reduced-motion without one, and saves a new choice (FR4.2)', async () => {
    mockReducedMotion(true);
    await renderApp({});
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    expect(document.documentElement.dataset.motion).toBe('reduced');
    cleanup();

    mockReducedMotion(false);
    await renderApp({});
    await waitFor(() => expect(document.documentElement.dataset.motion).toBe('full'));
    cleanup();

    mockReducedMotion(true);
    await renderApp({ animations: 'full' }); // a saved choice wins over the OS setting
    await waitFor(() => expect(document.documentElement.dataset.motion).toBe('full'));

    fireEvent.click(screen.getByTestId('app-settings-open'));
    fireEvent.click(screen.getByTestId('app-settings-tab-appearance')); // the animations live on Utseende (US-0410)
    expect(screen.getByTestId('app-settings-animations-full').checked).toBe(true);
    fireEvent.click(screen.getByTestId('app-settings-animations-off'));
    expect(document.documentElement.dataset.motion).toBe('off');
    await waitFor(() => expect(saved).toContainEqual({ animations: 'off' }));
  });

  it('shows Inställningar as a view in the content frame from the arm, with aria-current and a way back (US-0405 FR1.1, FR6.1)', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    await screen.findByTestId('project-view-switch-features');
    const pane = () => screen.getByTestId('project-view-p1').parentElement;

    fireEvent.click(screen.getByTestId('app-settings-open'));
    expect(screen.getByTestId('settings-view')).toBeTruthy();
    expect(screen.getByTestId('app-settings-open').getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inställningar');
    expect(screen.getByTestId('project-view-switch-features').hasAttribute('aria-current')).toBe(false);
    expect(pane().hidden).toBe(true); // the project stays mounted, hidden

    fireEvent.click(screen.getByTestId('project-view-switch-intents')); // a view block leaves Settings (US-0012)
    expect(screen.queryByTestId('settings-view')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/aidlc-dash-a.*Intents/);
    expect(screen.getByTestId('project-view-switch-intents').getAttribute('aria-current')).toBe('page');
    expect(pane().hidden).toBe(false);
  });

  it('shows the five Settings tabs under SETTINGS only while Settings is open, and saves the chosen one (US-0410 FR1.1–FR1.3, FR5.1)', async () => {
    await renderApp({});
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    const ids = ['tools', 'appearance', 'notifications', 'project', 'about'];
    for (const id of ids) expect(screen.queryByTestId(`app-settings-tab-${id}`)).toBeNull();

    fireEvent.click(screen.getByTestId('app-settings-open'));
    const tabs = ids.map((id) => screen.getByTestId(`app-settings-tab-${id}`));
    expect(tabs.map((b) => b.textContent)).toEqual(['Verktyg', 'Utseende', 'Notiser', 'Projekt', 'Om']);
    expect(tabs.map((b) => b.tagName)).toEqual(Array(5).fill('BUTTON')); // keyboard reachable
    expect(tabs[0].getAttribute('aria-current')).toBe('page'); // first time: Tools
    expect(screen.getByTestId('settings-view-tools')).toBeTruthy();

    fireEvent.click(tabs[2]);
    expect(screen.getByTestId('app-settings-tab-notifications').getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('app-settings-tab-tools').hasAttribute('aria-current')).toBe(false);
    expect(screen.getByTestId('settings-view-notifications')).toBeTruthy();
    expect(screen.queryByTestId('settings-view-tools')).toBeNull();
    await waitFor(() => expect(window.bridge.setSettings).toHaveBeenCalledWith({ settingsTab: 'notifications' }));

    fireEvent.keyDown(screen.getByTestId('settings-view'), { key: 'Escape' });
    expect(screen.queryByTestId('app-settings-tab-notifications')).toBeNull();
  });

  it('opens Settings on the saved tab, and on Tools for an unknown one (US-0410 FR5.1)', async () => {
    await renderApp({ settingsTab: 'about' });
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    await act(async () => {}); // the restore effect has applied the saved tab
    fireEvent.click(screen.getByTestId('app-settings-open'));
    expect(screen.getByTestId('settings-view-about')).toBeTruthy();
    expect(screen.getByTestId('app-settings-tab-about').getAttribute('aria-current')).toBe('page');
    cleanup();

    await renderApp({ settingsTab: 'pipeline' });
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    await act(async () => {});
    fireEvent.click(screen.getByTestId('app-settings-open'));
    expect(screen.getByTestId('settings-view-tools')).toBeTruthy();
  });

  it('shows the Auctum mark in the header with its name, next to the project and view title (FR2.1)', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('img', { name: 'Auctum' })).toBeTruthy();
    expect(within(header).getByText('T.H.A.D.E.U.S.')).toBeTruthy(); // the name alone, no sub-line (US-0406 FR2.1)
    expect(within(header).queryByText(/aidlc control/i)).toBeNull();
    expect(await within(header).findByText('feat/epic04-living-lcars')).toBeTruthy();
    // The arm's watermark is decoration: hidden, so the header's mark is the only named one outside the splash.
    expect(within(screen.getByTestId('project-tabs')).queryByRole('img')).toBeNull();
  });

  // US-0015: a branch switch outside the app changes .git/HEAD, and main sends git:headChanged.
  it('reads the branch again when HEAD changes, and names a detached HEAD (US-0015)', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    const header = screen.getByRole('banner');
    expect(await within(header).findByText('feat/epic04-living-lcars')).toBeTruthy();
    const projectId = window.bridge.getGitStatus.mock.calls.at(-1)[0];
    window.bridge.getGitStatus.mockResolvedValue({ isRepo: true, branch: 'main' }); // other views read the status too
    act(() => push.gitHeadChanged({ projectId: 'another-project' }));
    expect(within(header).getByText('feat/epic04-living-lcars')).toBeTruthy(); // another project's switch is not ours
    act(() => push.gitHeadChanged({ projectId }));
    expect(await within(header).findByText('main')).toBeTruthy();
    window.bridge.getGitStatus.mockResolvedValue({ isRepo: true, branch: 'HEAD' });
    act(() => push.gitHeadChanged({ projectId }));
    expect(await within(header).findByText('Ingen gren (frånkopplad HEAD)')).toBeTruthy();
  });

  it("labels the fullscreen block from the window's real mode, with aria-pressed, and toggles it on click (US-0404 FR1.2, NFR3)", async () => {
    await renderApp({});
    const button = await screen.findByTestId('fullscreen-toggle');
    expect(button.tagName).toBe('BUTTON'); // reachable with the keyboard
    expect(button.textContent).toBe('Helskärm');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);
    expect(window.bridge.toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(button.textContent).toBe('Helskärm'); // only main's event changes it

    act(() => push.fullscreen(true)); // e.g. the green macOS button
    expect(button.textContent).toBe('Lämna helskärm');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    act(() => push.fullscreen(false));
    expect(button.textContent).toBe('Helskärm');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('runs a menu command through the same function as the arm button, reports the menu state and ignores unknown ones (US-0404 FR2.4–FR2.6)', async () => {
    await renderApp({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    await screen.findByTestId('project-view-switch-features');
    await waitFor(() => expect(window.bridge.sendMenuState).toHaveBeenLastCalledWith({ hasProject: true, framework: 'aidlc', showFeatures: true }));

    act(() => push.menuCommand({ command: 'view', view: 'features' }));
    expect(screen.getByTestId('project-view-switch-features').getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Features/);

    act(() => push.menuCommand({ command: 'appSettings' }));
    expect(screen.getByTestId('settings-view')).toBeTruthy(); // the same view as the arm's Inställningar
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inställningar');
    fireEvent.keyDown(screen.getByTestId('settings-view'), { key: 'Escape' }); // back to the view that was shown
    expect(screen.getByTestId('project-view-switch-features').getAttribute('aria-current')).toBe('page');

    act(() => push.menuCommand({ command: 'nope' }));
    act(() => push.menuCommand({ command: 'view', view: 'elsewhere' }));
    act(() => push.menuCommand(null));
    expect(screen.getByTestId('project-view-switch-features').getAttribute('aria-current')).toBe('page');

    // Hjälp without docs/README.md opens AI-DLC's fixed web page in main.
    await act(async () => push.menuCommand({ command: 'docs' }));
    await waitFor(() => expect(window.bridge.openDocsUrl).toHaveBeenCalledTimes(1));

    // Cmd/Ctrl+W closes the active project like its ×, and then does nothing.
    act(() => push.menuCommand({ command: 'closeProject' }));
    await waitFor(() => expect(window.bridge.closeProject).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(window.bridge.sendMenuState).toHaveBeenLastCalledWith({ hasProject: false, framework: null, showFeatures: false }));
    act(() => push.menuCommand({ command: 'closeProject' }));
    expect(window.bridge.closeProject).toHaveBeenCalledTimes(1);
  });
});

describe('App shell: agent dialogs (US-0506 u1)', () => {
  const hookEvent = {
    eventId: 'h1',
    sessionId: 's1',
    projectId: 'p1',
    tabId: 'agent:claude',
    harness: 'claude',
    source: 'hook',
    kind: 'question',
    state: 'shown',
    arrivedAtMs: 1,
    seq: 1,
    context: null,
    questions: [{ header: 'Val', text: 'Vilken?', truncated: false, options: [{ label: 'A', description: null }], multiSelect: false, allowOwn: true }],
    lastError: null
  };
  async function withAgentEvents(settings) {
    mockBridge({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a', ...settings });
    window.bridge.agentEvents = {
      list: vi.fn(async () => []),
      onChanged: vi.fn((cb) => ((push.agentEvents = cb), () => delete push.agentEvents)),
      answer: vi.fn(async () => ({ state: 'sent', via: 'hook' })),
      close: vi.fn(async () => ({ state: 'handedBack' }))
    };
    render(<App />);
    await waitFor(() => expect(window.bridge.agentEvents.list).toHaveBeenCalledWith('p1'));
  }
  afterEach(() => delete window.bridge.agentEvents);

  it('a pushed hook event opens the dialog', async () => {
    await withAgentEvents({});
    act(() => push.agentEvents({ projectId: 'p1', events: [hookEvent] }));
    expect(await screen.findByTestId('agent-dialog-title')).toBeTruthy();
    expect(screen.getByTestId('agent-dialog').hasAttribute('open')).toBe(true);
    act(() => push.agentEvents({ projectId: 'p1', events: [] }));
    await waitFor(() => expect(screen.getByTestId('agent-dialog').hasAttribute('open')).toBe(false));
  });

  it('with question alerts off the dialog does not open by itself', async () => {
    await withAgentEvents({ questionAlerts: 'off' });
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    act(() => push.agentEvents({ projectId: 'p1', events: [hookEvent] }));
    expect(screen.getByTestId('agent-dialog').hasAttribute('open')).toBe(false);
  });

  // US-0506 u2 K11, K13: permissions before replies across projects, and the 5 s hand-back notice.
  const permissionEvent = {
    ...hookEvent,
    eventId: 'perm-b',
    projectId: 'p2',
    tabId: 'agent:b',
    kind: 'permission',
    arrivedAtMs: 5,
    seq: 2,
    questions: undefined,
    permission: {
      what: 'Bash',
      detail: 'git push',
      cwd: null,
      truncated: false,
      choices: [
        { label: 'Tillåt en gång', effect: 'allowOnce', refuses: false, enabled: true },
        { label: 'Neka', effect: 'deny', refuses: true, enabled: true }
      ]
    }
  };
  const replyStandIn = { ...hookEvent, eventId: 'reply-a', tabId: 'agent:a', kind: 'reply', arrivedAtMs: 1, seq: 1 };

  it('a permission from tab B reaches the dialog before a reply from tab A that arrived first (AC2.1.4)', async () => {
    await withAgentEvents({ openProjects: ['/p/aidlc-dash-a', '/p/other-b'] });
    await waitFor(() => expect(window.bridge.agentEvents.list).toHaveBeenCalledWith('p2'));
    act(() => {
      // both waiting when the dialog opens; an open page itself never jumps (BR2.1)
      push.agentEvents({ projectId: 'p1', events: [replyStandIn] });
      push.agentEvents({ projectId: 'p2', events: [permissionEvent] });
    });
    expect((await screen.findByTestId('agent-dialog-title')).textContent).toBe('BEHÖRIGHET: Claude Code ber om behörighet');
    expect(screen.getByText('1 av 2')).toBeTruthy();
  });

  it('a handed-back permission shows the notice for 5 s, then it goes (K11)', { timeout: 15_000 }, async () => {
    await withAgentEvents({});
    act(() => push.agentEvents({ projectId: 'p1', events: [{ ...permissionEvent, projectId: 'p1' }] }));
    await screen.findByTestId('agent-dialog-what');
    await new Promise((r) => setTimeout(r, 450)); // past the input guard
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    const notice = await screen.findByTestId('app-notice');
    expect(notice.textContent).toBe('Lämnad tillbaka till terminalen. Svara där som vanligt.');
    expect(notice.getAttribute('role')).toBe('status');
    await new Promise((r) => setTimeout(r, 4500));
    expect(screen.getByTestId('app-notice')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('app-notice')).toBeNull(), { timeout: 2000 });
  });
});

describe('App shell: agent replies (US-0506 u3)', () => {
  const question = {
    eventId: 'h1',
    sessionId: 's1',
    projectId: 'p1',
    tabId: 'agent:claude',
    harness: 'claude',
    source: 'hook',
    kind: 'question',
    state: 'shown',
    arrivedAtMs: 5,
    seq: 2,
    context: null,
    questions: [{ header: 'Val', text: 'Vilken?', truncated: false, options: [{ label: 'A', description: null }], multiSelect: false, allowOwn: true }],
    lastError: null
  };
  const reply = (state, over = {}) => ({
    ...question,
    eventId: 'r1',
    sessionId: 's2',
    tabId: 'agent:opencode',
    harness: 'opencode',
    kind: 'reply',
    state,
    arrivedAt: '2026-11-14T10:00:00.000Z',
    arrivedAtMs: 1,
    seq: 1,
    questions: undefined,
    message: { text: 'Vilket namn ska filen få?', truncated: false, empty: false },
    staleReason: null,
    ...over
  });
  const subs = new Set();
  const send = (events) => act(() => subs.forEach((cb) => cb({ projectId: 'p1', events })));
  async function withReplies(latest = null) {
    mockBridge({ openProjects: ['/p/aidlc-dash-a'], activeProject: '/p/aidlc-dash-a' });
    window.bridge.agentEvents = {
      list: vi.fn(async () => []),
      onChanged: vi.fn((cb) => (subs.add(cb), () => subs.delete(cb))),
      answer: vi.fn(),
      close: vi.fn(async () => ({ state: 'dismissed' })),
      latest: vi.fn(async () => latest),
      reopen: vi.fn(async () => {
        send([reply('shown')]);
        return { state: 'shown' };
      })
    };
    render(<App />);
    await waitFor(() => expect(window.bridge.agentEvents.list).toHaveBeenCalledWith('p1'));
  }
  afterEach(() => {
    subs.clear();
    delete window.bridge.agentEvents;
  });

  it('pages questions before replies, whatever their arrival (BR6.8)', async () => {
    await withReplies();
    send([reply('shown'), question]);
    expect((await screen.findByTestId('agent-dialog-title')).textContent).toMatch(/^Fråga/);
    fireEvent.click(screen.getByTestId('agent-dialog-next'));
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Meddelande från opencode');
  });

  it('leaves queued and dismissed replies out of the pager and closes when only a dismissed one is left', async () => {
    await withReplies();
    send([reply('queued'), question]);
    expect((await screen.findByTestId('agent-dialog-title')).textContent).toMatch(/^Fråga/);
    expect(screen.queryByTestId('agent-dialog-next')).toBeNull(); // one item: no pager (US-0018)
    send([reply('shown')]);
    await waitFor(() => expect(screen.getByTestId('agent-dialog').hasAttribute('open')).toBe(true));
    send([reply('dismissed')]);
    await waitFor(() => expect(screen.getByTestId('agent-dialog').hasAttribute('open')).toBe(false));
  });

  it("the strip's Answer calls reopen once, then the dialog opens on that reply (AC3.1.3)", async () => {
    await withReplies({
      tabId: 'agent:opencode',
      harness: 'opencode',
      text: 'Vilket namn?',
      arrivedAt: '2026-11-14T10:00:00.000Z',
      status: 'waiting',
      eventId: 'r1',
      truncated: false,
      empty: false
    });
    send([reply('dismissed')]);
    fireEvent.click(await screen.findByTestId('latest-message-answer'));
    await waitFor(() => expect(screen.getByTestId('agent-dialog').hasAttribute('open')).toBe(true));
    expect(window.bridge.agentEvents.reopen).toHaveBeenCalledTimes(1);
    expect(window.bridge.agentEvents.reopen).toHaveBeenCalledWith('r1');
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Meddelande från opencode');
  });
});
