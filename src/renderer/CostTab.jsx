// The "Kostnad" tab of one intent, plus the cost and model tables the project panel reuses.
// US-0211 FR3: each figure is the recorded one, with the current-price one beside it when a rate table was loaded.
import { useTranslation } from 'react-i18next';
import { compareModels } from '../main/parsers/ledger.js';
import { formatCostPair, formatTokens, shortModel, tokenBreakdown } from './format.js';
import { Readout } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';
import i18n, { t as translate } from '../shared/i18n.js';

/** The configuration source as text; an unknown one is shown as it is. */
const sourceText = (source) => (i18n.exists(`cost.source.${source}`) ? translate(`cost.source.${source}`) : source);

export function CostLabel({ complete = true }) {
  const { t } = useTranslation();
  const explanation = t('cost.explanation');
  return (
    <span className="cost-label">
      {t('cost.label')}
      <Tooltip text={explanation} focusable>
        <span className="info-tip" aria-label={explanation} role="img">
          ⓘ
        </span>
      </Tooltip>
      {!complete && (
        <Tooltip text={t('cost.incompleteTitle')} focusable>
          <span className="tag tag-warn">{t('cost.incomplete')}</span>
        </Tooltip>
      )}
    </span>
  );
}

/**
 * US-0209 FR4.1, FR4.2: the machines a total came from, this one marked, and a "partial" tag when any part counts
 * audit stage rows only. Nothing shows when main sent no machines. Lives here so CostPanel can import it, like CostLabel.
 * @param {{machines?: {host: string|null, local: boolean}[], partial?: boolean}} props
 */
export function MachinesLine({ machines, partial }) {
  const { t } = useTranslation();
  if (!machines?.length) return null;
  const name = (m) => (m.local ? t('cost.thisMachine', { host: m.host ?? '–' }) : m.host);
  // US-0211 FR3.2: a repriced machine also shows its figures; without a rate table only the names show.
  const names = machines.map((m) => (m.currentUsd === undefined ? name(m) : `${name(m)} ${formatCostPair(m)}`));
  return (
    <p className="muted cost-machines" data-testid="cost-machines">
      {t('cost.machines', { list: names.join(', ') })}
      {partial && (
        <Tooltip text={t('cost.partialHelp')} focusable>
          <span className="tag tag-warn" data-testid="cost-partial">
            {t('cost.partial')}
          </span>
        </Tooltip>
      )}
    </p>
  );
}

/** US-0211 AC1.2.1, AC1.3.3: where a model row's current price came from, or "price missing" when no table has it. */
const rateSourceText = (source) =>
  !source ? translate('cost.missingPrice') : i18n.exists(`cost.reprice.source.${source}`) ? translate(`cost.reprice.source.${source}`) : source;

/**
 * USD, share of the total and tokens per row; the largest row is highlighted (FR2.2, FR6.3). Model rows that were
 * repriced (they carry `source`) also get the "Pris från" column (US-0211 AC1.2.1).
 */
