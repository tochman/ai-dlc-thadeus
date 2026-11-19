import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { detectProject, loadIntentDetail, loadIntentList } from '../../src/main/projectService.js';
import { viewsFor } from '../../src/shared/frameworkViews.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
const TMP = path.resolve(__dirname, '../.tmp/detect');

/** A fresh fixture folder per test: `aidlc/spaces/<name>/` and `.specify/memory/constitution.md` placeholders only. */
async function fixture({ spaces, speckit = false } = {}) {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
  if (spaces) {
    await fs.mkdir(path.join(TMP, 'aidlc/spaces'), { recursive: true });
    for (const s of spaces) await fs.mkdir(path.join(TMP, 'aidlc/spaces', s));
  }
  if (speckit) {
    await fs.mkdir(path.join(TMP, '.specify/memory'), { recursive: true });
    await fs.writeFile(path.join(TMP, '.specify/memory/constitution.md'), '# Constitution\n');
  }
  return openRoot(TMP);
}

describe('projectService.detectProject', () => {
  afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

  it('recognises the fixture project with active space "default" (FR1.2)', async () => {
    const root = await openRoot(path.join(FIXTURES, 'project'));
    expect(await detectProject(root)).toEqual({
      framework: 'aidlc',
      source: 'detected',
      found: { aidlc: true, speckit: false },
      reason: null,
      views: viewsFor('aidlc'),
      defaultView: 'intents',
      isAidlc: true,
      activeSpace: 'default',
      spaces: ['default']
    });
  });

  it('US-1401 BR1.2: only .specify/ is Spec Kit (AC1.1.3)', async () => {
    const res = await detectProject(await fixture({ speckit: true }));
    expect(res).toEqual({
      framework: 'speckit',
      source: 'detected',
      found: { aidlc: false, speckit: true },
      reason: null,
      views: viewsFor('speckit'),
      defaultView: 'specs',
      isAidlc: false,
      activeSpace: null,
      spaces: []
    });
  });

  it('US-1401 BR1.1: AI-DLC alone, or with .specify/, is AI-DLC until U4 switches the question on (AC1.1.3, AC1.1.4)', async () => {
    expect(await detectProject(await fixture({ spaces: ['team'] }))).toMatchObject({ framework: 'aidlc', activeSpace: 'team', spaces: ['team'] });
    const both = await detectProject(await fixture({ spaces: ['default'], speckit: true }));
    expect(both).toMatchObject({ framework: 'aidlc', source: 'detected', found: { aidlc: true, speckit: true }, isAidlc: true });
  });

  it('US-1401 BR1.3: both found with askWhenBoth gives no framework and asks (AC1.1.4)', async () => {
    const res = await detectProject(await fixture({ spaces: ['default'], speckit: true }), { askWhenBoth: true });
    expect(res).toMatchObject({ framework: null, source: 'ask', found: { aidlc: true, speckit: true }, defaultView: 'setup', isAidlc: false });
    expect(res.views).toEqual(viewsFor(null));
  });

  it('US-1401 BR1.4: neither, or an empty aidlc/spaces/, gives no framework and today’s reason', async () => {
    const none = await detectProject(await fixture());
    expect(none).toMatchObject({ framework: null, source: 'detected', found: { aidlc: false, speckit: false }, isAidlc: false });
    expect(none.reason).toMatch(/aidlc\/spaces/);
    const empty = await detectProject(await fixture({ spaces: [] }));
    expect(empty).toMatchObject({ framework: null, source: 'detected', isAidlc: false });
    expect(empty.reason).toMatch(/space/);
  });

  it('US-1401: a saved framework wins when it is still on disk, and is ignored when it is not', async () => {
    const both = await fixture({ spaces: ['default'], speckit: true });
    expect(await detectProject(both, { saved: 'speckit', askWhenBoth: true })).toMatchObject({ framework: 'speckit', source: 'file', reason: null });
    const onlyAidlc = await fixture({ spaces: ['default'] });
    expect(await detectProject(onlyAidlc, { saved: 'speckit' })).toMatchObject({ framework: 'aidlc', source: 'detected' });
    expect(await detectProject(onlyAidlc, { saved: 'bogus' })).toMatchObject({ framework: 'aidlc', source: 'detected' });
  });

  it('US-1401: a .specify file, not a folder, is not Spec Kit', async () => {
    const root = await fixture();
    await fs.writeFile(path.join(TMP, '.specify'), 'x');
    expect(await detectProject(root)).toMatchObject({ framework: null, found: { aidlc: false, speckit: false } });
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
