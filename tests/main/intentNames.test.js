// US-0508 FR1.1, FR1.3, FR1.4, NFR3: the display names the app keeps in `.thadeus/intent-names.json`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { NAMES_PATH, readIntentNames, setIntentName } from '../../src/main/intentNames.js';
import { t } from '../../src/shared/i18n.js';

let root;
const intents = [
  { dirName: '261123-rename-and-clean', slug: 'rename-and-clean', aidlcSlug: 'rename-and-clean' },
  { dirName: '261122-other', slug: 'shown-name', aidlcSlug: 'other' }
];
const writeNames = (text) => fs.mkdir(path.join(root, '.thadeus'), { recursive: true }).then(() => fs.writeFile(path.join(root, NAMES_PATH), text));
const readNames = async () => JSON.parse(await fs.readFile(path.join(root, NAMES_PATH), 'utf8'));

beforeEach(async () => {
  root = await openRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'intent-names-')));
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

describe('readIntentNames', () => {
  it('gives {} when the file is missing', async () => {
    expect(await readIntentNames(root)).toEqual({});
  });

  it('gives {} for broken JSON or a non-object, and logs it (NFR3)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await writeNames('{ "261122-other": ');
    expect(await readIntentNames(root)).toEqual({});
    await writeNames('["x"]');
    expect(await readIntentNames(root)).toEqual({});
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('reads the names and drops entries that are not strings', async () => {
    await writeNames(JSON.stringify({ '261122-other': 'shown-name', '261123-x': 42 }));
    expect(await readIntentNames(root)).toEqual({ '261122-other': 'shown-name' });
  });
});

describe('setIntentName', () => {
  it('saves a valid, trimmed name and keeps the other entries (FR1.1)', async () => {
    await writeNames(JSON.stringify({ '261122-other': 'shown-name' }));
    expect(await setIntentName(root, '261123-rename-and-clean', '  tidy-up-2 ', { intents })).toEqual({ ok: true, name: 'tidy-up-2' });
    expect(await readNames()).toEqual({ '261122-other': 'shown-name', '261123-rename-and-clean': 'tidy-up-2' });
  });

  it('creates .thadeus/ when it is missing', async () => {
    expect(await setIntentName(root, '261123-rename-and-clean', 'rename-and-clean', { intents })).toEqual({ ok: true, name: 'rename-and-clean' });
    expect(await readNames()).toEqual({ '261123-rename-and-clean': 'rename-and-clean' });
  });

  it.each(['has space', 'a/b', '..', 'Upper', 'x'.repeat(61), 'ok_not'])('refuses %j by the slug rules and saves nothing (FR1.3)', async (name) => {
    const res = await setIntentName(root, '261123-rename-and-clean', name, { intents });
    expect(res).toEqual({ ok: false, error: t('intents.rename.invalid', { name: name.trim() }) });
    await expect(fs.access(path.join(root, NAMES_PATH))).rejects.toThrow();
  });

  it("refuses a name taken by another intent's slug or display name (FR1.3)", async () => {
    for (const name of ['other', 'shown-name']) {
      expect(await setIntentName(root, '261123-rename-and-clean', name, { intents })).toEqual({ ok: false, error: t('intents.rename.taken', { name }) });
    }
    await expect(fs.access(path.join(root, NAMES_PATH))).rejects.toThrow();
  });

  it('an empty name removes the entry, so the folder name shows again (FR1.4)', async () => {
    await writeNames(JSON.stringify({ '261122-other': 'shown-name', '261123-rename-and-clean': 'tidy' }));
    expect(await setIntentName(root, '261123-rename-and-clean', '   ', { intents })).toEqual({ ok: true, name: null });
    expect(await readNames()).toEqual({ '261122-other': 'shown-name' });
  });

  it('refuses an unknown intent and a name that is not a string', async () => {
    await expect(setIntentName(root, '261101-nope', 'x', { intents })).rejects.toThrow(t('intents.rename.unknown', { name: '261101-nope' }));
    await expect(setIntentName(root, '261122-other', 7, { intents })).rejects.toThrow();
  });
});