export function CostTable({ title, rows, totalUsd, testId }) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;
  const top = Math.max(...rows.map((r) => r.usd));
  const sources = rows.some((r) => 'source' in r);
  return (
    <table className="cost-table" data-testid={testId}>
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">{t('cost.name')}</th>
          <th scope="col">{t('cost.usd')}</th>
          <th scope="col">{t('cost.share')}</th>
          <th scope="col">{t('cost.tokensHeader')}</th>
          {sources && <th scope="col">{t('cost.reprice.priceFrom')}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className={r.usd > 0 && r.usd === top ? 'is-top' : ''}>
            <td>{r.name}</td>
            <td className={r.missingPrice ? 'missing-price' : ''}>{formatCostPair(r)}</td>
            <td>{totalUsd > 0 && !r.missingPrice ? `${Math.round((r.usd / totalUsd) * 100)} %` : '–'}</td>
            <Tooltip text={tokenBreakdown(r.tokens)} focusable>
              <td>{formatTokens(r.totalTokens)}</td>
            </Tooltip>
            {sources && <td>{rateSourceText(r.source)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * US-0211 AC1.1.4, AC1.2.2, AC1.2.3: why a figure is priced the way it is: a skipped override file, haiku-5-5 at its
 * higher tier from the app's table, audit cache writes as 5m. Nothing shows without a rate table (`rates` null).
 * @param {{rates?: {notes?: {kind: string, path: string}[]}|null, byModel?: object[], audit?: boolean}} props
 */
export function CostNotes({ rates, byModel = [], audit = false }) {
  const { t } = useTranslation();
  if (!rates) return null;
  const notes = (rates.notes ?? []).map((n) => t(`cost.reprice.notes.${n.kind}`, { path: n.path }));
  if (byModel.some((r) => r.key === 'haiku-5-5' && r.source === 'app')) notes.push(t('cost.reprice.notes.haikuTier'));
  if (audit) notes.push(t('cost.reprice.notes.auditFiveMinute'));
  if (notes.length === 0) return null;
  return (
    <div className="muted cost-notes" data-testid="cost-notes">
      {notes.map((text) => (
        <p key={text}>{text}</p>
      ))}
    </div>
  );
}

function modelText(row) {
  if (row.inherit) return row.expected ? translate('cost.sessionModelOf', { model: row.expected }) : translate('cost.sessionModel');
  return row.configured ?? '–';
}

/** Configured vs actual model per agent, with the configuration source (FR4.2–FR4.6). */
export function ModelTable({ models, agentModels, onlyParticipants = false }) {
  const { t } = useTranslation();
  if (!models) return <p className="muted">{t('cost.readingModels')}</p>;
  const rows = compareModels(models, agentModels ?? {}, { onlyParticipants });
  return (
    <div className="model-table" data-testid="model-table">
      <p className="muted">
        {t('cost.configuredFrom')} <strong>{sourceText(models.source)}</strong>
        {models.error && (
          <Tooltip text={models.error} focusable>
            <span className="tag tag-warn">{t('cost.configFailed')}</span>
          </Tooltip>
        )}
      </p>
      {rows.length === 0 ? (
        <p className="muted">{t('cost.noAgents')}</p>
      ) : (
        <table className="cost-table">
          <thead>
            <tr>
              <th scope="col">{t('cost.agent')}</th>
              <th scope="col">{t('cost.configured')}</th>
              <th scope="col">{t('cost.actual')}</th>
              <th scope="col">{t('cost.effort')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.agent}>
                <td>{r.agent === 'main' ? t('cost.mainSession') : r.agent}</td>
                <td>{r.agent === 'main' && !r.configured ? t('cost.sessionModel') : modelText(r)}</td>
                <td>
                  {r.actual.length ? (
                    r.actual.join(', ')
                  ) : (
                    <Tooltip text={t('cost.unknownTitle')} focusable>
                      <span className="muted">{t('cost.unknown')}</span>
                    </Tooltip>
                  )}
                  {r.mismatch && (
                    <Tooltip text={t('cost.configuredFor', { model: r.expected })} focusable>
                      <span className="tag tag-warn" data-testid="model-mismatch">
                        {t('cost.mismatch')}
                      </span>
                    </Tooltip>
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
  const { t } = useTranslation();
  if (!cost) return <p className="muted">{t('cost.reading')}</p>;
  if (!cost.available)
    return (
      <p className="muted" data-testid="cost-tab-unavailable">
        {cost.reason}
      </p>
    );
  if (!intentCost) return <p className="muted">– {t('cost.noEntry')}</p>;
  const { total } = intentCost;

  return (
    <div className="cost-tab" data-testid="cost-tab">
      <p className="muted" data-testid="cost-tab-harness">
        {t('cost.coversClaude')}
      </p>
      {cost.stale && (
        <p className="banner banner-warn" role="status">
          {t('cost.stale', { warning: cost.warning })}
        </p>
      )}
      <div className="cost-total">
        <CostLabel complete={intentCost.complete} />
        <span className="cost-total-usd" data-testid="cost-tab-total">
          {formatCostPair(total)}
        </span>
        <span className="muted">{tokenBreakdown(total.tokens)}</span>
      </div>
      <MachinesLine machines={intentCost.machines} partial={intentCost.partial} />
      <CostNotes rates={cost.rates} byModel={intentCost.byModel} audit={!!intentCost.machines?.some((m) => m.source === 'audit')} />
      <Readout
        rows={[...intentCost.byModel].sort((a, b) => b.usd - a.usd).map((r, i) => ({ ...r, label: shortModel(r.name), key: i === 0 ? 'steel' : 'light' }))}
        totalUsd={total.usd}
      />
      <CostTable title={t('cost.perStage')} rows={inPipelineOrder(intentCost.byStage, pipeline)} totalUsd={total.usd} testId="cost-tab-stages" />
      <CostTable title={t('cost.perAgent')} rows={intentCost.byAgent} totalUsd={total.usd} testId="cost-tab-agents" />
      <CostTable title={t('cost.perModel')} rows={intentCost.byModel} totalUsd={total.usd} testId="cost-tab-models" />
      <h3 className="section-title">{t('cost.participantModels')}</h3>
      <ModelTable models={models} agentModels={intentCost.agentModels} onlyParticipants />
    </div>
  );
}
