// US-0210: the profile commands, running them, the intent tracker and the saved profile names.
import { describe, expect, it, vi } from 'vitest';
import { createProfileTracker, profileCommands, runProfile, savedProfileNames } from '../../src/main/modelProfiles.js';

const MODELS = ['default', 'inherit', 'opus', 'sonnet', 'haiku'];
const CRITICAL = { from: 'strong', models: { developer: 'opus', architect: 'opus' } };

/** A fake exec that answers each aidlc call, failing the ones whose args include `failOn`; the PATH probe is answered too. */
function fakeExec(failOn) {
  const calls = [];
  const exec = vi.fn(async (_file, args) => {
    if (args[0] === '-l') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push(args);
    if (failOn && args.includes(failOn)) throw new Error(`refused ${failOn}`);
    return `ok ${args[2]} ${args[3]}`;
  });
  return { exec, calls };
}

describe('profile commands (US-0210 FR2.2)', () => {
  it('runs --from first, then one --agent --model per agent that has a model', () => {
    expect(profileCommands(CRITICAL, 'claude', MODELS)).toEqual([
      ['config', 'models', '--from', 'strong', '--harness', 'claude', '--project', '--yes'],
      ['config', 'models', '--agent', 'developer', '--model', 'opus', '--harness', 'claude', '--project', '--yes'],
      ['config', 'models', '--agent', 'architect', '--model', 'opus', '--harness', 'claude', '--project', '--yes']
    ]);
  });

  it('leaves out --from without a saved profile, and skips agents left empty', () => {
    expect(profileCommands({ models: { developer: '', quality: 'sonnet' } }, 'opencode', MODELS)).toEqual([
      ['config', 'models', '--agent', 'quality', '--model', 'sonnet', '--harness', 'opencode', '--project', '--yes']
    ]);
    expect(profileCommands({ models: {} }, 'claude', MODELS)).toEqual([]);
  });

  it('refuses a model outside the harness table before anything runs (NFR2)', () => {
    expect(() => profileCommands({ models: { developer: 'gpt-5.5' } }, 'claude', MODELS)).toThrow(/gpt-5.5/);
  });
});

describe('running a profile (US-0210 FR4.2, FR4.3)', () => {
  it('runs every command in order and gives each output', async () => {
    const { exec, calls } = fakeExec();
    const res = await runProfile('/p', CRITICAL, 'claude', MODELS, { exec });
    expect(res.ok).toBe(true);
    expect(res.results.map((r) => r.command)).toEqual([
      'aidlc config models --from strong --harness claude --project --yes',
      'aidlc config models --agent developer --model opus --harness claude --project --yes',
      'aidlc config models --agent architect --model opus --harness claude --project --yes'
    ]);
    expect(res.results[0]).toMatchObject({ ok: true, output: 'ok --from strong' });
    expect(calls).toHaveLength(3);
  });

  it('stops at the first failure and reports it, running none of the rest', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { exec, calls } = fakeExec('developer');
    const res = await runProfile('/p', CRITICAL, 'claude', MODELS, { exec });
    expect(res.ok).toBe(false);
    expect(res.results).toHaveLength(2);
    expect(res.results[1]).toMatchObject({ ok: false, error: 'refused developer' });
    expect(calls).toHaveLength(2);
  });

  it('runs nothing and reports the refusal when a command cannot be built', async () => {
    const { exec } = fakeExec();
    const res = await runProfile('/p', { models: { developer: 'gpt-5.5' } }, 'claude', MODELS, { exec });
    expect(res).toMatchObject({ ok: false, results: [] });
    expect(res.error).toMatch(/gpt-5.5/);
    expect(exec).not.toHaveBeenCalled();
  });
});

const intent = (dirName, plan, status = 'in-flight') => ({ dirName, plan, scope: 'express', status });
const settings = (active = null) => ({ criticalPlans: ['feature'], critical: CRITICAL, economy: { models: {} }, askBeforeBack: false, active });

describe('the profile tracker (US-0210 FR2, FR3)', () => {
  it('asks once for a new critical intent, and never again after an answer (FR2.1, FR2.3)', () => {
    const tr = createProfileTracker();
    tr.baseline([]);
    const a = intent('a', 'feature');
    expect(tr.update([a], settings())).toEqual({ ask: a });
    expect(tr.update([a], settings())).toBeNull(); // still waiting: no second question
    tr.answered('critical', false);
    expect(tr.update([a], settings())).toBeNull();
  });

  it('never asks for intents open at baseline, or on a plan that is not critical (FR2.4, FR2.5)', () => {
    const tr = createProfileTracker();
    tr.baseline([intent('old', 'feature')]);
    expect(tr.update([intent('old', 'feature'), intent('b', 'bugfix'), { dirName: 'c', scope: 'express', status: 'in-flight' }], settings())).toBeNull();
  });

  it('uses scope as the plan when plan is missing', () => {
    const tr = createProfileTracker();
    tr.baseline([]);
    const s = { dirName: 's', scope: 'feature', status: 'in-flight' };
    expect(tr.update([s], settings())).toEqual({ ask: s });
  });

  it('does not ask while the critical profile is active (FR2.1)', () => {
    const tr = createProfileTracker();
    tr.baseline([]);
    expect(tr.update([intent('a', 'feature')], settings('critical'))).toBeNull();
  });

  it('switches back only when the last of two critical intents ends (FR3.1, AC1.3.3)', () => {
    const tr = createProfileTracker();
    tr.baseline([]);
    const a = intent('a', 'feature');
    tr.update([a], settings());
    tr.answered('critical', true);
    const b = intent('b', 'feature');
    expect(tr.update([a, b], settings('critical'))).toBeNull(); // b joins the critical work without a question
    expect(tr.update([{ ...a, status: 'complete' }, b], settings('critical'))).toBeNull();
    expect(
      tr.update(
        [
          { ...a, status: 'complete' },
          { ...b, status: 'archived' }
        ],
        settings('critical')
      )
    ).toEqual({ switchBack: true });
    expect(
      tr.update(
        [
          { ...a, status: 'complete' },
          { ...b, status: 'archived' }
        ],
        settings('critical')
      )
    ).toBeNull(); // once
  });

  it('a non-critical intent starting or ending does not change the profile (FR3.2)', () => {
    const tr = createProfileTracker();
    tr.baseline([]);
    const a = intent('a', 'feature');
    tr.update([a], settings());
    tr.answered('critical', true);
    expect(tr.update([a, intent('n', 'bugfix')], settings('critical'))).toBeNull();
    expect(tr.update([a, intent('n', 'bugfix', 'complete')], settings('critical'))).toBeNull();
  });

  it('a declined intent, or one whose switch failed, gives no switch back when it ends (FR3.3)', () => {
    const tr = createProfileTracker();
    tr.baseline([]);
    const a = intent('a', 'feature');
    tr.update([a], settings());
    tr.answered('critical', false);
    expect(tr.update([{ ...a, status: 'complete' }], settings('critical'))).toBeNull();
  });
});

describe('saved AI-DLC profile names (US-0210 FR1.2)', () => {
  it('reads names from data.profiles as an object or a list, and drops invalid names', () => {
    expect(savedProfileNames({ strong: { groups: {} }, cheap: {}, 'Bad Name': {} })).toEqual(['cheap', 'strong']);
    expect(savedProfileNames(['strong', { name: 'cheap' }, 7, 'x y'])).toEqual(['cheap', 'strong']);
    expect(savedProfileNames(null)).toEqual([]);
    expect(savedProfileNames('junk')).toEqual([]);
  });
});
