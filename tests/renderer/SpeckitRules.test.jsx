// US-1404 AC4.2.1–AC4.2.3, BR7.1–BR7.4, FR7.3, NFR3.4, NFR5.1, NFR7.4: Configuration › Spec Kit (contract C6).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import { EditorCtx } from '../../src/renderer/editor/EditorContext.jsx';

const terminal = { type: vi.fn(async () => true) };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
window.bridge = {}; // ArtifactReader keeps the bridge object it finds at import; beforeEach fills it
const { default: SpeckitRules } = await import('../../src/renderer/SpeckitRules.jsx');

const CONSTITUTION = '.specify/memory/constitution.md';
const git = {
  id: 'git',
  commands: ['speckit.git.commit', 'speckit.git.push'],
  hooks: [
    { when: 'before', target: 'specify', command: 'speckit.git.commit', mode: 'mandatory', condition: 'branch != main' },
    { when: 'after', target: 'implement', command: 'speckit.git.push', mode: 'off', condition: null }
  ]
};
const review = { id: 'review', commands: [], hooks: [] };
const result = (over = {}) => ({
  constitution: { path: CONSTITUTION, exists: true },
  extensions: [git, review],
  skipped: 0,
  hooksChecked: true,
  errors: [],
  ...over
});

let changed;
let unsubscribe;
const open = vi.fn();
beforeEach(() => {
  changed = null;
  unsubscribe = vi.fn();
  Object.assign(window.bridge, {
    platform: 'darwin',
    speckitRules: vi.fn(async () => result()),
    onSpeckitChanged: vi.fn((cb) => {
      changed = cb;
      return unsubscribe;
    }),
    readFile: vi.fn(async () => '# Constitution\n\n<script>alert(1)</script>\n')
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderRules = () =>
  render(
    <EditorCtx.Provider value={{ open }}>
      <SpeckitRules projectId="p1" />
    </EditorCtx.Provider>
  );

describe('SpeckitRules: the constitution (AC4.2.1, BR7.1, BR7.2)', () => {
  it('shows the constitution read-only, with a <script> line as text (NFR5.1)', async () => {
    renderRules();
    const box = await screen.findByTestId('speckit-rules-constitution');
    await waitFor(() => expect(box.textContent).toContain('<script>alert(1)</script>'));
    expect(window.bridge.readFile).toHaveBeenCalledWith('p1', CONSTITUTION);
    expect(box.querySelector('script')).toBeNull();
    expect(within(box).queryByTestId('artifact-reader-edit')).toBeNull(); // FileView's own edit is off; ours is the one
    expect(screen.queryByTestId('speckit-rules-no-constitution')).toBeNull();
  });

  it('opens the constitution, and only it, in the editor (NFR3.4)', async () => {
    renderRules();
    fireEvent.click(await screen.findByTestId('speckit-rules-edit'));
    expect(open).toHaveBeenCalledWith(CONSTITUTION);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('says there is no constitution yet and types /speckit-constitution only on a click', async () => {
    window.bridge.speckitRules.mockResolvedValue(result({ constitution: { path: CONSTITUTION, exists: false } }));
    renderRules();
    expect((await screen.findByTestId('speckit-rules-no-constitution')).textContent).toContain(t('speckit.rules.noConstitution'));
    expect(screen.queryByTestId('speckit-rules-constitution')).toBeNull();
    expect(window.bridge.readFile).not.toHaveBeenCalled();
    expect(terminal.type).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('speckit-rules-constitution-run'));
    expect(terminal.type).toHaveBeenCalledWith('agent', '/speckit-constitution ', { submit: false });
  });

  it('offers no /speckit-constitution when the constitution exists but cannot be read', async () => {
    const errors = [{ path: CONSTITUTION, reason: 'Inte en fil, så den läses inte.' }];
    window.bridge.speckitRules.mockResolvedValue(result({ constitution: { path: CONSTITUTION, exists: false }, errors }));
    renderRules();
    expect((await screen.findByTestId('speckit-rules-errors')).textContent).toContain(errors[0].reason);
    expect(screen.queryByTestId('speckit-rules-constitution-run')).toBeNull();
  });
});

describe('SpeckitRules: extensions and hooks (AC4.2.2, BR7.3, BR7.4)', () => {
  it('shows each extension with its commands and hooks: when, target, command, mode and the condition note', async () => {
    renderRules();
    await waitFor(() => expect(screen.getAllByTestId('speckit-rules-extension')).toHaveLength(2));
    const [first, second] = screen.getAllByTestId('speckit-rules-extension');
    expect(first.textContent).toContain('git');
    expect(
      within(first)
        .getAllByTestId('speckit-rules-command')
        .map((c) => c.textContent)
    ).toEqual(['speckit.git.commit', 'speckit.git.push']);
    const [before, after] = within(first).getAllByTestId('speckit-rules-hook');
    for (const text of [t('speckit.rules.when.before'), 'specify', 'speckit.git.commit', t('speckit.rules.mode.mandatory')])
      expect(before.textContent).toContain(text);
    expect(before.textContent).toContain(t('speckit.rules.condition', { condition: 'branch != main' }));
    for (const text of [t('speckit.rules.when.after'), 'implement', 'speckit.git.push', t('speckit.rules.mode.off')]) expect(after.textContent).toContain(text);
    expect(second.textContent).toContain('review');
    expect(within(second).queryAllByTestId('speckit-rules-hook')).toHaveLength(0);
  });

  it('says there are no extensions', async () => {
    window.bridge.speckitRules.mockResolvedValue(result({ extensions: [] }));
    renderRules();
    expect(await screen.findByText(t('speckit.rules.noExtensions'))).toBeTruthy();
    expect(screen.queryByTestId('speckit-rules-extension')).toBeNull();
  });

  it('shows the skipped count, and no count when nothing was skipped', async () => {
    window.bridge.speckitRules.mockResolvedValue(result({ skipped: 3 }));
    renderRules();
    expect((await screen.findByTestId('speckit-rules-skipped')).textContent).toBe(t('speckit.rules.skipped', { count: 3 }));
    cleanup();
    window.bridge.speckitRules.mockResolvedValue(result());
    renderRules();
    await screen.findAllByTestId('speckit-rules-extension');
    expect(screen.queryByTestId('speckit-rules-skipped')).toBeNull();
  });
});

describe('SpeckitRules: what could not be read (AC4.2.3, BR7.3, FR7.3)', () => {
  it('says no hooks were checked after a parse failure, and names every error with its reason', async () => {
    const errors = [
      { path: '.specify/extensions.yml', reason: 'Inte giltig YAML: x' },
      { path: '.specify/extensions/git/extension.yml', reason: 'Saknas.' }
    ];
    window.bridge.speckitRules.mockResolvedValue(result({ extensions: [], hooksChecked: false, errors }));
    renderRules();
    expect((await screen.findByTestId('speckit-rules-unchecked')).textContent).toBe(t('speckit.rules.unchecked'));
    const list = screen.getByTestId('speckit-rules-errors');
    for (const e of errors) {
      expect(list.textContent).toContain(e.path);
      expect(list.textContent).toContain(e.reason);
    }
  });

  it('shows the failure when the call is rejected', async () => {
    window.bridge.speckitRules.mockRejectedValue(new Error("Error invoking remote method 'speckit:rules': Error: Nej"));
    renderRules();
    expect((await screen.findByRole('alert')).textContent).toBe('Nej');
  });
});

describe('SpeckitRules: live (AC4.2.3, NFR7.4)', () => {
  it('reads once on open and once per push for this project, rereads the constitution, and stops listening on close', async () => {
    const { rerender, unmount } = renderRules();
    await screen.findAllByTestId('speckit-rules-extension');
    rerender(
      <EditorCtx.Provider value={{ open }}>
        <SpeckitRules projectId="p1" />
      </EditorCtx.Provider>
    );
    expect(window.bridge.speckitRules).toHaveBeenCalledTimes(1); // a plain re-render reads nothing
    await waitFor(() => expect(window.bridge.readFile).toHaveBeenCalledTimes(1));

    window.bridge.speckitRules.mockResolvedValue(result({ extensions: [review] }));
    await act(async () => changed({ projectId: 'p2', paths: ['.specify/extensions.yml'] }));
    expect(window.bridge.speckitRules).toHaveBeenCalledTimes(1); // another project's push
    await act(async () => changed({ projectId: 'p1', paths: [CONSTITUTION] }));
    expect(window.bridge.speckitRules).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getAllByTestId('speckit-rules-extension')).toHaveLength(1));
    await waitFor(() => expect(window.bridge.readFile).toHaveBeenCalledTimes(2));

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
