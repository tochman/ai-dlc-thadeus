// US-0507 FR1–FR3, FR5.2: the agent progress rows read from the audit events, the plan ticks and the review findings.
import { describe, expect, it } from 'vitest';
import { FINISHED_KEEP_MS, planSteps, progressRows, severityCounts } from '../../src/main/parsers/agentProgress.js';

const T0 = Date.UTC(2026, 10, 16, 8, 0);
const min = (m) => T0 + m * 60000;
const ev = (m, event, fields = {}) => ({ event, timeMs: min(m), fields: { Event: event, ...fields }, category: /^STAGE_/.test(event) ? 'stage' : 'other' });
const worktree = (m, slug) =>
  ev(m, 'WORKTREE_CREATED', { 'Bolt slug': slug, 'Worktree path': `.aidlc/worktrees/bolt-2a09832c_${slug}`, 'Branch name': `bolt-2a09832c_${slug}` });
const boltStarted = (m, slug) => ev(m, 'BOLT_STARTED', { 'Bolt slug': slug, 'Bolt names': slug });
const boltCompleted = (m, slug) => ev(m, 'BOLT_COMPLETED', { 'Bolt slug': slug, 'Bolt names': slug });
const requested = (m, id, extra = {}) => ev(m, 'REVIEW_REQUESTED', { Stage: 'code-generation', Reviewer: 'aidlc-architecture-reviewer-agent', Iteration: '1', 'Request Id': id, ...extra });
const reviewed = (m, id, verdict) =>
  ev(m, 'REVIEW_COMPLETED', {
    Stage: 'code-generation',
    Reviewer: 'aidlc-architecture-reviewer-agent',
    'Request Id': id,
    Verdict: verdict,
    'Review Record': '.aidlc-engine/reviews/code-generation/stage/2eaf/1.json'
  });
const dispatched = (m, agent) => ev(m, 'SUBAGENT_DISPATCHED', { 'Agent Type': agent });
const stage = (m, s) => ev(m, 'STAGE_STARTED', { Stage: s });

describe('progressRows (US-0507 FR1.2, FR1.3, FR3.1)', () => {
  it('gives one row per running Unit build, review and agent with no Unit, each with its stage and minutes', () => {
    const events = [
      stage(0, 'functional-design'),
      dispatched(1, 'aidlc-architect-agent'),
      stage(2, 'code-generation'),
      worktree(3, 'u2-permissions'),
      boltStarted(3, 'u2-permissions'),
      dispatched(3, 'aidlc-developer-agent'),
      requested(10, 'review:1')
    ];
    const rows = progressRows(events, { running: 3, nowMs: min(15) });
    expect(rows).toEqual([
      expect.objectContaining({ kind: 'build', unit: 'u2-permissions', stage: 'code-generation', minutes: 12, status: 'running', worktree: '.aidlc/worktrees/bolt-2a09832c_u2-permissions' }),
      expect.objectContaining({ kind: 'review', unit: null, stage: 'code-generation', agent: 'architecture-reviewer', minutes: 5, status: 'requested' }),
      expect.objectContaining({ kind: 'agent', unit: null, stage: 'functional-design', agent: 'architect', minutes: 14, status: 'running' })
    ]);
  });

  it('turns a Code Generation agent with no Unit into a build row', () => {
    const rows = progressRows([stage(0, 'code-generation'), dispatched(1, 'aidlc-developer-agent')], { running: 1, nowMs: min(4) });
    expect(rows).toEqual([expect.objectContaining({ kind: 'build', unit: null, stage: 'code-generation', agent: 'developer', minutes: 3, status: 'running' })]);
  });

  it('gives no rows when nothing runs (FR1.4), and drops open rows while no agent is in flight', () => {
    expect(progressRows([], { running: 0, nowMs: min(1) })).toEqual([]);
    expect(progressRows([worktree(0, 'u1-a'), requested(1, 'review:1')], { running: 0, nowMs: min(2) })).toEqual([]);
  });
});

describe('finished work (US-0507 FR3.2, FR5.2)', () => {
  const events = [worktree(0, 'u1-a'), boltStarted(0, 'u1-a'), requested(18, 'review:9'), boltCompleted(20, 'u1-a'), reviewed(20, 'review:9', 'NOT-READY')];

  it('keeps a finished build and a reviewed review with their result for under a minute', () => {
    const rows = progressRows(events, { running: 0, nowMs: min(20) + FINISHED_KEEP_MS - 1 });
    expect(rows).toEqual([
      expect.objectContaining({ kind: 'build', unit: 'u1-a', status: 'done', minutes: 20 }),
      expect.objectContaining({ kind: 'review', status: 'done', verdict: 'NOT-READY', record: '.aidlc-engine/reviews/code-generation/stage/2eaf/1.json', minutes: 2 })
    ]);
  });

  it('drops them once the minute has passed', () => {
    expect(progressRows(events, { running: 0, nowMs: min(20) + FINISHED_KEEP_MS })).toEqual([]);
  });
});

describe('planSteps and severityCounts (US-0507 FR2.1, FR3.2)', () => {
  it('counts ticked and open plan steps, ignoring other lines', () => {
    const plan = '# Plan\n\n- [x] Step 1: a\n- [X] Step 2: b\n  - [ ] sub\n- [ ] Step 3: c\ntext - [x] not a step\n';
    expect(planSteps(plan)).toEqual({ done: 2, total: 4 });
    expect(planSteps('no steps')).toEqual({ done: 0, total: 0 });
  });

  it('counts findings per severity as the record spells them', () => {
    expect(severityCounts({ findings: [{ severity: 'Major' }, { severity: 'Minor' }, { severity: 'Major' }] })).toEqual({ Major: 2, Minor: 1 });
    expect(severityCounts({ findings: [] })).toEqual({});
    expect(severityCounts({})).toEqual({});
  });
});
