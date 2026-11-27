import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// xterm needs a real canvas and layout; this stand-in keeps what the panel uses and lets the test "type".
const keyboards = []; // onData listeners, one per terminal in mount order (shell, then the agent once its harness is known)
const screens = []; // per terminal in mount order: the rows its screen shows (the popup reads the picker, US-0004)
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80;
    rows = 24;
    constructor() {
      const rows = [];
      screens.push(rows);
      this.buffer = {
        active: { viewportY: 0, baseY: 0, getLine: (y) => (y < rows.length ? { isWrapped: false, translateToString: () => rows[y] } : undefined) }
      };
    }
    loadAddon() {}
    open() {}
    write() {}
    focus() {}
    dispose() {}
    onData(fn) {
      keyboards.push(fn);
      return { dispose() {} };
    }
    onResize() {
      return { dispose() {} };
    }
  }
}));
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  }
}));
vi.mock('@xterm/xterm/css/xterm.css', () => ({}));
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
};
// Every harness has all quick commands or none; this lets a test take one away to see the disabled option.
let missingSuffix = null;
vi.mock('../../src/shared/harnesses.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, harnessCommand: (h, suffix) => (suffix === missingSuffix ? null : real.harnessCommand(h, suffix)) };
});

// Same calls as the preload bridge's pty API.
window.bridge = {
  ptySpawn: vi.fn(async ({ kind }) => `pty-${kind}`),
  ptyWrite: vi.fn(async () => {}),
  ptyKill: vi.fn(async () => {}),
  ptyResize: vi.fn(async () => {}),
  pathForFile: vi.fn((file) => file.path),
  onPtyData: vi.fn(() => () => {}),
  onPtyExit: vi.fn(() => () => {})
};
const { default: TerminalPanel } = await import('../../src/renderer/TerminalPanel.jsx');
const { TerminalProvider, useTerminal } = await import('../../src/renderer/TerminalContext.jsx');
const { HARNESSES } = await import('../../src/shared/harnesses.js');
const harness = (id) => HARNESSES.find((h) => h.id === id);

let terminal;
function Grab() {
  terminal = useTerminal();
  return null;
}

