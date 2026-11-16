// US-0507 FR2, FR3.2, FR5.3, NFR2: the loader adds the plan steps, the last commit subject and the review findings to the
// agent progress rows, from a temp project; git goes through a fake exec that only answers the fixed read-only call.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { loadAgentProgress } from '../../src/main/agentProgress.js';

const TMP = path.resolve(__dirname, '../.tmp/agent-progress');
const DIR = '261116-x';
const BASE = `aidlc/spaces/default/intents/${DIR}`;
const WT = '.aidlc/worktrees/bolt-2a09832c_u1-a';
const T0 = Date.UTC(2026, 10, 16, 8, 0);
const at = (m) => new Date(T0 + m * 60000).toISOString();
const NOW = T0 + 30 * 60000;

const write = async (rel, text) => {
  await fs.mkdir(path.dirname(path.join(TMP, rel)), { recursive: true });
  await fs.writeFile(path.join(TMP, rel), text);
};
const shard = (...blocks) =>
  blocks
    .map(([m, fields]) =>
      Object.entries({ Timestamp: at(m), ...fields })
        .map(([k, v]) => `**${k}**: ${v}`)
        .join('\n')
    )
    .join('\n\n---\n\n');
const inflight = (n) => JSON.stringify({ version: 1, entries: Array.from({ length: n }, (_, i) => ({ sessionId: `s${i}` })) });
const plan = (done, open) => `# Plan\n\n${'- [x] step\n'.repeat(done)}${'- [ ] step\n'.repeat(open)}`;

/** Answers only `git log -1 --format=%s`, recording each cwd; anything else fails like git would. */
function fakeExec(subjects) {
  const calls = [];
  const exec = async (file, args, opts) => {
    if (file !== 'git') return '__AIDLC_DASH_PATH__/usr/bin'; // the login-shell PATH probe
    calls.push({ args, cwd: opts.cwd });
    if (args.join(' ') !== 'log -1 --format=%s' || !(opts.cwd in subjects)) throw Object.assign(new Error('fatal'), { code: 128 });
    return `${subjects[opts.cwd]}\n`;
  };
  return { exec, calls };
}

const review = (m, id, record) => [
  [m, { Event: 'REVIEW_REQUESTED', Stage: 'code-generation', Reviewer: 'aidlc-architecture-reviewer-agent', 'Request Id': id }],
  [m + 1, { Event: 'REVIEW_COMPLETED', Stage: 'code-generation', Reviewer: 'aidlc-architecture-reviewer-agent', 'Request Id': id, Verdict: 'NOT-READY', 'Review Record': record }]
];

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await write('aidlc/.aidlc-subagent-inflight', inflight(2));
});
afterEach(() => fs.rm(TMP, { recursive: true, force: true }));

describe('loadAgentProgress (US-0507 FR2, FR3.2, FR5.3, NFR2)', () => {
  it('counts the worktree plan, reads the commit in the worktree and the findings, and names what it cannot read', async () => {
    await write(
      `${BASE}/audit/host-1.md`,
      shard(
        [0, { Event: 'STAGE_STARTED', Stage: 'code-generation' }],
        [1, { Event: 'WORKTREE_CREATED', 'Bolt slug': 'u1-a', 'Worktree path': WT }],
        [1, { Event: 'BOLT_STARTED', 'Bolt slug': 'u1-a' }],
        [2, { Event: 'WORKTREE_CREATED', 'Bolt slug': 'u2-b', 'Worktree path': '.aidlc/worktrees/bolt-2a09832c_u2-b' }],
        ...review(29, 'review:1', '.aidlc-engine/reviews/code-generation/stage/a1/1.json'),
        ...review(29, 'review:2', '.aidlc-engine/reviews/code-generation/stage/a2/1.json')
      )
    );
    await write(`${WT}/${BASE}/construction/u1-a/code-generation/code-generation-plan.md`, plan(6, 21));
    await write(`${BASE}/.aidlc-engine/reviews/code-generation/stage/a1/1.json`, JSON.stringify({ findings: [{ severity: 'Major' }, { severity: 'Minor' }, { severity: 'Major' }] }));
    const root = await openRoot(TMP);
    const { exec, calls } = fakeExec({ [path.join(root, WT)]: 'feat(u1-a): step 6' });

    const rows = await loadAgentProgress(root, 'default', DIR, { exec, nowMs: NOW });
    expect(rows).toEqual([
      expect.objectContaining({ unit: 'u1-a', steps: { done: 6, total: 27 }, commit: 'feat(u1-a): step 6', unreadable: null }),
      expect.objectContaining({ unit: 'u2-b', steps: null, commit: null, unreadable: '.aidlc/worktrees/bolt-2a09832c_u2-b' }),
      expect.objectContaining({ kind: 'review', verdict: 'NOT-READY', severities: { Major: 2, Minor: 1 }, unreadable: null }),
      expect.objectContaining({ kind: 'review', verdict: 'NOT-READY', severities: null, unreadable: `${BASE}/.aidlc-engine/reviews/code-generation/stage/a2/1.json` })
    ]);
    expect(calls).toEqual([{ args: ['log', '-1', '--format=%s'], cwd: path.join(root, WT) }]);
  });

  it('reads the record plan and the project commit for a build with no Unit, and names a missing plan', async () => {
    await write(
      `${BASE}/audit/host-1.md`,
      shard([0, { Event: 'STAGE_STARTED', Stage: 'code-generation' }], [1, { Event: 'SUBAGENT_DISPATCHED', 'Agent Type': 'aidlc-developer-agent' }])
    );
    const root = await openRoot(TMP);
    const { exec } = fakeExec({ [root]: 'docs(US-0507): start' });
    const recordPlan = `${BASE}/construction/code-generation/code-generation-plan.md`;

    expect(await loadAgentProgress(root, 'default', DIR, { exec, nowMs: NOW })).toEqual([
      expect.objectContaining({ kind: 'build', unit: null, steps: null, commit: 'docs(US-0507): start', unreadable: recordPlan })
    ]);
    await write(recordPlan, plan(3, 10));
    expect(await loadAgentProgress(root, 'default', DIR, { exec, nowMs: NOW })).toEqual([
      expect.objectContaining({ kind: 'build', unit: null, steps: { done: 3, total: 13 }, unreadable: null })
    ]);
  });

  it('gives no rows for an intent without an audit folder and refuses a bad intent name', async () => {
    const root = await openRoot(TMP);
    expect(await loadAgentProgress(root, 'default', DIR, { exec: fakeExec({}).exec, nowMs: NOW })).toEqual([]);
    await expect(loadAgentProgress(root, 'default', '../x', { nowMs: NOW })).rejects.toThrow();
  });
});
