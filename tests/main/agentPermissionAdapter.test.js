// US-0506 u2 LC3: the permission part of HarnessEventAdapter against the docs-built fixtures (BR5.1–BR5.5, BR5.8;
// SD9, SD11, SD12, SCD8, RD15, PD7; NFR2.4, NFR2.6, NFR2.7, NFR3.16–NFR3.18, NFR5.24, NFR7.4).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { adapters, DENY_MESSAGE } from '../../src/main/agentAdapters.js';
import { t } from '../../src/shared/i18n.js';

const FIX = path.resolve(__dirname, '../fixtures/agent-events');
const raw = (harness, name) => readFileSync(path.join(FIX, harness, `${name}.json`));
const json = (harness, name) => JSON.parse(raw(harness, name).toString('utf8'));
const cp = (n) => String.fromCodePoint(n);
const claude = (name) => adapters.claude.parse('permission', raw('claude', name));
const opencode = (name) => adapters.opencode.parse('permission', raw('opencode', name));
const claudeWith = (over) => adapters.claude.parse('permission', Buffer.from(JSON.stringify({ ...json('claude', 'permission-bash'), ...over })));
const opencodeWith = (over) => {
  const p = json('opencode', 'permission-asked-always');
  return adapters.opencode.parse('permission', Buffer.from(JSON.stringify({ ...p, properties: { ...p.properties, ...over } })));
};
const effects = (parsed) => parsed.permission.choices.map((c) => c.effect);
const always = (parsed) => parsed.permission.choices.find((c) => c.effect === 'allowAlways');
const suggestion = (rules, over = {}) => ({ type: 'addRules', rules, behavior: 'allow', destination: 'localSettings', ...over });
/** `n` rules whose shown lines are `localSettings: Bash(<content>)`, each line exactly `len` code points. */
const rulesOf = (n, len) =>
  Array.from({ length: n }, (_, i) => ({ toolName: 'Bash', ruleContent: String(i % 10).repeat(len - 'localSettings: Bash()'.length) }));

