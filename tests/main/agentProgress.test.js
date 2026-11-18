// US-0507 FR1–FR3, FR5.2: the agent progress rows read from the audit events, the plan ticks and the review findings.
import { describe, expect, it } from 'vitest';
import { FINISHED_KEEP_MS, planSteps, progressRows, severityCounts } from '../../src/main/parsers/agentProgress.js';
import { categoryOf, mergeAudits } from '../../src/main/parsers/audit.js';

const T0 = Date.UTC(2026, 10, 16, 8, 0);
const min = (m) => T0 + m * 60000;
const ev = (m, event, fields = {}) => ({ event, timeMs: min(m), fields: { Event: event, ...fields }, category: /^STAGE_/.test(event) ? 'stage' : 'other' });
const worktree = (m, slug) =>
  ev(m, 'WORKTREE_CREATED', { 'Bolt slug': slug, 'Worktree path': `.aidlc/worktrees/bolt-2a09832c_${slug}`, 'Branch name': `bolt-2a09832c_${slug}` });
const boltStarted = (m, slug) => ev(m, 'BOLT_STARTED', { 'Bolt slug': slug, 'Bolt names': slug });
const boltCompleted = (m, slug) => ev(m, 'BOLT_COMPLETED', { 'Bolt slug': slug, 'Bolt names': slug });
const requested = (m, id, extra = {}) =>
  ev(m, 'REVIEW_REQUESTED', { Stage: 'code-generation', Reviewer: 'aidlc-architecture-reviewer-agent', Iteration: '1', 'Request Id': id, ...extra });
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
      expect.objectContaining({
        kind: 'build',
        unit: 'u2-permissions',
        stage: 'code-generation',
        minutes: 12,
        status: 'running',
        worktree: '.aidlc/worktrees/bolt-2a09832c_u2-permissions'
      }),
      expect.objectContaining({ kind: 'review', unit: null, stage: 'code-generation', agent: 'architecture-reviewer', minutes: 5, status: 'requested' }),
      expect.objectContaining({ kind: 'agent', unit: null, stage: 'functional-design', agent: 'architect', minutes: 14, status: 'running' })
    ]);
  });

  it('turns a Code Generation agent with no Unit into a build row', () => {
    const rows = progressRows([stage(0, 'code-generation'), dispatched(1, 'aidlc-developer-agent')], { running: 1, nowMs: min(4) });
    expect(rows).toEqual([expect.objectContaining({ kind: 'build', unit: null, stage: 'code-generation', agent: 'developer', minutes: 3, status: 'running' })]);
  });

  it("shows the running Code Generation build while no agent is in flight and Claude Code's helpers completed as unknown (US-0025)", () => {
    const done = (m, agent) => ev(m, 'SUBAGENT_COMPLETED', { 'Agent Type': agent, 'Agent ID': 'a1' });
    const events = [stage(0, 'code-generation'), dispatched(1, 'aidlc-developer-agent'), done(5, 'unknown'), done(6, 'unknown')];
    expect(progressRows(events, { running: 0, nowMs: min(10) })).toEqual([
      expect.objectContaining({ kind: 'build', unit: null, stage: 'code-generation', agent: 'developer', minutes: 9, status: 'running' })
    ]);
  });

  it('drops a review whose stage has completed without its REVIEW_COMPLETED (US-0025)', () => {
    const events = [stage(0, 'code-generation'), requested(1, 'review:1'), ev(5, 'STAGE_COMPLETED', { Stage: 'code-generation' })];
    expect(progressRows(events, { running: 1, nowMs: min(10) })).toEqual([]);
  });

  it('gives no rows when nothing runs (FR1.4), and drops open rows while no agent is in flight', () => {
    expect(progressRows([], { running: 0, nowMs: min(1) })).toEqual([]);
    expect(progressRows([worktree(0, 'u1-a'), requested(1, 'review:1')], { running: 0, nowMs: min(2) })).toEqual([]);
  });
});

