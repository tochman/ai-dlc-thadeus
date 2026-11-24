// US-1402 AC4.1.1–AC4.1.6, BR6.8–BR6.10, NFR3.2, NFR5.2, NFR7.4: the Spec Kit features list and detail (contract C5).
// US-1403 AC3.1.1, AC3.1.3, BR5.3, BR5.4, BR5.9, NFR3.1, NFR7.1: the next command, the quick bar in the empty state.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import { EditorCtx } from '../../src/renderer/editor/EditorContext.jsx';

const HARNESS = { claude: { id: 'claude', name: 'Claude Code' }, opencode: { id: 'opencode', name: 'opencode' } };
let harness = HARNESS.claude;
const terminal = { lastAgent: 'agent:x', harnessOf: () => harness, state: () => 'idle', asking: () => false, type: vi.fn(async () => true) };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
window.bridge = {}; // ArtifactReader keeps the bridge object it finds at import; beforeEach fills it
const { default: SpeckitFeatures } = await import('../../src/renderer/SpeckitFeatures.jsx');

const FLOW_NONE = { spec: false, clarify: false, plan: false, tasks: false, implement: false, converge: false };
const NO_TASKS = { done: 0, total: 0, skipped: 0, phases: [] };
const albums = {
  dir: '001-albums',
  number: '001',
  name: 'albums',
  active: true,
  flow: { spec: true, clarify: true, plan: true, tasks: true, implement: false, converge: false },
  tasks: {
    done: 2,
    total: 3,
    skipped: 1,
    phases: [
      { name: 'Setup', round: null, items: [{ id: 'T001', parallel: true, story: null, done: true, text: 'Create the structure' }] },
      { name: 'User Story 1', round: null, items: [{ id: 'T002', parallel: false, story: 'US1', done: false, text: 'Album model' }] },
      { name: 'Convergence', round: 1, items: [{ id: 'T003', parallel: false, story: null, done: true, text: 'Close the gap' }] }
    ]
  },
  files: ['specs/001-albums/contracts/api.yaml', 'specs/001-albums/spec.md']
};
const search = { dir: '002-search', number: '002', name: 'search', active: false, flow: FLOW_NONE, tasks: NO_TASKS, files: [] };
const result = (over = {}) => ({ version: { found: '1.4.3', supported: true }, features: [albums, search], active: '001-albums', errors: [], ...over });

