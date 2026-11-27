import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HARNESSES, detectHarnesses, resolveHarness, selectableHarness } from '../../src/main/harness.js';
import { checkAgentCommand, defaultAgentCommand, defaultSetupHarness, setupHarness } from '../../src/shared/harnesses.js';

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
    expect(found.cursor.cli).toEqual({ found: false, version: null }); // cursor-agent is probed too (US-0806 FR1.2)
  });
});

describe('resolveHarness and the table (FR2.1, FR2.2, FR3.3)', () => {
  const det = (...installed) => HARNESSES.map((h) => ({ id: h.id, installed: installed.includes(h.id) }));

  it('defaults to the only installed selectable harness, else Claude Code, and keeps a valid choice', () => {
    expect(resolveHarness(undefined, det('opencode'))).toBe('opencode');
    expect(resolveHarness(undefined, det('codex'))).toBe('codex'); // US-0806 FR1.4: codex can run the tab
    expect(resolveHarness(undefined, det('opencode', 'codex'))).toBe('claude'); // two installed: Claude Code
    expect(resolveHarness(undefined, det('claude', 'opencode'))).toBe('claude');
    expect(resolveHarness(undefined, det())).toBe('claude');
    expect(resolveHarness(undefined, null)).toBe('claude'); // detection not done
    expect(resolveHarness('opencode', det('claude'))).toBe('opencode');
    expect(resolveHarness('codex', det('opencode'))).toBe('codex'); // a saved choice is kept (US-0806 FR1.4)
    expect(resolveHarness('bogus', det('opencode'))).toBe('opencode'); // unknown: the default applies
    expect(resolveHarness('rm -rf /', det())).toBe('claude');
  });

  it('all six harnesses are selectable for the agent tab, and nothing else is (US-0806 FR1.4)', () => {
    expect(HARNESSES.filter((h) => h.selectable).map((h) => h.id)).toEqual(['claude', 'opencode', 'codex', 'kiro', 'cursor', 'copilot']);
    expect(selectableHarness('kiro')?.id).toBe('kiro');
    expect(selectableHarness('bogus')).toBeNull();
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

describe('the agent command per harness (US-0806 FR1.2, FR3.1, FR3.2)', () => {
  it('defaultAgentCommand gives each harness its usual command, and null for anything else (FR1.2)', () => {
    expect(['claude', 'opencode', 'codex', 'kiro', 'cursor', 'copilot'].map(defaultAgentCommand)).toEqual([
      'claude',
      'opencode',
      'codex',
      'kiro-cli',
      'cursor-agent',
      'copilot'
    ]);
    expect(defaultAgentCommand('bogus')).toBeNull();
    expect(defaultAgentCommand({ id: 'claude' })).toBeNull();
  });

  it('accepts a program with arguments from the allowed characters, trimmed (FR3.1)', () => {
    expect(checkAgentCommand('codex --full-auto')).toEqual({ ok: true, command: 'codex --full-auto' });
    expect(checkAgentCommand('~/bin/my-cli -p x=1')).toEqual({ ok: true, command: '~/bin/my-cli -p x=1' });
    expect(checkAgentCommand('  claude --model sonnet  ')).toEqual({ ok: true, command: 'claude --model sonnet' });
    expect(checkAgentCommand('a_b.c:d@e,f+g Åäö 9')).toMatchObject({ ok: true });
    expect(checkAgentCommand('x'.repeat(500))).toMatchObject({ ok: true });
  });

  it('refuses each shell character, naming it (FR3.2)', () => {
    for (const [text, char] of [
      ['claude; rm -rf ~', ';'],
      ['a|b', '|'],
      ['a & b', '&'],
      ['$(x)', '$'],
      ['`x`', '`'],
      ['a < b', '<'],
      ['a > b', '>'],
      ['"a"', '"'],
      ["'a'", "'"],
      ['a*', '*']
    ]) {
      expect(checkAgentCommand(text)).toEqual({ ok: false, reason: 'char', char });
    }
  });

  it('refuses a line break and a control character, each with its own reason (FR3.2)', () => {
    expect(checkAgentCommand('a\nb')).toEqual({ ok: false, reason: 'lineBreak' });
    expect(checkAgentCommand('a\rb')).toEqual({ ok: false, reason: 'lineBreak' });
    expect(checkAgentCommand('a\tb')).toEqual({ ok: false, reason: 'control' });
    expect(checkAgentCommand('a\u0007b')).toEqual({ ok: false, reason: 'control' });
  });

  it('refuses an empty or blank text, a non-string and more than 500 characters (FR3.2)', () => {
    expect(checkAgentCommand('')).toEqual({ ok: false, reason: 'empty' });
    expect(checkAgentCommand('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkAgentCommand(null)).toEqual({ ok: false, reason: 'empty' });
    expect(checkAgentCommand(42)).toEqual({ ok: false, reason: 'empty' });
    expect(checkAgentCommand('x'.repeat(501))).toEqual({ ok: false, reason: 'tooLong' });
  });
});
