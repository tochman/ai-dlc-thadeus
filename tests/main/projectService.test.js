import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import {
  detectProject,
  foundFrameworks,
  inProgress,
  loadCrossMachineCost,
  loadHandoffInputs,
  loadIntentDetail,
  loadIntentList,
  loadPendingQuestions,
  readActiveSpace
} from '../../src/main/projectService.js';
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

describe('projectService archived intents (US-0513)', () => {
  const INTENTS = 'aidlc/spaces/default/intents';
  const roots = [];
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((r) => fs.rm(r, { recursive: true, force: true })));
  });

  const event = (at, name, fields = {}) =>
    [`## ${name}`, `**Timestamp**: ${at}`, `**Event**: ${name}`, ...Object.entries(fields).map(([k, v]) => `**${k}**: ${v}`), '', '---', ''].join('\n');
  const stateText = (status, from) =>
    `## Current Status\n- **Status**: ${status}\n${from ? `- **Archived From**: ${from}\n` : ''}- **Current Stage**: code-generation\n\n### CONSTRUCTION PHASE\n- [-] code-generation — EXECUTE\n`;
  const ASKED = event('2026-11-20T10:00:00Z', 'STAGE_AWAITING_APPROVAL', { Stage: 'code-generation' });

  /** A temporary project: `rows` is `{dirName: {row, state, from, audit}}`; `active` is written to active-intent. */
  async function projectWith(rows, active) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'archived-'));
    roots.push(dir);
    const base = path.join(dir, INTENTS);
    for (const [dirName, r] of Object.entries(rows)) {
      await fs.mkdir(path.join(base, dirName, 'audit'), { recursive: true });
      await fs.writeFile(path.join(base, dirName, 'aidlc-state.md'), stateText(r.state, r.from));
      await fs.writeFile(path.join(base, dirName, 'audit/host-1.md'), r.audit ?? '');
    }
    const index = Object.entries(rows).map(([dirName, r]) => ({ uuid: `u-${dirName}`, slug: dirName.slice(7), dirName, scope: 'feature', status: r.row }));
    await fs.writeFile(path.join(base, 'intents.json'), JSON.stringify(index));
    if (active) await fs.writeFile(path.join(base, 'active-intent'), `${active}\n`);
    return openRoot(dir);
  }
  const byName = async (root) => Object.fromEntries((await loadIntentList(root, 'default')).intents.map((i) => [i.dirName, i]));

  it('an intent archived in the index or in its state alone is listed archived, with what it was before (FR3.1, AC6.1.2)', async () => {
    const list = await byName(
      await projectWith({
        '261120-both': { row: 'archived', state: 'Archived', from: 'Completed' },
        '261120-index': { row: 'archived', state: 'Running' },
        '261120-state': { row: 'in-flight', state: 'Archived', from: 'Running' },
        '261120-open': { row: 'in-flight', state: 'Running' }
      })
    );
    expect(list['261120-both']).toMatchObject({ status: 'archived', archivedFrom: 'Completed' });
    expect(list['261120-index']).toMatchObject({ status: 'archived', archivedFrom: null });
    expect(list['261120-state']).toMatchObject({ status: 'archived', archivedFrom: 'Running' });
    expect(list['261120-open']).toMatchObject({ status: 'in-flight', archivedFrom: null });
  });

  it('an archived intent is never active, also when active-intent still names it (FR1.6, AC1.2.5)', async () => {
    const root = await projectWith({ '261120-a': { row: 'archived', state: 'Archived', from: 'Running', audit: ASKED } }, '261120-a');
    const intent = (await byName(root))['261120-a'];
    expect(intent).toMatchObject({ active: false, status: 'archived' });
    expect(inProgress(intent)).toBe(false);
  });

  it('a parked intent that is archived is not shown parked, and is parked again after unarchive (AC2.1.3)', async () => {
    const audit = event('2026-11-20T08:00:00Z', 'WORKFLOW_PARKED', { Stage: 'code-generation' }) + event('2026-11-21T08:00:00Z', 'WORKFLOW_ARCHIVED');
    const root = await projectWith({ '261120-a': { row: 'archived', state: 'Archived', from: 'Running', audit } });
    expect((await byName(root))['261120-a'].parked).toBe(false);

    const base = path.join(root, INTENTS);
    await fs.writeFile(path.join(base, '261120-a/aidlc-state.md'), stateText('Running'));
    await fs.writeFile(path.join(base, 'intents.json'), JSON.stringify([{ uuid: 'u', slug: 'a', dirName: '261120-a', status: 'in-flight' }]));
    await fs.appendFile(path.join(base, '261120-a/audit/host-1.md'), event('2026-11-22T08:00:00Z', 'WORKFLOW_UNARCHIVED'));
    expect((await byName(root))['261120-a']).toMatchObject({ status: 'in-flight', parked: true, parkedStage: 'code-generation' });
  });

  it('no question and no handoff from an archived intent waits (AC1.2.4)', async () => {
    for (const r of [
      { row: 'archived', state: 'Archived', from: 'Running' },
      { row: 'archived', state: 'Running' },
      { row: 'in-flight', state: 'Archived', from: 'Running' }
    ]) {
      const root = await projectWith({ '261120-a': { ...r, audit: ASKED } }, '261120-a');
      expect(await loadPendingQuestions({ root, space: 'default', projectId: 'p', name: 'p' })).toEqual([]);
      expect(await loadHandoffInputs(root, 'default')).toEqual([]);
    }
    const running = await projectWith({ '261120-a': { row: 'in-flight', state: 'Running', audit: ASKED } }, '261120-a');
    expect(await loadPendingQuestions({ root: running, space: 'default', projectId: 'p', name: 'p' })).toHaveLength(1);
    expect(await loadHandoffInputs(running, 'default')).toHaveLength(1);
  });

  it('the list follows the files: an archive by an agent shows on the next reload of that intent (FR3.5, AC3.1.4)', async () => {
    const root = await projectWith({ '261120-a': { row: 'in-flight', state: 'Running' } }, '261120-a');
    expect((await byName(root))['261120-a'].active).toBe(true);
    await fs.writeFile(path.join(root, INTENTS, '261120-a/aidlc-state.md'), stateText('Archived', 'Running'));
    const { intents } = await loadIntentList(root, 'default', ['261120-a']);
    expect(intents[0]).toMatchObject({ status: 'archived', archivedFrom: 'Running', active: false });
  });

  it('cost counts an archived intent as before it was archived (AC6.1.1)', async () => {
    const root = await projectWith({ '261120-a': { row: 'complete', state: 'Completed' } });
    const ledger = { workflows: { 'intent:u-261120-a': { totals: { usd: 4, tokens: { input: 10 } } } }, totals: { usd: 4, tokens: { input: 10 } } };
    const before = (await loadCrossMachineCost(root, 'default', (await loadIntentList(root, 'default')).intents, ledger)).summary;
    await fs.writeFile(path.join(root, INTENTS, '261120-a/aidlc-state.md'), stateText('Archived', 'Completed'));
    const after = (await loadCrossMachineCost(root, 'default', (await loadIntentList(root, 'default')).intents, ledger)).summary;
    expect(after.project.total.usd).toBe(4);
    expect(after).toEqual(before);
  });

  it('100 intents, 60 archived, read the same files as 100 that are not (NFR2, AC3.1.6)', async () => {
    const readsOf = async (status) => {
      const rows = {};
      for (let n = 0; n < 100; n++) {
        const archived = status === 'archived' && n < 60;
        rows[`261120-i${n}`] = {
          row: archived ? 'archived' : 'complete',
          state: archived ? 'Archived' : 'Completed',
          ...(archived ? { from: 'Completed' } : {})
        };
      }
      const root = await projectWith(rows);
      const spy = vi.spyOn(fs, 'readFile');
      await loadIntentList(root, 'default');
      const read = spy.mock.calls.map(([file]) => path.relative(root, String(file))).sort();
      spy.mockRestore();
      return read;
    };
    const plain = await readsOf('complete');
    expect(plain.length).toBeGreaterThan(200); // a state and an audit per intent
    expect(await readsOf('archived')).toEqual(plain);
  });

  it('reads the active space that AI-DLC is in (Constraints)', async () => {
    const root = await projectWith({ '261120-a': { row: 'complete', state: 'Completed' } });
    expect(await readActiveSpace(root)).toBe('default');
    await fs.mkdir(path.join(root, 'aidlc/spaces/team'));
    await fs.writeFile(path.join(root, 'aidlc/active-space'), 'team\n');
    expect(await readActiveSpace(root)).toBe('team');
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
