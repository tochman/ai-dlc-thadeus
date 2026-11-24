// US-1403 BR5.1–BR5.3, BR5.6, NFR4.2, NFR4.3 (contract C7): the Spec Kit command form, the next command and the
// specify description.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nextCommand, speckitCommand, specifyText } from '../../src/shared/speckitCommands.js';

describe('the U5 files: one way out, the agent tab (NFR3.1, NFR4.1)', () => {
  it('import no fs or child_process and use no bridge channel beyond speckit:rules and its push', () => {
    for (const file of ['src/shared/speckitCommands.js', 'src/renderer/SpeckitCommandButton.jsx', 'src/renderer/SpeckitQuickCommands.jsx']) {
      const src = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
      expect(src, file).not.toMatch(/(node:)?(fs|child_process)['"]/);
      expect(
        [...src.matchAll(/window\.(?:bridge|api)\.(\w+)/g)].map((m) => m[1]).filter((n) => n !== 'speckitRules' && n !== 'onSpeckitChanged'),
        file
      ).toEqual([]);
    }
  });
});

describe('speckitCommand: the harness form (BR5.1, C7)', () => {
  it('writes a core stem as /speckit-<stem> for claude and /speckit.<stem> for opencode', () => {
    expect(speckitCommand('claude', 'plan')).toBe('/speckit-plan');
    expect(speckitCommand('opencode', 'plan')).toBe('/speckit.plan');
  });

  it('writes an extension command with every dot as a dash for claude, as it is for opencode', () => {
    expect(speckitCommand('claude', 'speckit.git.commit')).toBe('/speckit-git-commit');
    expect(speckitCommand('opencode', 'speckit.git.commit')).toBe('/speckit.git.commit');
  });

  it('treats speckit.<core> as the core stem', () => {
    expect(speckitCommand('claude', 'speckit.plan')).toBe(speckitCommand('claude', 'plan'));
    expect(speckitCommand('opencode', 'speckit.plan')).toBe(speckitCommand('opencode', 'plan'));
  });

  it('puts the arguments after one space, as one plain line', () => {
    expect(speckitCommand('claude', 'specify', 'Photo albums')).toBe('/speckit-specify Photo albums');
    expect(speckitCommand('opencode', 'specify', 'a\nb')).toBe('/speckit.specify a b');
    expect(speckitCommand('claude', 'clarify', '   ')).toBe('/speckit-clarify');
  });

  it('gives null for a name that is not safe (NFR4.2)', () => {
    for (const name of ['a;rm -rf', 'x\ny', 'speckit.', '', 'speckit.git;ls', 'notacommand', null, undefined]) {
      expect(speckitCommand('claude', name)).toBeNull();
    }
  });

  it('gives null for codex, no harness and an unknown harness', () => {
    for (const harness of ['codex', null, undefined, 'kiro', 'nope']) expect(speckitCommand(harness, 'plan')).toBeNull();
  });
});

describe('specifyText: one plain line (BR5.6, NFR4.3)', () => {
  it('turns line breaks and tabs into spaces and removes control characters', () => {
    expect(specifyText('a\nb\tc\u001b[2J')).toBe('a b c[2J');
    expect(specifyText('a\r\nb\u007fc')).toBe('a bc');
  });

  it('turns U+0085, U+2028 and U+2029 into spaces', () => {
    const [nel, ls, ps] = [0x85, 0x2028, 0x2029].map((c) => String.fromCodePoint(c));
    expect(specifyText(`a${nel}b${ls}c${ps}d`)).toBe('a b c d');
  });

  it('keeps at most 1000 characters', () => {
    expect(specifyText('x'.repeat(1500))).toHaveLength(1000);
  });

  it('gives null for blanks and non-strings', () => {
    for (const raw of ['', '   ', '\n\t', '\u001b', null, undefined, 42]) expect(specifyText(raw)).toBeNull();
  });
});

const FLOW = { spec: true, clarify: false, plan: true, tasks: true, implement: false, converge: false };
const tasksOf = (...phases) => {
  const items = phases.flatMap((p) => p.items);
  return { done: items.filter((i) => i.done).length, total: items.length, skipped: 0, phases };
};
const phase = (round, ...done) => ({ name: round === null ? 'Setup' : 'Convergence', round, items: done.map((d, i) => ({ id: `T${i}`, done: d })) });
const feature = (flow, tasks = tasksOf()) => ({ dir: '001-a', active: true, flow: { ...FLOW, ...flow }, tasks, files: [] });

describe('nextCommand: where the feature stands (BR5.2, BR5.3)', () => {
  it('gives specify with no spec, plan with no plan, tasks with no tasks.md', () => {
    expect(nextCommand(feature({ spec: false, plan: false, tasks: false })).name).toBe('specify');
    expect(nextCommand(feature({ plan: false, tasks: false })).name).toBe('plan');
    expect(nextCommand(feature({ tasks: false })).name).toBe('tasks');
  });

  it('gives tasks, never converge, for a tasks.md with no tasks (empty or unreadable)', () => {
    expect(nextCommand(feature({}, tasksOf()))).toEqual({ name: 'tasks' });
  });

  it('gives implement for an open task in a phase or in a round', () => {
    expect(nextCommand(feature({}, tasksOf(phase(null, true, false)))).name).toBe('implement');
    expect(nextCommand(feature({}, tasksOf(phase(null, true), phase(1, false)))).name).toBe('implement');
  });

  it('gives converge, with converged unknown, when every task is done, with or without rounds', () => {
    expect(nextCommand(feature({}, tasksOf(phase(null, true, true))))).toEqual({ name: 'converge', converged: 'unknown' });
    expect(nextCommand(feature({}, tasksOf(phase(null, true), phase(1, true), phase(2, true))))).toEqual({ name: 'converge', converged: 'unknown' });
  });
});
