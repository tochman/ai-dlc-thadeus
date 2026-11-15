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

  it('shows a quick command the harness lacks as a disabled option, with the reason', async () => {
    missingSuffix = ' continue';
    try {
      await renderPanel();
      const last = screen.getAllByTestId('terminal-panel-quick-command')[2];
      expect(last.disabled).toBe(true);
      expect(last.textContent).toBe('continue');
      expect(last.title).toBe('Claude har inget AI-DLC-kommando i appens tabell, så inget skrivs in.');
    } finally {
      missingSuffix = null;
    }
  });

  it('hides the quick commands on the shell tab, when collapsed and for a harness without commands', async () => {
    await renderPanel();
    expect(screen.getByTestId('terminal-panel-toggle').querySelector('svg.terminal-elbow-mark')).toBeTruthy();
    fireEvent.click(screen.getByTestId('terminal-panel-tab-shell'));
    expect(screen.queryByTestId('terminal-panel-quick-select')).toBeNull();
    fireEvent.click(screen.getByTestId('terminal-panel-tab-agent'));
    expect(screen.getByTestId('terminal-panel-quick-select')).toBeTruthy();
    fireEvent.click(screen.getByTestId('terminal-panel-toggle'));
    expect(screen.queryByTestId('terminal-panel-quick-select')).toBeNull();
    cleanup();

    await renderPanel({ harness: { ...harness('claude'), commands: {} } });
    expect(screen.queryByTestId('terminal-panel-quick-select')).toBeNull();
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
