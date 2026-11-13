import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

// xterm needs a real canvas and layout; this stand-in keeps what the panel uses and lets the test "type".
const keyboards = []; // onData listeners, one per terminal in mount order (claude, then shell)
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

let terminal;
function Grab() {
  terminal = useTerminal();
  return null;
}

async function renderPanel() {
  keyboards.length = 0;
  render(
    <TerminalProvider>
      <Grab />
      <TerminalPanel projectId="p1" visible />
    </TerminalProvider>
  );
  // Both sessions spawn and count as busy until their first quiet period.
  await waitFor(() => expect(screen.getByTestId('terminal-panel-state-claude').textContent).toBe('Arbetar'));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TerminalPanel', () => {
  it('shows "Väntar på din Enter" after text typed without Enter, until the person types in that tab (FR3.6)', async () => {
    await renderPanel();
    expect(screen.queryByTestId('terminal-panel-pending-claude')).toBeNull();

    await act(() => terminal.type('claude', '/aidlc', { submit: false }));
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-claude', '/aidlc'); // no Enter
    expect(screen.getByTestId('terminal-panel-pending-claude').textContent).toBe('Väntar på din Enter');
    expect(screen.queryByTestId('terminal-panel-pending-shell')).toBeNull();

    act(() => keyboards[1]('x')); // typing in the shell tab leaves the claude label
    expect(screen.getByTestId('terminal-panel-pending-claude')).toBeTruthy();
    act(() => keyboards[0]('\r')); // the person's Enter in the claude tab
    expect(screen.queryByTestId('terminal-panel-pending-claude')).toBeNull();

    await act(() => terminal.type('shell', 'git status', { submit: true })); // submitted: nothing waits
    expect(window.bridge.ptyWrite).toHaveBeenCalledWith('pty-shell', 'git status\r');
    expect(screen.queryByTestId('terminal-panel-pending-shell')).toBeNull();
  });
});
