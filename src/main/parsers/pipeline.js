// Merges aidlc-state.md stage checkboxes with runtime-graph.json timings.
// The state file wins; a disagreement about "done" is flagged as a mismatch.
// US-0411 FR2.1, FR3.4: each stage also carries its unit counts for the level bar and a failed outcome.
// US-0509 FR4.1: each stage also says whether the work has passed it (`behind`), and the counts follow a plan switch.
import { isArchived } from '../../shared/intentArchive.js';
import { stageRuns } from '../../shared/planChange.js';

const ACTIVE = new Set(['in-progress', 'awaiting-approval', 'revising']);
// US-0411 FR3.4: any other runtime outcome (e.g. `rejected`) is a failure; `pending` is a stage still running.
const NOT_FAILED = new Set(['approved', 'pending']);

function graphStatus(g) {
  if (g.completedAt && g.outcome === 'approved') return 'done';
  if (g.startedAt) return 'in-progress';
  return 'not-started';
}

/**
 * US-0509 FR4.1: the stages before the current one, which AI-DLC does not go back to; none without a current stage in the
 * state file. Construction built unit by unit is gone back to for each unit, so while the work is in it none of its stages
 * is behind. It is built so only once there are units, as in AI-DLC.
 * ponytail: the stages AI-DLC itself goes back to (Reverse Engineering it owes, one added just after it was passed) need
 * its audit and record, so they show as passed until they start.
 */
function stagesBehind(state) {
  const all = (state?.phases ?? []).flatMap((p) => p.stages.map((s) => ({ ...s, phase: p.name })));
  const at = all.findIndex((s) => s.slug === state?.currentStage);
  const unitByUnit = state?.constructionIteration === 'unit-major' && all.some((s) => s.slug === 'units-generation' && s.status === 'done');
  const goneBackTo = unitByUnit && all[at]?.phase === 'construction';
  return new Set(
    all
      .slice(0, Math.max(at, 0))
      .filter((s) => !(goneBackTo && s.phase === 'construction'))
      .map((s) => s.slug)
  );
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
  const archived = isArchived({ stateStatus: state?.currentStatus }); // US-0513 FR1.6: nothing in it runs
  const behind = stagesBehind(state);

  const phases = (state?.phases ?? []).map((phase) => ({
    name: phase.name,
    stages: phase.stages.map((s) => {
      const g = bySlug.get(s.slug);
      const mismatch = !!g && s.status !== 'skipped' && (graphStatus(g) === 'done') !== (s.status === 'done');
      return {
        slug: s.slug,
        status: s.status,
        mode: s.mode,
        behind: behind.has(s.slug),
        agent: g?.agent ?? null,
        startedAt: g?.startedAt ?? null,
        completedAt: g?.completedAt ?? null,
        durationMs: g?.durationMs ?? null,
        outcome: g?.outcome ?? null,
        mismatch,
        units: unitsOf(g),
        failed: !!g?.outcome && !NOT_FAILED.has(g.outcome), // US-0411 FR3.4
        graphStatus: g ? graphStatus(g) : null,
        current: !archived && (ACTIVE.has(s.status) || (inFlight && s.slug === state.currentStage))
      };
    })
  }));

  // A stage skipped by a jump ([S]) is not left to do, so it is not counted: the list's n/m, the detail's dots and its
  // "Step n of m" then agree (US-0013). The pipeline still shows it, muted. The rule itself is stageRuns (US-0509 FR4.1).
  const executed = phases.flatMap((p) => p.stages).filter(stageRuns);
  return {
    phases,
    done: executed.filter((s) => s.status === 'done').length,
    executed: executed.length
  };
}
