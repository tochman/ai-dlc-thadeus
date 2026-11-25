// US-0303 FR3.4, FR4.2, FR4.3: loadVelocity reads every intent's audit and keeps a missing record (no audit folder), an
// unreadable one (a read error) and an empty one apart; the missing and unreadable ones are named with their paths.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadVelocity } from '../../src/main/projectService.js';

const TMP_BASE = path.join(process.cwd(), 'tests/.tmp');
const INTENTS = 'aidlc/spaces/default/intents';
const block = (time, event, fields = {}) =>
  [`## ${event}`, `**Timestamp**: ${time}`, `**Event**: ${event}`, ...Object.entries(fields).map(([k, v]) => `**${k}**: ${v}`), '', '---', ''].join('\n');

const intents = [
  { dirName: '261110-finished', slug: 'finished', status: 'complete', request: 'US-0301 timeline' },
  { dirName: '261111-running', slug: 'running', status: 'in-flight', request: null },
  { dirName: '261112-no-audit', slug: 'no-audit', status: 'archived', request: null },
  { dirName: '261113-unreadable', slug: 'unreadable', status: 'in-flight', request: null },
  { dirName: '261114-empty', slug: 'empty', status: 'in-flight', request: null }
];
const features = {
  available: true,
  overviewPath: 'docs/FEATURES.md',
  epics: [
    {
      id: 'EPIC-03',
      file: 'docs/features/epic-03.md',
      parsed: { stories: [{ id: 'US-0301', title: 'Timeline', status: 'done', statusText: 'Released in v0.2.0' }] }
    },
    { id: 'EPIC-04', file: 'docs/features/epic-04.md', parsed: null }
  ]
};

describe('loadVelocity (US-0303 FR3.4, FR4.2, FR4.3)', () => {
  let root;
  let outside;
  beforeEach(async () => {
    await fs.mkdir(TMP_BASE, { recursive: true });
    root = await fs.realpath(await fs.mkdtemp(path.join(TMP_BASE, 'velocity-')));
    outside = await fs.realpath(await fs.mkdtemp(path.join(TMP_BASE, 'velocity-outside-')));
    const audit = async (dir, text) => {
      await fs.mkdir(path.join(root, INTENTS, dir, 'audit'), { recursive: true });
      if (text !== undefined) await fs.writeFile(path.join(root, INTENTS, dir, 'audit', 'hosta-aaaaaaaaaaaa.md'), text);
    };
    await audit('261110-finished', block('2026-11-10T10:00:00Z', 'WORKFLOW_STARTED') + block('2026-11-10T12:00:00Z', 'WORKFLOW_COMPLETED'));
    await audit(
      '261111-running',
      block('2026-11-11T10:00:00Z', 'WORKFLOW_STARTED') + block('2026-11-11T10:30:00Z', 'STAGE_STARTED', { Stage: 'code-generation' })
    );
    await fs.mkdir(path.join(root, INTENTS, '261112-no-audit'), { recursive: true });
    await audit('261113-unreadable');
    await fs.writeFile(path.join(outside, 'x.md'), block('2026-11-13T10:00:00Z', 'WORKFLOW_STARTED'));
    await fs.symlink(path.join(outside, 'x.md'), path.join(root, INTENTS, '261113-unreadable', 'audit', 'x.md')); // escapes the root
    await audit('261114-empty', '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('reads the finished, running and empty intents, and names the missing and unreadable ones with their paths', async () => {
    const v = await loadVelocity(root, 'default', intents, features, { tags: [], history: null, featuresDir: 'docs/features' });
    const rows = Object.fromEntries(v.intents.map((r) => [r.dirName, r]));
    expect(Object.keys(rows).sort()).toEqual(['261110-finished', '261111-running', '261114-empty']);
    expect(rows['261110-finished']).toMatchObject({ finished: true, activeMs: 2 * 3600e3, empty: false });
    expect(rows['261111-running']).toMatchObject({ finished: false, empty: false });
    expect(rows['261114-empty']).toMatchObject({ finished: false, empty: true, totalMs: null });

    const missing = v.sources.missing;
    expect(missing).toContainEqual({ kind: 'missing', path: `${INTENTS}/261112-no-audit/audit` });
    expect(missing).toContainEqual(expect.objectContaining({ kind: 'unreadable', path: `${INTENTS}/261113-unreadable/audit`, error: expect.any(String) }));
    expect(missing).toContainEqual({ kind: 'epic', path: 'docs/features/epic-04.md' });
    expect(missing).toContainEqual({ kind: 'git', path: 'docs/features' });
    expect(missing.some((m) => m.path.includes('261114-empty'))).toBe(false); // empty is not missing

    expect(v.sources).toMatchObject({ intents: 3, shards: 2, epicFiles: ['docs/features/epic-03.md'], git: null });
    expect(v.stories.map((s) => s.id)).toEqual(['US-0301']);
  });

  it('an archived intent is finished when it was complete, else neither finished nor running (US-0513 AC6.1.2, AC6.1.3)', async () => {
    const rowOf = async (over) => {
      const v = await loadVelocity(root, 'default', [{ ...intents[1], ...over }], features); // an audit without WORKFLOW_COMPLETED
      return { ...v.intents[0], running: v.project.running };
    };
    const archived = { status: 'archived', stateStatus: 'Archived' };
    expect(await rowOf({ ...archived, archivedFrom: 'Completed' })).toMatchObject({ finished: true, archived: true, running: 0 });
    expect(await rowOf({ ...archived, archivedFrom: 'Running' })).toMatchObject({ finished: false, archived: true, running: 0 });
    expect(await rowOf({ status: 'complete' })).toMatchObject({ finished: true, archived: false });
    expect(await rowOf({})).toMatchObject({ finished: false, archived: false, running: 1 });
  });
});
