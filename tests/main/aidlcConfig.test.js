import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { checkHarness, getAidlcConfig, splitSource } from '../../src/main/aidlcConfig.js';

const TMP = path.resolve(__dirname, '../.tmp/aidlc-config');
const envelope = (data) => JSON.stringify({ schemaVersion: 1, ok: true, code: 0, status: 'ok', data });

// Trimmed from `aidlc config <section> --show --json --harness claude` and `aidlc config list --json` (2026-11-14).
const OUTPUT = {
  models: envelope({
    harness: 'claude',
    effective: [
      { agent: 'architect', group: 'deciding', layer: 'session-inherit', model: 'inherit', modelSource: 'shipped default', effortSource: 'shipped default' },
      { agent: 'product-lead', group: 'reviewing', model: 'sonnet', effort: 'medium', modelSource: 'project', effortSource: 'env' }
    ]
  }),
  flags: envelope({
    section: 'flags',
    effective: { AWS_AIDLC_DEFAULT_SCOPE: 'classic' },
    sources: { AWS_AIDLC_DEFAULT_SCOPE: 'env', AIDLC_USE_SWARM: 'shipped default' }
  }),
  providers: envelope({ section: 'providers', harnessManaged: false, record: null, credentials: { hasCredentials: false } }),
  project: envelope({ section: 'project', plugins: null, installedPlugins: ['aidlc'] }),
  list: JSON.stringify({
    depth: 'Minimal',
    review: '',
    'guard-policy': 'off (from scope ultra-express)',
    'guard.review-freeze': 'off (guard policy off (from scope ultra-express))'
  })
};

/** An exec that answers each aidlc command from `answers` (a string, or a function that throws) and the PATH probe. */
function fakeExec(answers = OUTPUT) {
  const calls = [];
  const exec = vi.fn(async (file, args, opts) => {
    if (file !== 'aidlc') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push({ args, opts });
    const answer = answers[args[1]];
    return typeof answer === 'function' ? answer() : answer;
  });
  return { exec, calls };
}

let root;
beforeAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  const write = async (rel, text) => {
    await fs.mkdir(path.dirname(path.join(TMP, rel)), { recursive: true });
    await fs.writeFile(path.join(TMP, rel), text);
  };
  await write('aidlc/scopes/ultra-express.md', '---\nname: ultra-express\ndescription: Plan saved from 261113, based on bugfix\n---\n');
  await write('.claude/scopes/aidlc-ultra-express.md', '---\nname: ultra-express\ndescription: harness copy\n---\n');
  await write('.claude/scopes/aidlc-mvp.md', '---\nname: mvp\ndepth: Standard\ndescription: Skip operations, ship the core\n---\n');
  await write('.claude/scopes/aidlc-broken.md', '---\ndescription: no name here\n---\n');
  root = await openRoot(TMP);
});
afterAll(() => fs.rm(TMP, { recursive: true, force: true }));

