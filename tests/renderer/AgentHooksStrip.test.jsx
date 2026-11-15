// US-0506 u4 LC35, M7: the fallback notice per used harness whose hooks are not current, in the Swedish locale
// (BR7.15, BR7.20, RD39, PD31, AC4.1.1).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgentHooksStrip from '../../src/renderer/AgentHooksStrip.jsx';

const claude = (status, files, used = true) => ({ harness: 'claude', used, status, files });
const opencode = (status, used = false) => ({ harness: 'opencode', used, status, files: [{ path: '.opencode/plugins/thadeus-dialog.js', status }] });
const missingFiles = [
  { path: '.claude/settings.json', status: 'missing' },
  { path: '.thadeus/hooks/dialog.sh', status: 'missing' }
];

let bridge, changed, onDetails;
function setup(status) {
  changed = null;
  bridge = {
    status: vi.fn(() => (status instanceof Promise ? status : Promise.resolve(status))),
    preview: vi.fn(async () => ({ previewId: 'x', harness: 'claude', action: 'install', canApply: true, files: [] })),
    apply: vi.fn(),
    cancel: vi.fn(),
    onChanged: vi.fn((fn) => {
      changed = fn;
      return () => (changed = null);
    })
  };
  window.bridge = { agentHooks: bridge };
  onDetails = vi.fn();
  render(<AgentHooksStrip projectId="p1" onDetails={onDetails} />);
}
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('AgentHooksStrip (M7)', () => {
  it('shows Install for a used harness that is missing, naming each file in words, and opens the preview', async () => {
    setup([claude('missing', missingFiles), opencode('missing')]);
    const strip = await screen.findByTestId('agent-hooks-strip');
    expect(strip.textContent).toContain('Claude Code: appens hooks saknas (.claude/settings.json saknas, .thadeus/hooks/dialog.sh saknas)');
    expect(screen.getAllByTestId('agent-hooks-strip')).toHaveLength(1); // opencode is not used here
    fireEvent.click(screen.getByTestId('agent-hooks-strip-action'));
    expect(screen.getByTestId('agent-hooks-strip-action').textContent).toBe('Installera');
    await waitFor(() => expect(bridge.preview).toHaveBeenCalledWith('p1', 'claude', 'install'));
  });

  it('shows Update for outOfDate and editedByHand', async () => {
    setup([
      claude('editedByHand', [
        { path: '.claude/settings.json', status: 'editedByHand' },
        { path: '.thadeus/hooks/dialog.sh', status: 'current' }
      ]),
      opencode('outOfDate', true)
    ]);
    const actions = await screen.findAllByTestId('agent-hooks-strip-action');
    expect(actions.map((b) => b.textContent)).toEqual(['Uppdatera', 'Uppdatera']);
    expect(screen.getAllByTestId('agent-hooks-strip')[0].textContent).toContain('.claude/settings.json ändrade för hand');
  });

  it('is hidden when the harness is current or not used, and follows agent-hooks:changed', async () => {
    setup([claude('current', []), opencode('missing')]);
    await waitFor(() => expect(bridge.status).toHaveBeenCalledWith('p1'));
    await act(async () => {});
    expect(screen.queryByTestId('agent-hooks-strip')).toBeNull();
    act(() => changed({ projectId: 'p1', harnesses: [claude('missing', missingFiles), opencode('missing')] }));
    expect(screen.getByTestId('agent-hooks-strip')).toBeTruthy();
    act(() => changed({ projectId: 'other', harnesses: [claude('current', [])] }));
    expect(screen.getByTestId('agent-hooks-strip')).toBeTruthy();
  });

  it('Details opens Project settings at Agent dialogs; dismiss hides the strip for this run', async () => {
    setup([claude('missing', missingFiles)]);
    fireEvent.click(await screen.findByTestId('agent-hooks-strip-details'));
    expect(onDetails).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('agent-hooks-strip-dismiss'));
    expect(screen.queryByTestId('agent-hooks-strip')).toBeNull();
    act(() => changed({ projectId: 'p1', harnesses: [claude('outOfDate', missingFiles)] }));
    expect(screen.queryByTestId('agent-hooks-strip')).toBeNull();
  });

  it('shows the reason sentence and Details only for a file the app cannot use (RD39)', async () => {
    setup([claude('missing', [{ path: '.claude/settings.json', status: 'missing', reason: 'invalidJson' }, missingFiles[1]])]);
    const strip = await screen.findByTestId('agent-hooks-strip');
    expect(strip.textContent).toContain('.claude/settings.json är inte ren JSON, så appen ändrar den inte.');
    expect(screen.queryByTestId('agent-hooks-strip-action')).toBeNull();
    expect(screen.getByTestId('agent-hooks-strip-details')).toBeTruthy();
  });

  it('renders nothing while the status is pending, then the strip once it answers (PD31)', async () => {
    let resolve;
    setup(new Promise((r) => (resolve = r)));
    expect(screen.queryByTestId('agent-hooks-strip')).toBeNull();
    await act(async () => resolve([claude('missing', missingFiles)]));
    expect(screen.getByTestId('agent-hooks-strip')).toBeTruthy();
  });
});