/** Renders the panel; with `agent` ({harness, problem}) set as ProjectView sets it once detection is done. */
async function renderPanel(agent = { harness: harness('claude') }, props = {}) {
  keyboards.length = 0;
  render(
    <TerminalProvider>
      <Grab />
      <TerminalPanel projectId="p1" visible {...props} />
    </TerminalProvider>
  );
  expect(screen.getByTestId('terminal-panel-state-agent').textContent).toBe('Kontrollerar…'); // nothing started yet (NFR3)
  act(() => terminal.setAgent(agent));
  if (agent.problem) return;
  // Both sessions spawn and count as busy until their first quiet period.
  await waitFor(() => expect(screen.getByTestId('terminal-panel-state-agent').textContent).toBe('Arbetar'));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TerminalPanel', () => {
  it('shows "Väntar på din Enter" after text typed without Enter, until the person types in that tab (FR3.6)', async () => {
    await renderPanel();
    expect(screen.queryByTestId('terminal-panel-pending-agent')).toBeNull();

    await act(() => terminal.type('agent', '/aidlc', { submit: false }));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '/aidlc'); // no Enter
    expect(screen.getByTestId('terminal-panel-pending-agent').textContent).toBe('Väntar på din Enter');
    expect(screen.queryByTestId('terminal-panel-pending-shell')).toBeNull();

    act(() => keyboards[0]('x')); // typing in the shell tab leaves the agent label
    expect(screen.getByTestId('terminal-panel-pending-agent')).toBeTruthy();
    act(() => keyboards[1]('\r')); // the person's Enter in the agent tab
    expect(screen.queryByTestId('terminal-panel-pending-agent')).toBeNull();

    await act(() => terminal.type('shell', 'git status', { submit: true })); // submitted: nothing waits
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-shell', 'git status\r');
    expect(screen.queryByTestId('terminal-panel-pending-shell')).toBeNull();
  });

  it('labels the agent tab with the chosen harness and starts it by id; a switch restarts it (US-0801 FR3.1, FR3.2)', async () => {
    await renderPanel({ harness: harness('opencode') });
    expect(screen.getByTestId('terminal-panel-name-agent').textContent).toBe('opencode');
    expect(screen.getByTestId('terminal-panel-tab-agent')).toBeTruthy();
    expect(window.bridge.ptySpawn).toHaveBeenCalledWith(expect.objectContaining({ kind: 'agent', harness: 'opencode' }));
    expect(window.bridge.ptySpawn.mock.calls.every(([a]) => !('command' in a))).toBe(true); // only an id reaches main

    act(() => terminal.setAgent({ harness: harness('claude') }));
    await waitFor(() => expect(screen.getByTestId('terminal-panel-name-agent').textContent).toBe('Claude'));
    expect(window.bridge.ptyKill).toHaveBeenCalledWith('pty-agent'); // the opencode session is closed
    expect(window.bridge.ptySpawn).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'agent', harness: 'claude' }));
  });

  it('puts the quick commands select inside the dark segment of the bar above the terminal, at its placeholder (FR4.1)', async () => {
    await renderPanel({ harness: harness('opencode') });
    expect(screen.queryByTestId('terminal-panel-foot')).toBeNull(); // nothing pending: no row under the terminal
    const select = screen.getByTestId('terminal-panel-quick-select');
    expect(select.className).toBe('lcars-select lcars-select--bar');
    expect(select.closest('.lcars-seg').classList.contains('lcars-seg--steel-deep')).toBe(true);
    expect(select.closest('.lcars-bar').nextElementSibling.classList.contains('terminal-body')).toBe(true);
    expect(select.value).toBe('');
    expect(select.options[0].textContent).toBe('Snabbkommandon');
    const quick = screen.getAllByTestId('terminal-panel-quick-command');
    expect(quick.map((o) => o.textContent)).toEqual(['/aidlc --status', '/aidlc --doctor', '/aidlc continue']);
    expect(quick.every((o) => !o.disabled)).toBe(true);
  });

  it('a chosen quick command is typed into the agent tab without Enter, and the select resets', async () => {
    await renderPanel({ harness: harness('opencode') });
    const select = screen.getByTestId('terminal-panel-quick-select');
    await act(async () => fireEvent.change(select, { target: { value: '/aidlc --doctor' } }));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '/aidlc --doctor'); // no Enter
    expect(select.value).toBe('');
    expect(screen.getByTestId('terminal-panel-pending-agent')).toBeTruthy(); // the foot row shows while it waits
  });

  it('shows a quick command the harness lacks as a disabled option, with the reason in the list tooltip (US-0414 FR2.5)', async () => {
    missingSuffix = ' continue';
    try {
      await renderPanel();
      const last = screen.getAllByTestId('terminal-panel-quick-command')[2];
      expect(last.disabled).toBe(true);
      expect(last.textContent).toBe('continue');
      expect(last.hasAttribute('title')).toBe(false);
      fireEvent.focus(screen.getByTestId('terminal-panel-quick-select'));
      expect(screen.getByRole('tooltip').textContent).toBe(
        'Skriver in kommandot i Claude-fliken utan att skicka det\nClaude har inget AI-DLC-kommando i appens tabell, så inget skrivs in.'
      );
    } finally {
      missingSuffix = null;
    }
  });

  it('hides the quick commands on the shell tab and when collapsed', async () => {
    await renderPanel();
    fireEvent.click(screen.getByTestId('terminal-panel-tab-shell'));
    expect(screen.queryByTestId('terminal-panel-quick-select')).toBeNull();
    fireEvent.click(screen.getByTestId('terminal-panel-tab-agent'));
    expect(screen.getByTestId('terminal-panel-quick-select')).toBeTruthy();
    fireEvent.click(screen.getByTestId('terminal-panel-toggle'));
    expect(screen.queryByTestId('terminal-panel-quick-select')).toBeNull();
    cleanup();
  });

  // US-0806: the four harnesses without AI-DLC commands, and the not-found answer from main.
  it('a Codex tab shows the quick commands as not available, with the reason in the list tooltip (US-0806 FR5.2)', async () => {
    await renderPanel({ harness: harness('codex') });
    const quick = screen.getAllByTestId('terminal-panel-quick-command');
    expect(quick.map((o) => [o.textContent, o.disabled])).toEqual([
      ['--status', true],
      ['--doctor', true],
      ['continue', true]
    ]);
    fireEvent.focus(screen.getByTestId('terminal-panel-quick-select'));
    expect(screen.getByRole('tooltip').textContent).toContain('Codex har inget AI-DLC-kommando i appens tabell, så inget skrivs in.');
    await act(async () => fireEvent.change(screen.getByTestId('terminal-panel-quick-select'), { target: { value: '' } }));
    expect(window.bridge.ptyWrite).not.toHaveBeenCalled(); // nothing is typed into a Codex tab
  });

  it('names each agent tab after its harness, whatever command it runs (US-0806 FR2.3)', async () => {
    await renderPanel({ harness: harness('codex') });
    expect(screen.getByTestId('terminal-panel-name-agent').textContent).toBe('Codex');
    expect(window.bridge.ptySpawn).toHaveBeenCalledWith(expect.objectContaining({ kind: 'agent', harness: 'codex' }));
    expect(window.bridge.ptySpawn.mock.calls.every(([a]) => !('command' in a))).toBe(true); // main reads the command (NFR1)
    cleanup();
    await renderPanel({ harness: harness('claude') });
    expect(screen.getByTestId('terminal-panel-name-agent').textContent).toBe('Claude');
  });

  it('a notFound answer starts nothing, says so in one sentence and offers the terminal settings (US-0806 FR4.1, FR4.2)', async () => {
    const onChooseHarness = vi.fn();
    window.bridge.ptySpawn.mockImplementation(async ({ kind }) => (kind === 'agent' ? { notFound: 'my-cli' } : `pty-${kind}`));
    try {
      render(
        <TerminalProvider>
          <Grab />
          <TerminalPanel projectId="p1" visible onChooseHarness={onChooseHarness} />
        </TerminalProvider>
      );
      act(() => terminal.setAgent({ harness: harness('codex') }));
      const line = await screen.findByTestId('terminal-panel-not-found-agent');
      expect(line.textContent).toBe('Kommandot my-cli hittades inte, så inget startades.');
      expect(terminal.running()).toBe(false); // no session: nothing runs
      expect(screen.getByTestId('terminal-panel-state-agent').textContent).not.toBe('Arbetar');
      const open = screen.getByTestId('terminal-panel-open-settings-agent');
      expect(open.textContent).toBe('Öppna terminalinställningarna');
      fireEvent.click(open);
      expect(onChooseHarness).toHaveBeenCalledTimes(1);
      expect(await act(() => terminal.type('agent', 'x'))).toBe(false); // nothing to type into
    } finally {
      window.bridge.ptySpawn.mockImplementation(async ({ kind }) => `pty-${kind}`);
    }
  });

  it('starts nothing and offers another harness when the chosen one cannot run (FR5.1)', async () => {
    const onChooseHarness = vi.fn();
    const problem = 'opencode hittades inte: kommandot opencode finns inte i PATH, så inget startades.';
    await renderPanel({ harness: harness('opencode'), problem }, { onChooseHarness });
    expect(screen.getByTestId('terminal-panel-harness-problem').textContent).toContain(problem);
    expect(window.bridge.ptySpawn.mock.calls.map(([a]) => a.kind)).toEqual(['shell']);
    expect(terminal.running()).toBe(false); // no agent session: nothing runs the work (EPIC-00 US-0007)

    fireEvent.click(screen.getByTestId('terminal-panel-choose-harness'));
    expect(onChooseHarness).toHaveBeenCalledTimes(1);
    expect(await act(() => terminal.type('agent', '/aidlc'))).toBe(false);
    expect(screen.getByTestId('terminal-panel-error').textContent).toBe(problem);
  });

  it('a file drop types its quoted path into that tab without Enter, and highlights while dragging over', async () => {
    await renderPanel();
    const host = screen.getByTestId('terminal-panel-host-agent');
    const dataTransfer = { types: ['Files'], files: [{ path: '/Users/me/Skärm bild.png' }, { path: '/tmp/a.png' }] };
    expect(fireEvent.dragOver(host, { dataTransfer })).toBe(false); // default prevented: the window never opens the file
    expect(host.classList.contains('is-drop-target')).toBe(true);
    fireEvent.dragLeave(host, { relatedTarget: document.body });
    expect(host.classList.contains('is-drop-target')).toBe(false);
    fireEvent.dragOver(host, { dataTransfer });
    expect(fireEvent.drop(host, { dataTransfer })).toBe(false);
    expect(host.classList.contains('is-drop-target')).toBe(false);
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '/Users/me/Skärm\\ bild.png /tmp/a.png ');
    expect(window.bridge.ptyWrite).not.toHaveBeenCalledWith('pty-shell', expect.anything());

    fireEvent.drop(screen.getByTestId('terminal-panel-host-shell'), { dataTransfer: { types: ['Files'], files: [{ path: '/x.png' }] } });
    expect(window.bridge.ptyWrite).toHaveBeenLastCalledWith('pty-shell', '/x.png ');
  });

  it("answer() sends the picker's own key to the agent tab without switching tabs, and refuses with no picker (US-0004)", async () => {
    await renderPanel();
    act(() => terminal.setView({ open: true, active: 'shell' }));
    const gate = { kind: 'gate' };
    const now = { waitMs: 0 }; // no wait for a picker to be drawn
    await expect(terminal.answer(gate, { index: 1 }, now)).rejects.toThrow('visar ingen fråga'); // nothing on screen: no keys
    expect(window.bridge.ptyWrite).not.toHaveBeenCalled();

    screens.at(-1).push('Klart. Hur vill du gå vidare?', '', '❯ 1. Approve', '     Fortsätt', '  2. Request Changes', '  3. Type something.');
    await act(() => terminal.answer(gate, { index: 1 }, now));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '2');
    expect(terminal.view.active).toBe('shell');

    await expect(terminal.answer({ kind: 'question', options: ['Fritt'] }, { own: 'x' }, now)).rejects.toThrow('andra val'); // another picker
    screens.at(-1).length = 0; // the picker is gone: a free-text question in the chat
    await act(() => terminal.answer({ kind: 'question', options: ['Fritt'] }, { own: 'Både och' }, now));
    expect(window.bridge.ptyWrite).toHaveBeenLastCalledWith('pty-agent', 'Både och\r');
    act(() => terminal.setAgent({ harness: null }));
    await expect(terminal.answer({ kind: 'question', options: [] }, { own: 'x' }, now)).rejects.toThrow();
  });

  it('answer() waits for a picker drawn just after the question was logged (EPIC-00 US-0006)', async () => {
    await renderPanel();
    expect(terminal.running()).toBe(true); // the agent session is alive (EPIC-00 US-0007)
    const sent = terminal.answer({ kind: 'gate' }, { index: 0 }, { waitMs: 3000 });
    setTimeout(() => screens.at(-1).push('❯ 1. Approve', '  2. Request Changes', '  3. Type something.'), 400);
    await act(() => sent);
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '1');
  });
});

