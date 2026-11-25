import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HARNESSES } from '../../src/shared/harnesses.js';

const CLAUDE = HARNESSES.find((h) => h.id === 'claude');
const terminal = { state: vi.fn(() => 'idle'), type: vi.fn(), sequence: vi.fn(), harness: CLAUDE };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
// US-0513: the real shared rule; `seen` records what it is asked.
const sharedRule = vi.hoisted(() => ({ seen: [] }));
vi.mock('../../src/shared/intentArchive.js', async (importOriginal) => {
  const real = await importOriginal();
  sharedRule.ELSEWHERE_MS = real.ELSEWHERE_MS;
  return { ...real, workBlock: (seen) => (sharedRule.seen.push(seen), real.workBlock(seen)) };
});
const { default: ResumeButton, ELSEWHERE_MS } = await import('../../src/renderer/ResumeButton.jsx');
const BUSY_MESSAGE = 'Claude arbetar — vänta eller avbryt först'; // sv.json intents.resume.busy with {harness} (EPIC-07, US-0801)

// Same shape as an intent row from loadIntentList.
const intent = { dirName: '261113-workflow-control', slug: 'workflow-control', status: 'in-flight', active: true };
const position = { stage: 'Code Generation', step: 3, total: 7 };

// US-0414 FR2.4: an unavailable Resume stays focusable (aria-disabled, not disabled) and its tooltip gives the reason.
const unavailable = (b) => b.getAttribute('aria-disabled') === 'true';
function tip(b) {
  fireEvent.focus(b);
  const text = screen.queryByRole('tooltip')?.textContent ?? '';
  fireEvent.blur(b);
  return text;
}

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
    expect(button.textContent).toBe('Fortsätt vid Code Generation'); // US-0037 FR3.4: the step shows in the progress row only
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

  it('is unavailable with the reason while the agent works, available again when idle, and absent when complete (FR2.4, FR2.1)', () => {
    terminal.state.mockImplementation(() => 'busy');
    const { rerender } = render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    const button = screen.getByTestId('intent-resume');
    expect(unavailable(button)).toBe(true);
    expect(tip(button)).toBe(BUSY_MESSAGE);
    fireEvent.click(button);
    expect(terminal.type).not.toHaveBeenCalled();
    expect(terminal.sequence).not.toHaveBeenCalled();

    terminal.state.mockImplementation(() => 'idle');
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(unavailable(screen.getByTestId('intent-resume'))).toBe(false);
    expect(tip(screen.getByTestId('intent-resume'))).toBe('');

    rerender(<ResumeButton intent={{ ...intent, status: 'complete' }} activeDirName="261113-workflow-control" />);
    expect(screen.queryByTestId('intent-resume')).toBeNull();
  });

  it('stays focusable while unavailable, shows the reason on focus, and a click does nothing (US-0414 FR2.4)', () => {
    terminal.state.mockImplementation(() => 'busy');
    render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    const button = screen.getByTestId('intent-resume');
    expect(button.disabled).toBe(false);
    act(() => button.focus());
    expect(document.activeElement).toBe(button);
    expect(screen.getByRole('tooltip').textContent).toBe(BUSY_MESSAGE);
    expect(button.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    fireEvent.click(button);
    expect(terminal.type).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('is unavailable with a reason when the harness table lacks the AI-DLC command, and types nothing (US-0801 FR4.2)', () => {
    terminal.harness = HARNESSES.find((h) => h.id === 'codex'); // a table entry without commands
    const { rerender } = render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    const button = screen.getByTestId('intent-resume');
    expect(unavailable(button)).toBe(true);
    expect(tip(button)).toBe('Codex har inget AI-DLC-kommando i appens tabell, så inget skrivs in.');
    fireEvent.click(button);
    expect(terminal.type).not.toHaveBeenCalled();

    terminal.harness = null; // detection still runs
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(tip(screen.getByTestId('intent-resume'))).toBe('Kontrollerar…');
  });

  it('stays unavailable while the work already runs: another agent tab works, or an agent waits on an answer (EPIC-00 US-0005)', () => {
    terminal.anyBusy = vi.fn(() => true); // the last-used tab is idle, but another agent tab works
    const { rerender } = render(<ResumeButton intent={intent} activeDirName="261113-workflow-control" />);
    expect(unavailable(screen.getByTestId('intent-resume'))).toBe(true);
    expect(tip(screen.getByTestId('intent-resume'))).toBe(BUSY_MESSAGE);

    terminal.anyBusy = vi.fn(() => false);
    terminal.asking = vi.fn(() => true); // idle at a question it asked: still working on it
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(unavailable(screen.getByTestId('intent-resume'))).toBe(true);
    expect(tip(screen.getByTestId('intent-resume'))).toBe('Claude väntar på ditt svar — svara i terminalen först');
    fireEvent.click(screen.getByTestId('intent-resume'));
    expect(terminal.type).not.toHaveBeenCalled();

    terminal.asking = vi.fn(() => false);
    rerender(<ResumeButton intent={{ ...intent }} activeDirName="261113-workflow-control" />);
    expect(unavailable(screen.getByTestId('intent-resume'))).toBe(false);
  });
});

describe('ResumeButton while an agent session runs the work (EPIC-00 US-0007)', () => {
  const RUNNING = 'Claude kör workflow-control — fortsätt i terminalen';
  const active = (status) => ({ ...intent, status });
  const button = () => screen.getByTestId('intent-resume');

  it('a quiet but alive agent tab with the active intent in flight makes it unavailable, with the reason, and types nothing', () => {
    terminal.running = vi.fn(() => true); // idle: waiting on a subagent or between steps
    render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active('in-flight')} position={position} />);
    expect(unavailable(button())).toBe(true);
    expect(tip(button())).toBe(RUNNING);
    fireEvent.click(button());
    expect(terminal.type).not.toHaveBeenCalled();
    expect(terminal.sequence).not.toHaveBeenCalled();
  });

  it("another intent's button waits too while the active one is in flight", () => {
    terminal.running = vi.fn(() => true);
    render(<ResumeButton intent={{ ...intent, dirName: '261112-other', active: false }} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(unavailable(button())).toBe(true);
    expect(tip(button())).toBe(RUNNING);
  });

  it('is available again when the agent tab has exited, or the active intent is parked or complete', () => {
    terminal.running = vi.fn(() => false); // exited
    const { rerender } = render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(unavailable(button())).toBe(false);

    terminal.running = vi.fn(() => true);
    for (const status of ['parked', 'complete']) {
      const other = { ...intent, dirName: '261112-other', active: false };
      rerender(<ResumeButton intent={other} activeDirName={intent.dirName} activeIntent={active(status)} />);
      expect(unavailable(button()), status).toBe(false);
      expect(tip(button()), status).toBe('');
    }
  });

  it('busy and asking keep their own reasons ahead of it', () => {
    terminal.running = vi.fn(() => true);
    terminal.anyBusy = vi.fn(() => true);
    const { rerender } = render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(tip(button())).toBe(BUSY_MESSAGE);
    terminal.anyBusy = vi.fn(() => false);
    terminal.asking = vi.fn(() => true);
    rerender(<ResumeButton intent={{ ...intent }} activeDirName={intent.dirName} activeIntent={active('in-flight')} />);
    expect(tip(button())).toBe('Claude väntar på ditt svar — svara i terminalen först');
  });
});

