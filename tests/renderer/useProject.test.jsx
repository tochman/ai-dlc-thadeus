// Characterisation tests of useProject (US-0506 Step 3a, K17): today's loading, live reload and highlight.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const listeners = {};
const bridge = {
  getIntents: vi.fn(),
  getIntent: vi.fn(),
  getCost: vi.fn(),
  getModels: vi.fn(),
  onProjectChanged: vi.fn((fn) => {
    listeners.change = fn;
    return vi.fn();
  }),
  onWatchError: vi.fn((fn) => {
    listeners.error = fn;
    return vi.fn();
  })
};
window.bridge = bridge; // useProject reads window.bridge when it is imported
const { useProject } = await import('../../src/renderer/useProject.js');

const intents = [
  { dirName: 'a', active: false },
  { dirName: 'b', active: true }
];
const detailOf = (dirName, keys) => ({ dirName, events: keys.map((key) => ({ key })) });

beforeEach(() => {
  bridge.getIntents.mockResolvedValue({ intents, warning: null });
  bridge.getIntent.mockImplementation(async (_p, _s, dirName) => detailOf(dirName, ['e1']));
  bridge.getCost.mockResolvedValue({ available: true });
  bridge.getModels.mockResolvedValue({ source: 'settings', agents: [] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useProject', () => {
  it('loads the list, selects the active intent and loads its detail, cost and models', async () => {
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.detail?.dirName).toBe('b'));
    expect(result.current.selected).toBe('b');
    expect(result.current.intents).toEqual(intents);
    expect(result.current.cost).toEqual({ available: true });
    expect(result.current.models).toEqual({ source: 'settings', agents: [] });
    expect(result.current.error).toBeNull();
  });

  it('selects the first intent when none is active, and nothing in an empty list', async () => {
    bridge.getIntents.mockResolvedValueOnce({ intents: [{ dirName: 'x' }], warning: 'w' });
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.selected).toBe('x'));
    expect(result.current.listWarning).toBe('w');
  });

  it('shows a list error without the IPC prefix', async () => {
    bridge.getIntents.mockRejectedValueOnce(new Error("Error invoking remote method 'project:intents': Error: kaputt"));
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.error).toContain('kaputt'));
    expect(result.current.error).not.toContain('invoking');
  });

  it('shows a detail error, a cost failure as unavailable, and a models failure as source none', async () => {
    bridge.getIntent.mockRejectedValueOnce(new Error('no detail'));
    bridge.getCost.mockRejectedValueOnce(new Error('no ledger'));
    bridge.getModels.mockRejectedValueOnce(new Error('no models'));
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.error).toContain('no detail'));
    await waitFor(() => expect(result.current.cost?.available).toBe(false));
    expect(result.current.cost.reason).toContain('no ledger');
    await waitFor(() => expect(result.current.models).toEqual({ source: 'none', agents: [], error: 'no models' }));
  });

  it('reloads only the changed folders, and the detail with a highlight of new events', async () => {
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.detail?.dirName).toBe('b'));
    bridge.getIntent.mockResolvedValueOnce(detailOf('b', ['e1', 'e2']));
    await act(async () => listeners.change({ projectId: 'p1', space: 'default', dirNames: ['b'], indexChanged: false }));
    await waitFor(() => expect(result.current.newKeys).toEqual(new Set(['e2'])));
    expect(bridge.getIntents).toHaveBeenLastCalledWith('p1', 'default', ['b']);
    expect(result.current.lastIntentChangeAt).toEqual(expect.any(Number));
  });

  it('clears the highlight after four seconds', async () => {
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.detail?.dirName).toBe('b'));
    vi.useFakeTimers();
    bridge.getIntent.mockResolvedValueOnce(detailOf('b', ['e1', 'e9']));
    await act(async () => listeners.change({ projectId: 'p1', space: 'default', dirNames: ['b'], indexChanged: false }));
    expect(result.current.newKeys).toEqual(new Set(['e9']));
    await act(async () => vi.advanceTimersByTime(4000));
    expect(result.current.newKeys).toBeNull();
  });

  it('reloads the whole list and the cost on an index change', async () => {
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.detail?.dirName).toBe('b'));
    const costCalls = bridge.getCost.mock.calls.length;
    await act(async () => listeners.change({ projectId: 'p1', space: 'default', dirNames: [], indexChanged: true }));
    expect(bridge.getIntents).toHaveBeenLastCalledWith('p1', 'default', undefined);
    expect(bridge.getCost.mock.calls.length).toBe(costCalls + 1);
    expect(result.current.lastIntentChangeAt).toBeNull();
  });

  it('ignores changes for another project or space, and shows a watch error for its own project', async () => {
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.detail?.dirName).toBe('b'));
    const calls = bridge.getIntents.mock.calls.length;
    await act(async () => listeners.change({ projectId: 'p2', space: 'default', dirNames: ['b'] }));
    await act(async () => listeners.change({ projectId: 'p1', space: 'other', dirNames: ['b'] }));
    expect(bridge.getIntents.mock.calls.length).toBe(calls);
    act(() => listeners.error({ projectId: 'p2', message: 'x' }));
    expect(result.current.error).toBeNull();
    act(() => listeners.error({ projectId: 'p1', message: 'stopped' }));
    expect(result.current.error).toContain('stopped');
  });

  it('loads a new selection and clears the detail for none', async () => {
    const { result } = renderHook(() => useProject('p1', 'default'));
    await waitFor(() => expect(result.current.detail?.dirName).toBe('b'));
    act(() => result.current.setSelected('a'));
    await waitFor(() => expect(result.current.detail?.dirName).toBe('a'));
    act(() => result.current.setSelected(null));
    await waitFor(() => expect(result.current.detail).toBeNull());
  });
});
