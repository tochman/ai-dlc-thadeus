// The "Kostnad" tab of one intent, plus the cost and model tables the project panel reuses.
import { compareModels } from '../main/parsers/ledger.js';
import {
  COST_EXPLANATION,
  COST_LABEL,
  MISSING_PRICE,
  NO_COST_ENTRY,
  formatCost,
  formatTokens,
  formatUsd,
  tokenBreakdown
} from './format.js';

const SOURCE_LABEL = { 'aidlc-config': 'aidlc config', 'agent-files': 'agentfiler', none: 'ingen källa' };

export function CostLabel({ complete = true }) {
  return (
    <span className="cost-label">
      {COST_LABEL}
      <span className="info-tip" title={COST_EXPLANATION} aria-label={COST_EXPLANATION} role="img">
        ⓘ
      </span>
      {!complete && (
        <span className="tag tag-warn" title="Minst en modell har tokens men inget pris i ledgern">
          Ofullständig
        </span>
      )}
    </span>
  );
}

/** USD, share of the total and tokens per row; the largest row is highlighted (FR2.2, FR6.3). */
export function CostTable({ title, rows, totalUsd, testId }) {
  if (rows.length === 0) return null;
  const top = Math.max(...rows.map((r) => r.usd));
  return (
    <table className="cost-table" data-testid={testId}>
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Namn</th>
          <th scope="col">USD</th>
          <th scope="col">Andel</th>
          <th scope="col">Tokens</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className={r.usd > 0 && r.usd === top ? 'is-top' : ''}>
            <td>{r.name}</td>
            <td className={r.missingPrice ? 'missing-price' : ''}>{formatCost(r)}</td>
            <td>{totalUsd > 0 && !r.missingPrice ? `${Math.round((r.usd / totalUsd) * 100)} %` : '–'}</td>
            <td title={tokenBreakdown(r.tokens)}>{formatTokens(r.totalTokens)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function modelText(row) {
  if (row.inherit) return row.expected ? `Sessionens modell (${row.expected})` : 'Sessionens modell';
  return row.configured ?? '–';
}

/** Configured vs actual model per agent, with the configuration source (FR4.2–FR4.6). */
export function ModelTable({ models, agentModels, onlyParticipants = false }) {
  if (!models) return <p className="muted">Läser modellkonfigurationen …</p>;
  const rows = compareModels(models, agentModels ?? {}, { onlyParticipants });
  return (
    <div className="model-table" data-testid="model-table">
      <p className="muted">
        Konfigurerad modell från: <strong>{SOURCE_LABEL[models.source] ?? models.source}</strong>
        {models.error && (
          <span className="tag tag-warn" title={models.error}>
            aidlc config gick inte att köra
          </span>
        )}
      </p>
      {rows.length === 0 ? (
        <p className="muted">Inga agenter att visa.</p>
      ) : (
        <table className="cost-table">
          <thead>
            <tr>
              <th scope="col">Agent</th>
              <th scope="col">Konfigurerad</th>
              <th scope="col">Faktisk (ledger)</th>
              <th scope="col">Effort</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.agent}>
                <td>{r.agent === 'main' ? 'main (sessionen)' : r.agent}</td>
                <td>{r.agent === 'main' && !r.configured ? 'Sessionens modell' : modelText(r)}</td>
                <td>
                  {r.actual.length ? r.actual.join(', ') : <span className="muted" title="Agenten körde bara i stages som delades med andra agenter">okänd</span>}
                  {r.mismatch && (
                    <span className="tag tag-warn" title={`Konfigurerad för ${r.expected}`} data-testid="model-mismatch">
                      Avviker
                    </span>
                  )}
                </td>
                <td>{r.effort ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Stage rows in pipeline order; stages only the ledger knows come last (FR2.1). */
function inPipelineOrder(rows, pipeline) {
  const order = pipeline.phases.flatMap((p) => p.stages.map((s) => s.slug));
  const pos = (r) => (order.includes(r.name) ? order.indexOf(r.name) : order.length);
  return [...rows].sort((a, b) => pos(a) - pos(b));
}

export default function CostTab({ cost, intentCost, pipeline, models }) {
  if (!cost) return <p className="muted">Läser kostnad …</p>;
  if (!cost.available) return <p className="muted" data-testid="cost-tab-unavailable">{cost.reason}</p>;
  if (!intentCost) return <p className="muted">– {NO_COST_ENTRY}</p>;
  const { total } = intentCost;

  return (
    <div className="cost-tab" data-testid="cost-tab">
      {cost.stale && <p className="banner banner-warn" role="status">{cost.warning} Visar senaste giltiga värden.</p>}
      <div className="cost-total">
        <CostLabel complete={intentCost.complete} />
        <span className="cost-total-usd">{total.missingPrice ? MISSING_PRICE : formatUsd(total.usd)}</span>
        <span className="muted">{tokenBreakdown(total.tokens)}</span>
      </div>
      <CostTable title="Per stage" rows={inPipelineOrder(intentCost.byStage, pipeline)} totalUsd={total.usd} testId="cost-tab-stages" />
      <CostTable title="Per agent" rows={intentCost.byAgent} totalUsd={total.usd} testId="cost-tab-agents" />
      <CostTable title="Per modell" rows={intentCost.byModel} totalUsd={total.usd} testId="cost-tab-models" />
      <h3 className="section-title">Modeller för deltagande agenter</h3>
      <ModelTable models={models} agentModels={intentCost.agentModels} onlyParticipants />
    </div>
  );
}