describe('ResumeButton while an agent outside the app runs the work (EPIC-00 US-0009)', () => {
  const ELSEWHERE = 'En agent utanför appen arbetar med workflow-control — fortsätt där';
  const button = () => screen.getByTestId('intent-resume');

  it('a recent audit write on the in-flight active intent makes it unavailable, with the reason, and types nothing', () => {
    const active = { ...intent, activityAt: Date.now() - 60_000 };
    render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={active} position={position} />);
    expect(unavailable(button())).toBe(true);
    expect(tip(button())).toBe(ELSEWHERE);
    fireEvent.click(button());
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it('uses the rule it shares with Archive, with its limit (US-0513 FR1.4)', () => {
    expect(sharedRule.ELSEWHERE_MS).toBe(ELSEWHERE_MS);
    const spy = vi.spyOn(sharedRule.seen, 'push');
    terminal.running = vi.fn(() => true);
    render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={intent} />);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ busy: false, asking: false, running: true, activeIntent: intent }));
  });

  it('is absent on an archived intent (US-0513 AC2.1.1)', () => {
    render(<ResumeButton intent={{ ...intent, status: 'archived', active: false }} activeDirName={null} />);
    expect(screen.queryByTestId('intent-resume')).toBeNull();
  });

  it('is available when the log has been quiet for over 10 minutes, or the intent is not in flight', () => {
    const quiet = { ...intent, activityAt: Date.now() - 11 * 60_000 };
    const { rerender } = render(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={quiet} />);
    expect(unavailable(button())).toBe(false);
    rerender(<ResumeButton intent={intent} activeDirName={intent.dirName} activeIntent={{ ...intent, status: 'parked', activityAt: Date.now() }} />);
    expect(unavailable(button())).toBe(false);
  });
});

