import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { viewFields } from '../../src/shared/frameworkViews.js';

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

const detectionOf = (framework) => ({
  framework,
  source: 'detected',
  reason: framework ? null : 'Inget ramverk.',
  ...viewFields(framework),
  activeSpace: framework === 'aidlc' ? 'default' : null,
  spaces: framework === 'aidlc' ? ['default'] : []
});
const none = detectionOf(null);
const speckit = detectionOf('speckit');
const project = { projectId: 'p1', root: '/p/app', name: 'app', detection: detectionOf('aidlc') };
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
    getMachines: vi.fn(async () => ({ intents: [], branches: [], flags: [] })),
    // US-1402: the Spec Kit shell reads the features.
    speckitFeatures: vi.fn(async () => ({ version: { found: '1.4.3', supported: true }, features: [], active: null, errors: [] })),
    onSpeckitChanged: vi.fn(() => () => {}),
    // US-1406: a project with no framework opens on the choice screen, which scans first.
    frameworkScan: vi.fn(() => new Promise(() => {})),
    // US-1404: Configuration › Spec Kit reads the rules.
    speckitRules: vi.fn(async () => ({
      constitution: { path: '.specify/memory/constitution.md', exists: false },
      extensions: [],
      skipped: 0,
      hooksChecked: true,
      errors: []
    }))
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

  it('shows a banner first above the project, in every view, and works without one (US-0805 FR3.3)', async () => {
    const { show } = renderView('intents', { banner: <p data-testid="a-banner" /> });
    await screen.findByTestId('intent-list');
    for (const view of ['intents', 'config']) {
      show(view);
      const banner = screen.getByTestId('a-banner');
      expect(banner.parentElement.className).toBe('project-main');
      expect(banner.previousElementSibling).toBeNull();
    }
  });

  it('the left arm counts the intents that are not archived (US-0513 FR3.1)', async () => {
    projectHook.extra = { intents: [...intents, { dirName: '261101-old', slug: 'old', status: 'archived', active: false }] };
    const onMeta = vi.fn();
    renderView('intents', { onMeta });
    await screen.findByTestId('intent-list');
    projectHook.extra = {};
    expect(onMeta).toHaveBeenCalledWith('p1', { intentCount: 1 });
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

  // US-0050 items 3 and 4: a Configuration section, Settings | Plans and a GitHub section slide in as a tab does.
  it('slides the Configuration body in on a section or Settings | Plans switch, and a GitHub section in, with full motion only', async () => {
    window.bridge.listPlans = vi.fn(async () => ({ plans: [], errors: {} }));
    const body = () => screen.getByTestId('lcars-round-body');
    const el = (p) => <ProjectView project={project} visible onView={() => {}} onMeta={() => {}} {...p} />;
    try {
      document.documentElement.dataset.motion = 'full';
      const { rerender } = render(el({ view: 'config', section: 'docs' }));
      expect(body().classList.contains('lcars-tab-in')).toBe(false);
      rerender(el({ view: 'config', section: 'aidlc' }));
      expect(body().classList.contains('lcars-tab-in')).toBe(true);
      cleanup();
      const plans = render(el({ view: 'config', section: 'aidlc' }));
      await waitFor(() => expect(shown('config-view')).toBe(true));
      plans.rerender(el({ view: 'config', section: 'aidlc', aidlcTab: 'plans' }));
      expect((await screen.findByTestId('plans-view')).closest('.lcars-tab-in')).toBeTruthy();
      cleanup();
      const team = render(el({ view: 'github' }));
      await screen.findByTestId('refresh-panel-status');
      expect(screen.getByTestId('refresh-panel').closest('.lcars-tab-in')).toBeNull();
      team.rerender(el({ view: 'github', teamSection: 'machines' }));
      expect((await screen.findByTestId('machines-view')).classList.contains('lcars-tab-in')).toBe(true);
      team.rerender(el({ view: 'github' }));
      expect(screen.getByTestId('refresh-panel').closest('.lcars-tab-in')).toBeTruthy();
      cleanup();
      document.documentElement.dataset.motion = 'reduced';
      const still = render(el({ view: 'config', section: 'docs' }));
      still.rerender(el({ view: 'config', section: 'aidlc' }));
      expect(body().classList.contains('lcars-tab-in')).toBe(false);
    } finally {
      delete document.documentElement.dataset.motion;
    }
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
    renderView('config', { section: 'aidlc', aidlcTab: 'plans', project: { ...project, detection: detectionOf(null) } });
    expect(await screen.findByTestId('framework-choice-root')).toBeTruthy(); // US-1406
    expect(screen.queryByTestId('plans-view')).toBeNull();
  });

  it('US-1406: a folder without a framework shows the choice screen, whatever view was asked for', async () => {
    window.bridge.frameworkScan = vi.fn(async () => ({ found: { aidlc: false, speckit: false }, cli: { aidlc: false, specify: false }, proposal: null }));
    renderView('github', { project: { ...project, detection: none } });
    expect(await screen.findByTestId('framework-choice-root')).toBeTruthy();
    expect(window.bridge.frameworkScan).toHaveBeenCalledWith('p1');
    expect(screen.queryByTestId('setup-choice-aidlc')).toBeNull(); // U3's simple choice is replaced
    expect(screen.queryByTestId('refresh-panel')).toBeNull();
    expect(screen.queryByTestId('add-harness-dialog')).toBeNull();
  });

  // US-1406 BR4.6: a missing framework opens the real setup panel from the choice screen.
  it('the choice screen opens the real Spec Kit setup for a missing Spec Kit', async () => {
    window.bridge.frameworkScan = vi.fn(async () => ({ found: { aidlc: false, speckit: false }, cli: { aidlc: false, specify: false }, proposal: null }));
    window.bridge.chooseFramework = vi.fn(async () => ({ ok: true, file: null, next: 'setupSpeckit' }));
    window.bridge.speckitSetupPreview = vi.fn(async () => ({
      specifyOnPath: false,
      version: null,
      installHint: 'uv tool install specify-cli',
      harnesses: [],
      harness: null,
      command: null,
      adds: [],
      notEmpty: false
    }));
    renderView('intents', { project: { ...project, detection: none } });
    fireEvent.click(await screen.findByTestId('framework-choice-option-speckit'));
    fireEvent.click(screen.getByTestId('framework-choice-confirm'));
    expect(await screen.findByTestId('setup-speckit-root')).toBeTruthy();
    expect(screen.queryByTestId('project-not-aidlc')).toBeNull();
    expect(window.bridge.speckitSetupPreview).toHaveBeenCalledWith('p1', null);
  });

  it('US-1406: confirming a found AI-DLC switches to its views without the "set up" notice, since no setup ran', async () => {
    window.bridge.frameworkScan = vi.fn(async () => ({ found: { aidlc: true, speckit: false }, cli: { aidlc: true, specify: false }, proposal: 'aidlc' }));
    const el = (p) => <ProjectView project={p} visible view="intents" onView={vi.fn()} onMeta={() => {}} />;
    const { rerender } = render(el({ ...project, detection: none }));
    await screen.findByTestId('framework-choice-option-aidlc');
    rerender(el(project)); // main's project:detected push after the saved choice
    await screen.findByTestId('intent-list');
    expect(screen.queryByTestId('setup-aidlc-done')).toBeNull();
  });

  it('a project with a framework shows no choice screen', async () => {
    renderView('intents');
    await screen.findByTestId('intent-list');
    expect(screen.queryByTestId('framework-choice-root')).toBeNull();
  });
});

