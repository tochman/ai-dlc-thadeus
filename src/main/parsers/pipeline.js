// Merges aidlc-state.md stage checkboxes with runtime-graph.json timings.
// The state file wins; a disagreement about "done" is flagged as a mismatch.

const ACTIVE = new Set(['in-progress', 'awaiting-approval', 'revising']);

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
  const inFlight = state && !/^complete/i.test(state.currentStatus ?? '');

  const phases = (state?.phases ?? []).map((phase) => ({
    name: phase.name,
    stages: phase.stages.map((s) => {
      const g = bySlug.get(s.slug);
      const mismatch =
        !!g && s.status !== 'skipped' && (graphStatus(g) === 'done') !== (s.status === 'done');
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
        graphStatus: g ? graphStatus(g) : null,
        current: ACTIVE.has(s.status) || (inFlight && s.slug === state.currentStage)
      };
    })
  }));

  const executed = phases.flatMap((p) => p.stages).filter((s) => s.mode === 'EXECUTE');
  return {
    phases,
    done: executed.filter((s) => s.status === 'done').length,
    executed: executed.length
  };
}
