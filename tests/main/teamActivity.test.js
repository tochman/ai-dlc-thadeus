// US-1201 AC-2, AC-3: who worked on which intent on which machine (from the audit shard names), possible collisions
// (the same story on two machines or two branches) and pull requests that change the same files.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { collisions, loadMachines, machinesOf, possibleCollisions } from '../../src/main/teamActivity.js';

const COST = path.resolve(__dirname, '../fixtures/cost');
const TMP = path.resolve(__dirname, '../.tmp/team-activity');
const AUDIT = path.join(TMP, 'aidlc/spaces/default/intents/261116-x/audit');

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(AUDIT, { recursive: true });
  copyFileSync(path.join(COST, 'hosta-aaaaaaaaaaaa.md'), path.join(AUDIT, 'hosta-aaaaaaaaaaaa.md'));
  copyFileSync(path.join(COST, 'hostb-bbbbbbbbbbbb.md'), path.join(AUDIT, 'hostb-bbbbbbbbbbbb.md'));
  symlinkSync('/nonexistent/thadeus-shard.md', path.join(AUDIT, 'hostc-cccccccccccc.md')); // a shard that cannot be read
});
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const ev = (source, iso, stage) => ({ source, timeMs: Date.parse(iso), fields: stage ? { Stage: stage } : {} });

describe('machinesOf (US-1201 AC-3)', () => {
  it('gives each machine of an intent from its shard name, with its last stage and when, newest first', () => {
    const events = [
      ev('mac-aaaaaaaaaaaa.md', '2026-11-16T09:00:00Z', 'requirements-analysis'),
      ev('pc-bbbbbbbbbbbb.md', '2026-11-16T10:00:00Z', 'code-generation'),
      ev('mac-aaaaaaaaaaaa.md', '2026-11-16T11:00:00Z', 'build-and-test'),
      ev('mac-aaaaaaaaaaaa.md', '2026-11-16T11:30:00Z')
    ];
    expect(machinesOf(events)).toEqual([
      { host: 'mac', cloneId: 'aaaaaaaaaaaa', lastStage: 'build-and-test', lastAt: '2026-11-16T11:30:00.000Z' },
      { host: 'pc', cloneId: 'bbbbbbbbbbbb', lastStage: 'code-generation', lastAt: '2026-11-16T10:00:00.000Z' }
    ]);
  });

  it('leaves out a shard without any timed event', () => {
    expect(machinesOf([{ source: 'odd-cccccccccccc.md', timeMs: -Infinity, fields: {} }])).toEqual([]);
  });
});

describe('loadMachines (US-1201 AC-3)', () => {
  it('reads every shard of each intent on its own and skips one that cannot be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = await openRoot(TMP);
    const [intent] = await loadMachines(root, 'default', [{ dirName: '261116-x', slug: 'x', stories: ['US-0209'] }]);
    expect(intent.dirName).toBe('261116-x');
    expect(intent.machines.map((x) => x.host).sort()).toEqual(['hosta', 'hostb']);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('hostc-cccccccccccc.md'), expect.anything());
    expect(await loadMachines(root, 'default', [{ dirName: '261116-none', slug: 'none' }])).toEqual([
      { dirName: '261116-none', slug: 'none', stories: [], inProgress: false, machines: [] }
    ]);
  });
});

describe('possibleCollisions (US-1201 AC-3)', () => {
  const mac = { host: 'mac', cloneId: 'aaaaaaaaaaaa' };
  const pc = { host: 'pc', cloneId: 'bbbbbbbbbbbb' };

  it('flags a story in progress on two machines, and a story on two branches', () => {
    const intents = [
      { dirName: '261116-a', stories: ['US-0209'], inProgress: true, machines: [mac] },
      { dirName: '261116-b', stories: ['US-0209', 'US-0414'], inProgress: true, machines: [pc] },
      { dirName: '261116-c', stories: ['US-0414'], inProgress: true, machines: [pc] }
    ];
    const branches = [
      { branch: 'origin/feat/US-0414', story: 'US-0414', ahead: 3 },
      { branch: 'origin/fix/US-0414', story: 'US-0414', ahead: 1 },
      { branch: 'origin/feat/US-0507', story: 'US-0507', ahead: 2 }
    ];
    expect(possibleCollisions(intents, branches)).toEqual([
      { story: 'US-0209', kind: 'machines', where: ['mac', 'pc'] },
      { story: 'US-0414', kind: 'branches', where: ['origin/feat/US-0414', 'origin/fix/US-0414'] }
    ]);
  });

  it('does not flag finished intents or one machine with two clones of the same story', () => {
    const intents = [
      { dirName: '261116-a', stories: ['US-0209'], inProgress: false, machines: [mac] },
      { dirName: '261116-b', stories: ['US-0209'], inProgress: true, machines: [pc] },
      { dirName: '261116-c', stories: ['US-0209'], inProgress: true, machines: [{ host: 'pc', cloneId: 'cccccccccccc' }] }
    ];
    expect(possibleCollisions(intents, [])).toEqual([]);
  });
});

describe('collisions (US-1201 AC-2)', () => {
  const pulls = [
    { number: 58, title: 'US-0209', branch: 'feat/US-0209', files: ['src/main/git.js', 'aidlc/spaces/default/intents/intents.json'] },
    { number: 59, title: 'US-0414', branch: 'feat/US-0414', files: ['src/renderer/Tooltip.jsx', 'aidlc/spaces/default/intents/intents.json'] },
    { number: 60, title: 'docs', branch: 'docs/x', files: ['README.md'] }
  ];

  it("names the other pull requests that change the local branch's files, with the shared files", () => {
    expect(collisions(pulls, 'feat/US-0414')).toEqual([
      { number: 58, title: 'US-0209', branch: 'feat/US-0209', shared: ['aidlc/spaces/default/intents/intents.json'] }
    ]);
  });

  it("uses the branch's own changed files when it has no pull request yet, and gives none without overlap", () => {
    expect(collisions(pulls, 'feat/US-0999', ['README.md', 'src/x.js'])).toEqual([{ number: 60, title: 'docs', branch: 'docs/x', shared: ['README.md'] }]);
    expect(collisions(pulls, 'feat/US-0999')).toEqual([]);
    expect(collisions([], 'main', ['README.md'])).toEqual([]);
  });
});