describe('Claude Code PermissionRequest (BR5.1, BR5.3)', () => {
  it('builds what, detail, cwd and the three choices in the agent order; only Deny refuses (NFR2.7, RD15)', () => {
    const p = claude('permission-bash');
    expect(p).toMatchObject({ ok: true, kind: 'permission' });
    expect(p.permission).toEqual({
      what: 'Bash',
      detail: 'git push origin feat/US-0506',
      cwd: '/Users/dev/Projects/aidlc-dash',
      truncated: false,
      choices: [
        { label: t('agentDialog.permission.allowOnce'), effect: 'allowOnce', refuses: false, enabled: true },
        { label: t('agentDialog.permission.allowAlways', { rules: 'localSettings: Bash(git push:*)' }), effect: 'allowAlways', refuses: false, enabled: true },
        { label: t('agentDialog.permission.deny'), effect: 'deny', refuses: true, enabled: true }
      ]
    });
    expect(p.alwaysRules).toEqual(json('claude', 'permission-bash').permission_suggestions);
  });

  it('detail is the command, else file_path, else the input as indented JSON', () => {
    expect(claude('permission-edit').permission.detail).toBe('/Users/dev/Projects/aidlc-dash/src/main/index.js');
    expect(claude('permission-empty-suggestions').permission.detail).toBe(JSON.stringify(json('claude', 'permission-empty-suggestions').tool_input, null, 2));
    expect(claudeWith({ cwd: 7 }).permission.cwd).toBeNull();
  });

  it('offers Allow always for addRules and addDirectories only, one line per rule and folder (SD11, K4)', () => {
    expect(always(claude('permission-bash-dirs')).label).toBe(
      t('agentDialog.permission.allowAlways', {
        rules: ['projectSettings: Bash(ls:*)', 'projectSettings: Read', 'session: /Users/dev/Projects/shared-assets'].join('\n')
      })
    );
    for (const name of ['permission-edit', 'permission-empty-suggestions', 'permission-setmode', 'permission-deny-rule', 'permission-extra-key']) {
      expect(effects(claude(name)), name).toEqual(['allowOnce', 'deny']);
    }
  });

  it.each([
    ['an empty toolName', [suggestion([{ toolName: '' }])]],
    ['an empty ruleContent', [suggestion([{ toolName: 'Bash', ruleContent: '' }])]],
    ['no rules', [suggestion([])]],
    ['a rule with an extra key', [suggestion([{ toolName: 'Bash', extra: 1 }])]],
    ['no destination', [{ type: 'addRules', rules: [{ toolName: 'Bash' }], behavior: 'allow' }]],
    ['an empty directory string', [{ type: 'addDirectories', directories: [''], destination: 'session' }]],
    ['no directories', [{ type: 'addDirectories', directories: [], destination: 'session' }]],
    ['one good and one unknown type', [suggestion([{ toolName: 'Bash' }]), { type: 'replaceRules', rules: [], destination: 'session' }]],
    ['not an array', { type: 'addRules' }]
  ])('offers no Allow always for %s (R-05)', (_name, suggestions) => {
    expect(effects(claudeWith({ permission_suggestions: suggestions }))).toEqual(['allowOnce', 'deny']);
  });

  it('a newline inside a rule shows as \\u000a, so one rule never looks like two', () => {
    const p = claudeWith({ permission_suggestions: [suggestion([{ toolName: 'Bash', ruleContent: 'a\nlocalSettings: Bash(*)' }])] });
    expect(always(p).label).toBe(t('agentDialog.permission.allowAlways', { rules: 'localSettings: Bash(a\\u000alocalSettings: Bash(*))' }));
  });

  it.each([
    ['8 lines', rulesOf(8, 30), true],
    ['9 lines', rulesOf(9, 30), false],
    ['1 024 characters together', [...rulesOf(4, 256)], true],
    ['1 025 characters together', [...rulesOf(3, 256), ...rulesOf(1, 241), { toolName: 'X' }], false], // 768 + 241 + 16
    ['a 256-character line', rulesOf(1, 256), true],
    ['a 257-character line', rulesOf(1, 257), false]
  ])('caps in code points: %s (SD11, SCD8)', (_name, rules, offered) => {
    const choice = always(claudeWith({ permission_suggestions: [suggestion(rules)] }));
    expect(choice.enabled).toBe(offered);
    if (!offered) expect(choice.label).toBe(t('agentDialog.permission.allowAlwaysBare'));
  });

  it('counts a 4-byte emoji as one code point in the caps', () => {
    const rules = [{ toolName: 'Bash', ruleContent: '👍'.repeat(256 - 'localSettings: Bash()'.length) }];
    expect(always(claudeWith({ permission_suggestions: [suggestion(rules)] })).enabled).toBe(true);
  });
});

describe('opencode permission.asked (BR5.2, BR5.3 Q1 A)', () => {
  it('builds what, detail and the request id, with Allow always from the always-patterns', () => {
    const p = opencode('permission-asked-always');
    expect(p).toMatchObject({ ok: true, kind: 'permission', toolCallId: 'per_9a1f20b3c4' });
    expect(p.permission).toEqual({
      what: 'bash',
      detail: 'git push origin feat/US-0506',
      cwd: null,
      truncated: false,
      choices: [
        { label: t('agentDialog.permission.allowOnce'), effect: 'allowOnce', refuses: false, enabled: true },
        { label: t('agentDialog.permission.allowAlways', { rules: 'bash: git push *' }), effect: 'allowAlways', refuses: false, enabled: true },
        { label: t('agentDialog.permission.reject'), effect: 'deny', refuses: true, enabled: true }
      ]
    });
  });

  it('detail from the patterns when there is no command; no Allow always without valid always-patterns', () => {
    const p = opencode('permission-asked-no-always');
    expect(p.permission.detail).toBe('src/main/index.js\nsrc/main/ipc.js');
    for (const name of ['permission-asked-no-always', 'permission-asked-empty-always', 'permission-asked-bad-always']) {
      expect(effects(opencode(name)), name).toEqual(['allowOnce', 'deny']);
    }
  });

  it('answered reads the requestID, and still the formID', () => {
    expect(adapters.opencode.parse('answered', raw('opencode', 'permission-replied')).toolCallId).toBe('per_9a1f20b3c4');
    expect(adapters.opencode.parse('answered', raw('opencode', 'form-replied')).toolCallId).toBe('frm_gate20261114');
  });
});

