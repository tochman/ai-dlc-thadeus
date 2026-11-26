// US-0804 FR2, FR3, FR5.2: the sign-in state and "Sign in" in Settings › Tools, with a mocked check, in Swedish.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import SettingsView from '../../src/renderer/SettingsView.jsx';
import { CopyCommand, useSignIn } from '../../src/renderer/SignIn.jsx';
import { groupStrip } from '../../src/renderer/ToolRows.jsx';

const found = (id, over) => ({ id, path: `/usr/local/bin/${id}`, source: 'auto', found: true, version: '1.0.0', ...over });
const missing = (id) => ({ id, path: null, source: 'auto', found: false, version: null });
const IDS = ['aidlc', 'claude', 'opencode', 'gh', 'glab', 'specify', 'shell'];
const ALL = IDS.map((id) => found(id));
const answer = (state, over) => ({ state, account: null, reason: null, ...over });
const IN = {
  claude: answer('in', { account: 'dana@example.com · max' }),
  opencode: answer('in', { account: 'Anthropic, OpenAI' }),
  gh: answer('in', { account: 'octo-dana' })
};

/** A promise and its settlers, for an answer the test gives when it wants to. */
function held() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => ((resolve = yes), (reject = no)));
  return { promise, resolve: (value) => act(async () => resolve(value)), reject: (err) => act(async () => reject(err)) };
}

