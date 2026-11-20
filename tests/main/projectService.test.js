import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
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

describe('projectService parked intents (US-0510)', () => {
  let tmp;
  afterEach(() => fs.rm(tmp, { recursive: true, force: true }));

  const entry = (title, at, event, extra = '') => `## ${title}\n**Timestamp**: ${at}\n**Event**: ${event}\n${extra}\n---\n\n`;
  /** A temporary project with one intent per audit text. */
  async function projectWith(audits) {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'parked-'));
    for (const [dirName, text] of Object.entries(audits)) {
      await fs.mkdir(path.join(tmp, 'aidlc/spaces/default/intents', dirName, 'audit'), { recursive: true });
      await fs.writeFile(path.join(tmp, 'aidlc/spaces/default/intents', dirName, 'audit/host-1.md'), `# Audit\n\n${text}`);
    }
    return openRoot(tmp);
  }

  it('an intent whose audit ends with a parked event is listed parked, with its stage (AC4.1.1)', async () => {
    const root = await projectWith({ '261120-a': entry('Workflow Parked', '2026-11-20T08:00:00Z', 'WORKFLOW_PARKED', '**Stage**: code-generation\n') });
    const { intents } = await loadIntentList(root, 'default');
    expect(intents.find((i) => i.dirName === '261120-a')).toMatchObject({
      parked: true,
      parkedStage: 'code-generation',
      parkedAt: Date.parse('2026-11-20T08:00:00Z')
    });
  });

  it('an intent whose audit ends with an unparked event is not (AC4.1.6)', async () => {
    const text =
      entry('Workflow Parked', '2026-11-20T08:00:00Z', 'WORKFLOW_PARKED', '**Stage**: code-generation\n') +
      entry('Workflow Unparked', '2026-11-20T09:00:00Z', 'WORKFLOW_UNPARKED');
    const root = await projectWith({ '261120-b': text });
    const { intents } = await loadIntentList(root, 'default');
    expect(intents.find((i) => i.dirName === '261120-b')).toMatchObject({ parked: false, parkedStage: null });
  });
});
