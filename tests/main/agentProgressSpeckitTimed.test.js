// US-1410 NFR7.3: the C9 result for 30 features and 200 hook events within 1 s (target 300 ms). In TIMED, so it runs
// in the retried `scripts` project, after the parallel ones.
import { describe, expect, it } from 'vitest';
import { loadSpeckitProgress } from '../../src/main/agentProgress.js';

describe('loadSpeckitProgress timing (NFR7.3)', () => {
  it('resolves 30 features and 200 events within 1 s', async () => {
    const features = Array.from({ length: 30 }, (_, i) => ({
      dir: `${String(i + 1).padStart(3, '0')}-f${i}`,
      name: `f${i}`,
      active: i === 29,
      tasks: { done: i, total: 40, skipped: 0, phases: [] }
    }));
    const events = Array.from({ length: 200 }, (_, i) => ({
      eventId: `h${i}`,
      projectId: 'p1',
      harness: 'claude',
      source: 'hook',
      kind: i % 2 ? 'permission' : 'reply',
      state: i < 199 ? 'ended' : 'shown',
      arrivedAtMs: i,
      seq: i,
      permission: { what: 'Edit', detail: 'x' }
    }));
    const loadFeatures = async () => ({ version: null, features, active: '030-f29', errors: [] });
    const start = performance.now();
    const res = await loadSpeckitProgress('/kit', events, { loadFeatures });
    expect(performance.now() - start).toBeLessThan(1000);
    expect(res).toEqual({ source: 'hooks', waiting: { question: 'Edit', agent: 'Claude Code' }, feature: { name: 'f29', done: 29, total: 40 } });
  });
});
