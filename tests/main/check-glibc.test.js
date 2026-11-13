import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { checkDir, findVersions } from '../../scripts/check-glibc.mjs';

const TMP = path.resolve(__dirname, '../.tmp/check-glibc');
const elf = (body) => Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.from(`\0${body}\0`, 'latin1')]);

async function put(rel, content) {
  const file = path.join(TMP, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe('check-glibc (FR1.2, FR1.3)', () => {
  it('finds the highest GLIBC and GLIBCXX versions in a binary', () => {
    const buf = Buffer.from('\0GLIBC_2.17\0GLIBC_2.42\0GLIBC_2.9\0GLIBCXX_3.4.32\0GLIBCXX_3.4.9\0', 'latin1');
    expect(findVersions(buf)).toEqual({ glibc: '2.42', glibcxx: '3.4.32' });
  });

  it('reports a too-new ELF and foreign node-pty prebuilds, and nothing for a 2.31 binary', async () => {
    await put('bad/resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node', elf('GLIBC_2.42'));
    await put('bad/resources/app.asar.unpacked/node_modules/node-pty/prebuilds/win32-x64/pty.node', 'MZ');
    await put('bad/notes.txt', 'GLIBC_2.99 in plain text is not an ELF');
    await put('good/pty.node', elf('GLIBC_2.31\0GLIBCXX_3.4.28'));

    const bad = checkDir(path.join(TMP, 'bad'));
    expect(bad.map((v) => v.file).sort()).toEqual([
      'resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node',
      'resources/app.asar.unpacked/node_modules/node-pty/prebuilds/win32-x64/pty.node'
    ]);
    expect(bad.find((v) => v.file.endsWith('Release/pty.node')).reason).toMatch(/GLIBC_2\.42/);
    expect(checkDir(path.join(TMP, 'good'))).toEqual([]);
  });
});