// US-0214 OQ1, FR2.3, FR4.1: the screenshot of 2026-11-17 22:33 (intent 261117-session-handoff-dialog). The audit as it
// stood then, cut to the blocks that matter: a developer agent dispatched at 21:14:46Z, Claude Code's own helper agents
// completing as `unknown` (they empty AI-DLC's inflight file), and a general-purpose agent that came and went.
const SCREENSHOT_AUDIT = [
  ['2026-11-17T16:00:29Z', 'STAGE_STARTED', { Stage: 'code-generation' }],
  ['2026-11-17T21:05:43Z', 'PLAN_APPROVAL_RECORDED', { Stage: 'code-generation' }],
  ['2026-11-17T21:07:09Z', 'SUBAGENT_DISPATCHED', { 'Agent Type': 'aidlc-developer-agent' }],
  ['2026-11-17T21:07:29Z', 'SUBAGENT_COMPLETED', { 'Agent Type': 'unknown', 'Agent ID': 'a158270404b01de3f' }],
  ['2026-11-17T21:14:46Z', 'SUBAGENT_DISPATCHED', { 'Agent Type': 'aidlc-developer-agent' }],
  ['2026-11-17T21:14:54Z', 'SUBAGENT_COMPLETED', { 'Agent Type': 'unknown', 'Agent ID': 'ab610e29ad6ae3d54' }],
  ['2026-11-17T21:26:01Z', 'SUBAGENT_DISPATCHED', { 'Agent Type': 'claude-code-guide' }],
  ['2026-11-17T21:28:03Z', 'SUBAGENT_COMPLETED', { 'Agent Type': 'claude-code-guide', 'Agent ID': 'a6d477bd7a8c8ee89' }],
  ['2026-11-17T21:28:22Z', 'SUBAGENT_COMPLETED', { 'Agent Type': 'unknown', 'Agent ID': 'adff02c747b5187d6' }],
  ['2026-11-17T21:29:38Z', 'SUBAGENT_DISPATCHED', { 'Agent Type': 'general-purpose' }],
  ['2026-11-17T21:29:59Z', 'SUBAGENT_COMPLETED', { 'Agent Type': 'unknown', 'Agent ID': 'a949f7593f9f04850' }],
  ['2026-11-17T21:32:58Z', 'SUBAGENT_COMPLETED', { 'Agent Type': 'general-purpose', 'Agent ID': 'a21c9e75ddf201681' }]
]
  .map(
    ([ts, event, fields]) =>
      `## ${event}\n**Timestamp**: ${ts}\n**Event**: ${event}\n${Object.entries(fields)
        .map(([k, v]) => `**${k}**: ${v}`)
        .join('\n')}\n`
  )
  .join('\n---\n\n');

describe('the screenshot case (US-0214 OQ1, FR2.3)', () => {
  it('shows the running developer agent at 22:33 while the inflight file is empty', () => {
    const events = mergeAudits([{ source: 'macbookpro.md', text: SCREENSHOT_AUDIT }]).map((e) => ({ ...e, category: categoryOf(e.event) }));
    const rows = progressRows(events, { running: 0, nowMs: Date.parse('2026-11-17T21:33:00Z') });
    expect(rows).toEqual([
      expect.objectContaining({ kind: 'build', unit: null, stage: 'code-generation', agent: 'developer', minutes: 18, status: 'running' })
    ]);
  });
});

describe('finished work (US-0507 FR3.2, FR5.2)', () => {
  const events = [worktree(0, 'u1-a'), boltStarted(0, 'u1-a'), requested(18, 'review:9'), boltCompleted(20, 'u1-a'), reviewed(20, 'review:9', 'NOT-READY')];

  it('keeps a finished build and a reviewed review with their result for under a minute', () => {
    const rows = progressRows(events, { running: 0, nowMs: min(20) + FINISHED_KEEP_MS - 1 });
    expect(rows).toEqual([
      expect.objectContaining({ kind: 'build', unit: 'u1-a', status: 'done', minutes: 20 }),
      expect.objectContaining({
        kind: 'review',
        status: 'done',
        verdict: 'NOT-READY',
        record: '.aidlc-engine/reviews/code-generation/stage/2eaf/1.json',
        minutes: 2
      })
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
