// US-0210 US1.2, US1.3: the LCARS question and the switch result (AC1.2.1–AC1.2.3, AC1.2.5, AC1.3.2, FR4.2, FR4.3, NFR4).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfileSwitchDialog from '../../src/renderer/ProfileSwitchDialog.jsx';

const OK = {
  ok: true,
  active: 'critical',
  results: [
    { ok: true, command: 'aidlc config models --from strong --harness claude --project --yes', output: 'loaded strong' },
    { ok: true, command: 'aidlc config models --agent developer --model opus --harness claude --project --yes', output: 'pinned developer' }
  ]
};
const FAILED = {
  ok: false,
  results: [OK.results[0], { ok: false, command: 'aidlc config models --agent developer --model opus --harness claude --project --yes', error: 'refused' }]
};

let confirm;
beforeEach(() => {
  confirm = vi.spyOn(window, 'confirm').mockImplementation(() => true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ask = (over) => ({ projectId: 'p1', kind: 'critical', intent: '261117-big', confirm: true, ...over });

describe('ProfileSwitchDialog (US-0210)', () => {
  it('asks in a native dialog, and Yes shows each command with its output (AC1.2.1, AC1.2.2, FR4.2, NFR4)', async () => {
    const answer = vi.fn(async () => OK);
    render(<ProfileSwitchDialog ask={ask()} answer={answer} onClose={vi.fn()} />);
    const dialog = screen.getByTestId('profile-switch-dialog');
    expect(dialog.tagName).toBe('DIALOG');
    expect(screen.getByTestId('profile-switch-question').textContent).toContain('261117-big');
    fireEvent.click(screen.getByTestId('profile-switch-yes'));
    await screen.findByTestId('profile-switch-results');
    expect(answer).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('profile-switch-results').textContent).toContain('--from strong');
    expect(screen.getByTestId('profile-switch-results').textContent).toContain('pinned developer');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('No answers no and closes (AC1.2.3)', async () => {
    const answer = vi.fn(async () => ({ ok: true, results: [], skipped: true }));
    const onClose = vi.fn();
    render(<ProfileSwitchDialog ask={ask()} answer={answer} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('profile-switch-no'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(answer).toHaveBeenCalledWith(false);
  });

  it('shows the failing command and its message (AC1.2.5, FR4.3), and a harness that cannot switch (FR5.2)', async () => {
    render(<ProfileSwitchDialog ask={ask()} answer={vi.fn(async () => FAILED)} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('profile-switch-yes'));
    expect((await screen.findByRole('alert')).textContent).toBeTruthy();
    expect(screen.getByTestId('profile-switch-results').textContent).toContain('refused');
    cleanup();
    render(
      <ProfileSwitchDialog ask={ask()} answer={vi.fn(async () => ({ ok: false, results: [], error: 'Kiro har ingen modelltabell' }))} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('profile-switch-yes'));
    expect((await screen.findByRole('alert')).textContent).toContain('Kiro har ingen modelltabell');
  });

  it('asks before switching back when that is on (AC1.3.2), and switches back at once when it is off (FR3.1)', async () => {
    const answer = vi.fn(async () => ({ ...OK, active: 'economy' }));
    render(<ProfileSwitchDialog ask={ask({ kind: 'back', intent: null })} answer={answer} onClose={vi.fn()} />);
    expect(screen.getByTestId('profile-switch-question').textContent).toBeTruthy();
    expect(answer).not.toHaveBeenCalled();
    cleanup();
    render(<ProfileSwitchDialog ask={ask({ kind: 'back', intent: null, confirm: false })} answer={answer} onClose={vi.fn()} />);
    await screen.findByTestId('profile-switch-results');
    expect(answer).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('profile-switch-yes')).toBeNull();
  });
});
