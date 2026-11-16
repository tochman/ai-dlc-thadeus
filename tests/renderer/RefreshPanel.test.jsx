import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const terminal = { state: vi.fn(() => 'idle'), type: vi.fn() };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: RefreshPanel } = await import('../../src/renderer/RefreshPanel.jsx');
const WAIT_MESSAGE = 'Vänta tills AI-DLC-steget är klart eller parkera arbetet först'; // sv.json github.wait (EPIC-07)

// Same shapes git:status and git:remoteChanges return.
const status = { isRepo: true, branch: 'feature/x', upstream: 'origin/feature/x', tracking: true, ahead: 1, behind: 4, dirtyAidlc: 1, dirtyOther: 2 };
const changes = {
  ref: 'origin/feature/x',
  aidlcCommits: 4,
  aidlcFiles: ['aidlc/spaces/default/intents/261114-from-laptop/audit/mac-1.md'],
  otherFiles: ['src/app.js', 'README.md'],
  auditLines: 12,
  newIntents: [{ dirName: '261114-from-laptop', slug: 'from-laptop' }]
};

// US-1201: the platform of origin and the collision warning (team:platform, team:collisions).
const github = { id: 'github', name: 'GitHub', host: 'github.com', path: 'tochman/aidlc-dash' };
const collisions = { isRepo: true, branch: 'feature/x', base: 'origin/main', behind: 2, error: null, collisions: [] };

beforeEach(() => {
  window.bridge = {
    getGitStatus: vi.fn(async () => status),
    gitFetch: vi.fn(async () => {}),
    getRemoteChanges: vi.fn(async () => changes),
    showRemoteFile: vi.fn(async () => '# Remote'),
    getConflicts: vi.fn(async () => []),
    getPlatform: vi.fn(async () => github),
    getCollisions: vi.fn(async () => collisions),
    getMergeNote: vi.fn(async () => ({ rel: 'x.md', section: '' }))
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  terminal.state.mockImplementation(() => 'idle');
});

async function openAndRefresh(props = {}) {
  render(<RefreshPanel projectId="p1" space="default" lastIntentChangeAt={null} {...props} />);
  fireEvent.click(screen.getByTestId('refresh-panel-toggle'));
  await screen.findByTestId('refresh-panel-status');
  fireEvent.click(screen.getByTestId('refresh-panel-update'));
  await screen.findByTestId('refresh-panel-badge');
}

describe('RefreshPanel', () => {
  it('fetches only on Uppdatera, shows the badge and types the chosen pull or merge into the shell tab without Enter (FR3.2, FR3.3, FR3.6)', async () => {
    render(<RefreshPanel projectId="p1" space="default" lastIntentChangeAt={null} />);
    fireEvent.click(screen.getByTestId('refresh-panel-toggle'));
    await screen.findByTestId('refresh-panel-status');
    expect(window.bridge.gitFetch).not.toHaveBeenCalled(); // status before any fetch (FR3.5)

    fireEvent.click(screen.getByTestId('refresh-panel-update'));
    const badge = await screen.findByTestId('refresh-panel-badge');
    expect(window.bridge.gitFetch).toHaveBeenCalledWith('p1');
    expect(window.bridge.getRemoteChanges).toHaveBeenCalledWith('p1', 'origin/feature/x', 'default');
    expect(badge.textContent).toMatch(/^4 nya ändringar i AI-DLC på origin\/feature\/x/);
    expect(badge.textContent).toMatch(/2 ändrade filer utanför aidlc\//);

    fireEvent.click(screen.getByTestId('refresh-panel-details'));
    expect(screen.getByText('på GitHub')).toBeTruthy();

    fireEvent.click(screen.getByTestId('refresh-panel-pull'));
    fireEvent.click(screen.getByTestId('refresh-panel-choice-rebase'));
    expect(terminal.type).toHaveBeenLastCalledWith('shell', 'git pull --rebase --autostash', { submit: false });

    fireEvent.click(screen.getByTestId('refresh-panel-from-main'));
    fireEvent.click(screen.getByTestId('refresh-panel-choice-merge'));
    expect(terminal.type).toHaveBeenLastCalledWith('shell', 'git fetch && git merge origin/main', { submit: false });
  });

  it('disables Hämta in and Uppdatera från main while AI-DLC works: Claude busy or a recent write (FR3.7)', async () => {
    await openAndRefresh({ lastIntentChangeAt: Date.now() - 60 * 1000 });
    expect(screen.getByTestId('refresh-panel-pull').disabled).toBe(true);
    expect(screen.getByTestId('refresh-panel-from-main').disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe(WAIT_MESSAGE);
    cleanup();

    terminal.state.mockImplementation(() => 'busy');
    await openAndRefresh({ lastIntentChangeAt: Date.now() - 10 * 60 * 1000 });
    expect(screen.getByTestId('refresh-panel-pull').disabled).toBe(true);
    await waitFor(() => expect(screen.getByTestId('refresh-panel-status').textContent).toMatch(/arbetar/));
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it("is named after origin's platform, and after git when origin is on none of them (US-1201 AC-5)", async () => {
    window.bridge.getPlatform.mockResolvedValueOnce({ ...github, id: 'gitlab', name: 'GitLab' });
    render(<RefreshPanel projectId="p1" space="default" lastIntentChangeAt={null} />);
    await waitFor(() => expect(screen.getByTestId('refresh-panel-toggle').textContent).toMatch(/^Uppdatera från GitLab/));
    expect(window.bridge.getPlatform).toHaveBeenCalledWith('p1');
    cleanup();
    window.bridge.getPlatform.mockResolvedValueOnce(null);
    render(<RefreshPanel projectId="p1" space="default" lastIntentChangeAt={null} />);
    await waitFor(() => expect(screen.getByTestId('refresh-panel-toggle').textContent).toMatch(/^Uppdatera från git/));
  });

  it('shows the collision warning once open, reads it again after Uppdatera, and still fetches only then (US-1201 AC-2, AC-5)', async () => {
    render(<RefreshPanel projectId="p1" space="default" lastIntentChangeAt={null} activeDirName="261116-a" />);
    expect(window.bridge.getCollisions).not.toHaveBeenCalled(); // nothing is read while the panel is closed
    fireEvent.click(screen.getByTestId('refresh-panel-toggle'));
    expect((await screen.findByTestId('collision-panel-behind')).textContent).toMatch(/^Grenen ligger 2 commits efter origin\/main/);
    expect(window.bridge.gitFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('refresh-panel-update'));
    await screen.findByTestId('refresh-panel-badge');
    await waitFor(() => expect(window.bridge.getCollisions).toHaveBeenCalledTimes(2));
    expect(window.bridge.gitFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('collision-panel-merge-note')).toBeTruthy();
  });
});
