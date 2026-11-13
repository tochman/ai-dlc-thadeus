// Collapsible project cost overview at the top of the intent list (FR3, FR4.6, FR6).
import { useState } from 'react';
import { CostLabel, CostTable, ModelTable } from './CostTab.jsx';
import { Readout } from './Lcars.jsx';
import { COST_LABEL, MISSING_PRICE, formatCost, formatTokens, formatUsd, shortModel, tokenBreakdown } from './format.js';

const BAR_W = 14;
const BAR_GAP = 6;
const CHART_H = 60;

/** Cost per intent over time as plain SVG bars, ordered by date prefix (FR3.2). */
function CostChart({ timeline }) {
  if (timeline.length === 0) return null;
  const max = Math.max(...timeline.map((t) => t.usd), 0.01);
  const width = timeline.length * (BAR_W + BAR_GAP);
  return (
    <figure className="cost-chart">
      <svg viewBox={`0 0 ${width} ${CHART_H}`} width="100%" height={CHART_H} preserveAspectRatio="none" role="img" aria-label="Kostnad per intent över tid">
        {timeline.map((t, i) => {
          const h = Math.max(1, (t.usd / max) * (CHART_H - 2));
          return (
            <rect key={t.dirName} x={i * (BAR_W + BAR_GAP)} y={CHART_H - h} width={BAR_W} height={h}>
              <title>{`${t.date ?? '–'} ${t.slug}: ${formatUsd(t.usd)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="muted">Kostnad per intent över tid ({timeline[0].date ?? '–'} – {timeline.at(-1).date ?? '–'})</figcaption>
    </figure>
  );
}

function ScopeTable({ byScope }) {
  const scopes = Object.entries(byScope).sort((a, b) => b[1].usd - a[1].usd);
  if (scopes.length === 0) return null;
  return (
    <table className="cost-table" data-testid="cost-panel-scopes">
      <caption>Per scope</caption>
      <thead>
        <tr>
          <th scope="col">Scope</th>
          <th scope="col">Total</th>
          <th scope="col">Intents</th>
          <th scope="col">Snitt</th>
        </tr>
      </thead>
      <tbody>
        {scopes.map(([scope, s]) => (
          <tr key={scope}>
            <td>{scope}</td>
            <td>
              {formatUsd(s.usd)}
              {s.missingPrice && '*'}
            </td>
            <td>{s.count}</td>
            <td>{formatUsd(s.avg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const byUsd = (rows) => [...rows].sort((a, b) => b.usd - a.usd);

/** The readout under the total: top models filled (the largest lit), top agents outlined (FR3.5). */
function readoutRows(project) {
  const models = byUsd(project.byModel)
    .slice(0, 2)
    .map((r, i) => ({ ...r, label: shortModel(r.name), key: i === 0 ? 'steel' : 'light' }));
  const agents = byUsd(project.byAgent)
    .slice(0, 2)
    .map((r) => ({ ...r, key: 'outline' }));
  return [...models, ...agents];
}

/**
 * Total and readout always show; the tables fold out. `open`/`onToggle` let the left arm's "Kostnad" block
 * drive it (FR2.2); without them the panel keeps its own state.
 */
export default function CostPanel({ cost, models, open: openProp, onToggle }) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const toggle = onToggle ?? (() => setOwnOpen((o) => !o));
  if (!cost) return null;
  const project = cost.available ? cost.project : null;

  return (
    <section className="cost-panel" data-testid="cost-panel">
      <button className="cost-panel-toggle lcars-heading" onClick={toggle} aria-expanded={open} data-testid="cost-panel-toggle">
        <span className="section-title">Kostnad</span>
        <span className="lcars-heading-line" aria-hidden="true" />
        <span className="lcars-heading-meta">Uppskattad · API-pris</span>
        <span className="toggle-arrow" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {!project && <p className="muted">{cost.reason}</p>}
      {project && (
        <>
          <p className="cost-big">
            <span className="cost-big-usd" title={COST_LABEL}>
              {formatCost(project.total)}
              {!project.complete && '*'}
            </span>
            <span className="cost-big-tokens">{formatTokens(project.total.totalTokens)} tokens</span>
          </p>
          <Readout rows={readoutRows(project)} totalUsd={project.total.usd} />
        </>
      )}
      {open && project && (
        <div className="cost-panel-body">
          {cost.stale && <p className="banner banner-warn" role="status">{cost.warning} Visar senaste giltiga värden.</p>}
          <p className="cost-total">
            <CostLabel complete={project.complete} />
            <span className="cost-total-usd">{project.total.missingPrice ? MISSING_PRICE : formatUsd(project.total.usd)}</span>
            <span className="muted">{tokenBreakdown(project.total.tokens)}</span>
          </p>
          {project.legacy && (
            <p className="cost-legacy" data-testid="cost-panel-legacy" title="Körningar under record:<space>/legacy, från före intent-id. Ingår i totalen.">
              Äldre körningar (utan intent-id): {formatCost(project.legacy)} · {formatTokens(project.legacy.totalTokens)} tokens
            </p>
          )}
          <CostChart timeline={cost.timeline} />
          <CostTable title="Per modell" rows={project.byModel} totalUsd={project.total.usd} testId="cost-panel-models" />
          <CostTable title="Per agent" rows={project.byAgent} totalUsd={project.total.usd} testId="cost-panel-agents" />
          <ScopeTable byScope={cost.byScope} />
          <h3 className="section-title">Modeller per agent</h3>
          <ModelTable models={models} agentModels={project.agentModels} />
        </div>
      )}
    </section>
  );
}