describe('ProjectView: a Spec Kit project (US-1401)', () => {
  const kit = { ...project, detection: speckit };

  it('shows the Spec Kit shell in the first view, without intents or setup (AC1.1.2)', async () => {
    renderView('specs', { project: kit });
    expect(await screen.findByTestId('speckit-shell-root')).toBeTruthy();
    expect(shown('speckit-shell-root')).toBe(true);
    expect(screen.queryByTestId('intent-list')).toBeNull();
    expect(screen.queryByTestId('project-not-aidlc')).toBeNull();
  });

  it('falls back to the Spec Kit shell for an AI-DLC view (R-01)', async () => {
    for (const view of ['intents', 'cost', 'github', 'plans']) {
      renderView(view, { project: kit });
      expect(shown('speckit-shell-root'), view).toBe(true);
      expect(screen.queryByTestId('refresh-panel'), view).toBeNull();
      expect(screen.queryByTestId('cost-panel'), view).toBeNull();
      cleanup();
    }
  });

  it('keeps the shared Configuration, without the AI-DLC sections (BR1.11)', async () => {
    renderView('config', { project: kit, section: 'aidlc' }); // an AI-DLC section falls back to the project's own
    expect(await screen.findByTestId('project-settings-view')).toBeTruthy();
    expect(shown('speckit-shell-root')).toBe(false);
    expect(screen.queryByTestId('config-view')).toBeNull();
    expect(window.bridge.getAidlcConfig).not.toHaveBeenCalled();
    expect(screen.queryByTestId('add-harness-dialog')).toBeNull();
    cleanup();

    renderView('config', { project: kit, section: 'agent' });
    expect(await screen.findByTestId('project-settings-view')).toBeTruthy();
    expect(screen.queryByTestId('project-settings-add-harness')).toBeNull(); // adding a harness is AI-DLC setup
  });

  // US-1407: Configuration › Framework shows for both frameworks, and not for a folder with none.
  it('shows the Framework section in an AI-DLC and a Spec Kit project, not in a folder with no framework', async () => {
    renderView('config', { project: kit, section: 'framework' });
    expect(await screen.findByTestId('framework-section')).toBeTruthy();
    expect(screen.queryByTestId('project-settings-view')).toBeNull();
    cleanup();
    renderView('config', { section: 'framework' });
    expect(await screen.findByTestId('framework-section')).toBeTruthy();
    cleanup();
    renderView('config', { project: { ...project, detection: none }, section: 'framework' });
    expect(await screen.findByTestId('project-settings-view')).toBeTruthy();
    expect(screen.queryByTestId('framework-section')).toBeNull();
  });

  // US-1404 BR7.9: Configuration › Spec Kit holds the rules, in a Spec Kit project only.
  it('shows the Spec Kit rules in Configuration › Spec Kit, without the project settings', async () => {
    renderView('config', { project: kit, section: 'speckit' });
    expect(await screen.findByTestId('speckit-rules-root')).toBeTruthy();
    expect(window.bridge.speckitRules).toHaveBeenCalledWith('p1');
    expect(screen.queryByTestId('project-settings-view')).toBeNull();
    cleanup();

    renderView('config', { section: 'speckit' }); // an AI-DLC project has no such section: its own first one shows
    expect(await screen.findByTestId('project-settings-view')).toBeTruthy();
    expect(screen.queryByTestId('speckit-rules-root')).toBeNull();
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
    renderView('intents', { project: { ...project, detection: none } });
    await screen.findByTestId('framework-choice-root'); // US-1406
    expect(screen.queryByTestId('lifecycle-rule-notice')).toBeNull();
  });
});

describe('ProjectView: the Intents list folds away (US-0415)', () => {
  it('the toggle folds the list to the drawer stack, and the stack brings it back with the search text kept (AC5.1.1, AC5.1.2)', async () => {
    renderView('intents');
    const drawer = (await screen.findByTestId('intent-list')).closest('[data-testid="list-drawer"]');
    expect(drawer.closest('aside')).toBeTruthy(); // US-0417: the drawer is the Intents column
    fireEvent.change(screen.getByTestId('intent-list-search'), { target: { value: 'config' } });
    const toggle = within(drawer).getByTestId('list-fold-toggle');
    fireEvent.click(toggle);
    expect(drawer.classList.contains('is-folded')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('intent-list-search')).toBeTruthy(); // still mounted, inert while folded

    fireEvent.click(within(drawer).getByTestId('list-drawer-stack'));
    expect(drawer.classList.contains('is-folded')).toBe(false);
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
