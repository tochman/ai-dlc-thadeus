import { describe, expect, it, vi } from 'vitest';
import {
  appliedEffort,
  applyModelChange,
  buildModelCommand,
  checkDrift,
  estimateCost,
  ledgerRows,
  modelOptions,
  previewModelChange,
  pricesFromLedger
} from '../../src/main/modelChoice.js';

const envelope = (harness, effective) => JSON.stringify({ schemaVersion: 1, ok: true, code: 0, status: 'ok', data: { harness, policy: null, effective } });
// Trimmed from `aidlc config models --show --json --harness <h>` and `opencode models` (2026-11-14).
const SHOW = {
  claude: envelope('claude', [
    { agent: 'developer', group: 'deciding', model: 'inherit', modelSource: 'shipped default', effortSource: 'shipped default' },
    { agent: 'product-lead', group: 'reviewing', model: 'sonnet', effort: 'medium', modelSource: 'shipped default', effortSource: 'shipped default' },
    { agent: 'quality', group: 'deciding', model: 'claude-opus-5-5', modelSource: 'project', effortSource: 'shipped default' }
  ]),
  opencode: envelope('opencode', [{ agent: 'developer', group: 'deciding', modelSource: 'shipped default', effortSource: 'shipped default' }])
};
const OPENCODE_MODELS = 'anthropic/claude-opus-5-5\nanthropic/claude-sonnet-5-5\nopenai/gpt-5.5\nopencode/big-pickle\n';
const CLAUDE_LIST = ['default', 'inherit', 'opus', 'sonnet', 'haiku', 'claude-opus-5-5'];
const PLAN = 'models configuration plan: update=1';

