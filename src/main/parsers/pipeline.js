// Merges aidlc-state.md stage checkboxes with runtime-graph.json timings.
// The state file wins; a disagreement about "done" is flagged as a mismatch.
// US-0411 FR2.1, FR3.4: each stage also carries its unit counts for the level bar and a failed outcome.

const ACTIVE = new Set(['in-progress', 'awaiting-approval', 'revising']);
// US-0411 FR3.4: any other runtime outcome (e.g. `rejected`) is a failure; `pending` is a stage still running.
const NOT_FAILED = new Set(['approved', 'pending']);

function graphStatus(g) {
  if (g.completedAt && g.outcome === 'approved') return 'done';
  if (g.startedAt) return 'in-progress';
  return 'not-started';
}

/**
 * @param {ReturnType<import('./state.js').parseState>|null} state
 * @param {ReturnType<import('./runtimeGraph.js').parseRuntimeGraph>|null} graph
 */
export function mergePipeline(state, graph) {
  const bySlug = new Map((graph?.stages ?? []).map((g) => [g.slug, g])); // last run of a stage wins
  const planned = graph?.boltDag?.units.length || 0;
  // US-0411 FR2.1: units in the plan (bolt_dag), else the instances seen; null for a stage not built unit by unit.
  const unitsOf = (g) => (g?.unitsSeen ? { approved: g.unitsApproved, total: planned || g.unitsSeen } : null);
  const inFlight = state && !/^complete/i.test(state.currentStatus ?? '');

  const phases = (state?.phases ?? []).map((phase) => ({
    name: phase.name,
    stages: phase.stages.map((s) => {
      const g = bySlug.get(s.slug);
      const mismatch = !!g && s.status !== 'skipped' && (graphStatus(g) === 'done') !== (s.status === 'done');
      return {
        slug: s.slug,
        status: s.status,
        mode: s.mode,
        agent: g?.agent ?? null,
        startedAt: g?.startedAt ?? null,
        completedAt: g?.completedAt ?? null,
        durationMs: g?.durationMs ?? null,
        outcome: g?.outcome ?? null,
        mismatch,
        units: unitsOf(g),
        failed: !!g?.outcome && !NOT_FAILED.has(g.outcome), // US-0411 FR3.4
        graphStatus: g ? graphStatus(g) : null,
        current: ACTIVE.has(s.status) || (inFlight && s.slug === state.currentStage)
      };
    })
  }));

  // A stage skipped by a jump ([S]) is not left to do, so it is not counted: the list's n/m, the detail's dots and its
  // "Step n of m" then agree (US-0013). The pipeline still shows it, muted.
  const executed = phases.flatMap((p) => p.stages).filter((s) => s.mode === 'EXECUTE' && s.status !== 'skipped');
  return {
    phases,
    done: executed.filter((s) => s.status === 'done').length,
    executed: executed.length
  };
}
