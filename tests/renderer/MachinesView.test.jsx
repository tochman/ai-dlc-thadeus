// US-1201 AC-3: who works on what across my machines: the machines per intent, origin's story branches and the
// possible collisions, in LCARS cards.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import MachinesView from '../../src/renderer/MachinesView.jsx';

// The shape team:machines returns.
const MACHINES = {
  intents: [
    {
      dirName: '261116-a',
      slug: 'cost',
      stories: ['US-0209'],
      inProgress: true,
      machines: [
        { host: 'macbookpro', cloneId: '95cba7b6a821', lastStage: 'code-generation', lastAt: '2026-11-16T10:00:00.000Z' },
        { host: 'imac', cloneId: 'bbbbbbbbbbbb', lastStage: 'build-and-test', lastAt: '2026-11-16T09:00:00.000Z' }
      ]
    },
    {
      dirName: '261116-b',
      slug: 'tooltip',
      stories: ['US-0414'],
      inProgress: false,
      machines: [{ host: 'imac', cloneId: 'bbbbbbbbbbbb', lastStage: null, lastAt: '2026-11-15T09:00:00.000Z' }]
    },
    { dirName: '261116-c', slug: 'fresh', stories: [], inProgress: true, machines: [] } // no shard yet: not listed
  ],
  branches: [
    { branch: 'origin/feat/US-0209', story: 'US-0209', ahead: 4 },
    { branch: 'origin/fix/US-0209', story: 'US-0209', ahead: 1 }
  ],
  flags: [
    { story: 'US-0209', kind: 'machines', where: ['imac', 'macbookpro'] },
    { story: 'US-0209', kind: 'branches', where: ['origin/feat/US-0209', 'origin/fix/US-0209'] }
  ]
};

function setup(result = MACHINES) {
  window.bridge = { getMachines: vi.fn(async () => result) };
  render(<MachinesView projectId="p1" space="default" />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MachinesView (US-1201 AC-3)', () => {
  it('lists each intent with the machines that worked on it: host, clone, last stage and when', async () => {
    setup();
    const [first] = await screen.findAllByTestId('machines-view-intent');
    expect(window.bridge.getMachines).toHaveBeenCalledWith('p1', 'default');
    expect(within(first).getByText('cost')).toBeTruthy();
    expect(within(first).getByText('macbookpro')).toBeTruthy();
    expect(within(first).getByText('95cba7b6a821')).toBeTruthy();
    expect(within(first).getByText('Code Generation')).toBeTruthy();
    expect(first.closest('.lcars-card')).toBeTruthy();
  });

  it('marks the same story on two machines or two branches as a possible collision', async () => {
    setup();
    const flags = await screen.findAllByTestId('machines-view-flag');
    expect(flags.map((f) => f.textContent)).toEqual([
      'Möjlig krockUS-0209 pågår på 2 datorer: imac, macbookpro',
      'Möjlig krockUS-0209 finns på 2 grenar: origin/feat/US-0209, origin/fix/US-0209'
    ]);
    const intents = screen.getAllByTestId('machines-view-intent');
    expect(intents).toHaveLength(2);
    expect(within(intents[0]).getByText('Möjlig krock').className).toContain('lcars-chip--warn');
    expect(within(intents[1]).queryByText('Möjlig krock')).toBeNull();
    expect(within(intents[1]).getByText('–')).toBeTruthy(); // no stage yet
  });

  it("lists origin's story branches with the commits that are not in main", async () => {
    setup();
    const branches = await screen.findAllByTestId('machines-view-branch');
    expect(branches[0].textContent).toBe('origin/feat/US-0209 · 4 commits som inte finns i main');
  });

  it('says so when there are no shards and no branches, and when the read fails', async () => {
    setup({ intents: [{ dirName: '261116-b', slug: 'b', stories: [], inProgress: true, machines: [] }], branches: [], flags: [] });
    expect(await screen.findByText('Inga intents har audit-shards ännu.')).toBeTruthy();
    expect(screen.getByText('Inga storygrenar på origin med commits utanför main.')).toBeTruthy();
    cleanup();
    window.bridge = { getMachines: vi.fn(async () => Promise.reject(new Error('nope'))) };
    render(<MachinesView projectId="p1" space="default" />);
    expect((await screen.findByRole('alert')).textContent).toBe('Datorerna kunde inte läsas: nope');
  });
});

// US-0050 item 5: the heading, the intents and the branches join the view's entrance.
describe('MachinesView entrance (US-0050)', () => {
  it('lets the heading, each intent and each branch rise with the entrance, staggered', async () => {
    setup();
    const intents = await screen.findAllByTestId('machines-view-intent');
    expect(screen.getByTestId('machines-view').querySelector('.lcars-heading').classList.contains('lcars-e-rise')).toBe(true);
    expect(intents.every((el) => el.classList.contains('lcars-e-rise'))).toBe(true);
    expect(intents[0].style.getPropertyValue('--i')).toBe('1');
    expect(screen.getAllByTestId('machines-view-branch').every((el) => el.classList.contains('lcars-e-rise'))).toBe(true);
  });
});
