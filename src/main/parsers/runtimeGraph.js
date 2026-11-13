// Normalises a parsed runtime-graph.json. Unknown fields are ignored; a bad
// shape yields null rather than throwing.

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

export function parseRuntimeGraph(json) {
  if (!json || typeof json !== 'object' || !Array.isArray(json.stages)) return null;
  const stages = json.stages
    .filter((s) => s && typeof s.stage_slug === 'string')
    .map((s) => ({
      slug: s.stage_slug,
      agent: s.agent ?? null,
      startedAt: s.started_at ?? null,
      completedAt: s.completed_at ?? null,
      outcome: s.outcome ?? null,
      durationMs: durationMs(s.started_at, s.completed_at),
      sensorFirings: Array.isArray(s.sensor_firings) ? s.sensor_firings.length : 0
    }));
  return {
    workflowId: json.workflow_id ?? null,
    scope: json.scope ?? null,
    startedAt: json.started_at ?? null,
    stages,
    boltDag: parseBoltDag(json.bolt_dag)
  };
}
