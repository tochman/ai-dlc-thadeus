import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AidlcUpdate from '../../src/renderer/AidlcUpdate.jsx';

// US-0041 AC4: sv.json github.waitFor names the in-flight intent and its stage.
const FLIGHT = { name: 'release-0-2-14', stage: 'code-generation', at: null };
const WAIT_MESSAGE = 'Vänta tills AI-DLC är klart med Code Generation i release-0-2-14, eller parkera arbetet först';

// The shapes aidlc:updateStatus and aidlc:projectPlans return (US-0504).
const NEWER = { version: 'aidlc 2.11.3 (runtime 2.11.3)', status: 'newer', latest: '2.11.4', reason: null, command: 'aidlc update' };
const OFFLINE = { version: 'aidlc 2.11.3', status: 'unavailable', latest: null, reason: 'update check unavailable while offline', command: 'aidlc update' };
const PLANS = [
  {
    harness: 'claude',
    label: 'Claude Code',
    command: 'aidlc config --harness claude --yes',
    counts: { create: 1, update: 2, merge: 0, preserve: 361, remove: 0, conflict: 1 },
    files: [
      { path: '.claude/skills/aidlc/SKILL.md', action: 'update' },
      { path: '.claude/tools/aidlc-orchestrate.ts', action: 'update' },
      { path: '.claude/knowledge/new.md', action: 'create' }
    ],
    conflicts: ['.claude/CLAUDE.md']
  },
  {
    harness: 'opencode',
    label: 'opencode',
    command: 'aidlc config --harness opencode --yes',
    counts: { create: 0, update: 0, merge: 0, preserve: 376, remove: 0, conflict: 0 },
    files: [],
    conflicts: []
  }
];

let terminal;
beforeEach(() => {
  terminal = { type: vi.fn(async () => true), anyBusy: vi.fn(() => false) };
  window.bridge = { getAidlcUpdateStatus: vi.fn(async () => NEWER), getAidlcProjectPlans: vi.fn(async () => PLANS) };
});
afterEach(() => cleanup());

const show = (props = {}) => render(<AidlcUpdate projectId="p1" terminal={terminal} lastIntentChangeAt={null} {...props} />);

describe('AidlcUpdate', () => {
  it('shows the program version and the newer release; Update AI-DLC types `aidlc update` without Enter (FR1)', async () => {
    show();
    const row = screen.getByTestId('aidlc-update-program');
    await within(row).findByText('aidlc 2.11.3 (runtime 2.11.3)');
    expect(within(row).getByTestId('aidlc-update-program-status').textContent).toBe('Nyare finns: v2.11.4');
    expect(window.bridge.getAidlcUpdateStatus).toHaveBeenCalledWith(false); // the start-up result, not a new check
    fireEvent.click(within(row).getByTestId('aidlc-update-program-update'));
    expect(terminal.type).toHaveBeenCalledWith('shell', 'aidlc update', { submit: false });
  });

  it('lists each harness with counts, unfolds its files, warns on a conflict and types its own command (FR2)', async () => {
    show();
    const claude = await screen.findByTestId('aidlc-update-plan-claude');
    expect(window.bridge.getAidlcProjectPlans).toHaveBeenCalledWith('p1');
    expect(within(claude).getByTestId('aidlc-update-plan-counts').textContent).toBe('1 nya, 2 ändrade, 0 sammanfogade, 0 borttagna');
    expect(within(claude).getByRole('alert').textContent).toMatch('.claude/CLAUDE.md');
    expect(within(claude).queryByText('.claude/knowledge/new.md')).toBeNull();
    fireEvent.click(within(claude).getByTestId('aidlc-update-plan-files'));
    expect(within(claude).getByText('.claude/knowledge/new.md')).toBeTruthy();
    expect(within(screen.getByTestId('aidlc-update-plan-opencode')).getByTestId('aidlc-update-plan-counts').textContent).toBe('Aktuell');
    fireEvent.click(within(claude).getByTestId('aidlc-update-plan-update'));
    expect(terminal.type).toHaveBeenCalledWith('shell', 'aidlc config --harness claude --yes', { submit: false });
  });

  it('asks again with force on "Check for updates", and shows why a check is unavailable (FR3, FR5)', async () => {
    show();
    await screen.findByTestId('aidlc-update-plan-claude');
    window.bridge.getAidlcUpdateStatus.mockResolvedValueOnce(OFFLINE);
    fireEvent.click(screen.getByTestId('aidlc-update-check'));
    await waitFor(() => expect(screen.getByTestId('aidlc-update-program-status').textContent).toBe('update check unavailable while offline'));
    expect(window.bridge.getAidlcUpdateStatus).toHaveBeenLastCalledWith(true);
    expect(window.bridge.getAidlcProjectPlans).toHaveBeenCalledTimes(2);
  });

  it('shows a failed bridge call as a reason and never throws (FR5)', async () => {
    window.bridge.getAidlcUpdateStatus.mockRejectedValueOnce(new Error("Error invoking remote method 'aidlc:updateStatus': Error: boom"));
    window.bridge.getAidlcProjectPlans.mockRejectedValueOnce(new Error('no project'));
    show();
    await waitFor(() => expect(screen.getByTestId('aidlc-update-program-status').textContent).toBe('boom'));
    expect(await screen.findByText(/no project/)).toBeTruthy();
  });

  it('disables both update buttons while a workflow runs, and hides the project row with no project (FR4, assumption 1)', async () => {
    terminal.anyBusy.mockReturnValue(true);
    const { unmount } = show({ lastIntentChangeAt: FLIGHT });
    await screen.findByTestId('aidlc-update-plan-claude');
    expect(screen.getByTestId('aidlc-update-program-update').disabled).toBe(true);
    expect(within(screen.getByTestId('aidlc-update-plan-claude')).getByTestId('aidlc-update-plan-update').disabled).toBe(true);
    expect(screen.getAllByText(WAIT_MESSAGE).length).toBeGreaterThan(0);
    unmount();

    terminal.anyBusy.mockReturnValue(false);
    show({ lastIntentChangeAt: { ...FLIGHT, at: Date.now() - 30 * 1000 } }); // a stage write half a minute ago
    await screen.findByTestId('aidlc-update-plan-claude');
    expect(screen.getByTestId('aidlc-update-program-update').disabled).toBe(true);
    cleanup();

    show({ projectId: null, terminal: null });
    await screen.findByText('aidlc 2.11.3 (runtime 2.11.3)');
    expect(screen.queryByTestId('aidlc-update-project')).toBeNull();
    expect(window.bridge.getAidlcProjectPlans).toHaveBeenCalledTimes(2); // only the two renders with a project
    expect(screen.getByTestId('aidlc-update-program-update').disabled).toBe(true); // no shell tab to type into
  });

  it('keeps the buttons enabled and shows no notice while the active intent is complete or parked, even with a busy tab (US-0041 AC1)', async () => {
    terminal.anyBusy.mockReturnValue(true);
    show({ lastIntentChangeAt: null }); // useProject gives null for a complete or parked active intent
    await screen.findByTestId('aidlc-update-plan-claude');
    expect(screen.getByTestId('aidlc-update-program-update').disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
