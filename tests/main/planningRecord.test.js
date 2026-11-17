// US-0607 FR1.1, FR1.2: the local record of release planning actions, one JSON file per project in the app's own
// data folder, outside the working tree.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addAction, markCommitted, readRecord, recordFile, removeActions, setProtectedMain } from '../../src/main/planningRecord.js';

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

  it('keeps protectedMain across later changes', async () => {
    await setProtectedMain(userData, '/work/a', true);
    const a = await addAction(userData, '/work/a', { kind: 'deleteRelease', storyIds: [], version: 'v1.0.0' });
    await removeActions(userData, '/work/a', [a.id]);
    expect(await readRecord(userData, '/work/a')).toEqual({ protectedMain: true, actions: [] });
  });
});