describe('refusals, one reason per malformed shape (NFR2.6, BR5.4, RD11)', () => {
  it.each([
    ['claude', 'permission-no-tool'],
    ['claude', 'permission-input-string'],
    ['claude', 'permission-question-tool'],
    ['opencode', 'permission-asked-no-request'],
    ['opencode', 'permission-asked-no-session']
  ])('%s %s is refused with a reason', (harness, name) => {
    const p = adapters[harness].parse('permission', raw(harness, name));
    expect(p.ok).toBe(false);
    expect(typeof p.reason).toBe('string');
  });

  it('the question tool is refused as such; not JSON and no detail too', () => {
    expect(claude('permission-question-tool').reason).toBe('question tool');
    expect(adapters.claude.parse('permission', Buffer.from('{nope')).reason).toBe('not JSON');
    expect(adapters.opencode.parse('permission', Buffer.from('{nope')).reason).toBe('not JSON');
    expect(opencodeWith({ metadata: {}, patterns: [] }).ok).toBe(false);
    expect(opencodeWith({ permission: '' }).ok).toBe(false);
  });
});

describe('escapes (SD9, NFR3.16)', () => {
  const CODES = [
    0x0000, 0x001b, 0x007f, 0x0085, 0x009f, 0x00ad, 0x061c, 0x180e, 0x200b, 0x200d, 0x200f, 0x202a, 0x202e, 0x2028, 0x2029, 0x2060, 0x2064, 0x2066, 0x2069,
    0xfeff, 0xe0001, 0xe0041, 0xe007f
  ];
  const esc = (n) => (n > 0xffff ? `\\u{${n.toString(16)}}` : `\\u${n.toString(16).padStart(4, '0')}`);
  const cases = [...CODES.map((n) => [n.toString(16), cp(n), esc(n)]), ['lone d800', '\ud800', '\\ud800']];

  it.each(cases)('U+%s shows as its escape in what, detail, cwd and a rule line', (_name, ch, shown) => {
    const p = claudeWith({
      tool_name: `T${ch}x`,
      tool_input: { command: `a${ch}b` },
      cwd: `/c${ch}d`,
      permission_suggestions: [suggestion([{ toolName: 'Bash', ruleContent: `r${ch}s` }])]
    });
    expect(p.permission.what).toBe(`T${shown}x`);
    expect(p.permission.detail).toBe(`a${shown}b`);
    expect(p.permission.cwd).toBe(`/c${shown}d`);
    expect(always(p).label).toBe(t('agentDialog.permission.allowAlways', { rules: `localSettings: Bash(r${shown}s)` }));
  });

  it('newline and tab stay in detail and are escaped elsewhere', () => {
    const p = claudeWith({ tool_name: 'T\tx', tool_input: { command: 'a\n\tb' }, cwd: '/c\nd' });
    expect(p.permission.detail).toBe('a\n\tb');
    expect(p.permission.what).toBe('T\\u0009x');
    expect(p.permission.cwd).toBe('/c\\u000ad');
  });
});

describe('bounds (SCD8, BR5.5)', () => {
  const enabled = (p) => p.permission.choices.map((c) => c.enabled);

  it('detail at 65 536 bytes is unchanged with the allows enabled; at 65 537 it is cut and both allows are disabled', () => {
    const at = claudeWith({ tool_input: { command: 'x'.repeat(65_536) } });
    expect(at.permission.detail).toHaveLength(65_536);
    expect(at.permission.truncated).toBe(false);
    expect(enabled(at)).toEqual([true, true, true]);
    const over = claudeWith({ tool_input: { command: 'x'.repeat(65_537) } });
    expect(over.permission.detail).toHaveLength(65_536);
    expect(over.permission.truncated).toBe(true);
    expect(enabled(over)).toEqual([false, false, true]);
  });

  it('a 4-byte emoji at byte 65 534 is not split', () => {
    const p = claudeWith({ tool_input: { command: `${'x'.repeat(65_534)}👍y` } });
    expect(p.permission.detail).toBe('x'.repeat(65_534));
    expect(p.permission.truncated).toBe(true);
  });

  it('what at 200 code points is whole; at 201 it is cut without splitting a pair', () => {
    expect(claudeWith({ tool_name: 'w'.repeat(200) }).permission).toMatchObject({ what: 'w'.repeat(200), truncated: false });
    const over = claudeWith({ tool_name: `${'w'.repeat(200)}👍` });
    expect(over.permission).toMatchObject({ what: 'w'.repeat(200), truncated: true });
    expect(enabled(over)).toEqual([false, false, true]);
  });

  it('cwd at 4 096 bytes is whole; at 4 097 it is cut; Deny stays enabled', () => {
    expect(claudeWith({ cwd: 'c'.repeat(4096) }).permission).toMatchObject({ cwd: 'c'.repeat(4096), truncated: false });
    const over = claudeWith({ cwd: 'c'.repeat(4097) });
    expect(over.permission).toMatchObject({ cwd: 'c'.repeat(4096), truncated: true });
    expect(over.permission.choices.at(-1)).toMatchObject({ effect: 'deny', enabled: true });
  });
});

