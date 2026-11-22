import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// The project data hooks and the terminals have their own tests; here only which view shows matters.
const intents = [{ dirName: '261113-config-view', slug: 'config-view', active: true }];
const projectHook = vi.hoisted(() => ({ extra: {} }));
vi.mock('../../src/renderer/useProject.js', () => ({
  useProject: () => ({
    space: 'default',
    setSpace() {},
    intents,
    listWarning: null,
    selected: null,
    setSelected() {},
    detail: null,
    newKeys: null,
    error: null,
    cost: { available: false, reason: 'Ingen ledger.' },
    models: null,
    lastIntentChangeAt: null,
    ...projectHook.extra
  })
}));
const featuresHook = vi.hoisted(() => ({ extra: {} }));
vi.mock('../../src/renderer/useFeatures.js', () => ({
  useFeatures: () => ({
    features: null,
    settings: { featureDocs: 'hide', featuresPath: 'docs/FEATURES.md', harness: null },
    settingsLoaded: true,
    links: {},
    ruleStatus: null,
    ...featuresHook.extra
  })
}));
vi.mock('../../src/renderer/TerminalPanel.jsx', () => ({ default: () => null }));
// The agent tab's typing, spied on; everything else is the real terminal context (US-0603 FR5.2).
const typed = vi.hoisted(() => vi.fn(async () => true));
vi.mock('../../src/renderer/TerminalContext.jsx', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, useTerminal: () => ({ ...real.useTerminal(), type: typed }) };
});
const { default: ProjectView } = await import('../../src/renderer/ProjectView.jsx');

const project = { projectId: 'p1', root: '/p/app', name: 'app', detection: { isAidlc: true, activeSpace: 'default', spaces: ['default'] } };
const installed = [{ id: 'claude', label: 'Claude Code', selectable: true, installed: true, cli: { found: true, version: '2.1.0' } }];

