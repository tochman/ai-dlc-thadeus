// US-0418 FR4, NFR6: the project file observer and the hub that credits its changes to agents.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { watchProjectFiles } from '../../src/main/watcher.js';
import { createPulseHub, UNATTRIBUTED } from '../../src/main/pulse.js';

const TMP = path.resolve(__dirname, '../.tmp/pulse-observer');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// US-0010: chokidar's events are wall-clock; retry up to twice under a loaded suite.
describe('watchProjectFiles', { retry: 2 }, () => {
  let watcher;

  beforeEach(async () => {
    await fs.rm(TMP, { recursive: true, force: true });
    await fs.mkdir(path.join(TMP, 'node_modules'), { recursive: true });
    await fs.mkdir(path.join(TMP, 'dist'), { recursive: true });
    await fs.mkdir(path.join(TMP, 'src'), { recursive: true });
    // tests/.tmp is ignored by this repository, so the fixture is a repository of its own.
    execFileSync('git', ['init', '-q'], { cwd: TMP });
    await fs.writeFile(path.join(TMP, '.gitignore'), 'dist/\n*.log\n');
    await fs.writeFile(path.join(TMP, 'old.txt'), 'x');
    await wait(300); // macOS FSEvents can deliver the setup after the watcher is ready
  });

  afterEach(async () => {
    await watcher?.close();
    await fs.rm(TMP, { recursive: true, force: true });
  });

  it('reports a write and a delete as project-relative paths (FR4.1)', async () => {
    const seen = [];
    watcher = watchProjectFiles(TMP, (c) => seen.push(c));
    await watcher.ready;
    await fs.writeFile(path.join(TMP, 'src', 'a.js'), 'a');
    await fs.rm(path.join(TMP, 'old.txt'));
    await wait(500);
    expect(seen).toContainEqual({ path: 'src/a.js', kind: 'write' });
    expect(seen).toContainEqual({ path: 'old.txt', kind: 'delete' });
  });

  it('skips .git, node_modules and git-ignored files (FR4.1)', async () => {
    const seen = [];
    watcher = watchProjectFiles(TMP, (c) => seen.push(c));
    await watcher.ready;
    await fs.writeFile(path.join(TMP, 'node_modules', 'm.js'), 'm');
    await fs.writeFile(path.join(TMP, 'dist', 'd.js'), 'd');
    await fs.writeFile(path.join(TMP, 'run.log'), 'l');
    await fs.writeFile(path.join(TMP, '.git', 'x'), 'g');
    await fs.writeFile(path.join(TMP, 'kept.md'), 'k');
    await wait(500);
    expect(seen.map((c) => c.path)).toEqual(['kept.md']);
  });

  it('closes without error before it is ready (NFR6)', async () => {
    watcher = watchProjectFiles(TMP, () => {});
    await watcher.close();
    await expect(watcher.ready).resolves.toBeUndefined();
  });
});

describe('createPulseHub', () => {
  const dev = { id: 'main:s1', label: null, group: 's1' };
  const helper = { id: 'agent:s1:a1', label: 'Explore', group: 's1' };
  let closes;
  let watched;
  let pushed;
  let hub;
  let clock;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 1_000_000;
    closes = 0;
    watched = new Map();
    pushed = [];
    const watch = (root, onChange) => {
      watched.set(root, onChange);
      return { close: async () => closes++ };
    };
    hub = createPulseHub({ watch, push: (projectId, snap) => pushed.push({ projectId, snap }), now: () => clock });
  });

  afterEach(() => {
    hub.close();
    vi.useRealTimers();
  });

  it('keeps the paths of a hook touch, credited to its agent (FR3.1)', () => {
    hub.touch({ projectId: 'p1', agent: helper, tool: 'Read', toolId: 't1', paths: [{ path: 'a.js', kind: 'read' }], phase: 'start' });
    const snap = hub.list('p1');
    expect(snap.files).toMatchObject([{ path: 'a.js', kind: 'read', agents: ['agent:s1:a1'] }]);
    expect(hub.list('p2').files).toEqual([]);
  });

  it('watches the project only while it is active and closes the watcher when that ends (FR4.2, NFR6)', () => {
    hub.setActive('p1', '/proj');
    hub.setActive('p1', '/proj'); // no second watcher
    expect([...watched.keys()]).toEqual(['/proj']);
    hub.setActive('p1', null);
    expect(closes).toBe(1);
    hub.setActive('p1', null);
    expect(closes).toBe(1);
  });

  it('credits an observed change to the shell tool running then, else to Unattributed (FR4.3)', () => {
    hub.setActive('p1', '/proj');
    const onChange = watched.get('/proj');
    onChange({ path: 'x.js', kind: 'write' });
    hub.touch({ projectId: 'p1', agent: dev, tool: 'Bash', toolId: 't2', paths: null, phase: 'start' });
    onChange({ path: 'y.js', kind: 'delete' });
    hub.touch({ projectId: 'p1', agent: dev, tool: 'Bash', toolId: 't2', phase: 'end' });
    onChange({ path: 'z.js', kind: 'write' });
    const by = Object.fromEntries(hub.list('p1').files.map((f) => [f.path, f.agents]));
    expect(by).toEqual({ 'x.js': [UNATTRIBUTED], 'y.js': ['main:s1'], 'z.js': [UNATTRIBUTED] });
  });

  it('drops an observed change on a file a write tool has open, also just after it ends (FR4.4)', () => {
    hub.setActive('p1', '/proj');
    const onChange = watched.get('/proj');
    hub.touch({ projectId: 'p1', agent: dev, tool: 'Edit', toolId: 't3', paths: [{ path: 'a.js', kind: 'write' }], phase: 'start' });
    onChange({ path: 'a.js', kind: 'write' });
    hub.touch({ projectId: 'p1', agent: dev, tool: 'Edit', toolId: 't3', phase: 'end' });
    onChange({ path: 'a.js', kind: 'write' }); // the file system reports late
    expect(hub.list('p1').touches).toHaveLength(1);
    clock += 10_000;
    onChange({ path: 'a.js', kind: 'write' });
    expect(hub.list('p1').touches.map((t) => t.agent)).toEqual(['main:s1', UNATTRIBUTED]);
  });

  it('pushes one batched snapshot per project every 2 seconds, and none when nothing changed (FR3, FR4)', () => {
    hub.setAgents('p1', [dev]);
    hub.touch({ projectId: 'p1', agent: dev, tool: 'Read', toolId: 't4', paths: [{ path: 'a.js', kind: 'read' }], phase: 'start' });
    hub.touch({ projectId: 'p1', agent: dev, tool: 'Read', toolId: 't5', paths: [{ path: 'b.js', kind: 'read' }], phase: 'start' });
    expect(pushed).toEqual([]);
    vi.advanceTimersByTime(2000);
    expect(pushed).toHaveLength(1);
    expect(pushed[0].projectId).toBe('p1');
    expect(pushed[0].snap.files.map((f) => f.path)).toEqual(['a.js', 'b.js']);
    expect(pushed[0].snap.agents[0]).toMatchObject({ id: 'main:s1', active: true });
    vi.advanceTimersByTime(4000);
    expect(pushed).toHaveLength(1);
  });

  it('forgets a project and closes its watcher on drop (NFR6)', () => {
    hub.setActive('p1', '/proj');
    hub.touch({ projectId: 'p1', agent: dev, tool: 'Read', toolId: 't6', paths: [{ path: 'a.js', kind: 'read' }], phase: 'start' });
    hub.drop('p1');
    expect(closes).toBe(1);
    expect(hub.list('p1').files).toEqual([]);
  });
});
