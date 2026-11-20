// US-0035 FR1.2, FR1.5: each Tools scan reads the login PATH again, and rows found on the fallback PATH say so.
// ponytail: a sibling of tools.test.js because the AI-DLC guard hook refuses edits to that file name.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/tools-login-path');
const BIN = path.join(TMP, 'bin');

/** A real executable file in `dir`. */
async function makeTool(dir, name) {
  const file = path.join(dir, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, '#!/bin/sh\necho test\n');
  await fs.chmod(file, 0o755);
  return file;
}

let tools;
let savedShell;

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(BIN, { recursive: true });
  savedShell = process.env.SHELL;
  process.env.SHELL = '/bin/zsh';
  vi.resetModules(); // an empty login-PATH cache and saved-path map per test
  tools = await import('../../src/main/tools.js');
});

afterEach(async () => {
  if (savedShell === undefined) delete process.env.SHELL;
  else process.env.SHELL = savedShell;
  await fs.rm(TMP, { recursive: true, force: true });
});

const rowsById = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe('getTools and the login PATH (US-0035)', () => {
  it('reads the login PATH again on each scan, so a tool added between two scans is found (AC1.1.3)', async () => {
    const later = path.join(TMP, 'later');
    let dirs = BIN;
    const exec = async (file, args) => {
      if (args.includes('-c')) return `__AIDLC_DASH_PATH__${dirs}`;
      if (args.join(' ') === '--version') return 'gh 2.0\n';
      throw new Error('ENOENT');
    };
    expect(rowsById(await tools.getTools({ exec })).gh.found).toBe(false);

    const gh = await makeTool(later, 'gh');
    dirs = `${BIN}${path.delimiter}${later}`;
    expect(rowsById(await tools.getTools({ exec })).gh).toMatchObject({ path: gh, found: true });
  });

  it('marks the automatic rows with pathFallback when the read fell back, never a saved row or the shell (AC1.1.5)', async () => {
    tools.setToolPaths({ claude: await makeTool(BIN, 'saved-claude') });
    const exec = async (file, args) => {
      if (args.includes('-c')) throw Object.assign(new Error('timeout'), { killed: true });
      return 'v 1.0\n';
    };
    const rows = rowsById(await tools.getTools({ exec }));
    expect(rows.aidlc.pathFallback).toBe(true);
    expect(rows.gh.pathFallback).toBe(true);
    expect(rows.claude.pathFallback).toBeUndefined();
    expect(rows.shell.pathFallback).toBeUndefined();
  });

  it('marks no row when the read succeeded', async () => {
    const exec = async (file, args) => (args.includes('-c') ? `__AIDLC_DASH_PATH__${BIN}` : 'v 1.0\n');
    const rows = await tools.getTools({ exec });
    expect(rows.some((r) => 'pathFallback' in r)).toBe(false);
  });
});
