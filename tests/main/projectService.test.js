import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { detectProject, loadIntentDetail, loadIntentList } from '../../src/main/projectService.js';
import { viewsFor } from '../../src/shared/frameworkViews.js';
import { t } from '../../src/shared/i18n.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
const TMP = path.resolve(__dirname, '../.tmp/detect');

/**
 * A fresh fixture folder per test: `aidlc/spaces/<name>/` and `.specify/memory/constitution.md` placeholders only, and
 * `.thadeus/project.json` when `saved` is given (an object is written as JSON, a string as it is).
 */
async function fixture({ spaces, speckit = false, saved } = {}) {
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
  if (saved !== undefined) {
    await fs.mkdir(path.join(TMP, '.thadeus'));
    await fs.writeFile(path.join(TMP, '.thadeus/project.json'), typeof saved === 'string' ? saved : JSON.stringify(saved));
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

  it('US-1408 BR1.5: a saved speckit with both folders is followed, with no question even with askWhenBoth (AC1.2.1)', async () => {
    const both = await fixture({ spaces: ['default'], speckit: true, saved: { version: 1, framework: 'speckit' } });
    expect(await detectProject(both, { askWhenBoth: true })).toMatchObject({ framework: 'speckit', source: 'file', reason: null, activeSpace: null });
  });

  it('US-1408 BR1.4: a saved speckit with no .specify/ falls back to aidlc and says the saved one was not found (AC1.2.3)', async () => {
    const res = await detectProject(await fixture({ spaces: ['default'], saved: { version: 1, framework: 'speckit' } }));
    expect(res).toMatchObject({ framework: 'aidlc', source: 'detected', activeSpace: 'default' });
    expect(res.reason).toBe(t('projectFile.savedNotFound', { file: '.thadeus/project.json' }));
  });

  it('US-1408 BR1.3: an unusable file falls back, and the reason names the file and why (AC1.2.3)', async () => {
    const res = await detectProject(await fixture({ spaces: ['default'], saved: '{"version": 1,' }));
    expect(res).toMatchObject({ framework: 'aidlc', source: 'detected' });
    expect(res.reason).toContain('.thadeus/project.json');
    expect(res.reason).toContain(t('projectFile.reason.unreadable'));
    const bogus = await detectProject(await fixture({ spaces: ['default'], saved: { version: 1, framework: '<b>bogus</b>' } }));
    expect(bogus).toMatchObject({ framework: 'aidlc', source: 'detected' });
    expect(bogus.reason).toContain(t('projectFile.reason.unknownFramework'));
    expect(bogus.reason).not.toContain('bogus'); // NFR1.1
  });

  it('US-1408 BR1.3: a missing file falls back with no reason, as before', async () => {
    expect(await detectProject(await fixture({ spaces: ['default'], speckit: true }))).toMatchObject({ framework: 'aidlc', source: 'detected', reason: null });
  });

  it('US-1408: an unusable file in a folder with neither framework gives both reasons', async () => {
    const res = await detectProject(await fixture({ saved: '[]' }));
    expect(res).toMatchObject({ framework: null, source: 'detected' });
    expect(res.reason).toContain(t('projectFile.reason.invalid'));
    expect(res.reason).toMatch(/aidlc\/spaces/);
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
