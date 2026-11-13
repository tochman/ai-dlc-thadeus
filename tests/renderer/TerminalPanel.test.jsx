import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// xterm needs a real canvas and layout; this stand-in keeps what the panel uses and lets the test "type".
const keyboards = []; // onData listeners, one per terminal in mount order (shell, then the agent once its harness is known)
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80;
    rows = 24;
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
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }));
vi.mock('@xterm/xterm/css/xterm.css', () => ({}));
globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };

// Same calls as the preload bridge's pty API.
window.bridge = {
  ptySpawn: vi.fn(async ({ kind }) => `pty-${kind}`),
  ptyWrite: vi.fn(async () => {}),
  ptyKill: vi.fn(async () => {}),
  ptyResize: vi.fn(async () => {}),
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

  it('types the quick commands from the harness table into the agent tab without Enter (FR4.1)', async () => {
    await renderPanel({ harness: harness('opencode') });
    const quick = screen.getAllByTestId('terminal-panel-quick-command');
    expect(quick.map((b) => b.textContent)).toEqual(['/aidlc --status', '/aidlc --doctor', '/aidlc continue']);
    expect(quick[0].title).toBe('Skriver in kommandot i opencode-fliken utan att skicka det');

    await act(async () => fireEvent.click(quick[1]));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '/aidlc --doctor');
  });

  it('starts nothing and offers another harness when the chosen one cannot run (FR5.1)', async () => {
    const onChooseHarness = vi.fn();
    const problem = 'opencode hittades inte: kommandot opencode finns inte i PATH, så inget startades.';
    await renderPanel({ harness: harness('opencode'), problem }, { onChooseHarness });
    expect(screen.getByTestId('terminal-panel-harness-problem').textContent).toContain(problem);
    expect(window.bridge.ptySpawn.mock.calls.map(([a]) => a.kind)).toEqual(['shell']);

    fireEvent.click(screen.getByTestId('terminal-panel-choose-harness'));
    expect(onChooseHarness).toHaveBeenCalledTimes(1);
    expect(await act(() => terminal.type('agent', '/aidlc'))).toBe(false);
    expect(screen.getByTestId('terminal-panel-error').textContent).toBe(problem);
  });
});