let bridge;
let toolPaths;
/** Settings › Tools with these scanned rows and these answers (per id: an answer, or a function that gives one). */
async function setup({ tools = ALL, answers = IN, terminal = { type: vi.fn(), anyBusy: () => false } } = {}) {
  toolPaths = {};
  bridge = {
    getSettings: vi.fn(async () => ({ toolPaths: { ...toolPaths } })),
    getTools: vi.fn(async () => tools.map((row) => (toolPaths[row.id] ? { ...row, path: toolPaths[row.id], source: 'saved' } : row))),
    pickTool: vi.fn(async () => '/opt/my tools/claude'),
    saveTool: vi.fn(async (id, file) => {
      toolPaths[id] = file;
    }),
    resetTool: vi.fn(async (id) => {
      delete toolPaths[id];
    }),
    getAidlcUpdateStatus: vi.fn(async () => ({ version: '2.11.3', status: 'current', latest: '2.11.3', reason: null, command: 'aidlc update' })),
    bitbucket: { status: vi.fn(async () => ({ set: false })) },
    checkSignIn: vi.fn(async (id) => (typeof answers[id] === 'function' ? answers[id]() : answers[id]))
  };
  window.bridge = bridge;
  render(<SettingsView tab="tools" animations="full" onClose={vi.fn()} terminal={terminal} activeProjectId={terminal ? 'p1' : null} />);
  await screen.findByTestId('settings-tool-chip-claude');
  await act(async () => {});
  return { terminal };
}
const checks = (id) => bridge.checkSignIn.mock.calls.filter(([called]) => called === id).length;
const row = (id) => within(screen.getByTestId(`settings-tool-${id}`));
const state = (id) => row(id).getByTestId(`settings-signin-state-${id}`);
const stateText = (key) => t(`signIn.state.${key}`);
const shows = (id, key) => waitFor(() => expect(state(id).textContent).toBe(stateText(key)));
const isChecking = (id) => row(id).queryByTestId(`settings-signin-checking-${id}`) !== null;

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('The sign-in state in Settings › Tools (US-0804 FR2.1–FR2.4)', () => {
  it('shows signed in with the account of each tool, and no Sign in (AC1.1.1, AC2.1.1)', async () => {
    await setup();
    for (const id of ['claude', 'opencode', 'gh']) {
      await shows(id, 'in');
      expect(row(id).getByTestId(`settings-signin-account-${id}`).textContent).toBe(IN[id].account);
      expect(row(id).queryByTestId(`settings-signin-${id}`)).toBeNull();
      expect(row(id).queryByTestId(`settings-signin-reason-${id}`)).toBeNull();
    }
    expect(stateText('in')).toBe('Inloggad');
  });

  it('tells the other states apart by text, with the reason for unknown (AC1.1.2–AC1.1.4)', async () => {
    await setup({ answers: { claude: answer('out'), opencode: answer('none'), gh: answer('unknown', { reason: 'connection refused' }) } });
    await shows('claude', 'out');
    await shows('opencode', 'none');
    await shows('gh', 'unknown');
    expect(new Set(['in', 'out', 'none', 'unknown', 'checking'].map(stateText)).size).toBe(5);
    expect(row('gh').getByTestId('settings-signin-reason-gh').textContent).toBe('connection refused');
    expect(row('claude').queryByTestId('settings-signin-account-claude')).toBeNull();
  });

  it('checks only a tool that was found; a missing one, and one main no longer finds, shows no state (AC1.1.5)', async () => {
    await setup({ tools: ALL.map((r) => (r.id === 'gh' ? missing('gh') : r)), answers: { ...IN, opencode: null } });
    await shows('claude', 'in');
    expect(checks('gh')).toBe(0);
    expect(screen.queryByTestId('settings-signin-state-gh')).toBeNull();
    expect(checks('opencode')).toBe(1);
    expect(screen.queryByTestId('settings-signin-state-opencode')).toBeNull();
  });

  it('shows none for AI-DLC, Spec Kit, Bitbucket and the shell, and never checks them (AC1.1.5, FR2.3)', async () => {
    await setup();
    await shows('gh', 'in');
    expect([...new Set(bridge.checkSignIn.mock.calls.flat())].sort()).toEqual(['claude', 'gh', 'opencode']);
    for (const id of ['aidlc', 'specify', 'shell']) expect(screen.queryByTestId(`settings-signin-state-${id}`)).toBeNull();
  });

  it('GitLab, when found, is unknown with the command to check by hand, without Sign in (AC1.1.6)', async () => {
    await setup();
    await shows('glab', 'unknown');
    expect(row('glab').getByTestId('settings-signin-reason-glab').textContent).toContain('glab auth status');
    expect(row('glab').queryByTestId('settings-signin-glab')).toBeNull();
    cleanup();
    await setup({ tools: ALL.map((r) => (r.id === 'glab' ? missing('glab') : r)) });
    await shows('gh', 'in');
    expect(screen.queryByTestId('settings-signin-state-glab')).toBeNull();
  });

  it('versions, paths and the quick answers show without waiting for a slow check (AC1.1.7)', async () => {
    const slow = held();
    await setup({ answers: { ...IN, claude: () => slow.promise } });
    expect(row('claude').getByText('1.0.0')).toBeTruthy();
    expect(state('claude').textContent).toBe(stateText('checking'));
    await shows('gh', 'in');
    await shows('opencode', 'in');
    await slow.resolve(answer('out'));
    expect(state('claude').textContent).toBe(stateText('out'));
  });

  it('a failed call is unknown with a reason, never signed in (FR1.6)', async () => {
    await setup({ answers: { ...IN, gh: () => Promise.reject(new Error('boom')) } });
    await shows('gh', 'unknown');
    expect(row('gh').getByTestId('settings-signin-reason-gh').textContent).toBe(t('signIn.reason.failed'));
  });

  it('works without the call, as a page that has no check', async () => {
    await setup();
    cleanup();
    delete bridge.checkSignIn;
    render(<SettingsView tab="tools" animations="full" onClose={vi.fn()} terminal={null} />);
    await waitFor(() => expect(row('claude').getByText('1.0.0')).toBeTruthy());
    expect(screen.queryByTestId('settings-signin-state-claude')).toBeNull();
  });
});

describe("The group's strip (US-0804 FR2.6, AC1.1.8)", () => {
  it('not signed in comes after missing and before newer', () => {
    expect(groupStrip(['found', 'out', 'newer'])).toBe('out');
    expect(groupStrip(['out', 'missing'])).toBe('missing');
    expect(groupStrip(['newer', 'found'])).toBe('newer');
    expect(groupStrip(['found', 'in', 'none', 'unknown', 'hand', undefined])).toBeNull();
  });

  it('only "not signed in" of the states marks its group, and a missing tool comes first', async () => {
    const strip = (group, kind) => screen.getByTestId(`settings-tools-group-${group}`).querySelector(`.tools-gh--${kind}`) !== null;
    await setup({ answers: { claude: answer('out'), opencode: answer('none'), gh: answer('unknown', { reason: 'x' }) } });
    await shows('claude', 'out');
    await shows('gh', 'unknown');
    expect(strip('agents', 'out')).toBe(true);
    expect(strip('git', 'out')).toBe(false);
    cleanup();
    await setup({ tools: ALL.map((r) => (r.id === 'opencode' ? missing('opencode') : r)), answers: { ...IN, claude: answer('out') } });
    await shows('claude', 'out');
    expect(strip('agents', 'missing')).toBe(true);
    expect(strip('agents', 'out')).toBe(false);
  });
});

