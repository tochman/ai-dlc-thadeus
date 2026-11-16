// US-0507 FR1–FR3, FR5.2: the agent progress rows of one intent, read from its audit events. Pure; the loader
// (src/main/agentProgress.js) adds the plan steps, the last commit and the review findings to these rows.
import { workingAgents } from '../projectService.js';
import { agentName } from './ledger.js';

/** A finished build or review keeps its row with its result this long, then drops off (FR5.2). */
export const FINISHED_KEEP_MS = 60000;
const BUILD_STAGE = 'code-generation';
const minutesBetween = (from, to) => Math.max(0, Math.floor((to - from) / 60000));

/** Unit builds by `Bolt slug` and reviews by `Request Id`, opened and closed as the audit logs them (FR1.2, FR3.1). */
function buildsAndReviews(events) {
  const builds = new Map();
  const reviews = new Map();
  let stage = null;
  for (const e of events) {
    const f = e.fields ?? {};
    if (e.category === 'stage' && f.Stage) stage = f.Stage;
    const slug = f['Bolt slug'];
    const id = f['Request Id'];
    if ((e.event === 'WORKTREE_CREATED' || e.event === 'BOLT_STARTED') && slug) {
      const prev = builds.get(slug);
      const open = prev && !prev.endedMs;
      builds.set(slug, {
        kind: 'build',
        key: `build:${slug}`,
        unit: slug,
        agent: null,
        stage: f['Swarm Stage'] ?? (open ? prev.stage : null) ?? stage ?? BUILD_STAGE,
        startedMs: open ? prev.startedMs : e.timeMs,
        endedMs: null,
        status: 'running',
        worktree: f['Worktree path'] ?? (open ? prev.worktree : null) ?? null
      });
    } else if ((e.event === 'BOLT_COMPLETED' || e.event === 'BOLT_FAILED') && builds.has(slug)) {
      Object.assign(builds.get(slug), { endedMs: e.timeMs, status: e.event === 'BOLT_COMPLETED' ? 'done' : 'failed' });
    } else if (e.event === 'REVIEW_REQUESTED' && id) {
      reviews.set(id, {
        kind: 'review',
        key: id,
        unit: f.Unit ?? null,
        agent: agentName(f.Reviewer ?? ''),
        reviewer: f.Reviewer ?? null,
        stage: f.Stage ?? stage,
        startedMs: e.timeMs,
        endedMs: null,
        status: 'requested',
        verdict: null,
        record: null
      });
    } else if (e.event === 'REVIEW_COMPLETED' && reviews.has(id)) {
      Object.assign(reviews.get(id), { endedMs: e.timeMs, status: 'done', verdict: f.Verdict ?? null, record: f['Review Record'] ?? null });
    }
  }
  return [...builds.values(), ...reviews.values()];
}

/**
 * US-0507 FR1.2, FR1.3, FR3.1, FR5.2: one row per running piece of agent work, Unit builds first, then reviews, then
 * the other agents (`workingAgents`, minus those a build or review row already shows). A dispatched Code Generation
 * agent is a build with no Unit. A finished row stays for FINISHED_KEEP_MS; an open one only while agents are in flight.
 * @param {Array<{event: string, timeMs: number, fields: object, category: string}>} events in time order
 * @param {{running: number, nowMs: number}} opts running: the inflight entries now
 */
export function progressRows(events, { running = 0, nowMs = Date.now() } = {}) {
  // ponytail: an open build or review whose end event never came shows while any agent is in flight; per-row liveness if that misleads.
  const kept = buildsAndReviews(events).filter((r) => (r.endedMs ? nowMs - r.endedMs < FINISHED_KEEP_MS : running > 0));
  const open = kept.filter((r) => !r.endedMs);
  const buildStages = new Set(open.filter((r) => r.kind === 'build').map((r) => r.stage));
  const reviewers = open.filter((r) => r.kind === 'review').map((r) => r.reviewer);
  const others = workingAgents(events, running).filter((a) => {
    const i = reviewers.indexOf(a.agent);
    if (i !== -1) reviewers.splice(i, 1);
    return i === -1 && !buildStages.has(a.stage);
  });
  const agentRows = others.map((a) => ({
    kind: a.stage === BUILD_STAGE ? 'build' : 'agent',
    key: `agent:${a.agent}:${a.startedMs}`,
    unit: null,
    agent: a.name,
    stage: a.stage,
    startedMs: a.startedMs,
    endedMs: null,
    status: 'running',
    worktree: null
  }));
  return [...kept, ...agentRows].map((r) => ({ ...r, minutes: minutesBetween(r.startedMs, r.endedMs ?? nowMs) }));
}

/** US-0507 FR2.1: steps done of all steps, from the `- [x]` and `- [ ]` lines of a code-generation-plan.md. */
export function planSteps(text) {
  const marks = [...String(text).matchAll(/^\s*- \[([ xX])\]/gm)].map((m) => m[1]);
  return { done: marks.filter((m) => m !== ' ').length, total: marks.length };
}

/** US-0507 FR3.2: findings per severity, named as the review record spells them. */
export function severityCounts(record) {
  const counts = {};
  for (const f of Array.isArray(record?.findings) ? record.findings : []) {
    if (f?.severity) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}
