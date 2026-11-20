// US-0607 FR1.1, FR1.2: the local record of release planning actions, one JSON file per project in the app's own
// data folder, outside the working tree.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  addAction,
  addContent,
  addThadeus,
  markCommitted,
  markConflict,
  readRecord,
  recordFile,
  removeActions,
  resolveEntry,
  setProtectedMain
} from '../../src/main/planningRecord.js';

let userData;
beforeEach(async () => {
  userData = await fs.mkdtemp(path.join(os.tmpdir(), 'planning-record-'));
});
afterEach(() => fs.rm(userData, { recursive: true, force: true }));

describe('planning record (US-0607 FR1.1, FR1.2)', () => {
  it('keeps one file per project root under <userData>/planning', () => {
    const a = recordFile(userData, '/work/a');
    expect(path.dirname(a)).toBe(path.join(userData, 'planning'));
    expect(a).toMatch(/[0-9a-f]{40}\.json$/);
    expect(recordFile(userData, '/work/a')).toBe(a);
    expect(recordFile(userData, '/work/b')).not.toBe(a);
  });

  it('adds an action and reads it back as pending, with an id and the time (FR1.1)', async () => {
    const action = await addAction(userData, '/work/a', { kind: 'setRelease', storyIds: ['US-0001'], version: 'v1.2.0' });
    expect(action).toMatchObject({ kind: 'setRelease', storyIds: ['US-0001'], version: 'v1.2.0', state: 'pending' });
    expect(action.id).toMatch(/\S/);
    expect(Number.isNaN(Date.parse(action.at))).toBe(false);
    expect(await readRecord(userData, '/work/a')).toEqual({ actions: [action] });
    expect(await readRecord(userData, '/work/b')).toEqual({ actions: [] });
  });

  it('reads a missing or a corrupt file as an empty record, and refuses an unknown kind', async () => {
    expect(await readRecord(userData, '/work/a')).toEqual({ actions: [] });
    await fs.mkdir(path.join(userData, 'planning'), { recursive: true });
    await fs.writeFile(recordFile(userData, '/work/a'), '{ not json');
    expect(await readRecord(userData, '/work/a')).toEqual({ actions: [] });
    await fs.writeFile(recordFile(userData, '/work/a'), JSON.stringify({ actions: [{ id: 'x', kind: 'rm -rf' }, 'junk'] }));
    expect(await readRecord(userData, '/work/a')).toEqual({ actions: [] });
    await expect(addAction(userData, '/work/a', { kind: 'push', storyIds: [], version: 'v1.0.0' })).rejects.toThrow();
  });

  it('writes atomically: the folder holds only the record, which always parses', async () => {
    await Promise.all([1, 2, 3].map((n) => addAction(userData, '/work/a', { kind: 'createRelease', storyIds: [], version: `v1.0.${n}` })));
    const names = await fs.readdir(path.join(userData, 'planning'));
    expect(names).toEqual([path.basename(recordFile(userData, '/work/a'))]);
    const record = JSON.parse(await fs.readFile(recordFile(userData, '/work/a'), 'utf8'));
    expect(record.actions.map((a) => a.version).sort()).toEqual(['v1.0.1', 'v1.0.2', 'v1.0.3']);
  });

  it('removes actions by id and marks actions committed (FR1.2)', async () => {
    const a = await addAction(userData, '/work/a', { kind: 'setRelease', storyIds: ['US-0001'], version: 'v1.0.0' });
    const b = await addAction(userData, '/work/a', { kind: 'setRelease', storyIds: ['US-0002'], version: null });
    await markCommitted(userData, '/work/a', [a.id]);
    expect((await readRecord(userData, '/work/a')).actions.map((x) => [x.id, x.state])).toEqual([
      [a.id, 'committed'],
      [b.id, 'pending']
    ]);
    await removeActions(userData, '/work/a', [a.id]);
    expect((await readRecord(userData, '/work/a')).actions.map((x) => x.id)).toEqual([b.id]);
  });

  // US-0608 FR2.2, FR5.1: a change that is not an action is kept as the file's new content and the hash it was based on.
  it('keeps a content entry and reads it back; a later save of the same file replaces it and keeps its earlier base', async () => {
    const base = 'a'.repeat(64);
    const one = await addContent(userData, '/work/a', {
      file: 'docs/features/epic-01.md',
      baseHash: base,
      content: 'one\n',
      storyIds: ['US-0101'],
      by: 'editor'
    });
    expect(one).toMatchObject({ kind: 'content', file: 'docs/features/epic-01.md', baseHash: base, content: 'one\n', storyIds: ['US-0101'], state: 'pending' });
    expect((await readRecord(userData, '/work/a')).actions).toEqual([one]);
    const two = await addContent(userData, '/work/a', {
      file: 'docs/features/epic-01.md',
      baseHash: 'b'.repeat(64),
      content: 'two\n',
      storyIds: [],
      by: 'watcher'
    });
    const { actions } = await readRecord(userData, '/work/a');
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: two.id,
      content: 'two\n',
      baseHash: 'b'.repeat(64),
      earlier: expect.arrayContaining([base]),
      storyIds: ['US-0101']
    });
  });

  it('drops a content entry outside the docs or without a base hash, and refuses to add one (FR2.2)', async () => {
    const good = { id: 'g', kind: 'content', file: 'docs/FEATURES.md', baseHash: null, content: 'x', storyIds: [], state: 'pending', version: null };
    await fs.mkdir(path.join(userData, 'planning'), { recursive: true });
    await fs.writeFile(
      recordFile(userData, '/work/a'),
      JSON.stringify({
        actions: [good, { ...good, id: 'o', file: '../outside.md' }, { ...good, id: 'abs', file: '/etc/x.md' }, { ...good, id: 'h', baseHash: undefined }]
      })
    );
    expect((await readRecord(userData, '/work/a')).actions.map((a) => a.id)).toEqual(['g']);
    await expect(addContent(userData, '/work/a', { file: '../x.md', baseHash: null, content: '' })).rejects.toThrow();
  });

  it('marks an entry as a conflict and resolves it with a new base (FR5.2)', async () => {
    const e = await addContent(userData, '/work/a', { file: 'docs/FEATURES.md', baseHash: 'a'.repeat(64), content: 'mine\n' });
    await markConflict(userData, '/work/a', [e.id]);
    expect((await readRecord(userData, '/work/a')).actions[0].state).toBe('conflict');
    await resolveEntry(userData, '/work/a', e.id, { baseHash: 'c'.repeat(64) });
    expect((await readRecord(userData, '/work/a')).actions[0]).toMatchObject({ state: 'pending', baseHash: 'c'.repeat(64), content: 'mine\n' });
  });

  // US-0609 FR3.1, FR3.2: a `thadeus` entry holds only the path of a changed app file, never its text.
  it('keeps a thadeus entry under .thadeus/ or on a harness path, one per file: a newer change replaces it', async () => {
    const one = await addThadeus(userData, '/work/a', { file: '.thadeus/tokens/i.json' });
    expect(one).toMatchObject({ kind: 'thadeus', file: '.thadeus/tokens/i.json', state: 'pending' });
    expect(one).not.toHaveProperty('content');
    const hook = await addThadeus(userData, '/work/a', { file: '.claude/settings.json', harness: 'claude' });
    const again = await addThadeus(userData, '/work/a', { file: '.thadeus/tokens/i.json' });
    const { actions } = await readRecord(userData, '/work/a');
    expect(actions.map((a) => [a.id, a.file])).toEqual([
      [hook.id, '.claude/settings.json'],
      [again.id, '.thadeus/tokens/i.json']
    ]);
    expect(again.id).not.toBe(one.id);
    expect(actions[0]).toMatchObject({ harness: 'claude' });
  });

  it('refuses a thadeus entry outside .thadeus/ and the harness paths, or with `..`, and drops one on read', async () => {
    for (const file of ['src/x.js', '.thadeus/../src/x.js', '../.thadeus/x', '/abs/.thadeus/x', '.thadeus', '.claude/other.json']) {
      await expect(addThadeus(userData, '/work/a', { file })).rejects.toThrow();
    }
    await fs.mkdir(path.join(userData, 'planning'), { recursive: true });
    const good = { id: 't', kind: 'thadeus', file: '.thadeus/x.json', at: new Date().toISOString(), state: 'pending' };
    await fs.writeFile(recordFile(userData, '/work/a'), JSON.stringify({ actions: [good, { ...good, id: 'bad', file: 'README.md' }] }));
    expect((await readRecord(userData, '/work/a')).actions.map((a) => a.id)).toEqual(['t']);
  });

  it('keeps protectedMain across later changes', async () => {
    await setProtectedMain(userData, '/work/a', true);
    const a = await addAction(userData, '/work/a', { kind: 'deleteRelease', storyIds: [], version: 'v1.0.0' });
    await removeActions(userData, '/work/a', [a.id]);
    expect(await readRecord(userData, '/work/a')).toEqual({ protectedMain: true, actions: [] });
  });
});
