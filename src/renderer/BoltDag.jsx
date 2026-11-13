import { UNIT_STATUS_LABEL } from './format.js';

const NODE_W = 200;
const NODE_H = 64;
const COL_GAP = 80;
const ROW_GAP = 6;
const PAD = 16;

/** Columns from `batches`; units no batch mentions get a final column so none disappear. */
function layout(dag) {
  const columns = dag.batches.map((b) => b.filter((n) => dag.units.some((u) => u.name === n)));
  const placed = new Set(columns.flat());
  const rest = dag.units.map((u) => u.name).filter((n) => !placed.has(n));
  if (rest.length) columns.push(rest);
  const pos = {};
  columns.forEach((col, c) =>
    col.forEach((name, r) => {
      pos[name] = { x: PAD + c * (NODE_W + COL_GAP), y: PAD + r * (NODE_H + ROW_GAP) };
    })
  );
  const width = PAD * 2 + columns.length * NODE_W + (columns.length - 1) * COL_GAP;
  const height = PAD * 2 + Math.max(...columns.map((c) => c.length)) * (NODE_H + ROW_GAP) - ROW_GAP;
  return { pos, width, height };
}

export default function BoltDag({ dag, statuses }) {
  if (!dag || dag.units.length === 0) {
    return (
      <p className="muted" data-testid="bolt-dag-empty">
        Den här intenten har ingen bolt-DAG. Den finns bara när Units Generation har delat upp arbetet i units.
      </p>
    );
  }
  const { pos, width, height } = layout(dag);

  return (
    <div className="bolt-dag" data-testid="bolt-dag">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Unit-beroenden per batch">
        <defs>
          <marker id="dag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" className="dag-arrow" />
          </marker>
        </defs>
        {dag.units.flatMap((u) =>
          u.dependsOn
            .filter((d) => pos[d])
            .map((d) => {
              const a = pos[d];
              const b = pos[u.name];
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x - 2;
              const y2 = b.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              return (
                <path
                  key={`${d}->${u.name}`}
                  className="dag-edge"
                  d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                  markerEnd="url(#dag-arrow)"
                />
              );
            })
        )}
        {dag.units.map((u) => {
          const p = pos[u.name];
          const status = statuses?.[u.name] ?? 'pending';
          return (
            <g key={u.name} transform={`translate(${p.x},${p.y})`} className={`dag-node unit-${status}`}>
              <title>{`${u.name} (${u.kind ?? 'okänd typ'}): ${UNIT_STATUS_LABEL[status]}`}</title>
              {/* An LCARS block: status at the top, the name at the bottom right. */}
              <rect width={NODE_W} height={NODE_H} />
              <text x="10" y="18" className="dag-meta">
                {u.kind ?? '–'} · {UNIT_STATUS_LABEL[status]}
              </text>
              <text x={NODE_W - 10} y={NODE_H - 10} textAnchor="end" className="dag-name">
                {u.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
