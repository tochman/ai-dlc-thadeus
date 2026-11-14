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

  it('keeps the quick commands in one closed menu; a pick types into the agent tab without Enter and closes it (FR4.1)', async () => {
    await renderPanel({ harness: harness('opencode') });
    expect(screen.queryByTestId('terminal-panel-foot')).toBeNull(); // nothing pending: no row under the terminal
    const toggle = screen.getByTestId('terminal-panel-quick-menu');
    expect(toggle.textContent).toBe('/aidlc ▾');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByRole('menu')).toBeTruthy();
    const quick = screen.getAllByRole('menuitem');
    expect(quick).toEqual(screen.getAllByTestId('terminal-panel-quick-command'));
    expect(quick.map((b) => b.textContent)).toEqual(['/aidlc --status', '/aidlc --doctor', '/aidlc continue']);
    expect(quick[0].title).toBe('Skriver in kommandot i opencode-fliken utan att skicka det');
    expect(document.activeElement).toBe(quick[0]);
    fireEvent.keyDown(quick[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(quick[1]);
    fireEvent.keyDown(quick[1], { key: 'ArrowUp' });
    fireEvent.keyDown(quick[0], { key: 'ArrowUp' }); // wraps
    expect(document.activeElement).toBe(quick[2]);

    await act(async () => fireEvent.click(quick[1]));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '/aidlc --doctor');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByTestId('terminal-panel-pending-agent')).toBeTruthy(); // the foot row shows while it waits
  });

  it('closes the quick menu on Esc and on an outside click', async () => {
    await renderPanel();
    fireEvent.click(screen.getByTestId('terminal-panel-quick-menu'));
    fireEvent.keyDown(screen.getAllByRole('menuitem')[0], { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('terminal-panel-quick-menu'));

    fireEvent.click(screen.getByTestId('terminal-panel-quick-menu'));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('a harness without an AI-DLC command shows its commands disabled, with the reason, and types nothing', async () => {
    await renderPanel({ harness: { ...harness('claude'), commands: {} } });
    const toggle = screen.getByTestId('terminal-panel-quick-menu');
    expect(toggle.textContent).toBe('Snabbkommandon ▾');
    fireEvent.click(toggle);
    const [first] = screen.getAllByTestId('terminal-panel-quick-command');
    expect(first.disabled).toBe(true);
    expect(first.title).toBe('Claude har inget AI-DLC-kommando i appens tabell, så inget skrivs in.');
    fireEvent.click(first);
    expect(window.bridge.ptyWrite).not.toHaveBeenCalledWith('pty-agent', expect.anything());
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

  it('answer() writes to the agent tab without switching tabs, and throws when there is none', async () => {
    await renderPanel();
    act(() => terminal.setView({ open: true, active: 'shell' }));
    act(() => terminal.answer('2'));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-agent', '2');
    expect(terminal.view.active).toBe('shell');
    act(() => terminal.setAgent({ harness: null }));
    expect(() => terminal.answer('1')).toThrow();
  });
});
