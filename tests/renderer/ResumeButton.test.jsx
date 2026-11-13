import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const terminal = { state: vi.fn(() => 'idle'), type: vi.fn(), sequence: vi.fn() };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: ResumeButton, BUSY_MESSAGE } = await import('../../src/renderer/ResumeButton.jsx');

// Same shape as an intent row from loadIntentList.
const intent = { dirName: '261113-workflow-control', slug: 'workflow-control', status: 'in-flight', active: true };
const position = { stage: 'Code Generation', step: 3, total: 7 };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  terminal.state.mockImplementation(() => 'idle');
});

describe('ResumeButton', () => {
  it('types /aidlc without Enter for the active intent and shows where it picks up (FR2.2, FR2.5, FR2.6)', () => {
    render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" position={position} />);
    const button = screen.getByTestId('intent-resume');
    expect(button.textContent).toBe('Fortsätt vid Code Generation (steg 3 av 7)');
    expect(button.tagName).toBe('BUTTON'); // focusable and keyboard-operable as a native button

    fireEvent.click(button);
    expect(terminal.type).toHaveBeenCalledWith('claude', '/aidlc', { submit: false });
    expect(terminal.sequence).not.toHaveBeenCalled();
  });

  it('switches first for another intent: the switch is submitted, /aidlc is not (FR2.3)', () => {
    render(<ResumeButton intent={{ ...intent, active: false }} activeDirName="261112-other" />);
    expect(screen.getByTestId('intent-resume').textContent).toBe('Fortsätt');

    fireEvent.click(screen.getByTestId('intent-resume'));
    expect(terminal.sequence).toHaveBeenCalledWith('claude', [
      { text: '/aidlc intent 261113-workflow-control', submit: true },
      { text: '/aidlc', submit: false }
    ]);
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it('types nothing while Claude is busy, says so as text, and shows no button for complete (FR2.4, FR2.1)', () => {
    terminal.state.mockImplementation(() => 'busy');
    const { rerender } = render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    fireEvent.click(screen.getByTestId('intent-resume'));
    expect(terminal.type).not.toHaveBeenCalled();
    expect(terminal.sequence).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe(BUSY_MESSAGE);

    rerender(<ResumeButton intent={{ ...intent, status: 'complete' }} activeDirName="261113-workflow-control" />);
    expect(screen.queryByTestId('intent-resume')).toBeNull();
  });
});
