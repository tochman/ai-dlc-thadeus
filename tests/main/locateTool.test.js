// US-1406 NFR4.1, NFR4.4: where the choice screen finds `aidlc` and `specify`. Its own file beside tools.test.js, which
// the harness's write guard refuses to edit by its name.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/locate-tool');
const BIN = path.join(TMP, 'bin');

/** A real file in the temp bin folder, executable unless told otherwise. */
async function makeTool(name, { mode = 0o755 } = {}) {
  const file = path.join(BIN, name);
  await fs.writeFile(file, '#!/bin/sh\necho test\n');
  await fs.chmod(file, mode);
  return file;
}

/** An exec that fails the test: the lookup never starts a program. */
const noExec = () => {
  throw new Error('exec must not be called');
};
const opts = { exec: noExec, searchPath: BIN };

let tools;

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(BIN, { recursive: true });
  vi.resetModules(); // an empty saved-path map per test
  tools = await import('../../src/main/tools.js');
});

afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

describe('locateTool (US-1406 NFR4.1, NFR4.4)', () => {
  it('gives the saved path when it is executable', async () => {
    const saved = await makeTool('saved-aidlc');
    tools.setToolPaths({ aidlc: saved });
    expect(await tools.locateTool('aidlc', opts)).toBe(saved);
  });

  it('gives null for a saved path that was deleted, even with the tool on the PATH', async () => {
    await makeTool('aidlc');
    tools.setToolPaths({ aidlc: path.join(TMP, 'gone') });
    expect(await tools.locateTool('aidlc', opts)).toBeNull();
  });

  it('gives null for a saved path that is not executable', async () => {
    tools.setToolPaths({ aidlc: await makeTool('plain', { mode: 0o644 }) });
    expect(await tools.locateTool('aidlc', opts)).toBeNull();
  });

  it('looks the bare name up on the PATH when nothing is saved', async () => {
    const onPath = await makeTool('aidlc');
    expect(await tools.locateTool('aidlc', opts)).toBe(onPath);
  });

  it('gives null when the tool is not on the PATH', async () => {
    expect(await tools.locateTool('specify', opts)).toBeNull();
  });

  it('follows the saved path of specify the same way (US-1405 tool row)', async () => {
    const saved = await makeTool('my-specify');
    tools.setToolPaths({ specify: saved });
    expect(await tools.locateTool('specify', opts)).toBe(saved);
    tools.setToolPaths({ specify: path.join(TMP, 'gone') });
    expect(await tools.locateTool('specify', opts)).toBeNull();
  });
});