let changed;
let unsubscribe;
beforeEach(() => {
  const listeners = []; // the view and its quick bar each listen
  changed = (e) => listeners.forEach((cb) => cb(e));
  unsubscribe = vi.fn();
  harness = HARNESS.claude;
  Object.assign(window.bridge, {
    platform: 'darwin',
    speckitFeatures: vi.fn(async () => result()),
    speckitRules: vi.fn(async () => ({ extensions: [{ id: 'git', commands: ['speckit.git.commit'], hooks: [] }], errors: [], hooksChecked: true })),
    onSpeckitChanged: vi.fn((cb) => {
      listeners.push(cb);
      return unsubscribe;
    }),
    readFile: vi.fn(async () => '# Spec\n\n<script>alert(1)</script>\n')
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const rows = () => screen.getAllByTestId('speckit-features-row');
const selectedRow = () => rows().find((r) => r.getAttribute('aria-current') === 'true');

describe('SpeckitFeatures: the list (AC4.1.1)', () => {
  it('shows each feature with its number and name, marks the active one and opens it', async () => {
    render(<SpeckitFeatures projectId="p1" />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(window.bridge.speckitFeatures).toHaveBeenCalledWith('p1');
    expect(rows()[0].textContent).toContain('001');
    expect(rows()[0].textContent).toContain('albums');
    expect(within(rows()[0]).getByTestId('speckit-features-active').textContent).toBe(t('speckit.features.active'));
    expect(within(rows()[1]).queryByTestId('speckit-features-active')).toBeNull();
    expect(selectedRow()).toBe(rows()[0]);
    expect(screen.getByTestId('speckit-feature-flow')).toBeTruthy();
  });

  it('keeps the selection after a refresh while its folder exists, else goes to the active feature', async () => {
    render(<SpeckitFeatures projectId="p1" />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(rows()[1]);
    expect(selectedRow().textContent).toContain('search');
    await act(async () => changed({ projectId: 'p1', paths: ['specs/001-albums/tasks.md'] }));
    expect(selectedRow().textContent).toContain('search');
    window.bridge.speckitFeatures.mockResolvedValueOnce(result({ features: [albums] }));
    await act(async () => changed({ projectId: 'p1', paths: ['specs/002-search'] }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(selectedRow().textContent).toContain('albums');
  });
});

describe('SpeckitFeatures: the detail (AC4.1.2, AC4.1.3)', () => {
  it('shows the six flow steps, done or not, with the note that they are worked out from the files', async () => {
    render(<SpeckitFeatures projectId="p1" />);
    const flow = await screen.findByTestId('speckit-feature-flow');
    const steps = within(flow).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual(
      ['spec', 'clarify', 'plan', 'tasks', 'implement', 'converge'].map(
        (k, i) => `${t(`speckit.features.step.${k}`)}${t(i < 4 ? 'speckit.features.done' : 'speckit.features.notDone')}`
      )
    );
    expect(screen.getByTestId('speckit-feature-flow-note').textContent).toBe(t('speckit.features.flowNote'));
  });

  it('shows the tasks by phase with rounds, ID, [P], [USn], tick, the count and the skipped lines', async () => {
    render(<SpeckitFeatures projectId="p1" />);
    const tasks = await screen.findByTestId('speckit-feature-tasks');
    expect(screen.getByTestId('speckit-feature-count').textContent).toBe(t('speckit.features.count', { done: 2, total: 3 }));
    expect(tasks.textContent).toContain(t('speckit.features.skipped', { count: 1 }));
    expect(tasks.textContent).toContain(t('speckit.features.round', { round: 1 }));
    const items = within(tasks).getAllByRole('checkbox');
    expect(items.map((c) => c.checked)).toEqual([true, false, true]);
    expect(items.every((c) => c.disabled)).toBe(true); // shown, never ticked from the app (BR6.6)
    expect(tasks.textContent).toContain('T001');
    expect(tasks.textContent).toContain('[P]');
    expect(tasks.textContent).toContain('[US1]');
    expect(tasks.textContent).toContain('Album model');
  });
});

describe('SpeckitFeatures: files (AC4.1.4, NFR3.2, NFR5.2)', () => {
  it('opens a file in the artifact reader, with no edit button even where the editor is available', async () => {
    render(
      <EditorCtx.Provider value={{ open: vi.fn() }}>
        <SpeckitFeatures projectId="p1" />
      </EditorCtx.Provider>
    );
    const files = await screen.findAllByTestId('speckit-feature-file');
    expect(files.map((f) => f.textContent)).toEqual(['contracts/api.yaml', 'spec.md']);
    fireEvent.click(files[1]);
    await waitFor(() => expect(window.bridge.readFile).toHaveBeenCalledWith('p1', 'specs/001-albums/spec.md'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Spec' })).toBeTruthy();
    expect(screen.getByTestId('artifact-reader-reveal')).toBeTruthy();
    expect(screen.queryByTestId('artifact-reader-edit')).toBeNull();
  });

  it('shows a <script> line in a Markdown file as text, never as an element', async () => {
    const { container } = render(<SpeckitFeatures projectId="p1" />);
    fireEvent.click((await screen.findAllByTestId('speckit-feature-file'))[1]);
    await waitFor(() => expect(container.textContent).toContain('<script>alert(1)</script>'));
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('SpeckitFeatures: live updates (AC4.1.5, NFR7.4)', () => {
  it("reads again on this project's speckit:changed only, and stops listening on unmount", async () => {
    const { unmount } = render(<SpeckitFeatures projectId="p1" />);
    await waitFor(() => expect(window.bridge.speckitFeatures).toHaveBeenCalledTimes(1));
    await act(async () => changed({ projectId: 'other', paths: ['specs/x'] }));
    expect(window.bridge.speckitFeatures).toHaveBeenCalledTimes(1);
    await act(async () => changed({ projectId: 'p1', paths: ['specs/x'] }));
    expect(window.bridge.speckitFeatures).toHaveBeenCalledTimes(2);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('SpeckitFeatures: empty state, version and errors (AC4.1.6, BR6.8–BR6.10)', () => {
  it("offers specify through the quick bar with no features, in the harness's form, typed only on a click (BR5.9)", async () => {
    harness = HARNESS.opencode;
    window.bridge.speckitFeatures.mockResolvedValue(result({ features: [], active: null }));
    render(<SpeckitFeatures projectId="p1" />);
    expect((await screen.findByTestId('speckit-features-empty')).textContent).toBe(t('speckit.features.empty'));
    const bar = await screen.findByTestId('speckit-commands-root');
    fireEvent.change(within(bar).getByTestId('speckit-commands-specify-input'), { target: { value: 'Photo albums' } });
    expect(terminal.type).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(within(bar).getAllByTestId('speckit-commands-button')[0]));
    expect(terminal.type).toHaveBeenCalledWith('agent', '/speckit.specify Photo albums', { submit: true });
  });

  it('warns about a version other than v1.4.x by name, or that it is unknown, and not for v1.4.x', async () => {
    window.bridge.speckitFeatures.mockResolvedValueOnce(result({ version: { found: '1.5.0', supported: false } }));
    const first = render(<SpeckitFeatures projectId="p1" />);
    expect((await screen.findByTestId('speckit-features-version-warning')).textContent).toBe(t('speckit.features.versionWarning', { version: '1.5.0' }));
    first.unmount();
    window.bridge.speckitFeatures.mockResolvedValueOnce(result({ version: { found: null, supported: false } }));
    const second = render(<SpeckitFeatures projectId="p1" />);
    expect((await screen.findByTestId('speckit-features-version-warning')).textContent).toBe(t('speckit.features.versionUnknown'));
    second.unmount();
    render(<SpeckitFeatures projectId="p1" />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.queryByTestId('speckit-features-version-warning')).toBeNull();
  });

  it('lists what could not be read with the reason, under the features', async () => {
    window.bridge.speckitFeatures.mockResolvedValueOnce(result({ errors: [{ path: 'specs/002-search/tasks.md', reason: 'Too big' }] }));
    render(<SpeckitFeatures projectId="p1" />);
    const errors = await screen.findByTestId('speckit-features-errors');
    expect(errors.textContent).toContain(t('speckit.features.errors'));
    expect(errors.textContent).toContain('specs/002-search/tasks.md');
    expect(errors.textContent).toContain('Too big');
    expect(rows()).toHaveLength(2);
  });

  it('shows a failed read as an error instead of an empty list', async () => {
    window.bridge.speckitFeatures.mockRejectedValueOnce(new Error("Error invoking remote method 'speckit:features': Error: boom"));
    render(<SpeckitFeatures projectId="p1" />);
    expect((await screen.findByRole('alert')).textContent).toBe('boom');
    expect(screen.queryByTestId('speckit-features-empty')).toBeNull();
  });
});

const allDone = {
  ...albums,
  flow: { ...albums.flow, implement: true, converge: true },
  tasks: { ...albums.tasks, done: 3, phases: albums.tasks.phases.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i, done: true })) })) }
};
const next = async () => within(await screen.findByTestId('speckit-commands-next')).getByTestId('speckit-commands-button');

describe('SpeckitFeatures: the next command (US-1403 AC3.1.1, BR5.2–BR5.4)', () => {
  it('offers the active feature its next command, typed with Enter on a click', async () => {
    render(<SpeckitFeatures projectId="p1" />);
    expect((await next()).textContent).toBe('/speckit-implement');
    expect(screen.queryByTestId('speckit-commands-converge-note')).toBeNull();
    await act(async () => fireEvent.click(await next()));
    expect(terminal.type).toHaveBeenCalledWith('agent', '/speckit-implement', { submit: true });
  });

  it('offers no command for a feature that is not active, and names the active one', async () => {
    render(<SpeckitFeatures projectId="p1" />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(rows()[1]);
    expect(screen.getByTestId('speckit-commands-not-active').textContent).toBe(t('speckit.commands.notActive', { name: 'albums' }));
    expect(screen.queryByTestId('speckit-commands-next')).toBeNull();
  });

  it('says no feature is active when none is (SPECIFY_FEATURE_NO_PERSIST)', async () => {
    window.bridge.speckitFeatures.mockResolvedValue(result({ features: [{ ...albums, active: false }, search], active: null }));
    render(<SpeckitFeatures projectId="p1" />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(rows()[0]);
    expect(screen.getByTestId('speckit-commands-not-active').textContent).toBe(t('speckit.commands.noActive'));
  });

  it('keeps converge after converge, with the note that the files cannot show it (BR5.3)', async () => {
    window.bridge.speckitFeatures.mockResolvedValue(result({ features: [allDone, search] }));
    render(<SpeckitFeatures projectId="p1" />);
    expect((await next()).textContent).toBe('/speckit-converge');
    expect(screen.getByTestId('speckit-commands-converge-note').textContent).toBe(t('speckit.commands.convergeNote'));
  });

  it('turns plan into tasks when a plan.md arrives with speckit:changed (NFR7.1)', async () => {
    const planned = { ...albums, flow: { ...albums.flow, plan: false, tasks: false }, tasks: NO_TASKS };
    window.bridge.speckitFeatures.mockResolvedValueOnce(result({ features: [planned, search] }));
    render(<SpeckitFeatures projectId="p1" />);
    expect((await next()).textContent).toBe('/speckit-plan');
    window.bridge.speckitFeatures.mockResolvedValueOnce(result({ features: [{ ...planned, flow: { ...planned.flow, plan: true } }, search] }));
    await act(async () => changed({ projectId: 'p1', paths: ['specs/001-albums/plan.md'] }));
    await waitFor(async () => expect((await next()).textContent).toBe('/speckit-tasks'));
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it('calls no bridge write with every command button clicked: only reads and the agent tab (NFR3.1, NFR4.1)', async () => {
    render(<SpeckitFeatures projectId="p1" />);
    await screen.findByTestId('speckit-commands-next');
    await screen.findAllByTestId('speckit-commands-extension');
    fireEvent.change(screen.getByTestId('speckit-commands-specify-input'), { target: { value: 'x' } });
    for (const b of screen.getAllByTestId('speckit-commands-button')) await act(async () => fireEvent.click(b));
    expect(terminal.type).toHaveBeenCalledTimes(screen.getAllByTestId('speckit-commands-button').length);
    const called = Object.entries(window.bridge).filter(([, f]) => vi.isMockFunction(f) && f.mock.calls.length > 0);
    expect(called.map(([name]) => name).sort()).toEqual(['onSpeckitChanged', 'speckitFeatures', 'speckitRules']);
  });
});