beforeEach(() => {
  window.bridge = {
    detectHarnesses: vi.fn(async () => installed),
    getAidlcConfig: vi.fn(async () => ({ activeDir: null, plans: [], errors: {} })),
    getWorkingAgents: vi.fn(async () => []),
    getGitStatus: vi.fn(async () => ({ isRepo: true, branch: 'main', upstream: null, ahead: 0, behind: 0, dirtyAidlc: 0, dirtyOther: 0 })),
    setProjectSettings: vi.fn(async () => ({})),
    // US-1201: the collision warning in the panel and the machines section.
    getCollisions: vi.fn(async () => ({ isRepo: true, branch: 'main', base: 'origin/main', behind: 0, error: null, collisions: [] })),
    getMachines: vi.fn(async () => ({ intents: [], branches: [], flags: [] }))
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Renders the project view with `view` as the left arm would select it; returns a function to select another. */
function renderView(view, props = {}) {
  const onView = vi.fn();
  const el = (v) => <ProjectView project={project} visible view={v} onView={onView} onMeta={() => {}} {...props} />;
  const { rerender } = render(el(view));
  return { onView, show: (v) => rerender(el(v)) };
}
const shown = (testId) => {
  const el = screen.queryByTestId(testId);
  return !!el && !el.closest('[hidden]');
};

describe('ProjectView: one view at a time', () => {
  it('shows the intent list alone in the intents view, without the cost or GitHub panel', async () => {
    renderView('intents');
    expect(await screen.findByTestId('intent-list')).toBeTruthy();
    expect(shown('intent-list')).toBe(true);
    expect(shown('cost-panel')).toBe(false);
    expect(shown('refresh-panel')).toBe(false);
    expect(window.bridge.getGitStatus).not.toHaveBeenCalled(); // the closed GitHub view reads nothing
  });

  it('GitHub shows only the GitHub panel, open, with the intent list and the cost panel hidden', async () => {
    const { show } = renderView('github');
    await screen.findByTestId('refresh-panel-status');
    expect(shown('refresh-panel')).toBe(true);
    expect(screen.getByTestId('refresh-panel-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(shown('intent-list')).toBe(false);
    expect(shown('cost-panel')).toBe(false);

    // Back to the intents view and again: the panel kept its status, so git is not read twice.
    show('intents');
    expect(shown('refresh-panel')).toBe(false);
    show('github');
    await screen.findByTestId('refresh-panel-status');
    expect(window.bridge.getGitStatus).toHaveBeenCalledTimes(1);
  });

  it("the team view's Machines section shows who does what instead of the panel (US-1201 AC-3)", async () => {
    renderView('github', { teamSection: 'machines' });
    expect(await screen.findByTestId('machines-view')).toBeTruthy();
    expect(window.bridge.getMachines).toHaveBeenCalledWith('p1', 'default');
    expect(shown('refresh-panel')).toBe(false);
    expect(shown('intent-list')).toBe(false);
  });

  it('Kostnad shows only the cost panel, open; folding it in goes back to the intents view', async () => {
    const { onView } = renderView('cost');
    expect(shown('cost-panel')).toBe(true);
    expect(screen.getByTestId('cost-panel-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(shown('intent-list')).toBe(false);
    expect(shown('refresh-panel')).toBe(false);
    expect(shown('config-view')).toBe(false);

    fireEvent.click(screen.getByTestId('cost-panel-toggle'));
    expect(onView).toHaveBeenLastCalledWith('intents');
  });

  it('mounts Konfiguration only once chosen, so its CLI reads wait until then, and never stacks it with another view', async () => {
    const { show } = renderView('intents', { section: 'aidlc' }); // Configuration › AI-DLC (US-0012)
    await screen.findByTestId('intent-list');
    show('cost');
    await waitFor(() => expect(window.bridge.detectHarnesses).toHaveBeenCalled());
    expect(screen.queryByTestId('config-view')).toBeNull();
    expect(window.bridge.getAidlcConfig).not.toHaveBeenCalled();

    show('config');
    await waitFor(() => expect(window.bridge.getAidlcConfig).toHaveBeenCalledWith('p1', 'claude'));
    expect(shown('config-view')).toBe(true);
    expect(shown('intent-list')).toBe(false);
    expect(shown('cost-panel')).toBe(false);

    show('intents');
    expect(shown('config-view')).toBe(false);
    expect(shown('intent-list')).toBe(true);
  });

  it('shows Configuration in the round frame, the section title on its bar, the AI-DLC switch as tiles (US-0417)', async () => {
    window.bridge.listPlans = vi.fn(async () => ({ plans: [], errors: {} }));
    renderView('config', { section: 'docs' });
    const frame = screen.getByTestId('lcars-round-frame');
    expect(frame.className).toContain('config-frame');
    const bar = within(frame).getByTestId('lcars-segbar');
    expect(within(bar).getByRole('heading', { level: 2, name: 'Feature-beskrivningar' })).toBeTruthy();
    expect(bar.textContent).toContain('Projektinställningar · app');
    expect(within(frame).getByTestId('project-settings-view')).toBeTruthy();
    cleanup();

    renderView('config', { section: 'aidlc' });
    const settingsTile = screen.getByTestId('aidlc-view-tab-settings');
    const plansTile = screen.getByTestId('aidlc-view-tab-plans');
    expect(settingsTile.className).toContain('lcars-tile');
    expect(settingsTile.className).toContain('is-sel');
    expect(plansTile.className).toContain('lcars-tile');
    expect(plansTile.className).not.toContain('is-sel');
    expect(settingsTile.closest('[data-testid="lcars-round-body"]')).toBeTruthy();
    await waitFor(() => expect(shown('config-view')).toBe(true));
  });

  it('splits Configuration › AI-DLC into Settings and Plans tabs, Plans alone when chosen, none without AI-DLC (US-0905)', async () => {
    window.bridge.listPlans = vi.fn(async () => ({ plans: [], errors: {} }));
    const { onView } = renderView('config', { section: 'aidlc' });
    await waitFor(() => expect(shown('config-view')).toBe(true)); // Settings is the first tab: today's AI-DLC content
    expect(screen.getByTestId('aidlc-view-tab-settings').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('aidlc-view-tab-settings').textContent).toBe('Inställningar');
    expect(screen.getByTestId('aidlc-view-tab-plans').textContent).toBe('Planer');
    expect(screen.queryByTestId('plans-view')).toBeNull();
    fireEvent.click(screen.getByTestId('aidlc-view-tab-plans'));
    expect(onView).toHaveBeenCalledWith('config', { configSection: 'aidlc', aidlcTab: 'plans' });
    cleanup();

    renderView('config', { section: 'aidlc', aidlcTab: 'plans' });
    expect(await screen.findByTestId('plans-view')).toBeTruthy();
    expect(shown('plans-view')).toBe(true);
    expect(shown('config-view')).toBe(false);
    expect(shown('intent-list')).toBe(false);
    expect(screen.getByTestId('aidlc-view-tab-plans').getAttribute('aria-selected')).toBe('true');
    cleanup();

    // Another section shows no AI-DLC tabs; a project without AI-DLC has no AI-DLC section at all.
    renderView('config', { section: 'docs', aidlcTab: 'plans' });
    expect(screen.queryByTestId('aidlc-view-tab-plans')).toBeNull();
    expect(screen.queryByTestId('plans-view')).toBeNull();
    cleanup();
    renderView('config', { section: 'aidlc', aidlcTab: 'plans', project: { ...project, detection: { isAidlc: false, reason: 'Ingen aidlc/.' } } });
    expect(await screen.findByTestId('project-not-aidlc')).toBeTruthy();
    expect(screen.queryByTestId('plans-view')).toBeNull();
  });

  it('a folder without AI-DLC shows its setup, whatever view was asked for', async () => {
    renderView('github', { project: { ...project, detection: { isAidlc: false, reason: 'Ingen aidlc/.' } } });
    expect(await screen.findByTestId('project-not-aidlc')).toBeTruthy();
    expect(screen.queryByTestId('refresh-panel')).toBeNull();
    expect(screen.queryByTestId('add-harness-dialog')).toBeNull();
  });
});

describe('ProjectView: Resume in the intents list on a parked intent (US-0510 AC4.1.4)', () => {
  afterEach(() => {
    projectHook.extra = {};
  });

  it("is available and unparks through the project's id", async () => {
    const parked = {
      dirName: '261120-release-0-2-13',
      slug: 'release-0-2-13',
      active: true,
      status: 'in-flight',
      parked: true,
      parkedStage: 'code-generation'
    };
    projectHook.extra = { intents: [parked], selected: parked.dirName };
    window.bridge.unparkIntent = vi.fn(async () => ({ ok: true, switched: false }));
    renderView('intents');
    const resume = await screen.findByTestId('intent-resume');
    await waitFor(() => expect(resume.getAttribute('aria-disabled')).toBe('false'));
    await act(async () => fireEvent.click(resume));
    expect(window.bridge.unparkIntent).toHaveBeenCalledWith('p1', parked.dirName);
  });
});

describe('ProjectView: lifecycle rule notice (US-0603 FR5.2, FR5.3)', () => {
  const docs = { features: { available: true, epics: [] }, settings: { featureDocs: 'auto', featuresPath: 'docs/FEATURES.md', harness: null } };
  afterEach(() => {
    featuresHook.extra = {};
  });

  it('shows the notice for a missing, older or other rule, and its button types the request without Enter', async () => {
    for (const [status, re] of [
      ['missing', /har ingen livscykelregel för storys för Releaser/],
      ['older', /äldre version/],
      ['other', /andra leveranssättet/]
    ]) {
      featuresHook.extra = { ...docs, ruleStatus: status };
      renderView('intents');
      expect((await screen.findByTestId('lifecycle-rule-notice')).textContent).toMatch(re);
      cleanup();
    }

    featuresHook.extra = { ...docs, settings: { ...docs.settings, delivery: 'continuous' }, ruleStatus: 'other' };
    renderView('intents');
    expect(screen.getByTestId('lifecycle-rule-notice').textContent).toMatch(/Kontinuerlig driftsättning/);
    fireEvent.click(screen.getByTestId('lifecycle-rule-notice-run'));
    expect(typed).toHaveBeenCalledWith('agent', expect.stringContaining('(story-lifecycle: continuous v1)'), { submit: false });
  });

  it('shows no notice for a current rule, without feature docs, or without AI-DLC', async () => {
    featuresHook.extra = { ...docs, ruleStatus: 'current' };
    renderView('intents');
    await screen.findByTestId('intent-list');
    expect(screen.queryByTestId('lifecycle-rule-notice')).toBeNull();
    cleanup();

    featuresHook.extra = { ruleStatus: 'missing' }; // features: null, no docs
    renderView('intents');
    await screen.findByTestId('intent-list');
    expect(screen.queryByTestId('lifecycle-rule-notice')).toBeNull();
    cleanup();

    featuresHook.extra = { ...docs, ruleStatus: 'missing' };
    renderView('intents', { project: { ...project, detection: { isAidlc: false, reason: 'Ingen aidlc/.' } } });
    await screen.findByTestId('project-not-aidlc');
    expect(screen.queryByTestId('lifecycle-rule-notice')).toBeNull();
  });
});

describe('ProjectView: the Intents list folds away (US-0415)', () => {
  it('the toggle folds the sidebar to the strip, and the strip brings it back with the search text kept (AC5.1.1, AC5.1.2)', async () => {
    renderView('intents');
    const aside = (await screen.findByTestId('intent-list')).closest('aside');
    fireEvent.change(screen.getByTestId('intent-list-search'), { target: { value: 'config' } });
    const toggle = within(aside).getByTestId('list-fold-toggle');
    fireEvent.click(toggle);
    expect(aside.classList.contains('is-folded')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('intent-list-search')).toBeTruthy(); // still mounted, hidden by the strip's CSS

    fireEvent.click(aside);
    expect(aside.classList.contains('is-folded')).toBe(false);
    expect(screen.getByTestId('intent-list-search').value).toBe('config');
  });
});

describe('ProjectView: Lägg till harness', () => {
  async function openAddHarness() {
    renderView('config', { section: 'agent' }); // the project's settings are Configuration › Agent (US-0012)
    fireEvent.click(await screen.findByTestId('project-settings-add-harness'));
    const dialog = screen.getByTestId('add-harness-dialog');
    await waitFor(() => expect(dialog.open).toBe(true));
    return dialog;
  }

  it('opens add-mode setup in a modal dialog, not inline, and closes it on Avbryt', async () => {
    const dialog = await openAddHarness();
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog.contains(screen.getByTestId('setup-add-harness'))).toBe(true);
    expect(screen.getAllByTestId('setup-add-harness')).toHaveLength(1);

    fireEvent.click(screen.getByTestId('add-harness-cancel'));
    await waitFor(() => expect(dialog.open).toBe(false));
    expect(screen.queryByTestId('setup-add-harness')).toBeNull();
  });

  it('closes on Esc', async () => {
    const dialog = await openAddHarness();
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    });
    await waitFor(() => expect(dialog.open).toBe(false));
    expect(screen.queryByTestId('setup-add-harness')).toBeNull();
  });
});
