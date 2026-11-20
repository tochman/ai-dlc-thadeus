import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { viewFields } from '../../src/shared/frameworkViews.js';

// The project data hooks and the terminals have their own tests; here only which view shows matters.
const intents = [{ dirName: '261113-config-view', slug: 'config-view', active: true }];
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
    lastIntentChangeAt: null
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

  it('a folder without AI-DLC shows its setup, whatever view was asked for', async () => {
    renderView('github', { project: { ...project, detection: none } });
    expect(await screen.findByTestId('project-not-aidlc')).toBeTruthy();
    expect(screen.queryByTestId('refresh-panel')).toBeNull();
    expect(screen.queryByTestId('add-harness-dialog')).toBeNull();
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
    await screen.findByTestId('project-not-aidlc');
    expect(screen.queryByTestId('lifecycle-rule-notice')).toBeNull();
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