describe('A state that keeps up (US-0804 FR2.5, FR5.2)', () => {
  it('is read once when the tab opens, and again on Rescan and when the window gets focus back (AC1.3.1)', async () => {
    await setup();
    await shows('gh', 'in');
    expect(['claude', 'opencode', 'gh'].map(checks)).toEqual([1, 1, 1]);
    fireEvent.click(screen.getByTestId('settings-tools-rescan'));
    await waitFor(() => expect(['claude', 'opencode', 'gh'].map(checks)).toEqual([2, 2, 2]));
    await shows('gh', 'in');
    fireEvent.focus(window);
    await waitFor(() => expect(['claude', 'opencode', 'gh'].map(checks)).toEqual([3, 3, 3]));
    expect(bridge.getTools).toHaveBeenCalledTimes(2); // the window's focus reads the sign-ins only
    cleanup(); // Settings closes: nothing is read while it does not show
    fireEvent.focus(window);
    await act(async () => {});
    expect(checks('gh')).toBe(3);
  });

  it('is read again after a path is chosen and after it is reset, keeping the last state meanwhile (AC1.3.1, AC1.3.2)', async () => {
    const scan = held();
    await setup();
    await shows('claude', 'in');
    bridge.getTools.mockImplementationOnce(() => scan.promise);
    fireEvent.click(screen.getByTestId('settings-tool-pick-claude'));
    await waitFor(() => expect(bridge.getTools).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(isChecking('claude')).toBe(true));
    expect(state('claude').textContent).toBe(stateText('in')); // the versions are not back yet
    bridge.checkSignIn.mockImplementation(async (id) => (id === 'claude' ? answer('out') : IN[id]));
    await scan.resolve(ALL.map((r) => (r.id === 'claude' ? { ...r, path: '/opt/my tools/claude', source: 'saved' } : r)));
    await shows('claude', 'out');
    expect(isChecking('claude')).toBe(false);

    const before = checks('claude');
    fireEvent.click(screen.getByTestId('settings-tool-reset-claude'));
    await waitFor(() => expect(checks('claude')).toBe(before + 1));
  });

  it('keeps the last state, marked as being checked, until the new one is there (AC1.3.2)', async () => {
    await setup();
    await shows('gh', 'in');
    const next = held();
    bridge.checkSignIn.mockImplementation((id) => (id === 'gh' ? next.promise : Promise.resolve(IN[id])));
    fireEvent.focus(window);
    await waitFor(() => expect(isChecking('gh')).toBe(true));
    expect(state('gh').textContent).toBe(stateText('in'));
    expect(row('gh').getByTestId('settings-signin-account-gh').textContent).toBe('octo-dana');
    await next.resolve(answer('out'));
    expect(state('gh').textContent).toBe(stateText('out'));
    expect(isChecking('gh')).toBe(false);
  });

  it('an older answer never replaces a newer one (AC1.3.3)', async () => {
    const older = held();
    const newer = held();
    await setup();
    await shows('gh', 'in');
    bridge.checkSignIn.mockImplementation((id) => (id === 'gh' ? older.promise : Promise.resolve(IN[id])));
    fireEvent.focus(window);
    bridge.checkSignIn.mockImplementation((id) => (id === 'gh' ? newer.promise : Promise.resolve(IN[id])));
    fireEvent.focus(window);
    await newer.resolve(answer('in', { account: 'new-account' }));
    await older.resolve(answer('out'));
    expect(state('gh').textContent).toBe(stateText('in'));
    expect(row('gh').getByTestId('settings-signin-account-gh').textContent).toBe('new-account');
  });

  it('an older scan that comes back last neither replaces the rows nor checks again', async () => {
    const older = held();
    await setup();
    await shows('gh', 'in');
    bridge.getTools.mockImplementationOnce(() => older.promise);
    fireEvent.click(screen.getByTestId('settings-tools-rescan'));
    fireEvent.click(screen.getByTestId('settings-tools-rescan'));
    await waitFor(() => expect(checks('gh')).toBe(2));
    await older.resolve(IDS.map(missing));
    expect(state('gh').textContent).toBe(stateText('in'));
    expect(checks('gh')).toBe(2);
  });

  it('forgets a state when the tool is not found any more', async () => {
    await setup();
    await shows('gh', 'in');
    bridge.getTools.mockResolvedValueOnce(ALL.map((r) => (r.id === 'gh' ? missing('gh') : r)));
    fireEvent.click(screen.getByTestId('settings-tools-rescan'));
    await waitFor(() => expect(screen.queryByTestId('settings-signin-state-gh')).toBeNull());
  });

  it('announces each tool and its new state politely, without moving focus (AC1.3.2)', async () => {
    const slow = held();
    await setup({ answers: { ...IN, claude: answer('out'), gh: () => slow.promise } });
    await shows('claude', 'out');
    const region = screen.getByTestId('settings-signin-status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.className).toBe('sr-only');
    expect(region.textContent).toContain(t('signIn.announce', { tool: 'Claude Code CLI', state: stateText('out') }));
    expect(region.textContent).not.toContain('GitHub');
    const rescan = screen.getByTestId('settings-tools-rescan');
    rescan.focus();
    await slow.resolve(answer('none'));
    expect(region.textContent).toContain(t('signIn.announce', { tool: 'GitHub CLI (gh)', state: stateText('none') }));
    expect(document.activeElement).toBe(rescan);
  });
});

describe('What the health check uses (US-0805)', () => {
  it('read resolves when its checks have, also when one failed (FR1.4)', async () => {
    const slow = held();
    window.bridge = { checkSignIn: vi.fn((id) => (id === 'gh' ? slow.promise : Promise.reject(new Error('boom')))) };
    const { result } = renderHook(() => useSignIn(ALL, false));
    let done = false;
    act(() => {
      result.current.read(ALL).then(() => (done = true));
    });
    await act(async () => {});
    expect(result.current.of(found('claude')).state).toBe('unknown');
    expect(done).toBe(false);
    await slow.resolve(answer('in'));
    expect(done).toBe(true);
  });

  it("without the focus option the window's focus starts no check (FR1.4)", async () => {
    window.bridge = { checkSignIn: vi.fn(async (id) => IN[id]) };
    renderHook(() => useSignIn(ALL, false, { onFocus: false }));
    fireEvent.focus(window);
    await act(async () => {});
    expect(window.bridge.checkSignIn).not.toHaveBeenCalled();
  });

  const command = 'one \\\n\t&& two';
  const copyable = (writeText) => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CopyCommand id="gh" command={command} label="Kör det här:" copyLabel="Kopiera för gh" testId="some" />);
    return screen.getByTestId('some-copy-gh');
  };

  it('CopyCommand shows and copies a text with line breaks unchanged (FR5.3)', async () => {
    const writeText = vi.fn(async () => {});
    const button = copyable(writeText);
    expect(screen.getByTestId('some-command-gh').querySelector('code').textContent).toBe(command);
    expect(screen.getByTestId('some-command-gh').textContent).toContain('Kör det här:');
    expect(button.getAttribute('aria-label')).toBe('Kopiera för gh');
    fireEvent.click(button);
    await waitFor(() => expect(button.textContent).toBe(t('signIn.copied')));
    expect(button.hasAttribute('aria-label')).toBe(false); // "Copied" is what it says now
    expect(writeText.mock.calls).toEqual([[command]]);
  });

  it('CopyCommand says when the clipboard refuses (FR4.1)', async () => {
    fireEvent.click(
      copyable(
        vi.fn(async () => {
          throw new Error('denied');
        })
      )
    );
    expect((await screen.findByRole('alert')).textContent).toBe(t('signIn.copyFailed', { error: 'denied' }));
  });
});

