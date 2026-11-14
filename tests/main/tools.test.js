import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/tools');
const BIN = path.join(TMP, 'bin');
const SHELL = '/bin/zsh';

/** `<cli> --version` answers from `versions`; the login PATH probe answers with `BIN`; anything else fails like a missing command. */
function fakeExec(versions) {
  return async (file, args) => {
    if (args.includes('-c')) return `__AIDLC_DASH_PATH__${BIN}`; // the login PATH probe
    if (args.join(' ') === '--version' && Object.hasOwn(versions, file)) return versions[file];
    throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT' });
  };
}

/** A real file in the temp bin folder, executable unless told otherwise. */
async function makeTool(name, { mode = 0o755 } = {}) {
  const file = path.join(BIN, name);
  await fs.mkdir(BIN, { recursive: true });
  await fs.writeFile(file, '#!/bin/sh\necho test\n');
  await fs.chmod(file, mode);
  return file;
}

let tools;
let savedShell;

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(BIN, { recursive: true });
  savedShell = process.env.SHELL;
  process.env.SHELL = SHELL;
  vi.resetModules(); // a fresh loginPath cache and an empty saved-path map per test
  tools = await import('../../src/main/tools.js');
});

afterEach(async () => {
  if (savedShell === undefined) delete process.env.SHELL;
  else process.env.SHELL = savedShell;
  await fs.rm(TMP, { recursive: true, force: true });
});

const rowsById = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe('getTools (EPIC-04 US-0405 FR2.1)', () => {
  it('takes the saved path as saved, finds the others on PATH, and the shell from $SHELL', async () => {
    const aidlc = await makeTool('aidlc');
    const claudeOnPath = await makeTool('claude');
    const savedClaude = await makeTool('saved-claude');
    tools.setToolPaths({ claude: savedClaude });

    const exec = fakeExec({
      [aidlc]: 'aidlc 1.2.3\n',
      [claudeOnPath]: 'auto 1.0\n', // not used: the saved path wins
      [savedClaude]: '2.1.0 (Claude Code)\n',
      [SHELL]: 'zsh 5.9 (x86_64-apple-darwin)\n'
    });
    const rows = rowsById(await tools.getTools({ exec }));

    expect(rows.claude).toEqual({ id: 'claude', path: savedClaude, source: 'saved', found: true, version: '2.1.0 (Claude Code)' });
    expect(rows.aidlc).toMatchObject({ path: aidlc, source: 'auto', found: true, version: 'aidlc 1.2.3' });
    expect(rows.shell).toMatchObject({ path: SHELL, source: 'auto', found: true, version: 'zsh 5.9 (x86_64-apple-darwin)' });
    // The resolver the app starts from follows the same map; a bare name is never started as a path.
    expect(tools.toolPath('claude')).toBe(savedClaude);
    expect(tools.toolPath('aidlc')).toBe('aidlc');
    expect(tools.shellPath()).toBe(SHELL);
  });

  it('reports a tool that cannot answer --version as not found with its reason, never an empty version (FR2.1, A3)', async () => {
    const claude = await makeTool('claude');
    tools.setToolPaths({ claude });
    const rows = rowsById(await tools.getTools({ exec: fakeExec({}) }));

    expect(rows.claude).toMatchObject({ path: claude, source: 'saved', found: false, version: null });
    expect(rows.claude.error).toMatch(/svarar inte på --version/);
    // Nothing of that name on PATH: the row says what was tried instead of showing a bare name.
    expect(rows.aidlc).toMatchObject({ path: null, source: 'auto', found: false, version: null });
    expect(rows.aidlc.error).toMatch(/PATH/);
    // A shell that reports no version keeps its path, with the reason beside it (A1).
    expect(rows.shell).toMatchObject({ path: SHELL, found: false, version: null });
    expect(rows.shell.error).toMatch(/svarar inte på --version/);

    // An empty answer is not a version either.
    const silent = rowsById(await tools.getTools({ exec: fakeExec({ [claude]: '  \n' }) }));
    expect(silent.claude).toMatchObject({ found: false, version: null });
    expect(silent.claude.error).toMatch(/någon version/);
  });
});

describe('validateTool (EPIC-04 US-0405 FR2.3)', () => {
  it('accepts only an absolute path to an executable file whose --version answers', async () => {
    const good = await makeTool('aidlc');
    const notExecutable = await makeTool('plain', { mode: 0o644 });
    const failing = await makeTool('failing');
    const exec = fakeExec({ [good]: 'aidlc 1.2.3\n' });

    await expect(tools.validateTool('aidlc', good, { exec })).resolves.toEqual({ ok: true, version: 'aidlc 1.2.3' });
    await expect(tools.validateTool('bogus', good, { exec })).rejects.toThrow(/Okänt verktyg/);
    await expect(tools.validateTool('aidlc', 'bin/aidlc', { exec })).rejects.toThrow(/absolut/);
    await expect(tools.validateTool('aidlc', '/a\0b', { exec })).rejects.toThrow(/absolut/);
    await expect(tools.validateTool('aidlc', path.join(TMP, 'missing'), { exec })).rejects.toThrow(/finns inte/);
    await expect(tools.validateTool('aidlc', BIN, { exec })).rejects.toThrow(/finns inte/); // a folder is no binary
    await expect(tools.validateTool('aidlc', notExecutable, { exec })).rejects.toThrow(/körbar/);
    await expect(tools.validateTool('aidlc', failing, { exec })).rejects.toThrow(/svarar inte/);
  });
});