/** Answers each command from the fixtures (an Error is thrown), plus the PATH probe runFixed makes once. */
function fakeExec({ show = SHOW, models = OPENCODE_MODELS, other = PLAN } = {}) {
  const calls = [];
  const exec = vi.fn(async (file, args) => {
    if (args[0] === '-l') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push({ file, args });
    let answer = other;
    if (file === 'opencode') answer = models;
    else if (args.includes('--show')) answer = show[args[args.length - 1]];
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { exec, calls };
}

describe('models and effort per agent (EPIC-09 US-0904)', () => {
  it('builds the exact args for a Claude agent change, with the target chosen explicitly (FR1.3)', () => {
    expect(buildModelCommand({ harness: 'claude', agent: 'developer', model: 'opus', effort: 'high', where: 'project' }, CLAUDE_LIST)).toEqual({
      args: ['config', 'models', '--agent', 'developer', '--effort', 'high', '--model', 'opus', '--harness', 'claude', '--project', '--yes'],
      dryRunArgs: ['config', 'models', '--agent', 'developer', '--effort', 'high', '--model', 'opus', '--harness', 'claude', '--project', '--dry-run']
    });
    expect(buildModelCommand({ harness: 'claude', agent: 'developer', effort: 'default', where: 'local' }, CLAUDE_LIST).args).toEqual([
      'config',
      'models',
      '--agent',
      'developer',
      '--effort',
      'default',
      '--harness',
      'claude',
      '--local',
      '--yes'
    ]);
    expect(() => buildModelCommand({ harness: 'claude', agent: 'developer', model: 'opus' }, CLAUDE_LIST)).toThrow(); // no target
    expect(() => buildModelCommand({ harness: 'claude', agent: 'developer', model: 'opus', where: 'global' }, CLAUDE_LIST)).toThrow();
  });

  it('shows opencode xhigh as running at high, and leaves Claude and max as chosen', () => {
    expect(appliedEffort('opencode', 'xhigh')).toBe('high');
    expect(appliedEffort('opencode', 'max')).toBe('max');
    expect(appliedEffort('claude', 'xhigh')).toBe('xhigh');
  });

  it('refuses a model id that is not in the harness list, and an agent name with a space', () => {
    expect(() => buildModelCommand({ harness: 'claude', agent: 'developer', model: 'gpt-5.5', where: 'project' }, CLAUDE_LIST)).toThrow(/gpt-5.5/);
    expect(() => buildModelCommand({ harness: 'claude', agent: 'dev eloper', model: 'opus', where: 'project' }, CLAUDE_LIST)).toThrow();
    expect(() => buildModelCommand({ harness: 'codex', agent: 'developer', model: 'opus', where: 'project' }, CLAUDE_LIST)).toThrow();
    expect(() => buildModelCommand({ harness: 'claude', agent: 'developer', model: 'opus', where: 'project', args: '--x' }, CLAUDE_LIST)).toThrow();
  });

  it('builds one command for all agents from a preset, and a group effort', () => {
    expect(buildModelCommand({ harness: 'opencode', preset: 'balanced', where: 'project' }).args).toEqual([
      'config',
      'models',
      '--preset',
      'balanced',
      '--harness',
      'opencode',
      '--project',
      '--yes'
    ]);
    expect(buildModelCommand({ harness: 'claude', group: 'writing-up', effort: 'low', where: 'local' }).args).toEqual([
      'config',
      'models',
      '--writing-up-effort',
      'low',
      '--harness',
      'claude',
      '--local',
      '--yes'
    ]);
    expect(() => buildModelCommand({ harness: 'claude', preset: 'balanced', agent: 'developer', where: 'project' })).toThrow();
    expect(() => buildModelCommand({ harness: 'claude', preset: 'cheap', where: 'project' })).toThrow();
  });

  it('estimateCost on a two-row ledger returns the expected difference, labelled as an estimate', () => {
    const project = {
      byAgent: [
        { name: 'developer-agent', usd: 10, totalTokens: 1000 },
        { name: 'quality', usd: 2, totalTokens: 1000 }
      ],
      byModel: [
        { name: 'claude-opus-5-5', usd: 10, totalTokens: 1000 },
        { name: 'claude-sonnet-5-5', usd: 2, totalTokens: 1000 }
      ],
      agentModels: { developer: ['claude-opus-5-5'], quality: ['claude-sonnet-5-5'] }
    };
    const rows = ledgerRows(project);
    expect(rows).toEqual([
      { agent: 'developer', model: 'claude-opus-5-5', totalTokens: 1000, usd: 10 },
      { agent: 'quality', model: 'claude-sonnet-5-5', totalTokens: 1000, usd: 2 }
    ]);
    const prices = pricesFromLedger(project.byModel);
    expect(estimateCost(rows, prices, { agents: ['developer'], model: 'sonnet' })).toEqual({ estimate: true, before: 12, after: 4, delta: -8 });
    expect(estimateCost(rows, prices, { agents: ['quality'], model: 'anthropic/claude-opus-5-5' }).delta).toBeCloseTo(8);
    expect(estimateCost(rows, prices, { agents: ['developer'], model: 'haiku' })).toBeNull(); // no price in this ledger
    expect(estimateCost(rows, prices, { agents: ['developer'], model: 'inherit' })).toBeNull();
  });
});

describe('model options and running the CLI', () => {
  it('offers Claude aliases plus configured ids, and opencode ids from opencode models', async () => {
    const claude = await modelOptions('/p', 'claude', fakeExec());
    expect(claude).toMatchObject({ editable: true, models: CLAUDE_LIST, applied: {} });
    expect(claude.configured.map((c) => c.agent)).toEqual(['developer', 'product-lead', 'quality']);

    const opencode = await modelOptions('/p', 'opencode', fakeExec());
    expect(opencode.editable).toBe(true);
    expect(opencode.models).toEqual([
      'default',
      'inherit',
      'anthropic/claude-opus-5-5',
      'anthropic/claude-sonnet-5-5',
      'openai/gpt-5.5',
      'opencode/big-pickle'
    ]);
    expect(opencode.applied).toEqual({ xhigh: 'high' });
  });

  it('is read-only with a reason when the model list cannot be read, and for harnesses without a table or with an IDE picker', async () => {
    const failed = await modelOptions('/p', 'opencode', fakeExec({ models: Object.assign(new Error('spawn opencode ENOENT'), { code: 'ENOENT' }) }));
    expect(failed.editable).toBe(false);
    expect(failed.reason).toMatch(/ENOENT/);
    const showFailed = await modelOptions('/p', 'claude', fakeExec({ show: { claude: '{"ok":false,"message":"not installed"}' } }));
    expect(showFailed).toMatchObject({ editable: false });
    expect(showFailed.reason).toMatch(/not installed/);

    const { exec } = fakeExec();
    expect((await modelOptions('/p', 'kiro', { exec })).editable).toBe(false);
    expect((await modelOptions('/p', 'cursor', { exec })).editable).toBe(false);
    expect((await modelOptions('/p', 'nope', { exec })).editable).toBe(false);
    expect(exec).not.toHaveBeenCalled();
  });

  it('previews with --dry-run, applies with --yes, checks drift, and returns a CLI failure as a value', async () => {
    const { exec, calls } = fakeExec();
    const change = { harness: 'claude', agent: 'developer', model: 'sonnet', where: 'project' };
    expect(await previewModelChange('/p', change, CLAUDE_LIST, { exec })).toEqual({
      command: 'aidlc config models --agent developer --model sonnet --harness claude --project --yes',
      dryRun: PLAN
    });
    expect(calls[calls.length - 1].args.includes('--dry-run')).toBe(true);
    expect((await applyModelChange('/p', change, CLAUDE_LIST, { exec })).ok).toBe(true);
    expect(calls[calls.length - 1].args.includes('--yes')).toBe(true);
    await checkDrift('/p', 'claude', { exec });
    expect(calls[calls.length - 1].args).toEqual(['config', 'models', '--check', '--harness', 'claude']);

    const failing = fakeExec({ other: new Error('one file differs from its policy') });
    expect(await checkDrift('/p', 'claude', failing)).toMatchObject({ ok: false, error: 'one file differs from its policy' });
  });
});
