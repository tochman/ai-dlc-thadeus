import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HARNESSES, detectHarnesses, resolveHarness, selectableHarness } from '../../src/main/harness.js';
import { defaultSetupHarness, setupHarness } from '../../src/shared/harnesses.js';

const TMP = path.resolve(__dirname, '../.tmp/harness');

/** `<cli> --version` answers from `versions`; anything else fails like a missing command (ENOENT). */
function fakeExec(versions) {
  return async (file, args) => {
    if (args.includes('-c')) return '__AIDLC_DASH_PATH__/usr/bin'; // the login PATH probe
    if (args.join(' ') === '--version' && file in versions) return versions[file];
    throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT' });
  };
}

async function tmpRoot(dirs = [], files = {}) {
  await fs.rm(TMP, { recursive: true, force: true });
  for (const d of dirs) await fs.mkdir(path.join(TMP, d), { recursive: true });
  for (const [f, text] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(TMP, f)), { recursive: true });
    await fs.writeFile(path.join(TMP, f), text);
  }
  return TMP;
}

const byId = (list) => Object.fromEntries(list.map((d) => [d.id, d]));
afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

describe('detectHarnesses (EPIC-08 US-0801 FR1)', () => {
  it('finds harnesses from their folders, and .github/ only when it holds AI-DLC files (FR1.1)', async () => {
    const root = await tmpRoot(['.claude', '.kiro', '.github/workflows'], { 'opencode.json': '{"plugin": ["aidlc"]}' });
    const found = byId(await detectHarnesses(root, { exec: fakeExec({}) }));
    expect(found.claude.installed).toBe(true);
    expect(found.opencode.installed).toBe(true);
    expect(found.kiro.installed).toBe(true);
    expect(found.codex.installed).toBe(false);
    expect(found.copilot.installed).toBe(false); // a plain GitHub repo is not Copilot with AI-DLC

    await tmpRoot(['.github/skills/aidlc'], { 'opencode.json': '{"theme": "dark"}' });
    const again = byId(await detectHarnesses(root, { exec: fakeExec({}) }));
    expect(again.copilot.installed).toBe(true);
    expect(again.opencode.installed).toBe(false); // opencode.json without AI-DLC entries
  });

  it('US-1401 BR1.10: a Spec Kit project with only .opencode/ has opencode installed (AC1.1.6)', async () => {
    const root = await tmpRoot(['.opencode/command', '.specify/memory']);
    const found = byId(await detectHarnesses(root, { exec: fakeExec({}) }));
    expect(found.opencode.installed).toBe(true);
    expect(found.claude.installed).toBe(false); // Claude's marker is still .claude/ only
  });

  it('reads CLI versions and counts a failing probe as not found, without failing (FR1.2, FR1.3)', async () => {
    const root = await tmpRoot();
    const found = byId(await detectHarnesses(root, { exec: fakeExec({ claude: '2.1.0 (Claude Code)\n', opencode: 'opencode v2.1.4' }) }));
    expect(found.claude.cli).toEqual({ found: true, version: '2.1.0 (Claude Code)' });
    expect(found.opencode.cli).toEqual({ found: true, version: 'opencode v2.1.4' });
    expect(found.codex.cli).toEqual({ found: false, version: null });
    expect(found.cursor.cli).toBeNull(); // no CLI to probe
  });
});

describe('resolveHarness and the table (FR2.1, FR2.2, FR3.3)', () => {
  const det = (...installed) => HARNESSES.map((h) => ({ id: h.id, installed: installed.includes(h.id) }));

  it('defaults to the only installed selectable harness, else Claude Code, and keeps a valid choice', () => {
    expect(resolveHarness(undefined, det('opencode'))).toBe('opencode');
    expect(resolveHarness(undefined, det('opencode', 'codex'))).toBe('opencode'); // codex is not selectable
    expect(resolveHarness(undefined, det('claude', 'opencode'))).toBe('claude');
    expect(resolveHarness(undefined, det())).toBe('claude');
    expect(resolveHarness(undefined, null)).toBe('claude'); // detection not done
    expect(resolveHarness('opencode', det('claude'))).toBe('opencode');
    expect(resolveHarness('codex', det('opencode'))).toBe('opencode'); // not selectable: default applies
    expect(resolveHarness('rm -rf /', det())).toBe('claude');
  });

  it('only claude and opencode are selectable', () => {
    expect(HARNESSES.filter((h) => h.selectable).map((h) => h.id)).toEqual(['claude', 'opencode']);
    expect(selectableHarness('kiro')).toBeNull();
    expect(selectableHarness({ id: 'claude' })).toBeNull();
  });

  it('setupHarness accepts the six harnesses AI-DLC installs and nothing else (US-0802 FR1.1, FR1.4)', () => {
    const ids = ['claude', 'opencode', 'codex', 'kiro', 'cursor', 'copilot'];
    expect(ids.map((id) => setupHarness(id)?.setupId)).toEqual(ids);
    for (const bad of ['bogus', '--yes', '', null, { id: 'claude' }]) expect(setupHarness(bad)).toBeNull();
  });

  it('defaultSetupHarness picks the only harness whose CLI was found, else Claude Code; add mode skips installed ones (FR1.2, FR3.1)', () => {
    const d = (id, { cli = false, installed = false } = {}) => ({ id, installed, cli: { found: cli, version: null } });
    expect(defaultSetupHarness([d('claude'), d('opencode', { cli: true })])).toBe('opencode');
    expect(defaultSetupHarness([d('claude', { cli: true }), d('opencode', { cli: true })])).toBe('claude');
    expect(defaultSetupHarness([])).toBe('claude');
    expect(defaultSetupHarness(null)).toBe('claude');
    expect(defaultSetupHarness([d('claude', { cli: true, installed: true }), d('opencode', { cli: true })], { add: true })).toBe('opencode');
  });
});