describe('Unicode (NFR7.4, PD10)', () => {
  it('Swedish text, plain emoji, emoji with U+FE0F and a non-ASCII path arrive unchanged', () => {
    const src = json('claude', 'permission-unicode');
    const p = claude('permission-unicode');
    expect(p.permission.what).toBe(src.tool_name);
    expect(p.permission.detail).toBe(src.tool_input.command);
    expect(p.permission.cwd).toBe(src.cwd);
    expect(always(p).label).toBe(
      t('agentDialog.permission.allowAlways', { rules: `localSettings: Bash(${src.permission_suggestions[0].rules[0].ruleContent})` })
    );
  });
});

describe('replay, one per choice per harness (NFR2.4, RD15, SD12)', () => {
  const answer = (harness, p, effect) => {
    const ev = { harness, permission: p.permission };
    return adapters[harness].permissionAnswer(
      ev,
      p.permission.choices.findIndex((c) => c.effect === effect),
      p.alwaysRules
    );
  };

  it('Claude Code allow once is exactly the allow decision', () => {
    expect(JSON.parse(answer('claude', claude('permission-bash'), 'allowOnce'))).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } }
    });
  });

  it('Claude Code allow always carries the recorded suggestions unchanged, the same parsed value', () => {
    const p = claude('permission-bash-dirs');
    expect(p.alwaysRules).toEqual(json('claude', 'permission-bash-dirs').permission_suggestions);
    const out = JSON.parse(answer('claude', p, 'allowAlways'));
    expect(out).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'allow', updatedPermissions: json('claude', 'permission-bash-dirs').permission_suggestions }
      }
    });
    expect(JSON.stringify(out.hookSpecificOutput.decision.updatedPermissions)).toBe(JSON.stringify(p.alwaysRules));
  });

  it('Claude Code deny is the fixed refusal with no command text in it; no output has updatedInput', () => {
    const p = claude('permission-bash');
    const deny = answer('claude', p, 'deny');
    expect(JSON.parse(deny)).toEqual({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'deny', interrupt: true, message: DENY_MESSAGE } }
    });
    expect(DENY_MESSAGE).toBe('The person denied this in the app.');
    expect(deny).not.toContain('git push');
    for (const e of ['allowOnce', 'allowAlways', 'deny']) expect(answer('claude', p, e)).not.toContain('updatedInput');
  });

  it('opencode gives once, always and reject', () => {
    const p = opencode('permission-asked-always');
    expect(['allowOnce', 'allowAlways', 'deny'].map((e) => answer('opencode', p, e))).toEqual(['once', 'always', 'reject']);
  });
});

describe('performance (PD7)', () => {
  it('a 64 KB mixed-text detail builds in under 50 ms', () => {
    const command = `${String.fromCodePoint(0x202e)}åäö 👍 ❤️ abc\t`.repeat(3000); // about 78 KB, so the cut runs too
    // ponytail: median of 7 warm runs so suite load and coverage do not decide one sample; a real regression still fails.
    claudeWith({ tool_input: { command } });
    const times = [];
    let p;
    for (let i = 0; i < 7; i++) {
      const started = performance.now();
      p = claudeWith({ tool_input: { command } });
      times.push(performance.now() - started);
    }
    times.sort((a, b) => a - b);
    expect(times[3]).toBeLessThan(50);
    expect(p.ok).toBe(true);
  });
});
