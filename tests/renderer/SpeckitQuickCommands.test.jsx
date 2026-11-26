// US-1403 AC3.1.2, BR5.5, BR5.6, NFR4.4, NFR5.1, NFR7.1: the Spec Kit quick commands (contracts C6, C7).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';

const tab = 'agent:claude';
const terminal = {
  lastAgent: tab,
  harnessOf: () => ({ id: 'claude', name: 'Claude Code' }),
  state: () => 'idle',
  asking: () => false,
  show: vi.fn(),
  type: vi.fn(async () => true)
};
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: SpeckitQuickCommands } = await import('../../src/renderer/SpeckitQuickCommands.jsx');

const git = { id: 'git', commands: ['speckit.git.commit', 'speckit.git.push'], hooks: [] };
const review = { id: 'review', commands: ['speckit.review.run'], hooks: [] };
const rules = (over = {}) => ({ constitution: { exists: true }, extensions: [git, review], skipped: 0, hooksChecked: true, errors: [], ...over });

let changed;
beforeEach(() => {
  changed = null;
  window.bridge = {
    speckitRules: vi.fn(async () => rules()),
    onSpeckitChanged: vi.fn((cb) => {
      changed = cb;
      return vi.fn();
    })
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  terminal.type = vi.fn(async () => true);
});

const texts = (root) =>
  within(root)
    .getAllByTestId('speckit-commands-button')
    .map((b) => b.textContent);
const core = () => screen.getAllByTestId('speckit-commands-button').slice(0, 4);
const specify = () => core()[0];
const input = () => screen.getByTestId('speckit-commands-specify-input');

describe('SpeckitQuickCommands: the commands (BR5.5, AC3.1.2)', () => {
  it("shows the core four, then each extension's commands grouped by id in the reader's order", async () => {
    render(<SpeckitQuickCommands projectId="p1" />);
    const groups = await screen.findAllByTestId('speckit-commands-extension');
    expect(core().map((b) => b.textContent)).toEqual(['/speckit-specify', '/speckit-clarify', '/speckit-analyze', '/speckit-constitution']);
    expect(groups.map((g) => g.textContent.startsWith('git') || g.textContent.startsWith('review'))).toEqual([true, true]);
    expect(texts(groups[0])).toEqual(['/speckit-git-commit', '/speckit-git-push']);
    expect(texts(groups[1])).toEqual(['/speckit-review-run']);
    expect(screen.queryByTestId('speckit-commands-rules-error')).toBeNull();
  });

  it('keeps the core four and says so when speckit:rules is rejected, names errors or checked no hooks (NFR5.1)', async () => {
    for (const answer of [Promise.reject(new Error('boom')), rules({ errors: [{ path: 'x', reason: 'y' }] }), rules({ hooksChecked: false, extensions: [] })]) {
      window.bridge.speckitRules.mockImplementationOnce(() => answer);
      const view = render(<SpeckitQuickCommands projectId="p1" />);
      expect((await screen.findByTestId('speckit-commands-rules-error')).textContent).toBe(t('speckit.commands.rulesError'));
      expect(core()).toHaveLength(4);
      view.unmount();
    }
  });

  it("reads again on this project's speckit:changed, and types nothing on mount or push (NFR4.4, NFR7.1)", async () => {
    render(<SpeckitQuickCommands projectId="p1" />);
    await screen.findAllByTestId('speckit-commands-extension');
    window.bridge.speckitRules.mockResolvedValueOnce(rules({ extensions: [review] }));
    await act(async () => changed({ projectId: 'other', paths: [] }));
    expect(window.bridge.speckitRules).toHaveBeenCalledTimes(1);
    await act(async () => changed({ projectId: 'p1', paths: ['.specify/extensions.yml'] }));
    await waitFor(() => expect(screen.getAllByTestId('speckit-commands-extension')).toHaveLength(1));
    expect(window.bridge.speckitRules).toHaveBeenCalledTimes(2);
    expect(terminal.type).not.toHaveBeenCalled();
  });
});

describe('SpeckitQuickCommands: specify with a description (BR5.6)', () => {
  it('keeps specify disabled until the description has text', async () => {
    render(<SpeckitQuickCommands projectId="p1" />);
    await screen.findAllByTestId('speckit-commands-extension');
    expect(specify().disabled).toBe(true);
    expect(screen.getByText(t('speckit.commands.needDescription'))).toBeTruthy();
    fireEvent.change(input(), { target: { value: ' \n\t ' } });
    expect(specify().disabled).toBe(true);
    fireEvent.change(input(), { target: { value: 'Photo albums' } });
    expect(specify().disabled).toBe(false);
    expect(core()[1].disabled).toBe(false); // the others never wait on a description
  });

  it('sends the description as one plain line and clears the field after a send that went through', async () => {
    render(<SpeckitQuickCommands projectId="p1" />);
    await screen.findAllByTestId('speckit-commands-extension');
    fireEvent.change(input(), { target: { value: 'Photo\talbums\u001b[2J' } });
    await act(async () => fireEvent.click(specify()));
    expect(terminal.type).toHaveBeenCalledWith('agent', '/speckit-specify Photo albums[2J', { submit: true });
    expect(input().value).toBe('');
  });

  it('keeps the description after a failed send', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    terminal.type = vi.fn(async () => false);
    render(<SpeckitQuickCommands projectId="p1" />);
    await screen.findAllByTestId('speckit-commands-extension');
    fireEvent.change(input(), { target: { value: 'Photo albums' } });
    await act(async () => fireEvent.click(specify()));
    expect(terminal.type).toHaveBeenCalledTimes(1);
    expect(input().value).toBe('Photo albums');
  });

  it('types an extension command with Enter on a click', async () => {
    render(<SpeckitQuickCommands projectId="p1" />);
    const [first] = await screen.findAllByTestId('speckit-commands-extension');
    await act(async () => fireEvent.click(within(first).getAllByTestId('speckit-commands-button')[0]));
    expect(terminal.type).toHaveBeenCalledWith('agent', '/speckit-git-commit', { submit: true });
  });
});

// US-0050 item 6: the command rows rise with the view's entrance.
describe('SpeckitQuickCommands entrance (US-0050)', () => {
  it('lets each command row rise', async () => {
    render(<SpeckitQuickCommands projectId="p1" />);
    await waitFor(() => expect(screen.getAllByTestId('speckit-commands-extension').length).toBeGreaterThan(0));
    const rowsShown = [...document.querySelectorAll('.speckit-commands-row')];
    expect(rowsShown.length).toBeGreaterThan(1);
    expect(rowsShown.every((r) => r.classList.contains('lcars-e-rise'))).toBe(true);
  });
});