describe('ResumeButton on a parked intent (US-0510)', () => {
  // Just parked: its audit was written a moment ago, which must not read as an agent working elsewhere.
  const parked = { ...intent, parked: true, parkedStage: 'code-generation', activityAt: Date.now() };
  afterEach(() => delete window.bridge);

  it('unparks first and types /aidlc only after it succeeds (AC4.1.4)', async () => {
    window.bridge = { unparkIntent: vi.fn(async () => ({ ok: true, switched: true })) };
    const other = { ...parked, dirName: '261112-other' };
    render(<ResumeButton projectId="p1" intent={{ ...parked, active: false }} activeDirName="261112-other" activeIntent={other} />);
    expect(unavailable(screen.getByTestId('intent-resume'))).toBe(false);
    fireEvent.click(screen.getByTestId('intent-resume'));
    expect(window.bridge.unparkIntent).toHaveBeenCalledWith('p1', '261113-workflow-control');
    expect(terminal.type).not.toHaveBeenCalled();
    await waitFor(() => expect(terminal.type).toHaveBeenCalledWith('agent', '/aidlc', { submit: false }));
    expect(terminal.sequence).not.toHaveBeenCalled(); // the unpark already made it the active intent
  });

  it('says it unparks: "Avparkera och fortsätt vid <stage>", from the position or else the parked stage (US-0037 FR3.2)', () => {
    const { rerender } = render(<ResumeButton projectId="p1" intent={parked} activeDirName={parked.dirName} activeIntent={parked} position={position} />);
    expect(screen.getByTestId('intent-resume').textContent).toBe('Avparkera och fortsätt vid Code Generation');
    rerender(<ResumeButton projectId="p1" intent={{ ...parked, parkedStage: 'functional-design' }} activeDirName={parked.dirName} activeIntent={parked} />);
    expect(screen.getByTestId('intent-resume').textContent).toBe('Avparkera och fortsätt vid Functional Design');
    rerender(<ResumeButton projectId="p1" intent={{ ...parked, parkedStage: null }} activeDirName={parked.dirName} activeIntent={parked} />);
    expect(screen.getByTestId('intent-resume').textContent).toBe('Avparkera och fortsätt');
  });

  it('types nothing and shows the reason when the unpark fails (AC4.1.5)', async () => {
    window.bridge = { unparkIntent: vi.fn(async () => ({ ok: false, error: 'Refused: in the middle of a stage', switched: false })) };
    render(<ResumeButton projectId="p1" intent={parked} activeDirName={parked.dirName} activeIntent={parked} />);
    fireEvent.click(screen.getByTestId('intent-resume'));
    expect((await screen.findByRole('status')).textContent).toBe('Refused: in the middle of a stage');
    expect(terminal.type).not.toHaveBeenCalled();
    expect(terminal.sequence).not.toHaveBeenCalled();
  });
});
