// US-0418 FR2, FR7, FR9: the Pulse store (agents, file marks, 15 minutes of touches).
import { describe, expect, it } from 'vitest';
import { createPulseHub, createPulseStore, FADE_MS, GROUP_LIMIT, HISTORY_MS, UNATTRIBUTED, wirePulse } from '../../src/main/pulse.js';

const T0 = 1_000_000;
const dev = { id: 's1', label: 'Main', group: 'Main' };

describe('createPulseStore', () => {
  it('keeps a touch and shows its file with full weight, credited to its agent (FR2.1, FR7.1)', () => {
    const store = createPulseStore();
    store.add({ agent: dev, path: 'src/a.js', kind: 'read', at: T0 });
    const snap = store.snapshot(T0);
    expect(snap.files).toEqual([{ path: 'src/a.js', kind: 'read', weight: 1, deleted: false, lastAt: T0, agents: ['s1'] }]);
    expect(snap.agents.map((a) => a.id)).toEqual(['s1', UNATTRIBUTED]);
    expect(snap.touches).toEqual([{ agent: 's1', path: 'src/a.js', kind: 'read', at: T0 }]);
  });

  it('credits a touch with no agent to Unattributed, which is always on the ring (FR2.3)', () => {
    const store = createPulseStore();
    expect(store.snapshot(T0).agents).toEqual([{ id: UNATTRIBUTED, label: null, group: null, active: false, count: 0 }]);
    store.add({ agent: null, path: 'b.md', kind: 'write', at: T0 });
    expect(store.snapshot(T0).agents).toEqual([{ id: UNATTRIBUTED, label: null, group: null, active: false, count: 1 }]);
  });

  it('fades a file mark over 10 minutes with no action on it (FR7.1)', () => {
    const store = createPulseStore();
    store.add({ agent: dev, path: 'a.js', kind: 'read', at: T0 });
    expect(store.snapshot(T0 + FADE_MS / 2).files[0].weight).toBe(0.5);
    expect(store.snapshot(T0 + FADE_MS).files).toEqual([]);
  });

  it('marks a deleted file, and a later write brings it back (FR8.2)', () => {
    const store = createPulseStore();
    store.add({ agent: null, path: 'a.js', kind: 'delete', at: T0 });
    expect(store.snapshot(T0).files[0].deleted).toBe(true);
    store.add({ agent: null, path: 'a.js', kind: 'write', at: T0 + 1 });
    expect(store.snapshot(T0 + 1).files[0]).toMatchObject({ deleted: false, kind: 'write' });
  });

  it('keeps only 15 minutes of history, pruned on add (FR9.2)', () => {
    const store = createPulseStore();
    store.add({ agent: dev, path: 'a.js', kind: 'read', at: T0 });
    store.add({ agent: dev, path: 'b.js', kind: 'read', at: T0 + HISTORY_MS + 1 });
    expect(store.snapshot(T0 + HISTORY_MS + 1).touches.map((t) => t.path)).toEqual(['b.js']);
  });

  it('groups files by folder past the limit (FR7.2)', () => {
    const store = createPulseStore();
    for (let i = 0; i <= GROUP_LIMIT; i++) store.add({ agent: null, path: `d${i % 3}/f${i}.js`, kind: 'read', at: T0 });
    const files = store.snapshot(T0).files;
    expect(files.map((f) => f.path).sort()).toEqual(['d0', 'd1', 'd2']);
    expect(files[0]).toMatchObject({ folder: true, weight: 1 });
    expect(files.reduce((n, f) => n + f.count, 0)).toBe(GROUP_LIMIT + 1);
  });

  it('counts a path outside the project as one mark with no path (FR5.2)', () => {
    const store = createPulseStore();
    store.add({ agent: dev, outside: true, kind: 'read', at: T0 });
    store.add({ agent: dev, outside: true, kind: 'read', at: T0 + 1 });
    const snap = store.snapshot(T0 + 1);
    expect(snap.files).toEqual([{ outside: true, kind: 'read', weight: 1, deleted: false, lastAt: T0 + 1, agents: ['s1'] }]);
    expect(JSON.stringify(snap)).not.toContain('path":"/');
  });

  it('shows working agents as active and refuses an unknown action (FR2.2)', () => {
    const store = createPulseStore();
    store.setAgents([dev]);
    expect(store.snapshot(T0).agents[0]).toEqual({ ...dev, active: true, count: 0 });
    store.setAgents([]);
    expect(store.snapshot(T0).agents.map((a) => a.id)).toEqual([UNATTRIBUTED]);
    expect(() => store.add({ agent: dev, path: 'a.js', kind: 'rename', at: T0 })).toThrow(/kind/);
  });
});

