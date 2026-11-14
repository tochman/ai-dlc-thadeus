import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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
vi.mock('../../src/renderer/useFeatures.js', () => ({
  useFeatures: () => ({ features: null, settings: { featureDocs: 'hide', featuresPath: 'docs/FEATURES.md', harness: null }, settingsLoaded: true, links: {} })
}));
vi.mock('../../src/renderer/TerminalPanel.jsx', () => ({ default: () => null }));
const { default: ProjectView } = await import('../../src/renderer/ProjectView.jsx');

const project = { projectId: 'p1', root: '/p/app', name: 'app', detection: { isAidlc: true, activeSpace: 'default', spaces: ['default'] } };
const installed = [{ id: 'claude', label: 'Claude Code', selectable: true, installed: true, cli: { found: true, version: '2.1.0' } }];

beforeEach(() => {
  window.bridge = {
    detectHarnesses: vi.fn(async () => installed),
    getAidlcConfig: vi.fn(async () => ({ activeDir: null, plans: [], errors: {} })),
    getWorkingAgents: vi.fn(async () => []),
    getGitStatus: vi.fn(async () => ({ isRepo: true, branch: 'main', upstream: null, ahead: 0, behind: 0, dirtyAidlc: 0, dirtyOther: 0 })),
    setProjectSettings: vi.fn(async () => ({}))
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
    const { show } = renderView('intents');
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
    renderView('github', { project: { ...project, detection: { isAidlc: false, reason: 'Ingen aidlc/.' } } });
    expect(await screen.findByTestId('project-not-aidlc')).toBeTruthy();
    expect(screen.queryByTestId('refresh-panel')).toBeNull();
    expect(screen.queryByTestId('add-harness-dialog')).toBeNull();
  });
});

describe('ProjectView: Lägg till harness', () => {
  async function openAddHarness() {
    renderView('intents', { settingsOpen: true, onCloseSettings: () => {} });
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