describe('getAidlcConfig', () => {
  it('reads every section with fixed args, the harness and no shell (FR2.1–FR2.6, FR2.8, NFR2)', async () => {
    const { exec, calls } = fakeExec();
    const res = await getAidlcConfig(root, { harness: 'claude', activeScope: 'ultra-express', exec });

    expect(calls.map((c) => c.args).sort()).toEqual([
      ['config', 'flags', '--show', '--json', '--harness', 'claude'],
      ['config', 'list', '--json'],
      ['config', 'models', '--show', '--json', '--harness', 'claude'],
      ['config', 'project', '--show', '--json', '--harness', 'claude'],
      ['config', 'providers', '--show', '--json', '--harness', 'claude']
    ]);
    for (const c of calls) expect(c.opts).toMatchObject({ cwd: root, timeout: 10000 });
    expect(calls.every((c) => c.opts.shell === undefined)).toBe(true);

    expect(res.errors).toEqual({});
    expect(res.models[0]).toEqual({
      agent: 'architect',
      model: 'inherit',
      effort: null,
      modelSource: 'shipped default',
      effortSource: 'shipped default',
      env: false
    });
    expect(res.flags).toEqual([
      { name: 'AWS_AIDLC_DEFAULT_SCOPE', value: 'classic', source: 'env', env: true },
      { name: 'AIDLC_USE_SWARM', value: null, source: 'shipped default', env: false }
    ]);
    expect(res.active).toContainEqual({ key: 'guard-policy', value: 'off', source: 'scope ultra-express', env: false });
    expect(res.active).toContainEqual({ key: 'review', value: '', source: null, env: false });
    expect(res.provider).toEqual({ provider: null, region: null, profile: null, harnessManaged: false });
    expect(res.plugins).toEqual({ installed: ['aidlc'], selected: null });
    // Only the fields the view shows reach the renderer (FR2.8).
    expect(JSON.stringify(res)).not.toMatch(/credentials|schemaVersion|layer/);
  });

  it('marks a value whose source is the environment (FR2.7)', async () => {
    const res = await getAidlcConfig(root, { harness: 'claude', exec: fakeExec().exec });
    expect(res.models.find((m) => m.agent === 'product-lead').env).toBe(true);
    expect(res.flags.find((f) => f.name === 'AWS_AIDLC_DEFAULT_SCOPE').env).toBe(true);
  });

  it('keeps the working sections when one command fails, and reports an ok:false envelope (FR5.3)', async () => {
    const failing = {
      ...OUTPUT,
      list: () => {
        throw new Error('Command failed: aidlc config list --json');
      },
      providers: JSON.stringify({ schemaVersion: 1, ok: false, message: 'multiple project harnesses are present' })
    };
    const res = await getAidlcConfig(root, { harness: 'claude', exec: fakeExec(failing).exec });
    expect(res.active).toBeNull();
    expect(res.errors.active).toMatch(/config list/);
    expect(res.provider).toBeNull();
    expect(res.errors.provider).toBe('multiple project harnesses are present');
    expect(res.models).toHaveLength(2);
    expect(res.flags).toHaveLength(2);
    expect(res.errors.missing).toBeUndefined();
  });

  it('reports a missing aidlc and a timeout without throwing (FR5.1, NFR3)', async () => {
    const enoent = () => {
      throw Object.assign(new Error('spawn aidlc ENOENT'), { code: 'ENOENT' });
    };
    const missing = await getAidlcConfig(root, {
      harness: 'claude',
      exec: fakeExec({ models: enoent, flags: enoent, providers: enoent, project: enoent, list: enoent }).exec
    });
    expect(missing.errors.missing).toBe(true);
    expect([missing.models, missing.flags, missing.active, missing.provider, missing.plugins]).toEqual([null, null, null, null, null]);

    const timedOut = await getAidlcConfig(root, {
      harness: 'claude',
      exec: fakeExec({
        ...OUTPUT,
        models: () => {
          throw Object.assign(new Error('Command failed'), { killed: true });
        }
      }).exec
    });
    expect(timedOut.errors.models).toMatch(/10 s/);
    expect(timedOut.errors.missing).toBeUndefined();
  });

  it('lists own plans first, drops their harness copy, highlights the active one and skips a nameless file (FR3.1–FR3.4)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await getAidlcConfig(root, { harness: 'claude', activeScope: 'ultra-express', exec: fakeExec().exec });
    expect(res.plans).toEqual([
      { name: 'ultra-express', description: 'Plan saved from 261113, based on bugfix', own: true, active: true },
      { name: 'mvp', description: 'Skip operations, ship the core', own: false, active: false }
    ]);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('aidlc-broken.md'))).toBe(true);
    warn.mockRestore();
  });
});

describe('splitSource', () => {
  it('takes the outermost trailing brackets as the source, nested ones included (FR2.4)', () => {
    expect(splitSource('off (guard policy off (from scope ultra-express))')).toEqual({
      value: 'off',
      source: 'guard policy off (from scope ultra-express)'
    });
    expect(splitSource('Minimal')).toEqual({ value: 'Minimal', source: null });
    expect(splitSource('odd)')).toEqual({ value: 'odd)', source: null });
  });
});

describe('checkHarness', () => {
  const detected = [
    { id: 'claude', installed: true },
    { id: 'cursor', installed: false }
  ];
  it('accepts an installed table harness and refuses any other id (FR4.3, NFR2)', () => {
    expect(checkHarness('claude', detected).id).toBe('claude');
    expect(() => checkHarness('cursor', detected)).toThrow(/Cursor/);
    expect(() => checkHarness('rm -rf', detected)).toThrow(/rm -rf/);
    expect(() => checkHarness({ id: 'claude' }, detected)).toThrow();
  });
});
