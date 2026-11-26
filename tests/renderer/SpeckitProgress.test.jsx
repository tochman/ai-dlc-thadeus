// US-1410 BR10.5, BR10.7, NFR5.1, NFR7.1, NFR7.2, NFR7.4 (contract C9): the Spec Kit agent progress readout, in the
// Swedish locale, with getAgentProgress and the two pushes stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import SpeckitProgress from '../../src/renderer/SpeckitProgress.jsx';

const NONE = { source: 'none', waiting: null, feature: null };
const WAITING = { question: 'Vilket upplägg?', agent: 'Claude Code' };
const FEATURE = { name: 'login', done: 3, total: 7 };
let pushes;

beforeEach(() => {
  pushes = { hooks: [], speckit: [], offHooks: vi.fn(), offSpeckit: vi.fn() };
  window.bridge = {
    getAgentProgress: vi.fn(async () => NONE),
    agentEvents: {
      onChanged: vi.fn((fn) => {
        pushes.hooks.push(fn);
        return pushes.offHooks;
      })
    },
    onSpeckitChanged: vi.fn((fn) => {
      pushes.speckit.push(fn);
      return pushes.offSpeckit;
    })
  };
});
afterEach(cleanup);

const shows = (result) => {
  window.bridge.getAgentProgress.mockResolvedValue(result);
  render(<SpeckitProgress projectId="p1" />);
};
const pushHooks = (projectId) => act(() => pushes.hooks.forEach((fn) => fn({ projectId, events: [] })));
const pushSpeckit = (projectId) => act(() => pushes.speckit.forEach((fn) => fn({ projectId, paths: ['specs/001-login/tasks.md'] })));

describe('SpeckitProgress', () => {
  it('shows the waiting question with its agent and "from the agent hooks" (BR10.5)', async () => {
    shows({ source: 'hooks', waiting: WAITING, feature: null });
    const w = await screen.findByTestId('speckit-progress-waiting');
    expect(w.textContent).toContain(t('speckit.progress.waiting', WAITING));
    expect(w.textContent).toContain(t('speckit.progress.fromHooks'));
    expect(screen.queryByTestId('speckit-progress-feature')).toBeNull();
    expect(window.bridge.getAgentProgress).toHaveBeenCalledWith('p1');
  });

  it('shows the feature with done/total and "from tasks.md"', async () => {
    shows({ source: 'tasks', waiting: null, feature: FEATURE });
    const f = await screen.findByTestId('speckit-progress-feature');
    expect(f.textContent).toContain(t('speckit.progress.feature', FEATURE));
    expect(f.textContent).toContain(t('speckit.progress.fromTasks'));
    expect(screen.queryByTestId('speckit-progress-waiting')).toBeNull();
  });

  it('shows both, and no empty line', async () => {
    shows({ source: 'hooks', waiting: WAITING, feature: FEATURE });
    expect(await screen.findByTestId('speckit-progress-waiting')).toBeTruthy();
    expect(screen.getByTestId('speckit-progress-feature')).toBeTruthy();
    expect(screen.queryByTestId('speckit-progress-empty')).toBeNull();
  });

  it('says there is nothing to show yet, in an LCARS readout with its title', async () => {
    shows(NONE);
    expect((await screen.findByTestId('speckit-progress-empty')).textContent).toBe(t('speckit.progress.nothingYet'));
    const root = screen.getByTestId('speckit-progress-root');
    expect(root.textContent).toContain(t('speckit.progress.title'));
  });

  it('shows the failed state when the call rejects', async () => {
    window.bridge.getAgentProgress.mockRejectedValue(new Error('boom'));
    render(<SpeckitProgress projectId="p1" />);
    expect((await screen.findByTestId('speckit-progress-error')).textContent).toBe(t('speckit.progress.failed'));
  });

  it('shows the question as text, never as markup (NFR5.1)', async () => {
    shows({ source: 'hooks', waiting: { question: '<script>alert(1)</script> **bold**', agent: 'Claude Code' }, feature: null });
    const w = await screen.findByTestId('speckit-progress-waiting');
    expect(w.textContent).toContain('<script>alert(1)</script> **bold**');
    expect(w.querySelector('script, strong')).toBeNull();
  });

  it("refreshes on a hook push for this project, not on another project's (BR10.7, NFR7.2)", async () => {
    shows(NONE);
    await screen.findByTestId('speckit-progress-empty');
    window.bridge.getAgentProgress.mockResolvedValue({ source: 'hooks', waiting: WAITING, feature: null });
    await pushHooks('other');
    expect(window.bridge.getAgentProgress).toHaveBeenCalledTimes(1);
    await pushHooks('p1');
    expect(await screen.findByTestId('speckit-progress-waiting')).toBeTruthy();
    expect(window.bridge.getAgentProgress).toHaveBeenCalledTimes(2);
  });

  it('refreshes on speckit:changed for this project (NFR7.1)', async () => {
    shows(NONE);
    await screen.findByTestId('speckit-progress-empty');
    window.bridge.getAgentProgress.mockResolvedValue({ source: 'tasks', waiting: null, feature: FEATURE });
    await pushSpeckit('other');
    expect(window.bridge.getAgentProgress).toHaveBeenCalledTimes(1);
    await pushSpeckit('p1');
    expect(await screen.findByTestId('speckit-progress-feature')).toBeTruthy();
  });

  it('a burst of pushes during a call gives one extra call, not one per push (NFR7.4)', async () => {
    let finish;
    window.bridge.getAgentProgress.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    render(<SpeckitProgress projectId="p1" />);
    await pushHooks('p1');
    await pushSpeckit('p1');
    await pushHooks('p1');
    expect(window.bridge.getAgentProgress).toHaveBeenCalledTimes(1);
    await act(async () => finish(NONE));
    await waitFor(() => expect(window.bridge.getAgentProgress).toHaveBeenCalledTimes(2));
    await screen.findByTestId('speckit-progress-empty');
    expect(window.bridge.getAgentProgress).toHaveBeenCalledTimes(2);
  });

  it('removes both listeners on unmount', async () => {
    const { unmount } = render(<SpeckitProgress projectId="p1" />);
    await screen.findByTestId('speckit-progress-empty');
    unmount();
    expect(pushes.offHooks).toHaveBeenCalledTimes(1);
    expect(pushes.offSpeckit).toHaveBeenCalledTimes(1);
  });
});

// US-0050 item 6: the progress parts rise with the view's entrance.
describe('SpeckitProgress entrance (US-0050)', () => {
  it('lets the waiting and the feature part rise', async () => {
    shows({ source: 'hooks', waiting: WAITING, feature: FEATURE });
    expect((await screen.findByTestId('speckit-progress-waiting')).classList.contains('lcars-e-rise')).toBe(true);
    expect(screen.getByTestId('speckit-progress-feature').classList.contains('lcars-e-rise')).toBe(true);
  });
});
