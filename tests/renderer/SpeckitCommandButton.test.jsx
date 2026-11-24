// US-1403 AC3.1.1, AC3.1.4, BR5.7, BR5.8, NFR4.4, NFR6.1, NFR7.4: one Spec Kit command button.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';

let terminal;
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: SpeckitCommandButton } = await import('../../src/renderer/SpeckitCommandButton.jsx');

const HARNESSES = { claude: { id: 'claude', name: 'Claude Code' }, opencode: { id: 'opencode', name: 'opencode' }, codex: { id: 'codex', name: 'Codex' } };
/** A terminal whose last agent tab runs `harness`, in `state`; the global `harness` field names another on purpose. */
const terminalWith = ({ harness = 'claude', state = 'idle', asking = false, type = vi.fn(async () => true) } = {}) => {
  const tab = `agent:${harness}`;
  return {
    lastAgent: tab,
    harness: HARNESSES.opencode,
    harnessOf: (k) => (k === tab ? (HARNESSES[harness] ?? null) : null),
    state: (k) => (k === tab ? state : 'idle'),
    asking: () => asking,
    show: vi.fn(),
    type
  };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const button = () => screen.getByTestId('speckit-commands-button');
const reason = () => screen.queryByTestId('speckit-commands-reason')?.textContent ?? null;

describe('SpeckitCommandButton: ready (BR5.7, AC3.1.1)', () => {
  it('shows the typed text and types it with Enter on a click, once; nothing on mount (NFR4.4)', async () => {
    terminal = terminalWith();
    render(<SpeckitCommandButton name="plan" />);
    expect(button().textContent).toBe('/speckit-plan');
    expect(button().disabled).toBe(false);
    expect(terminal.type).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(button()));
    expect(terminal.type).toHaveBeenCalledTimes(1);
    expect(terminal.type).toHaveBeenCalledWith('agent', '/speckit-plan', { submit: true });
  });

  it('takes the form, harness and state from the tab the command goes to (lastAgent)', () => {
    terminal = terminalWith({ harness: 'opencode' });
    terminal.harness = HARNESSES.claude;
    render(<SpeckitCommandButton name="plan" />);
    expect(button().textContent).toBe('/speckit.plan');
  });

  it('types one command for two clicks while the first is still being typed (NFR7.4)', async () => {
    let release;
    terminal = terminalWith({ type: vi.fn(() => new Promise((r) => (release = r))) });
    render(<SpeckitCommandButton name="plan" />);
    fireEvent.click(button());
    fireEvent.click(button());
    expect(terminal.type).toHaveBeenCalledTimes(1);
    await act(async () => release(true));
    expect(button().disabled).toBe(false);
  });
});

describe('SpeckitCommandButton: cannot run, and why (BR5.8, AC3.1.4, NFR6.1)', () => {
  it('is disabled with no agent tab', () => {
    terminal = null;
    render(<SpeckitCommandButton name="plan" />);
    expect(button().disabled).toBe(true);
    expect(reason()).toBe(t('speckit.commands.noTab'));
  });

  it('is disabled while the harness is not known yet', () => {
    terminal = terminalWith({ harness: 'unknown' });
    render(<SpeckitCommandButton name="plan" />);
    expect(button().disabled).toBe(true);
    expect(reason()).toBe(t('terminal.checking'));
  });

  it('is disabled for a harness Spec Kit commands are not typed for (codex)', () => {
    terminal = terminalWith({ harness: 'codex' });
    render(<SpeckitCommandButton name="plan" />);
    expect(button().disabled).toBe(true);
    expect(reason()).toBe(t('speckit.commands.unsupported', { harness: 'Codex' }));
  });

  it('is disabled while the agent works, or waits on a question', () => {
    terminal = terminalWith({ state: 'busy' });
    const first = render(<SpeckitCommandButton name="plan" />);
    expect(button().disabled).toBe(true);
    expect(reason()).toBe(t('intents.resume.busy', { harness: 'Claude Code' }));
    first.unmount();
    terminal = terminalWith({ asking: true });
    render(<SpeckitCommandButton name="plan" />);
    expect(button().disabled).toBe(true);
    expect(reason()).toBe(t('intents.resume.asking', { harness: 'Claude Code' }));
    fireEvent.click(button());
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it('renders nothing for a name that is not safe', () => {
    terminal = terminalWith();
    const { container } = render(<SpeckitCommandButton name="a;rm -rf" />);
    expect(container.textContent).toBe('');
  });
});

describe('SpeckitCommandButton: a failed send', () => {
  it('says the command was not typed when type resolves false or rejects, and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    terminal = terminalWith({ type: vi.fn(async () => false) });
    const onSent = vi.fn();
    const first = render(<SpeckitCommandButton name="plan" onSent={onSent} />);
    await act(async () => fireEvent.click(button()));
    expect(screen.getByTestId('speckit-commands-send-failed').textContent).toBe(t('speckit.commands.sendFailed'));
    expect(onSent).toHaveBeenCalledWith(false);
    first.unmount();
    terminal = terminalWith({ type: vi.fn(async () => Promise.reject(new Error('gone'))) });
    render(<SpeckitCommandButton name="plan" onSent={onSent} />);
    await act(async () => fireEvent.click(button()));
    await waitFor(() => expect(screen.getByTestId('speckit-commands-send-failed')).toBeTruthy());
    expect(warn).toHaveBeenCalledTimes(2);
    expect(button().disabled).toBe(false);
  });
});