// US-0418 FR3, FR4.2: the hook store's touches and activity rows feed the hub (the ipc.js wiring).
function fakeEvents() {
  const fns = { touch: new Set(), activity: new Set() };
  return {
    onTouch: (fn) => (fns.touch.add(fn), () => fns.touch.delete(fn)),
    onActivity: (fn) => (fns.activity.add(fn), () => fns.activity.delete(fn)),
    touch: (t) => fns.touch.forEach((fn) => fn(t)),
    activity: (c) => fns.activity.forEach((fn) => fn(c)),
    count: () => fns.touch.size + fns.activity.size
  };
}
function fakeHub() {
  const calls = [];
  return {
    calls,
    touch: (x) => calls.push(['touch', x]),
    setAgents: (...a) => calls.push(['setAgents', ...a]),
    setActive: (...a) => calls.push(['setActive', ...a])
  };
}
const row = (over) => ({ key: 'main:s1', sessionId: 's1', agentId: null, agentType: null, state: 'working', stale: false, ...over });

describe('wirePulse', () => {
  it('turns a tool start and end into hub touches with the activity row id of their agent (FR3.1)', () => {
    const events = fakeEvents();
    const hub = fakeHub();
    wirePulse({ events, hub, rootOf: () => '/p' });
    const paths = [{ path: 'a.js', kind: 'read' }];
    events.touch({ projectId: 'p1', sessionId: 's1', agentId: 'a7', agentType: 'Explore', name: 'toolStart', tool: 'Read', toolId: 't1', paths, atMs: T0 });
    events.touch({ projectId: 'p1', sessionId: 's1', agentId: null, agentType: null, name: 'toolEnd', tool: 'Read', toolId: 't1', paths: null, atMs: T0 + 5 });
    expect(hub.calls).toEqual([
      ['touch', { projectId: 'p1', agent: { id: 'agent:s1:a7', label: 'Explore', group: 's1' }, tool: 'Read', toolId: 't1', paths, phase: 'start', at: T0 }],
      ['touch', { projectId: 'p1', agent: { id: 'main:s1', label: null, group: 's1' }, tool: 'Read', toolId: 't1', paths: null, phase: 'end', at: T0 + 5 }]
    ]);
  });

  it('sets the working agents and runs the observer only while one works (FR2.2, FR4.2, NFR6)', () => {
    const events = fakeEvents();
    const hub = fakeHub();
    wirePulse({ events, hub, rootOf: (id) => (id === 'p1' ? '/p' : null) });
    const agentRow = row({ key: 'agent:s1:a7', agentId: 'a7', agentType: 'Explore', state: 'tool' });
    events.activity({
      projectId: 'p1',
      rows: [row(), agentRow, row({ key: 'main:s2', sessionId: 's2', state: 'idle' }), row({ key: 'main:s3', sessionId: 's3', stale: true })]
    });
    events.activity({ projectId: 'p1', rows: [row({ state: 'idle' })] });
    expect(hub.calls).toEqual([
      [
        'setAgents',
        'p1',
        [
          { id: 'main:s1', label: null, group: 's1' },
          { id: 'agent:s1:a7', label: 'Explore', group: 's1' }
        ]
      ],
      ['setActive', 'p1', '/p'],
      ['setAgents', 'p1', []],
      ['setActive', 'p1', null]
    ]);
  });

  it('a waiting chat holds its segment but does not keep the observer running (FR4.2)', () => {
    const events = fakeEvents();
    const hub = fakeHub();
    wirePulse({ events, hub, rootOf: () => '/p' });
    events.activity({ projectId: 'p1', rows: [row({ state: 'waiting' })] });
    expect(hub.calls).toEqual([
      ['setAgents', 'p1', [{ id: 'main:s1', label: null, group: 's1' }]],
      ['setActive', 'p1', null]
    ]);
  });

  it('ignores a project that is no longer open and unsubscribes on stop', () => {
    const events = fakeEvents();
    const hub = fakeHub();
    const stop = wirePulse({ events, hub, rootOf: () => null });
    events.touch({ projectId: 'gone', sessionId: 's1', name: 'toolStart', tool: 'Read', toolId: 't1', paths: null, atMs: T0 });
    events.activity({ projectId: 'gone', rows: [row()] });
    expect(hub.calls).toEqual([]);
    stop();
    expect(events.count()).toBe(0);
  });

  it('drives a real hub end to end: a hooked read reaches the batched push (FR3.1, FR9)', async () => {
    const events = fakeEvents();
    const pushed = [];
    const hub = createPulseHub({ watch: () => ({ close() {} }), push: (id, snap) => pushed.push([id, snap]), intervalMs: 1, now: () => T0 });
    wirePulse({ events, hub, rootOf: () => '/p' });
    events.touch({ projectId: 'p1', sessionId: 's1', name: 'toolStart', tool: 'Read', toolId: 't1', paths: [{ path: 'a.js', kind: 'read' }], atMs: T0 });
    await new Promise((r) => setTimeout(r, 10));
    expect(pushed).toHaveLength(1);
    expect(pushed[0][1].files.map((f) => f.path)).toEqual(['a.js']);
    hub.close();
  });
});
