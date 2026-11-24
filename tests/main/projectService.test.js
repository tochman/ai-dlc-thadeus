import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { detectProject, foundFrameworks, loadIntentDetail, loadIntentList } from '../../src/main/projectService.js';
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

  it('US-1406 BR4.1: the fixture project has no saved framework, so it asks, with what it found (AC2.2.1)', async () => {
    const root = await openRoot(path.join(FIXTURES, 'project'));
    expect(await detectProject(root)).toEqual({
      framework: null,
      source: 'ask',
      found: { aidlc: true, speckit: false },
      reason: null,
      views: viewsFor(null),
      defaultView: 'setup',
      isAidlc: false,
      activeSpace: null,
      spaces: []
    });
  });

  it('US-1406 BR4.1: no saved file asks whatever is found: one, both or neither (AC2.2.1)', async () => {
    for (const [opts, found] of [
      [{ spaces: ['team'] }, { aidlc: true, speckit: false }],
      [{ speckit: true }, { aidlc: false, speckit: true }],
      [
        { spaces: ['default'], speckit: true },
        { aidlc: true, speckit: true }
      ],
      [{}, { aidlc: false, speckit: false }],
      [{ spaces: [] }, { aidlc: false, speckit: false }]
    ]) {
      expect(await detectProject(await fixture(opts))).toMatchObject({
        framework: null,
        source: 'ask',
        found,
        reason: null,
        isAidlc: false,
        activeSpace: null
      });
    }
  });

  it('US-1406 BR4.1: foundFrameworks gives the same found as detection, and reads only', async () => {
    const root = await fixture({ spaces: ['default'], speckit: true });
    expect(await foundFrameworks(root)).toEqual({ aidlc: true, speckit: true });
    expect(await foundFrameworks(await fixture({ spaces: [] }))).toEqual({ aidlc: false, speckit: false });
    expect(await foundFrameworks(await fixture({ speckit: true }))).toEqual({ aidlc: false, speckit: true });
  });

  it('US-1401 BR1.2: a saved speckit with only .specify/ is Spec Kit (AC1.1.3)', async () => {
    const res = await detectProject(await fixture({ speckit: true, saved: { version: 1, framework: 'speckit' } }));
    expect(res).toEqual({
      framework: 'speckit',
      source: 'file',
      found: { aidlc: false, speckit: true },
      reason: null,
      views: viewsFor('speckit'),
      defaultView: 'specs',
      isAidlc: false,
      activeSpace: null,
      spaces: []
    });
  });

  it('US-1406 BR4.1: a saved aidlc is followed with its active space (FR1.2)', async () => {
    const res = await detectProject(await fixture({ spaces: ['team'], speckit: true, saved: { version: 1, framework: 'aidlc' } }));
    expect(res).toMatchObject({ framework: 'aidlc', source: 'file', reason: null, isAidlc: true, activeSpace: 'team', spaces: ['team'] });
  });

  it('US-1408 BR1.4: an unusable file with an empty aidlc/spaces/ gives no framework and today’s reason', async () => {
    const empty = await detectProject(await fixture({ spaces: [], saved: '[]' }));
    expect(empty).toMatchObject({ framework: null, source: 'detected', isAidlc: false });
    expect(empty.reason).toMatch(/space/);
  });

  it('US-1408 BR1.5: a saved speckit with both folders is followed, with no question (AC1.2.1)', async () => {
    const both = await fixture({ spaces: ['default'], speckit: true, saved: { version: 1, framework: 'speckit' } });
    expect(await detectProject(both)).toMatchObject({ framework: 'speckit', source: 'file', reason: null, activeSpace: null });
  });

  it('US-1406 BR4.1: a newer-version file keeps U2’s detection with its reason', async () => {
    const res = await detectProject(await fixture({ spaces: ['default'], saved: { version: 2, framework: 'aidlc' } }));
    expect(res).toMatchObject({ framework: 'aidlc', source: 'detected' });
    expect(res.reason).toContain(t('projectFile.reason.unknownVersion'));
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

  it('US-1406 BR4.1: a plain folder with no saved file asks (FR1.2)', async () => {
    const root = await openRoot(path.join(FIXTURES, 'plain-folder'));
    expect(await detectProject(root)).toMatchObject({ framework: null, source: 'ask', isAidlc: false, reason: null });
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

  it('US-0508 FR1.6, NFR3: the list shows the display names from .thadeus/intent-names.json; a broken file shows the slugs', async () => {
    const root = await projectWith({ '261123-rename-and-clean': '', '261122-other': '' });
    await fs.mkdir(path.join(tmp, '.thadeus'));
    await fs.writeFile(path.join(tmp, '.thadeus/intent-names.json'), JSON.stringify({ '261122-other': 'tidy-up' }));
    let { intents } = await loadIntentList(root, 'default');
    expect(intents.find((i) => i.dirName === '261122-other')).toMatchObject({ slug: 'tidy-up', aidlcSlug: 'other' });
    expect(intents.find((i) => i.dirName === '261123-rename-and-clean')).toMatchObject({ slug: 'rename-and-clean' });

    await fs.writeFile(path.join(tmp, '.thadeus/intent-names.json'), '{ broken');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    ({ intents } = await loadIntentList(root, 'default'));
    expect(intents.find((i) => i.dirName === '261122-other')).toMatchObject({ slug: 'other', aidlcSlug: 'other' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
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
