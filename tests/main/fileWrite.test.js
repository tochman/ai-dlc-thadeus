import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { isEngineOwned, listTree, readForEdit, writeAtomic, writeFileSafe } from '../../src/main/fileWrite.js';
import { t } from '../../src/shared/i18n.js';

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
    for (const rel of [
      'aidlc/spaces/default/intents/261114-x/aidlc-state.md',
      'aidlc/spaces/default/intents/261114-x/audit/host-1.md',
      'aidlc/spaces/default/intents/intents.json',
      '.claude/agents/aidlc-developer-agent.md'
    ]) {
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

// US-0506 u4 LC32, RD33, SD36: the shared atomic write.
// US-1402 NFR3.2, security-design §1: in a Spec Kit project the app never writes Spec Kit's files, except the constitution.
describe('Spec Kit files in the editor (US-1402 NFR3.2)', () => {
  const SPECKIT = { framework: 'speckit' };
  beforeEach(async () => {
    await write('specs/001-a/spec.md', '# Spec\n');
    await write('.specify/feature.json', '{}');
    await write('.specify/memory/constitution.md', '# Constitution\n');
  });

  it('opens files under specs/ and .specify/ read-only', async () => {
    expect(await readForEdit(root, 'specs/001-a/spec.md', SPECKIT)).toMatchObject({ readOnly: 'speckit', content: '# Spec\n' });
    expect(await readForEdit(root, '.specify/feature.json', SPECKIT)).toMatchObject({ readOnly: 'speckit' });
    expect(await readForEdit(root, 'docs/notes.md', SPECKIT)).toMatchObject({ readOnly: null });
  });

  it('refuses to save them, the same file reached through a link too', async () => {
    const opened = await readForEdit(root, 'specs/001-a/spec.md', SPECKIT);
    const at = { expectMtime: opened.mtimeMs, expectHash: opened.hash };
    await expect(writeFileSafe(root, 'specs/001-a/spec.md', 'x', { ...at, ...SPECKIT })).rejects.toThrow(
      t('errors.speckitReadOnly', { rel: 'specs/001-a/spec.md' })
    );
    await fs.symlink(path.join(tmp, 'specs/001-a/spec.md'), path.join(tmp, 'docs/spec-link.md'));
    await expect(writeFileSafe(root, 'docs/spec-link.md', 'x', { ...at, ...SPECKIT })).rejects.toThrow(
      t('errors.speckitReadOnly', { rel: 'docs/spec-link.md' })
    );
    expect(await fs.readFile(path.join(tmp, 'specs/001-a/spec.md'), 'utf8')).toBe('# Spec\n');
  });

  it('keeps .specify/memory/constitution.md editable', async () => {
    const opened = await readForEdit(root, '.specify/memory/constitution.md', SPECKIT);
    expect(opened.readOnly).toBeNull();
    expect(
      await writeFileSafe(root, '.specify/memory/constitution.md', '# New\n', { expectMtime: opened.mtimeMs, expectHash: opened.hash, ...SPECKIT })
    ).toMatchObject({ ok: true });
  });

  it('leaves a specs/ file editable in an AI-DLC project or with no framework', async () => {
    for (const opts of [{ framework: 'aidlc' }, {}]) {
      const opened = await readForEdit(root, 'specs/001-a/spec.md', opts);
      expect(opened.readOnly).toBeNull();
      expect(await writeFileSafe(root, 'specs/001-a/spec.md', '# Spec\n', { expectMtime: opened.mtimeMs, expectHash: opened.hash, ...opts })).toMatchObject({
        ok: true
      });
    }
    expect((await readForEdit(root, 'specs/001-a/spec.md')).readOnly).toBeNull();
  });
});

describe('writeAtomic (US-0506 u4 RD33)', () => {
  const target = () => path.join(tmp, 'docs/notes.md');
  const tmpLeft = async () => (await fs.readdir(path.join(tmp, 'docs'))).filter((f) => f.endsWith('.tmp'));
  const modeOf = async (abs) => (await fs.stat(abs)).mode & 0o7777;
  afterEach(() => vi.restoreAllMocks());

  it('writes the bytes to the target', async () => {
    await writeAtomic(target(), Buffer.from('new\n'));
    expect(await fs.readFile(target(), 'utf8')).toBe('new\n');
    expect(await tmpLeft()).toEqual([]);
  });

  it('on ENOSPC at the temp write and EACCES at the rename keeps the old bytes and leaves no temp file', async () => {
    const before = hashOf(await fs.readFile(target()));
    vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(Object.assign(new Error('full'), { code: 'ENOSPC' }));
    await expect(writeAtomic(target(), Buffer.from('x'))).rejects.toMatchObject({ code: 'ENOSPC' });
    vi.spyOn(fs, 'rename').mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));
    await expect(writeAtomic(target(), Buffer.from('y'))).rejects.toMatchObject({ code: 'EACCES' });
    expect(hashOf(await fs.readFile(target()))).toBe(before);
    expect(await tmpLeft()).toEqual([]);
  });

  it('leaves the target untouched when expect throws (the final compare)', async () => {
    const before = await fs.readFile(target(), 'utf8');
    const expectFn = vi.fn(async () => {
      throw Object.assign(new Error('changed'), { code: 'changedSincePreview' });
    });
    await expect(writeAtomic(target(), Buffer.from('z'), { expect: expectFn })).rejects.toMatchObject({ code: 'changedSincePreview' });
    expect(expectFn).toHaveBeenCalledTimes(1);
    expect(await fs.readFile(target(), 'utf8')).toBe(before);
    expect(await tmpLeft()).toEqual([]);
  });

  it('sets the mode exactly, also bits the umask would take off', async () => {
    for (const mode of [0o600, 0o664, 0o755]) {
      await writeAtomic(target(), Buffer.from(String(mode)), { mode });
      expect(await modeOf(target())).toBe(mode);
    }
  });

  it('gives a new file 0o666 & ~umask without a mode', async () => {
    const umask = process.umask();
    const abs = path.join(tmp, 'docs/new.txt');
    await writeAtomic(abs, Buffer.from('n'));
    expect(await modeOf(abs)).toBe(0o666 & ~umask);
  });

  it('writeFileSafe keeps the file mode exactly', async () => {
    await fs.chmod(target(), 0o664);
    const opened = await readForEdit(root, 'docs/notes.md');
    await writeFileSafe(root, 'docs/notes.md', '# Edited\n', { expectMtime: opened.mtimeMs, expectHash: opened.hash });
    expect(await modeOf(target())).toBe(0o664);
  });

  it('keeps the installer paths engine-owned for the editor, and dialog.sh editable (SD36)', async () => {
    expect(isEngineOwned('.claude/settings.json')).toBe(true);
    expect(isEngineOwned('.opencode/plugins/thadeus-dialog.js')).toBe(true);
    expect(isEngineOwned('.thadeus/hooks/dialog.sh')).toBe(false);
  });

  // US-0208 FR2.1 adds tokenReadings.js: it validates the intent dir name and resolves its folder in the root first.
  // US-0209 FR3.1 adds usageSnapshot.js, the same way: it validates <host>-<clone-id> and resolves .thadeus/usage in the root.
  // US-1201 AC-1 adds credentials.js: one fixed file name in the app's own userData folder, never in a project.
  // US-0212 NFR1 adds costRules.js: it validates the space name, takes the file only from its target table and resolves it in the root.
  // US-0607 FR1.1 adds planningRecord.js: one file per project in the app's own userData folder, named by a hash of the root.
  // US-0608 D5 adds planningSync.js: it writes only feature-doc paths that validDocFile checked, its folder resolved in the root.
  // US-1408 NFR3.4 adds projectFile.js (.thadeus/project.json, lstat checks before the rename).
  // US-0609 FR3.5 adds thadeusSync.js: it writes only paths isThadeusPath or the harness table accept, resolved in its worktree root.
  // US-0508 FR1.1 adds intentNames.js: one fixed file, .thadeus/intent-names.json, its folder resolved in the root.
  // US-1409 NFR3.5 adds speckitTokens.js: its cursor file in the app's userData only; buckets go through tokenReadings.js.
  // US-1411 NFR1 adds speckitArchive.js: only .thadeus/archived/<folder>.json, for a folder main finds listed, its own folders plain.
  it('is imported only by fileWrite.js, agentHooks.js, tokenReadings.js, usageSnapshot.js, credentials.js, costRules.js, planningRecord.js, planningSync.js, projectFile.js, thadeusSync.js, intentNames.js, speckitTokens.js and speckitArchive.js (SD36)', () => {
    const src = path.resolve(__dirname, '../../src');
    const users = readdirSync(src, { recursive: true })
      .filter((f) => /\.jsx?$/.test(f))
      .filter((f) => /\bwriteAtomic\b/.test(readFileSync(path.join(src, f), 'utf8')))
      .map((f) => f.split(path.sep).join('/'))
      .sort();
    expect(users).toEqual([
      'main/agentHooks.js',
      'main/costRules.js',
      'main/credentials.js',
      'main/fileWrite.js',
      'main/intentNames.js',
      'main/planningRecord.js',
      'main/planningSync.js',
      'main/projectFile.js',
      'main/speckitArchive.js',
      'main/speckitTokens.js',
      'main/thadeusSync.js',
      'main/tokenReadings.js',
      'main/usageSnapshot.js'
    ]);
  });
});