describe('A tool that is not signed in (EPIC-08 US-0804 FR4.1–FR4.3)', () => {
  const answer = (state) => ({ state, account: null, reason: null });
  const ownIds = async ({ kind, harness: h }) => `pty-${h ?? kind}`;
  const line = () => screen.queryByTestId('terminal-panel-signin');
  const checks = () => window.bridge.checkSignIn.mock.calls.map(([id]) => id);
  const start = (tab = 'agent') => act(() => terminal.restart(tab));
  /** The panel with a Claude agent tab whose check gives `state`. */
  async function renderSignedOut(state = 'out', agent, props) {
    window.bridge.checkSignIn = vi.fn(async () => answer(state));
    await renderPanel(agent, props);
    await act(async () => {});
  }
  afterEach(() => {
    delete window.bridge.checkSignIn;
    delete window.bridge.getSettings;
    window.bridge.ptySpawn.mockImplementation(async ({ kind }) => `pty-${kind}`);
  });

  it('shows one line that names the tool, and announces it, after one check of its own tool (AC3.1.1, AC3.1.6, NFR3)', async () => {
    await renderSignedOut();
    expect(checks()).toEqual(['claude']); // the Shell tab checks nothing
    expect(line().closest('[data-testid="terminal-panel-foot"]')).toBeTruthy();
    expect(line().textContent).toContain('Claude Code är inte inloggad.');
    const region = screen.getByTestId('terminal-panel-signin-status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('Claude Code är inte inloggad.');
  });

  it.each(['in', 'none', 'unknown'])('shows no line for %s (AC3.1.2)', async (state) => {
    await renderSignedOut(state);
    expect(checks()).toEqual(['claude']);
    expect(line()).toBeNull();
    expect(screen.queryByTestId('terminal-panel-foot')).toBeNull(); // the terminal keeps its height
  });

  it('shows no line for a tool that is not found, or for a check that fails', async () => {
    window.bridge.checkSignIn = vi.fn(async () => null);
    await renderPanel();
    await act(async () => {});
    expect(line()).toBeNull();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.bridge.checkSignIn.mockRejectedValueOnce(new Error('boom'));
    await start();
    await act(async () => {});
    expect(line()).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not delay the start, and shows no line while the check runs (AC3.1.1, AC3.1.2)', async () => {
    window.bridge.checkSignIn = vi.fn(() => new Promise(() => {}));
    await renderPanel(); // waits for the agent tab to be running
    expect(terminal.running()).toBe(true);
    expect(line()).toBeNull();
    await act(() => terminal.type('agent', '/aidlc'));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '/aidlc');
  });

  it('checks nothing when the start fails', async () => {
    window.bridge.checkSignIn = vi.fn(async () => answer('out'));
    window.bridge.ptySpawn.mockImplementation(async ({ kind }) => {
      if (kind === 'agent') throw new Error('no shell');
      return 'pty-shell';
    });
    render(
      <TerminalProvider>
        <Grab />
        <TerminalPanel projectId="p1" visible />
      </TerminalProvider>
    );
    act(() => terminal.setAgent({ harness: harness('claude') }));
    await screen.findByTestId('terminal-panel-restart-agent');
    expect(checks()).toEqual([]);
  });

  it('shows only while its tab is shown and the panel is open (AC3.1.1)', async () => {
    await renderSignedOut();
    fireEvent.click(screen.getByTestId('terminal-panel-tab-shell'));
    expect(line()).toBeNull();
    fireEvent.click(screen.getByTestId('terminal-panel-tab-agent'));
    expect(line()).toBeTruthy();
    fireEvent.click(screen.getByTestId('terminal-panel-toggle'));
    expect(line()).toBeNull();
    fireEvent.click(screen.getByTestId('terminal-panel-toggle'));
    expect(line()).toBeTruthy();
  });

  it("each of two agent tabs has its own tool's line (AC3.1.6)", async () => {
    window.bridge.ptySpawn.mockImplementation(ownIds);
    window.bridge.checkSignIn = vi.fn(async (id) => answer(id === 'opencode' ? 'out' : 'in'));
    await renderPanel({ harness: harness('claude'), extras: [harness('opencode')] });
    await waitFor(() => expect(checks().sort()).toEqual(['claude', 'opencode']));
    expect(line()).toBeNull(); // Claude is shown
    fireEvent.click(screen.getByTestId('terminal-panel-tab-agent-opencode'));
    await waitFor(() => expect(line().textContent).toContain('opencode är inte inloggad.'));
    await start('agent:opencode');
    expect(checks().filter((id) => id === 'claude')).toHaveLength(1); // the other tab's start checks its own tool only
    expect(checks().filter((id) => id === 'opencode')).toHaveLength(2);
  });

  it('Sign in types the command into the Shell tab without Enter, with the path chosen at that time (AC3.1.3)', async () => {
    await renderSignedOut();
    window.bridge.getSettings = vi.fn(async () => ({ toolPaths: { claude: '/opt/my tools/claude' } }));
    await act(async () => fireEvent.click(screen.getByTestId('terminal-panel-signin-start')));
    await waitFor(() => expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-shell', '/opt/my\\ tools/claude auth login'));
    expect(terminal.view.active).toBe('shell');
    expect(window.bridge.ptyWrite.mock.calls.flat().join('')).not.toMatch(/[\r\n]/);
  });

  it('Sign in falls back to the tool name when the settings cannot be read', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await renderSignedOut();
    window.bridge.getSettings = vi.fn(async () => {
      throw new Error('EACCES');
    });
    await act(async () => fireEvent.click(screen.getByTestId('terminal-panel-signin-start')));
    await waitFor(() => expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-shell', 'claude auth login'));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('Settings › Tools asks for that tab of Settings (AC3.1.3)', async () => {
    const onOpenTools = vi.fn();
    await renderSignedOut('out', undefined, { onOpenTools });
    const button = screen.getByTestId('terminal-panel-signin-tools');
    expect(button.textContent).toBe('Inställningar › Verktyg');
    fireEvent.click(button);
    expect(onOpenTools).toHaveBeenCalledTimes(1);
  });

  it('dismissed, the line stays away until the tab is started again (AC3.1.4)', async () => {
    await renderSignedOut();
    fireEvent.click(screen.getByTestId('terminal-panel-signin-dismiss'));
    expect(line()).toBeNull();
    fireEvent.click(screen.getByTestId('terminal-panel-tab-shell'));
    fireEvent.click(screen.getByTestId('terminal-panel-tab-agent'));
    expect(line()).toBeNull();
    await start();
    await waitFor(() => expect(line()).toBeTruthy());
    expect(checks()).toEqual(['claude', 'claude']);
  });

  it('a start forgets the earlier answer at once, and signed in shows no line (AC3.1.5)', async () => {
    await renderSignedOut();
    let reply;
    window.bridge.checkSignIn.mockImplementation(() => new Promise((resolve) => (reply = resolve)));
    await start();
    expect(line()).toBeNull();
    await act(async () => reply(answer('in')));
    expect(line()).toBeNull();
  });

  it('a late answer from before a restart changes nothing', async () => {
    const replies = [];
    window.bridge.checkSignIn = vi.fn(() => new Promise((resolve) => replies.push(resolve)));
    await renderPanel();
    await start();
    expect(replies).toHaveLength(2);
    await act(async () => replies[1](answer('in')));
    await act(async () => replies[0](answer('out')));
    expect(line()).toBeNull();
  });

  describe('checked again when the Shell tab goes quiet (FR4.3, AC3.1.5)', () => {
    const shellOutput = () => act(async () => window.bridge.onPtyData.mock.calls.forEach(([cb]) => cb({ id: 'pty-shell', data: '$ ' })));
    const shellState = (text) => waitFor(() => expect(screen.getByTestId('terminal-panel-state-shell').textContent).toBe(text), { timeout: 4000 });

    it('after Sign in only, each time, and signed in removes the line', { timeout: 20_000 }, async () => {
      await renderSignedOut();
      await shellState('Ledig');
      await shellOutput();
      await shellState('Arbetar');
      await shellState('Ledig');
      expect(checks()).toEqual(['claude']); // nothing was asked for yet

      await act(async () => fireEvent.click(screen.getByTestId('terminal-panel-signin-start')));
      await shellOutput();
      await shellState('Ledig');
      await waitFor(() => expect(checks()).toHaveLength(2));
      fireEvent.click(screen.getByTestId('terminal-panel-tab-agent'));
      expect(line()).toBeTruthy(); // still not signed in: the line stays, and the next quiet checks again

      window.bridge.checkSignIn.mockResolvedValue(answer('in'));
      await shellOutput();
      await shellState('Ledig');
      await waitFor(() => expect(checks()).toHaveLength(3));
      await waitFor(() => expect(line()).toBeNull());

      await shellOutput(); // no line shows any more: nothing is checked
      await shellState('Ledig');
      expect(checks()).toHaveLength(3);
    });

    it('not for a dismissed line', { timeout: 15_000 }, async () => {
      await renderSignedOut();
      await act(async () => fireEvent.click(screen.getByTestId('terminal-panel-signin-start')));
      fireEvent.click(screen.getByTestId('terminal-panel-tab-agent'));
      fireEvent.click(screen.getByTestId('terminal-panel-signin-dismiss'));
      await shellOutput();
      await shellState('Ledig');
      expect(checks()).toEqual(['claude']);
    });
  });
});

describe('Claude Code and opencode side by side (EPIC-08 US-0803)', () => {
  const both = { harness: harness('claude'), extras: [harness('opencode')] };
  /** Each agent session gets its own pty id, so the test can tell which tab was written to. */
  function ownIds() {
    window.bridge.ptySpawn.mockImplementation(async ({ kind, harness: h }) => `pty-${h ?? kind}`);
  }
  afterEach(() => window.bridge.ptySpawn.mockImplementation(async ({ kind }) => `pty-${kind}`));

  it('with harnessTabs [claude, opencode] renders two agent tabs and the shell tab, each spawning its own harness', async () => {
    ownIds();
    await renderPanel(both);
    expect(screen.getAllByRole('tab').map((b) => b.textContent)).toEqual([
      'ArbetarClaude',
      expect.stringMatching(/opencode$/),
      expect.stringMatching(/Shell$/)
    ]);
    expect(screen.getByTestId('terminal-panel-name-agent-opencode').textContent).toBe('opencode');
    const spawned = window.bridge.ptySpawn.mock.calls.map(([a]) => `${a.kind}:${a.harness ?? ''}`).sort();
    expect(spawned).toEqual(['agent:claude', 'agent:opencode', 'shell:']);
    expect(screen.getByTestId('terminal-panel-host-agent-opencode')).toBeTruthy(); // its own session and Restart
  });

  it('sends the quick command and type("agent") to the last agent tab used, and names it', async () => {
    ownIds();
    await renderPanel(both);
    expect(terminal.harness.id).toBe('claude'); // nothing used yet: the first tab
    fireEvent.click(screen.getByTestId('terminal-panel-tab-agent-opencode'));
    expect(terminal.harness.id).toBe('opencode');
    const select = screen.getByTestId('terminal-panel-quick-select');
    await act(async () => fireEvent.change(select, { target: { value: '/aidlc --status' } }));
    expect(window.bridge.ptyWrite).toHaveBeenLastCalledWith('pty-opencode', '/aidlc --status');
    expect(screen.getByTestId('terminal-panel-pending-agent-opencode')).toBeTruthy();

    await act(() => terminal.type('agent', '/aidlc continue', { submit: false }));
    expect(window.bridge.ptyWrite).toHaveBeenLastCalledWith('pty-opencode', '/aidlc continue');
    act(() => terminal.input('agent:claude')); // the person types in the Claude tab
    await act(() => terminal.type('agent', 'x'));
    expect(window.bridge.ptyWrite).toHaveBeenLastCalledWith('pty-claude', 'x');
  });

  it('US-0417: Hide / Show terminal is the last segment of the foot bar, a pill like Full screen; the elbow keeps only the mark', async () => {
    await renderPanel();
    const elbow = screen.getByTestId('terminal-panel-elbow');
    expect(elbow.querySelector('svg.terminal-elbow-mark')).toBeTruthy();
    expect(elbow.textContent).toBe(''); // the elbow lost its label
    expect(elbow.tagName).not.toBe('BUTTON');

    const foot = screen.getByTestId('terminal-panel-footbar');
    const toggle = screen.getByTestId('terminal-panel-toggle');
    expect(foot.lastElementChild).toBe(toggle);
    expect(toggle.className).toContain('lcars-pill');
    expect(toggle.textContent).toBe('Dölj terminal');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(toggle.getAttribute('aria-controls'))).toBeTruthy();

    fireEvent.click(toggle);
    // Hidden: one merged foot bar along the window's foot, the toggle still its last segment, focus kept on it.
    const panel = screen.getByRole('region', { name: 'Terminal' });
    expect(panel.className).toContain('is-collapsed');
    expect(screen.getAllByTestId('terminal-panel-footbar')).toHaveLength(1);
    const hidden = screen.getByTestId('terminal-panel-toggle');
    expect(screen.getByTestId('terminal-panel-footbar').lastElementChild).toBe(hidden);
    expect(hidden.textContent).toBe('Visa terminal');
    expect(hidden.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(hidden);
    expect(screen.queryByTestId('terminal-panel-elbow')).toBeNull();

    fireEvent.click(hidden);
    expect(panel.className).not.toContain('is-collapsed');
    expect(screen.getByTestId('terminal-panel-toggle').textContent).toBe('Dölj terminal');
  });

  it('anyBusy() is true when only the second tab is busy; two busy tabs show no notice (US-0019)', async () => {
    ownIds();
    await renderPanel(both);
    await waitFor(() => expect(terminal.busyAgents()).toBe(2)); // both just started
    expect(screen.queryByTestId('terminal-panel-two-agents')).toBeNull();
    expect(screen.queryByTestId('terminal-panel-foot')).toBeNull(); // the terminal keeps its height

    // Claude goes quiet after 1.5 s; opencode's 4 s quiet keeps it "Arbetar".
    await waitFor(() => expect(screen.getByTestId('terminal-panel-state-agent').textContent).toBe('Ledig'), { timeout: 3000 });
    expect(screen.getByTestId('terminal-panel-state-agent-opencode').textContent).toBe('Arbetar');
    expect(terminal.state('agent:claude')).toBe('idle');
    expect(terminal.anyBusy()).toBe(true);
  });
});
