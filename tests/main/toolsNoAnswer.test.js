// US-0805 FR4.6, FR4.7: a tool that is installed but does not answer --version is told apart from one that is not there.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/tools-no-answer');
const BIN = path.join(TMP, 'bin');

/** `<file> --version` answers from `versions`; the login PATH probe answers with BIN; anything else fails. */
const fakeExec = (versions) => async (file, args) => {
  if (args.includes('-c')) return `__AIDLC_DASH_PATH__${BIN}`;
  if (args.join(' ') === '--version' && Object.hasOwn(versions, file)) return versions[file];
  throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT' });
};

async function makeTool(name, mode = 0o755) {
  const file = path.join(BIN, name);
  await fs.writeFile(file, '#!/bin/sh\necho test\n');
  await fs.chmod(file, mode);
  return file;
}

let tools;
const scan = async (versions = {}) => Object.fromEntries((await tools.getTools({ exec: fakeExec(versions) })).map((r) => [r.id, r]));

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(BIN, { recursive: true });
  vi.resetModules(); // a fresh loginPath cache and an empty saved-path map per test
  tools = await import('../../src/main/tools.js');
});
afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

describe('noAnswer: installed, but --version fails', () => {
  it('marks an executable that does not answer, chosen or from PATH', async () => {
    const chosen = await makeTool('my-claude');
    await makeTool('gh');
    tools.setToolPaths({ claude: chosen });
    const rows = await scan();
    for (const id of ['claude', 'gh']) {
      expect(rows[id]).toMatchObject({ found: false, noAnswer: true });
      expect(rows[id].error).toMatch(/svarar inte på --version/);
    }
  });

  it('marks one that answers with nothing', async () => {
    const gh = await makeTool('gh');
    expect((await scan({ [gh]: ' \n' })).gh).toMatchObject({ found: false, noAnswer: true });
  });

  it('does not mark a chosen path that is gone or not executable, nor a tool that is not on PATH', async () => {
    const gone = path.join(TMP, 'gone');
    tools.setToolPaths({ claude: gone, opencode: await makeTool('plain', 0o644) });
    const rows = await scan();
    expect(rows.claude).toMatchObject({ path: gone, source: 'saved', found: false, version: null });
    expect(rows.claude.error).toMatch(/svarar inte på --version/);
    for (const id of ['claude', 'opencode', 'specify']) expect(rows[id]).not.toHaveProperty('noAnswer');
  });

  it('does not mark a tool that answers: its row is as before', async () => {
    const gh = await makeTool('gh');
    expect((await scan({ [gh]: 'gh version 2.0.0\n' })).gh).toEqual({ id: 'gh', path: gh, source: 'auto', found: true, version: 'gh version 2.0.0' });
  });
});
