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
  delete terminal.running;
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

describe('ResumeButton while an agent session runs the work (EPIC-00 US-0007)', () => {
  const RUNNING = 'Claude kör workflow-control — fortsätt i terminalen';
  const active = (status) => ({ ...intent, status });
  const button = () => screen.getByTestId('intent-resume');

  it('a quiet but alive agent tab with the active intent in flight disables it, with the reason, and types nothing', () => {
    terminal.running = vi.fn(() => true); // idle: waiting on a subagent or between steps
    render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active('in-flight')} position={position} />);
    expect(button().disabled).toBe(true);
    expect(button().title).toBe(RUNNING);
    fireEvent.click(button());
    expect(terminal.type).not.toHaveBeenCalled();
    expect(terminal.sequence).not.toHaveBeenCalled();
  });

  it("another intent's button waits too while the active one is in flight", () => {
    terminal.running = vi.fn(() => true);
    render(<ResumeButton intent={{ ...intent, dirName: '261112-other', active: false }} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(button().disabled).toBe(true);
    expect(button().title).toBe(RUNNING);
  });

  it('is enabled again when the agent tab has exited, or the active intent is parked or complete', () => {
    terminal.running = vi.fn(() => false); // exited
    const { rerender } = render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(button().disabled).toBe(false);

    terminal.running = vi.fn(() => true);
    for (const status of ['parked', 'complete']) {
      const other = { ...intent, dirName: '261112-other', active: false };
      rerender(<ResumeButton intent={other} activeDirName={intent.dirName} activeIntent={active(status)} />);
      expect(button().disabled, status).toBe(false);
      expect(button().title, status).toBe('');
    }
  });

  it('busy and asking keep their own reasons ahead of it', () => {
    terminal.running = vi.fn(() => true);
    terminal.anyBusy = vi.fn(() => true);
    const { rerender } = render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(button().title).toBe(BUSY_MESSAGE);
    terminal.anyBusy = vi.fn(() => false);
    terminal.asking = vi.fn(() => true);
    rerender(<ResumeButton intent={{ ...intent }} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(button().title).toBe('Claude väntar på ditt svar — svara i terminalen först');
  });
});

describe('ResumeButton while an agent outside the app runs the work (EPIC-00 US-0009)', () => {
  const ELSEWHERE = 'En agent utanför appen arbetar med workflow-control — fortsätt där';
  const button = () => screen.getByTestId('intent-resume');

  it('a recent audit write on the in-flight active intent disables it, with the reason, and types nothing', () => {
    const active = { ...intent, activityAt: Date.now() - 60_000 };
    render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active} position={position} />);
    expect(button().disabled).toBe(true);
    expect(button().title).toBe(ELSEWHERE);
    fireEvent.click(button());
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it('is enabled when the log has been quiet for over 10 minutes, or the intent is not in flight', () => {
    const quiet = { ...intent, activityAt: Date.now() - 11 * 60_000 };
    const { rerender } = render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={quiet} />);
    expect(button().disabled).toBe(false);
    rerender(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={{ ...intent, status: 'parked', activityAt: Date.now() }} />);
    expect(button().disabled).toBe(false);
  });
});
