import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HARNESSES } from '../../src/shared/harnesses.js';

const CLAUDE = HARNESSES.find((h) => h.id === 'claude');
const terminal = { state: vi.fn(() => 'idle'), type: vi.fn(), sequence: vi.fn(), harness: CLAUDE };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: ResumeButton } = await import('../../src/renderer/ResumeButton.jsx');
const BUSY_MESSAGE = 'Claude arbetar — vänta eller avbryt först'; // sv.json intents.resume.busy with {harness} (EPIC-07, US-0801)

// Same shape as an intent row from loadIntentList.
const intent = { dirName: '261113-workflow-control', slug: 'workflow-control', status: 'in-flight', active: true };
const position = { stage: 'Code Generation', step: 3, total: 7 };

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  terminal.state.mockImplementation(() => 'idle');
  terminal.harness = CLAUDE;
  delete terminal.anyBusy;
  delete terminal.asking;
});

describe('ResumeButton', () => {
  it('types /aidlc without Enter for the active intent and shows where it picks up (FR2.2, FR2.5, FR2.6)', () => {
    render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" position={position} />);
    const button = screen.getByTestId('intent-resume');
    expect(button.textContent).toBe('Fortsätt vid Code Generation (steg 3 av 7)');
    expect(button.tagName).toBe('BUTTON'); // focusable and keyboard-operable as a native button

    fireEvent.click(button);
    expect(terminal.type).toHaveBeenCalledWith('agent', '/aidlc', { submit: false });
    expect(terminal.sequence).not.toHaveBeenCalled();
  });

  it('switches first for another intent: the switch is submitted, /aidlc is not (FR2.3)', () => {
    render(<ResumeButton intent={{ ...intent, active: false }} activeDirName="261112-other" />);
    expect(screen.getByTestId('intent-resume').textContent).toBe('Fortsätt');

    fireEvent.click(screen.getByTestId('intent-resume'));
    expect(terminal.sequence).toHaveBeenCalledWith('agent', [
      { text: '/aidlc intent 261113-workflow-control', submit: true },
      { text: '/aidlc', submit: false }
    ]);
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it('is disabled with the reason while the agent works, enabled again when idle, and absent when complete (FR2.4, FR2.1)', () => {
    terminal.state.mockImplementation(() => 'busy');
    const { rerender } = render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    const button = screen.getByTestId('intent-resume');
    expect(button.disabled).toBe(true);
    expect(button.title).toBe(BUSY_MESSAGE);
    fireEvent.click(button);
    expect(terminal.type).not.toHaveBeenCalled();
    expect(terminal.sequence).not.toHaveBeenCalled();

    terminal.state.mockImplementation(() => 'idle');
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(screen.getByTestId('intent-resume').disabled).toBe(false);
    expect(screen.getByTestId('intent-resume').title).toBe('');

    rerender(<ResumeButton intent={{ ...intent, status: 'complete' }} activeDirName="261113-workflow-control" />);
    expect(screen.queryByTestId('intent-resume')).toBeNull();
  });

  it('is disabled with a reason when the harness table lacks the AI-DLC command, and types nothing (US-0801 FR4.2)', () => {
    terminal.harness = HARNESSES.find((h) => h.id === 'codex'); // a table entry without commands
    const { rerender } = render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    const button = screen.getByTestId('intent-resume');
    expect(button.disabled).toBe(true);
    expect(button.title).toBe('Codex har inget AI-DLC-kommando i appens tabell, så inget skrivs in.');
    fireEvent.click(button);
    expect(terminal.type).not.toHaveBeenCalled();

    terminal.harness = null; // detection still runs
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(screen.getByTestId('intent-resume').title).toBe('Kontrollerar…');
  });

  it('stays disabled while the work already runs: another agent tab works, or an agent waits on an answer (EPIC-00 US-0005)', () => {
    terminal.anyBusy = vi.fn(() => true); // the last-used tab is idle, but another agent tab works
    const { rerender } = render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    expect(screen.getByTestId('intent-resume').disabled).toBe(true);
    expect(screen.getByTestId('intent-resume').title).toBe(BUSY_MESSAGE);

    terminal.anyBusy = vi.fn(() => false);
    terminal.asking = vi.fn(() => true); // idle at a question it asked: still working on it
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(screen.getByTestId('intent-resume').disabled).toBe(true);
    expect(screen.getByTestId('intent-resume').title).toBe('Claude väntar på ditt svar — svara i terminalen först');
    fireEvent.click(screen.getByTestId('intent-resume'));
    expect(terminal.type).not.toHaveBeenCalled();

    terminal.asking = vi.fn(() => false);
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(screen.getByTestId('intent-resume').disabled).toBe(false);
  });
});