describe('Sign in from Settings (US-0804 FR3)', () => {
  it('is offered for not signed in, no account connected and unknown, and names its tool (AC2.1.1)', async () => {
    await setup({ answers: { claude: answer('out'), opencode: answer('none'), gh: answer('unknown', { reason: 'x' }) } });
    await shows('gh', 'unknown');
    for (const [id, label] of [
      ['claude', 'Claude Code CLI'],
      ['opencode', 'opencode CLI'],
      ['gh', 'GitHub CLI (gh)']
    ]) {
      const button = row(id).getByRole('button', { name: t('signIn.signInTo', { tool: label }) });
      expect(button.getAttribute('data-testid')).toBe(`settings-signin-${id}`);
      expect(button.textContent).toBe('Logga in');
    }
  });

  it('is not offered while the first check runs', async () => {
    await setup({ answers: { ...IN, gh: () => new Promise(() => {}) } });
    expect(state('gh').textContent).toBe(stateText('checking'));
    expect(row('gh').queryByTestId('settings-signin-gh')).toBeNull();
  });

  it("types the command through the active project's Shell tab, without Enter (AC2.1.2)", async () => {
    const { terminal } = await setup({ answers: { claude: answer('out'), opencode: answer('none'), gh: answer('unknown', { reason: 'x' }) } });
    await shows('gh', 'unknown');
    for (const id of ['gh', 'claude', 'opencode']) fireEvent.click(screen.getByTestId(`settings-signin-${id}`));
    expect(terminal.type.mock.calls).toEqual([
      ['shell', 'gh auth login --hostname github.com', { submit: false }],
      ['shell', 'claude auth login', { submit: false }],
      ['shell', 'opencode auth login', { submit: false }]
    ]);
    expect(screen.queryByTestId('settings-signin-command-gh')).toBeNull(); // the Shell tab is the way
  });

  it('a chosen path, quoted for the shell, replaces the name (AC2.1.3)', async () => {
    const tools = ALL.map((r) => (r.id === 'claude' ? { ...r, path: '/opt/my tools/claude', source: 'saved' } : r));
    const { terminal } = await setup({ tools, answers: { ...IN, claude: answer('out') } });
    await shows('claude', 'out');
    fireEvent.click(screen.getByTestId('settings-signin-claude'));
    expect(terminal.type).toHaveBeenCalledWith('shell', '/opt/my\\ tools/claude auth login', { submit: false });
  });

  describe('with no project open (FR3.3)', () => {
    const clipboard = (writeText) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    it('shows the command, that it can be run in any terminal, and copies exactly it (AC2.2.1, AC2.2.2)', async () => {
      const writeText = vi.fn(async () => {});
      clipboard(writeText);
      await setup({ answers: { ...IN, gh: answer('out') }, terminal: null });
      await shows('gh', 'out');
      const button = screen.getByTestId('settings-signin-gh');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(button);
      expect(button.getAttribute('aria-expanded')).toBe('true');
      const command = row('gh').getByTestId('settings-signin-command-gh');
      expect(command.textContent).toContain('gh auth login --hostname github.com');
      expect(command.textContent).toContain(t('signIn.anyTerminal'));
      const copy = row('gh').getByTestId('settings-signin-copy-gh');
      expect(copy.textContent).toBe(t('signIn.copy'));
      fireEvent.click(copy);
      await waitFor(() => expect(copy.textContent).toBe(t('signIn.copied')));
      expect(writeText.mock.calls).toEqual([['gh auth login --hostname github.com']]);
      fireEvent.click(button);
      expect(screen.queryByTestId('settings-signin-command-gh')).toBeNull();
    });

    it('a copy that fails says that (AC2.2.2)', async () => {
      clipboard(
        vi.fn(async () => {
          throw new Error('denied');
        })
      );
      await setup({ answers: { ...IN, gh: answer('out') }, terminal: null });
      await shows('gh', 'out');
      fireEvent.click(screen.getByTestId('settings-signin-gh'));
      fireEvent.click(screen.getByTestId('settings-signin-copy-gh'));
      expect((await screen.findByRole('alert')).textContent).toBe(t('signIn.copyFailed', { error: 'denied' }));
      expect(screen.getByTestId('settings-signin-copy-gh').textContent).toBe(t('signIn.copy'));
    });

    it('goes away when the tool turns out to be signed in', async () => {
      await setup({ answers: { ...IN, gh: answer('out') }, terminal: null });
      await shows('gh', 'out');
      fireEvent.click(screen.getByTestId('settings-signin-gh'));
      bridge.checkSignIn.mockImplementation(async (id) => IN[id]);
      fireEvent.focus(window);
      await shows('gh', 'in');
      expect(screen.queryByTestId('settings-signin-command-gh')).toBeNull();
    });
  });
});
