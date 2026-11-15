import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { detectProject, loadIntentDetail, loadIntentList } from '../../src/main/projectService.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');

describe('projectService.detectProject', () => {
  it('recognises the fixture project with active space "default" (FR1.2)', async () => {
    const root = await openRoot(path.join(FIXTURES, 'project'));
    expect(await detectProject(root)).toEqual({ isAidlc: true, activeSpace: 'default', spaces: ['default'] });
  });

  it('loads the intent list and one intent detail from the fixture project', async () => {
    const root = await openRoot(path.join(FIXTURES, 'project'));
    const { intents } = await loadIntentList(root, 'default');
    const epic29 = intents.find((i) => i.dirName === '261112-epic29-small-k2-fixes');
    expect(epic29).toMatchObject({ active: true, done: 6, executed: 9, request: expect.stringMatching(/^EPIC-29/) });

    const detail = await loadIntentDetail(root, 'default', '261110-epic02-finish');
    expect(detail.graph.boltDag.units).toHaveLength(6);
    expect(detail.events).toEqual([]); // audit shards live in tests/fixtures/audit, not in the tree
    await expect(loadIntentDetail(root, 'default', '../x')).rejects.toThrow(/Ogiltigt namn/);
  });

  it('reports isAidlc:false with a reason for a plain folder (FR1.2)', async () => {
    const root = await openRoot(path.join(FIXTURES, 'plain-folder'));
    const res = await detectProject(root);
    expect(res.isAidlc).toBe(false);
    expect(res.reason).toMatch(/aidlc\/spaces/);
  });
});
