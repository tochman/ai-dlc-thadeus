// Normalises a parsed runtime-graph.json. Unknown fields are ignored; a bad
// shape yields null rather than throwing.
// US-0411 FR2.1: per stage, `unitsApproved` and `unitsSeen` count its unit instances.

function durationMs(start, end) {
  const a = Date.parse(start);
  const b = Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) ? b - a : null;
}

function parseBoltDag(dag) {
  if (!dag || !Array.isArray(dag.units)) return null;
  const units = dag.units
    .filter((u) => u && typeof u.name === 'string')
    .map((u) => ({
      name: u.name,
      kind: u.kind ?? null,
      dependsOn: Array.isArray(u.depends_on) ? u.depends_on.filter((d) => typeof d === 'string') : []
    }));
  const batches = Array.isArray(dag.batches)
    ? dag.batches.filter(Array.isArray).map((b) => b.filter((n) => typeof n === 'string'))
    : [units.map((u) => u.name)];
  return { units, batches };
}

/**
 * US-0011: a stage built unit by unit (parallel Units) carries its times only on `instances`.
 * Started at the earliest unit start; completed at the latest unit end, only once every unit is approved.
 */
function unitTimes(instances) {
  const units = Array.isArray(instances) ? instances.filter((i) => i && typeof i === 'object') : [];
  const starts = units
    .map((i) => i.started_at)
    .filter((t) => typeof t === 'string')
    .sort();
  const ends = units
    .map((i) => i.completed_at)
    .filter((t) => typeof t === 'string')
    .sort();
  const allDone = units.length > 0 && units.every((i) => i.outcome === 'approved' && typeof i.completed_at === 'string');
  return {
    startedAt: starts[0] ?? null,
    completedAt: allDone ? ends[ends.length - 1] : null,
    // US-0411 FR2.1: counts for the level bar.
    approved: units.filter((i) => i.outcome === 'approved').length,
    seen: units.length
  };
}

export function parseRuntimeGraph(json) {
  if (!json || typeof json !== 'object' || !Array.isArray(json.stages)) return null;
  const stages = json.stages
    .filter((s) => s && typeof s.stage_slug === 'string')
    .map((s) => {
      const units = unitTimes(s.instances);
      const startedAt = s.started_at ?? units.startedAt;
      const completedAt = s.completed_at ?? units.completedAt;
      return {
        slug: s.stage_slug,
        agent: s.agent ?? null,
        startedAt,
        completedAt,
        outcome: s.outcome ?? null,
        durationMs: durationMs(startedAt, completedAt),
        unitsApproved: units.approved,
        unitsSeen: units.seen,
        sensorFirings: Array.isArray(s.sensor_firings) ? s.sensor_firings.length : 0
      };
    });
  return {
    workflowId: json.workflow_id ?? null,
    scope: json.scope ?? null,
    startedAt: json.started_at ?? null,
    stages,
    boltDag: parseBoltDag(json.bolt_dag)
  };
}
