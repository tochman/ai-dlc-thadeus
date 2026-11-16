import { describe, expect, it } from 'vitest';
import { checkProgram, programCommand, projectCommand, projectPlan, readProjectPlan, readUpdateCheck } from '../../src/main/aidlcUpdate.js';
import { isWorkflowRunning } from '../../src/renderer/workflowBusy.js';

// The real answers of aidlc 2.11.3 (US-0504): `update --check --json` behind, current and offline.
const BEHIND = JSON.stringify({
  schemaVersion: 1,
  ok: true,
  code: 5,
  status: 'action-needed',
  message: 'binary 2.11.3, latest 2.11.4',
  data: { state: 'behind', currentVersion: '2.11.3', channel: 'stable', latestVersion: '2.11.4', stale: false }
});
const CURRENT = JSON.stringify({
  schemaVersion: 1,
  ok: true,
  code: 0,
  status: 'ok',
  message: 'binary 2.11.4 is current',
  data: { state: 'current', currentVersion: '2.11.4', channel: 'stable', latestVersion: '2.11.4', stale: false }
});
const OFFLINE = JSON.stringify({ schemaVersion: 1, ok: false, code: 3, status: 'failed', message: 'update check unavailable while offline' });

const ROOT = '/work/project';
const DRY_RUN = JSON.stringify({
  schemaVersion: 1,
  ok: true,
  code: 0,
  status: 'ok',
  message: `config plan for ${ROOT}: create=1 update=2 merge=1 preserve=2 remove=1 conflict=1`,
  data: {
    projectDir: ROOT,
    distribution: 'claude',
    counts: { create: 1, update: 2, merge: 1, preserve: 2, remove: 1, conflict: 1 },
    actions: [
      { path: '.claude/agents/aidlc-architect-agent.md', action: 'preserve' },
      { path: '.claude/skills/aidlc/SKILL.md', action: 'update' },
      { path: '.claude/tools/aidlc-orchestrate.ts', action: 'update' },
      { path: '.claude/knowledge/new.md', action: 'create' },
      { path: '.claude/settings.json', action: 'merge' },
      { path: '.claude/old.md', action: 'remove' },
      { path: '.claude/CLAUDE.md', action: 'conflict' },
      { path: '.claude/hooks/aidlc-a.ts', action: 'preserve' }
    ]
  }
});
const NOTHING = JSON.stringify({
  ok: true,
  data: { counts: { create: 0, update: 0, merge: 0, preserve: 2, remove: 0, conflict: 0 }, actions: [{ path: '.claude/a.md', action: 'preserve' }] }
});

/** Answers `file args` like the real tools; a rejection is `{code, stdout}` like execFile's for a non-zero exit. */
function fakeExec(responses, calls = []) {
  return async (file, args) => {
    if (file !== 'aidlc') return '__AIDLC_DASH_PATH__/usr/bin';
    const key = `${file} ${args.join(' ')}`;
    calls.push(key);
    const answer = responses[key];
    if (answer === undefined) throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT' });
    if (answer.code) throw Object.assign(new Error(`Command failed: ${key}`), answer);
    return answer;
  };
}

describe('readUpdateCheck (US-0504 FR1.2, FR5)', () => {
  it('reads newer with the latest version, current, and unavailable with the CLI message', () => {
    expect(readUpdateCheck(BEHIND, 5)).toMatchObject({ status: 'newer', latest: '2.11.4' });
    expect(readUpdateCheck(CURRENT, 0)).toMatchObject({ status: 'current' });
    expect(readUpdateCheck(OFFLINE, 3)).toEqual({ status: 'unavailable', latest: null, reason: 'update check unavailable while offline' });
  });

  it('gives unavailable with a reason for an answer that is not JSON', () => {
    const res = readUpdateCheck('Segmentation fault', 139);
    expect(res.status).toBe('unavailable');
    expect(res.reason).toBeTruthy();
  });
});

describe('checkProgram (FR1.1, FR1.2, NFR2)', () => {
  it('reads the version and a check that exits 5 from the rejected call', async () => {
    const exec = fakeExec({
      'aidlc --version': 'aidlc 2.11.3 (runtime 2.11.3)\n',
      'aidlc update --check --json': { code: 5, stdout: BEHIND }
    });
    expect(await checkProgram({ exec })).toEqual({ version: 'aidlc 2.11.3 (runtime 2.11.3)', status: 'newer', latest: '2.11.4', reason: null });
  });

  it('never throws when aidlc is missing', async () => {
    const res = await checkProgram({ exec: fakeExec({}) });
    expect(res).toMatchObject({ version: null, status: 'unavailable', latest: null });
    expect(res.reason).toMatch(/ENOENT/);
  });
});

describe('readProjectPlan (FR2.1, FR2.2)', () => {
  it('keeps create, update, merge and remove files, drops preserve and lists conflicts', () => {
    const plan = readProjectPlan(DRY_RUN);
    expect(plan.counts).toEqual({ create: 1, update: 2, merge: 1, preserve: 2, remove: 1, conflict: 1 });
    expect(plan.files.map((f) => f.action)).toEqual(['update', 'update', 'create', 'merge', 'remove']);
    expect(plan.conflicts).toEqual(['.claude/CLAUDE.md']);
  });

  it('gives an empty list when nothing changes, and throws on an answer with ok:false', () => {
    expect(readProjectPlan(NOTHING)).toMatchObject({ files: [], conflicts: [] });
    expect(() => readProjectPlan(JSON.stringify({ ok: false, message: 'no harness here' }))).toThrow('no harness here');
  });
});

describe('projectPlan and the commands (FR1.3, FR2.3, NFR1)', () => {
  it('runs the dry run with fixed arguments and refuses an unknown harness id', async () => {
    const calls = [];
    const exec = fakeExec({ [`aidlc --project-dir ${ROOT} config --harness claude --dry-run --json`]: DRY_RUN }, calls);
    expect((await projectPlan(ROOT, 'claude', { exec })).files).toHaveLength(5);
    expect(calls).toEqual([`aidlc --project-dir ${ROOT} config --harness claude --dry-run --json`]);
    await expect(projectPlan(ROOT, '--yes', { exec })).rejects.toThrow(/--yes/);
    await expect(projectPlan('relative/dir', 'claude', { exec })).rejects.toThrow();
  });

  it('gives the exact commands to type', () => {
    expect(programCommand()).toBe('aidlc update');
    expect(projectCommand('opencode')).toBe('aidlc config --harness opencode --yes');
    expect(() => projectCommand('claude; rm -rf /')).toThrow();
  });
});

describe('isWorkflowRunning (FR4)', () => {
  const NOW = 1_000_000_000;
  const idle = { anyBusy: () => false };
  it('is true for a busy agent tab or an AI-DLC write within 5 minutes', () => {
    expect(isWorkflowRunning({ anyBusy: () => true }, null, NOW)).toBe(true);
    expect(isWorkflowRunning(idle, NOW - 4 * 60 * 1000, NOW)).toBe(true);
    expect(isWorkflowRunning({ state: (tab) => (tab === 'agent' ? 'busy' : 'idle') }, null, NOW)).toBe(true);
  });

  it('is false otherwise, also without a terminal', () => {
    expect(isWorkflowRunning(idle, NOW - 6 * 60 * 1000, NOW)).toBe(false);
    expect(isWorkflowRunning(idle, null, NOW)).toBe(false);
    expect(isWorkflowRunning(null, null, NOW)).toBe(false);
  });
});
