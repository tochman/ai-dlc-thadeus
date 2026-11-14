import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { isEngineOwned, listTree, readForEdit, writeFileSafe } from '../../src/main/fileWrite.js';

let tmp;
let outside;
let root;
const write = async (rel, data) => {
  await fs.mkdir(path.dirname(path.join(tmp, rel)), { recursive: true });
  await fs.writeFile(path.join(tmp, rel), data);
};
const hashOf = (text) => createHash('sha256').update(text).digest('hex');

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'file-write-'));
  outside = await fs.mkdtemp(path.join(os.tmpdir(), 'file-write-outside-'));
  await write('docs/notes.md', '# Notes\n');
  await write('aidlc/spaces/default/intents/261114-x/aidlc-state.md', '# State\n');
  await write('aidlc/spaces/default/intents/261114-x/audit/host-1.md', 'row\n');
  await write('aidlc/spaces/default/intents/intents.json', '[]');
  await write('.claude/agents/aidlc-developer-agent.md', 'agent\n');
  await fs.writeFile(path.join(outside, 'secret.txt'), 'secret');
  await fs.symlink(path.join(outside, 'secret.txt'), path.join(tmp, 'link-out.txt'));
  root = await openRoot(tmp);
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.rm(outside, { recursive: true, force: true });
});

describe('safe writes (EPIC-10 US-1001, NFR6)', () => {
  it('refuses an absolute path, `..`, a symlink out of the root and engine-owned paths', async () => {
    const opened = await readForEdit(root, 'docs/notes.md');
    const expect_ = { expectMtime: opened.mtimeMs, expectHash: opened.hash };
    await expect(writeFileSafe(root, path.join(outside, 'secret.txt'), 'x', expect_)).rejects.toThrow();
    await expect(writeFileSafe(root, '../x.txt', 'x', expect_)).rejects.toThrow();
    await expect(writeFileSafe(root, 'link-out.txt', 'x', expect_)).rejects.toThrow();
    for (const rel of ['aidlc/spaces/default/intents/261114-x/aidlc-state.md', 'aidlc/spaces/default/intents/261114-x/audit/host-1.md', 'aidlc/spaces/default/intents/intents.json', '.claude/agents/aidlc-developer-agent.md']) {
      await expect(writeFileSafe(root, rel, 'x', expect_), rel).rejects.toThrow(/AI-DLC/);
    }
    expect(await fs.readFile(path.join(outside, 'secret.txt'), 'utf8')).toBe('secret');
    expect(await fs.readFile(path.join(root, 'aidlc/spaces/default/intents/261114-x/aidlc-state.md'), 'utf8')).toBe('# State\n');
    expect(isEngineOwned('aidlc/.aidlc-sessions/x.json')).toBe(true);
    expect(isEngineOwned('aidlc/spaces/default/intents/261114-x/.aidlc-engine/state.json')).toBe(true);
    expect(isEngineOwned('.aidlc/tools/x.ts')).toBe(true);
    expect(isEngineOwned('docs/features/epic-10-editing.md')).toBe(false);
    expect(isEngineOwned('aidlc/spaces/default/intents/261114-x/inception/requirements.md')).toBe(false);
  });

  it('writes atomically: the new content in place and no temp file left', async () => {
    const opened = await readForEdit(root, 'docs/notes.md');
    expect(opened).toMatchObject({ content: '# Notes\n', hash: hashOf('# Notes\n'), readOnly: null });
    const res = await writeFileSafe(root, 'docs/notes.md', '# Notes\n\nMore.\n', { expectMtime: opened.mtimeMs, expectHash: opened.hash });
    expect(res).toMatchObject({ ok: true, hash: hashOf('# Notes\n\nMore.\n') });
    expect(await fs.readFile(path.join(root, 'docs/notes.md'), 'utf8')).toBe('# Notes\n\nMore.\n');
    expect(await fs.readdir(path.join(root, 'docs'))).toEqual(['notes.md']);
  });

  it('returns a conflict with the disk text when the file changed since it was opened', async () => {
    const opened = await readForEdit(root, 'docs/notes.md');
    await fs.writeFile(path.join(root, 'docs/notes.md'), '# Notes by the agent\n');
    await fs.utimes(path.join(root, 'docs/notes.md'), new Date(), new Date(Date.now() + 5000));
    const res = await writeFileSafe(root, 'docs/notes.md', '# Mine\n', { expectMtime: opened.mtimeMs, expectHash: opened.hash });
    expect(res).toEqual({ conflict: true, disk: { content: '# Notes by the agent\n', mtimeMs: expect.any(Number), hash: hashOf('# Notes by the agent\n') } });
    expect(await fs.readFile(path.join(root, 'docs/notes.md'), 'utf8')).toBe('# Notes by the agent\n');
    // "Keep mine": saving against the disk version's hash goes through.
    expect(await writeFileSafe(root, 'docs/notes.md', '# Mine\n', { expectMtime: res.disk.mtimeMs, expectHash: res.disk.hash })).toMatchObject({ ok: true });
  });

  it('opens binary, over-2-MB and engine-owned files read-only, with the reason', async () => {
    await write('img.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]));
    await write('big.log', 'a'.repeat(2 * 1024 * 1024 + 1));
    expect(await readForEdit(root, 'img.png')).toMatchObject({ readOnly: 'binary', content: null });
    expect(await readForEdit(root, 'big.log')).toMatchObject({ readOnly: 'tooLarge' });
    expect(await readForEdit(root, 'aidlc/spaces/default/intents/261114-x/aidlc-state.md')).toMatchObject({ readOnly: 'engine', content: '# State\n' });
    await expect(readForEdit(root, 'link-out.txt')).rejects.toThrow();
  });

  it('lists the tree without node_modules/, out/, dist/ and .git/', async () => {
    await write('node_modules/x/index.js', '');
    await write('out/main/index.js', '');
    await write('src/a.js', '');
    const noGit = async () => {
      throw new Error('not a repo');
    };
    const { files } = await listTree(root, { exec: noGit });
    expect(files).toContain('src/a.js');
    expect(files.some((f) => /^(node_modules|out|dist|\.git)\//.test(f))).toBe(false);
  });
});
