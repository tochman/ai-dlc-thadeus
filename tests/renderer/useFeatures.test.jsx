// Characterisation tests of useFeatures (US-0506 Step 3a, K17).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFeatures } from '../../src/renderer/useFeatures.js';

const listeners = {};
let bridge;

beforeEach(() => {
  bridge = {
    getProjectSettings: vi.fn(async () => ({ featureDocs: 'show', featuresPath: 'docs/F.md', harness: 'claude' })),
    loadFeatures: vi.fn(async () => ({ available: true, epics: [] })),
    getStoryLinks: vi.fn(async () => ({ 'US-1': 'd1' })),
    getLifecycleRuleStatus: vi.fn(async () => 'missing'),
    onFeaturesChanged: vi.fn((fn) => {
      listeners.features = fn;
      return vi.fn();
    }),
    onProjectChanged: vi.fn((fn) => {
      listeners.project = fn;
      return vi.fn();
    })
  };
  window.bridge = bridge;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('useFeatures', () => {
  it('starts with the default settings, not loaded, then loads settings, features and links', async () => {
    const { result } = renderHook(() => useFeatures('p1', 'default'));
    expect(result.current.settingsLoaded).toBe(false);
    expect(result.current.settings).toEqual({ featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' });
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(result.current.settings.harness).toBe('claude');
    expect(result.current.features).toEqual({ available: true, epics: [] });
    await waitFor(() => expect(result.current.links).toEqual({ 'US-1': 'd1' }));
  });

  it('reads the lifecycle rule status for the space, again on features:changed and on a project change (US-0603 FR5.2, FR5.3)', async () => {
    const { result } = renderHook(() => useFeatures('p1', 'default'));
    await waitFor(() => expect(result.current.ruleStatus).toBe('missing'));
    expect(bridge.getLifecycleRuleStatus).toHaveBeenCalledWith('p1', 'default');
    bridge.getLifecycleRuleStatus.mockResolvedValueOnce('current');
    await act(async () => listeners.features({ projectId: 'p1' }));
    await waitFor(() => expect(result.current.ruleStatus).toBe('current'));
    const calls = bridge.getLifecycleRuleStatus.mock.calls.length;
    await act(async () => listeners.project({ projectId: 'p1', indexChanged: false }));
    expect(bridge.getLifecycleRuleStatus.mock.calls.length).toBe(calls + 1);

    bridge.getLifecycleRuleStatus.mockRejectedValueOnce(new Error('läsfel'));
    await act(async () => listeners.features({ projectId: 'p1' }));
    await waitFor(() => expect(result.current.ruleStatus).toBeNull()); // no notice on a failed read; it is logged
    expect(console.error).toHaveBeenCalled();
  });

  it('has no rule status without a space', async () => {
    const { result } = renderHook(() => useFeatures('p1', null));
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(bridge.getLifecycleRuleStatus).not.toHaveBeenCalled();
    expect(result.current.ruleStatus).toBeNull();
  });

  it('has no links without a space', async () => {
    const { result } = renderHook(() => useFeatures('p1', null));
    await waitFor(() => expect(result.current.settingsLoaded).toBe(true));
    expect(bridge.getStoryLinks).not.toHaveBeenCalled();
    expect(result.current.links).toEqual({});
  });

  it('falls back to the default settings and an unavailable feature list when loading fails', async () => {
    bridge.loadFeatures.mockRejectedValueOnce(new Error("Error invoking remote method 'features:load': Error: trasig"));
    const { result } = renderHook(() => useFeatures('p1', 'default'));
    await waitFor(() => expect(result.current.features?.available).toBe(false));
    expect(result.current.features.reason).toContain('trasig');
    expect(result.current.settingsLoaded).toBe(true);
    expect(result.current.settings.featuresPath).toBe('docs/FEATURES.md');
  });

  it('logs a failing story-link load and keeps the links empty', async () => {
    bridge.getStoryLinks.mockRejectedValueOnce(new Error('links'));
    const { result } = renderHook(() => useFeatures('p1', 'default'));
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current.links).toEqual({});
  });

  it('reloads the docs on features:changed and the links on an index change, for its own project only', async () => {
    renderHook(() => useFeatures('p1', 'default'));
    await waitFor(() => expect(bridge.loadFeatures).toHaveBeenCalledTimes(1));
    await act(async () => listeners.features({ projectId: 'p2' }));
    expect(bridge.loadFeatures).toHaveBeenCalledTimes(1);
    await act(async () => listeners.features({ projectId: 'p1' }));
    expect(bridge.loadFeatures).toHaveBeenCalledTimes(2);
    const links = bridge.getStoryLinks.mock.calls.length;
    await act(async () => listeners.project({ projectId: 'p1', indexChanged: false }));
    await act(async () => listeners.project({ projectId: 'p1', indexChanged: true }));
    expect(bridge.getStoryLinks.mock.calls.length).toBe(links + 1);
  });
});
