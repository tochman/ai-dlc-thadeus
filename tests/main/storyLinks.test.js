// US-1303 FR1, FR5, NFR1: which stories an intent delivered, and the hand links in .thadeus/story-links.json.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { LINKS_PATH, deliveredStories, loadDelivered, readHandLinks, setHandLink } from '../../src/main/storyLinks.js';

describe('deliveredStories (US-1303 FR1.1, FR1.2)', () => {
  it('takes the story ids in the initial description', () => {
    expect(deliveredStories('{"description":"US-1303 and US-1304"}', '# Requirements — US-0001')).toEqual(['US-1303', 'US-1304']);
  });

  it('uses the first line of requirements.md only when the description names none', () => {
    expect(deliveredStories('{"description":"cost roll-up"}', '# Requirements — US-1303 Cost per story\n\nSee US-0209.')).toEqual(['US-1303']);
  });

  it('gives none when neither names a story', () => {
    expect(deliveredStories('', '')).toEqual([]);
    expect(deliveredStories(null, '# Requirements\n\nUS-0209 is reused.')).toEqual([]);
  });
});

describe('loadDelivered and the hand links (US-1303 FR1, FR5, NFR1)', () => {
  let root;
  const base = (dir) => path.join(root, 'aidlc/spaces/default/intents', dir);
  async function intent(dir, { desc, req } = {}) {
    await fs.mkdir(path.join(base(dir), 'inception/requirements-analysis'), { recursive: true });
    if (desc != null) await fs.writeFile(path.join(base(dir), 'project-description.json'), JSON.stringify({ description: desc }));
    if (req != null) await fs.writeFile(path.join(base(dir), 'inception/requirements-analysis/requirements.md'), req);
  }
  beforeEach(async () => {
    root = await openRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'story-links-')));
  });
  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('reads each intent’s stories; missing files give []; a hand link replaces both', async () => {
    await intent('261126-a', { desc: 'US-1303', req: '# Requirements — US-1304' });
    await intent('261126-b', { desc: 'no story', req: '# Requirements — US-1305\nUS-1306' });
    await intent('261126-c');
    await intent('261126-d', { desc: 'US-0001' });
    await setHandLink(root, '261126-d', ['US-1307', 'US-1307', 'US-1308']);
    const r = await loadDelivered(root, 'default', ['261126-a', '261126-b', '261126-c', '261126-d']);
    expect(r.stories).toEqual({ '261126-a': ['US-1303'], '261126-b': ['US-1305'], '261126-c': [], '261126-d': ['US-1307', 'US-1308'] });
    expect(r.hand).toEqual({ '261126-d': ['US-1307', 'US-1308'] });
  });

  it('writes a link, removes it again on [], and keeps the others', async () => {
    expect(await readHandLinks(root)).toEqual({});
    await setHandLink(root, '261126-a', ['US-1303']);
    expect(await setHandLink(root, '261126-b', ['US-1304'])).toEqual({ '261126-a': ['US-1303'], '261126-b': ['US-1304'] });
    expect(JSON.parse(await fs.readFile(path.join(root, LINKS_PATH), 'utf8'))).toEqual({ '261126-a': ['US-1303'], '261126-b': ['US-1304'] });
    expect(await setHandLink(root, '261126-a', [])).toEqual({ '261126-b': ['US-1304'] });
    expect(await readHandLinks(root)).toEqual({ '261126-b': ['US-1304'] });
  });

  it('refuses a bad dir name or story id and writes nothing', async () => {
    await expect(setHandLink(root, '../x', ['US-1303'])).rejects.toThrow();
    await expect(setHandLink(root, 42, ['US-1303'])).rejects.toThrow();
    await expect(setHandLink(root, '261126-a', ['US-13033'])).rejects.toThrow();
    await expect(setHandLink(root, '261126-a', 'US-1303')).rejects.toThrow();
    await expect(fs.stat(path.join(root, LINKS_PATH))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses a .thadeus that leads out of the root', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'story-links-out-'));
    await fs.symlink(outside, path.join(root, '.thadeus'));
    await expect(setHandLink(root, '261126-a', ['US-1303'])).rejects.toThrow();
    expect(await fs.readdir(outside)).toEqual([]);
    await fs.rm(outside, { recursive: true, force: true });
  });

  it('reads a broken file as {} and logs it; bad entries are left out', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.mkdir(path.join(root, '.thadeus'));
    await fs.writeFile(path.join(root, LINKS_PATH), '{ "261126-a": ');
    expect(await readHandLinks(root)).toEqual({});
    expect(warn).toHaveBeenCalledOnce();
    await fs.writeFile(path.join(root, LINKS_PATH), JSON.stringify({ '261126-a': ['US-1303', 'bad'], '../x': ['US-1303'], '261126-b': 'US-1304' }));
    expect(await readHandLinks(root)).toEqual({ '261126-a': ['US-1303'] });
    warn.mockRestore();
  });
});
