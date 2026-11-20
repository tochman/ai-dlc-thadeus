// US-1402 AC4.1.1–AC4.1.6, BR6.8–BR6.10, NFR3.2, NFR5.2, NFR7.4: the Spec Kit features list and detail (contract C5).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import { EditorCtx } from '../../src/renderer/editor/EditorContext.jsx';

const session = { write: vi.fn() };
const terminal = { run: vi.fn(async (_tab, fn) => fn(session)) };
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
  changed = null;
  unsubscribe = vi.fn();
  Object.assign(window.bridge, {
    platform: 'darwin',
    speckitFeatures: vi.fn(async () => result()),
    onSpeckitChanged: vi.fn((cb) => {
      changed = cb;
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
  it('offers /speckit-specify with no features, and types it into the agent terminal only on a click', async () => {
    window.bridge.speckitFeatures.mockResolvedValue(result({ features: [], active: null }));
    render(<SpeckitFeatures projectId="p1" />);
    expect((await screen.findByTestId('speckit-features-empty')).textContent).toBe(t('speckit.features.empty'));
    expect(terminal.run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('speckit-features-specify'));
    await waitFor(() => expect(session.write).toHaveBeenCalledWith('/speckit-specify '));
    expect(terminal.run).toHaveBeenCalledWith('agent', expect.any(Function));
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
