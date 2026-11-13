import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const { fixPtyPerms } = createRequire(import.meta.url)('../../scripts/fix-pty-perms.cjs');
const TMP = path.resolve(__dirname, '../.tmp/pty-perms');

afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

describe('fixPtyPerms (F-01)', () => {
  it('makes spawn-helper executable, so node-pty can spawn the terminal (FR1.2, FR2.2)', async () => {
    const helper = path.join(TMP, 'prebuilds', 'darwin-arm64', 'spawn-helper');
    await fs.mkdir(path.dirname(helper), { recursive: true });
    await fs.writeFile(helper, '');
    await fs.chmod(helper, 0o644);
    await fs.mkdir(path.join(TMP, 'prebuilds', 'win32-x64'), { recursive: true });

    expect(fixPtyPerms(TMP)).toEqual([helper]);
    expect((await fs.stat(helper)).mode & 0o111).toBe(0o111);
  });

  it('does nothing when node-pty has no prebuilds folder', () => {
    expect(fixPtyPerms(path.join(TMP, 'missing'))).toEqual([]);
  });
});
