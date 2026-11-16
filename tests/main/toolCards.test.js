// US-0410 FR4.1–FR4.3: getTools with opencode and gh. Beside tools.test.js, with the same fixtures.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/tool-cards');
const BIN = path.join(TMP, 'bin');

/** `<cli> --version` answers from `versions`; the login PATH probe answers with `BIN`; anything else fails like a missing command. */
function fakeExec(versions) {
  return async (file, args) => {
    if (args.includes('-c')) return `__AIDLC_DASH_PATH__${BIN}`;
    if (args.join(' ') === '--version' && Object.hasOwn(versions, file)) return versions[file];
    throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT' });
  };
}

async function makeTool(name) {
  const file = path.join(BIN, name);
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
  vi.resetModules();
  tools = await import('../../src/main/tools.js');
});

afterEach(async () => {
  if (savedShell === undefined) delete process.env.SHELL;
  else process.env.SHELL = savedShell;
  await fs.rm(TMP, { recursive: true, force: true });
});

describe('getTools with opencode and gh (US-0410 FR4.1–FR4.3)', () => {
  it('returns six rows in rail order (glab since US-1201 AC-1), finds opencode on PATH, and reports a missing gh as not found', async () => {
    const opencode = await makeTool('opencode');
    const rows = await tools.getTools({ exec: fakeExec({ [opencode]: '0.15.2\n' }) });

    expect(rows.map((r) => r.id)).toEqual(['aidlc', 'claude', 'opencode', 'gh', 'glab', 'shell']);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.opencode).toEqual({ id: 'opencode', path: opencode, source: 'auto', found: true, version: '0.15.2' });
    expect(byId.gh).toMatchObject({ path: null, source: 'auto', found: false, version: null });
    expect(byId.gh.error).toMatch(/gh.*PATH/);
  });

  it('accepts a chosen path for gh and starts from it (FR4.2)', async () => {
    const gh = await makeTool('my-gh');
    const exec = fakeExec({ [gh]: 'gh version 2.62.0 (2026-10-01)\n' });
    await expect(tools.validateTool('gh', gh, { exec })).resolves.toEqual({ ok: true, version: 'gh version 2.62.0 (2026-10-01)' });
    tools.setToolPaths({ gh, opencode: '/opt/opencode' });
    expect(tools.toolPath('gh')).toBe(gh);
    expect(tools.toolPath('opencode')).toBe('/opt/opencode');
  });

  it('still refuses an id that is not a tool', async () => {
    await expect(tools.validateTool('git', '/usr/bin/git', { exec: fakeExec({}) })).rejects.toThrow(/Okänt verktyg/);
  });
});
