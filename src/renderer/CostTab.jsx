// The "Kostnad" tab of one intent, plus the cost and model tables the project panel reuses.
// US-0211 FR3: each figure is the recorded one, with the current-price one beside it when a rate table was loaded.
// US-1302 FR7: the Savings section, shown here for one intent and in the project panel for all.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { compareModels } from '../main/parsers/ledger.js';
import { formatCostPair, formatTokens, formatUsd, shortModel, tokenBreakdown } from './format.js';
import { Pill, Readout } from './Lcars.jsx';
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

/** US-1301 FR3: an estimate mark whose tooltip names why the figure is one. */
function EstimateMark({ why, testId }) {
  const { t } = useTranslation();
  return (
    <Tooltip text={why ? t(`cost.rework.why.${why.key}`, { date: why.date ?? '' }) : t('cost.rework.estimate')} focusable>
      <span className="tag tag-warn" data-testid={testId}>
        {t('cost.rework.estimate')}
      </span>
    </Tooltip>
  );
}

/**
 * US-1301 FR4, NFR2: the intent's rework: its total and share of the intent's cost, then one row per thrown-away attempt
 * with stage, the cause (never a person), tokens, cost and the estimate mark. Nothing shows before main answers.
 * @param {{rework: {total: {tokens: number, usd: number}, share: number, why: object|null, attempts: object[]}|null}} props
 */
export function ReworkSection({ rework }) {
  const { t } = useTranslation();
  if (!rework) return null;
  const { total, attempts } = rework;
  return (
    <section className="cost-rework" data-testid="cost-rework">
      <h3 className="section-title">{t('cost.rework.title')}</h3>
      {attempts.length === 0 ? (
        <p className="muted" data-testid="cost-rework-none">
          {t('cost.rework.none')}
        </p>
      ) : (
        <>
          <p className="cost-rework-total">
            <span data-testid="cost-rework-total">
              {t('cost.rework.total', { usd: formatUsd(total.usd), tokens: formatTokens(total.tokens), share: Math.round(rework.share * 100) })}
            </span>
            {rework.why && <EstimateMark why={rework.why} testId="cost-rework-total-estimate" />}
          </p>
          <table className="cost-table cost-rework-rows" data-testid="cost-rework-rows">
            <caption>{t('cost.rework.rowsCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('cost.rework.stage')}</th>
                <th scope="col">{t('cost.rework.reasonHeader')}</th>
                <th scope="col">{t('cost.tokensHeader')}</th>
                <th scope="col">{t('cost.usd')}</th>
                <th scope="col">{t('cost.rework.estimate')}</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={`${a.stage}:${a.unit}:${a.from ?? i}`}>
                  <td>{a.stage ? `${a.stage}${a.unit ? ` (${a.unit})` : ''}` : t('cost.rework.wholeIntent')}</td>
                  <td>{t(`cost.rework.reason.${a.reason}`)}</td>
                  <td>{formatTokens(a.tokens)}</td>
                  <td>{formatUsd(a.usd)}</td>
                  <td>{a.estimate && <EstimateMark why={a.why} testId="cost-rework-estimate" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

// US-1302 FR2.5, FR4, NFR1: each link only opens a view; nothing is changed from a hint.
const SAVINGS_LINKS = {
  models: { testId: 'models', view: ['config', { configSection: 'aidlc', aidlcTab: 'settings' }] }, // model per agent, US-0904
  costRules: { testId: 'cost-rules', view: ['config', { configSection: 'costRules' }] }, // the THADEUS rule pack, US-0212
  handoff: { testId: 'handoff', view: ['config', { configSection: 'agent' }] } // the session handoff, US-0213
};
const pct = (x) => String(Math.round(x * 100));
const whole = (x) => String(Math.round(x));

/** US-1302 FR2.5, FR3, FR4: what a hint suggests, in one sentence. */
function hintText(h, t) {
  const f = h.working.figures;
  if (h.kind === 'model') return t(h.agent ? 'cost.savings.modelAgent' : 'cost.savings.model', { stage: h.stage, agent: h.agent ?? '', to: h.working.to });
  if (h.kind === 'cache') return t('cost.savings.cache', { intent: h.intent, share: pct(f.share), median: pct(f.medianShare) });
  return t('cost.savings.turns', { stage: h.stage, intent: h.intent, turns: whole(f.turns), median: whole(f.medianTurns) });
}

/** US-1302 FR5: how a hint was worked out: the figures it compared, the thresholds and the prices used. */
function workingLines(h, t) {
  const { figures: f, thresholds: th, prices } = h.working;
  if (h.kind === 'cache') return [t('cost.savings.workingCache', { share: pct(f.share), median: pct(f.medianShare), points: whole(th.pointsBelow) })];
  if (h.kind === 'turns')
    return [
      t('cost.savings.workingTurns', {
        turns: whole(f.turns),
        median: whole(f.medianTurns),
        runs: whole(f.earlierRuns),
        factor: whole(th.factor),
        minRuns: whole(th.minEarlierRuns)
      })
    ];
  const runs = { runs: whole(f.runs), rejections: whole(f.rejections), maxRejected: pct(th.maxRejectedShare), minRuns: whole(th.minRuns) };
  const output = { output: whole(f.outputPerRun), median: whole(f.medianOutputPerRun) };
  const { from, to } = prices ?? {};
  const price =
    from && to
      ? t('cost.savings.workingPrices', {
          from: from.model,
          fromIn: String(from.input),
          fromOut: String(from.output),
          to: to.model,
          toIn: String(to.input),
          toOut: String(to.output)
        })
      : t('cost.savings.workingNoPrice');
  return [t('cost.savings.workingRuns', runs), t('cost.savings.workingOutput', output), price];
}

/** US-1302 FR2.5, FR5, FR6, NFR2: one hint, its saving as an estimate ("no price" without a rate), working, links, dismiss. */
function SavingsHint({ hint: h, open, onOpen, onView, onDismiss }) {
  const { t } = useTranslation();
  return (
    <li className="cost-savings-hint" data-testid="cost-savings-hint" data-hint={h.id}>
      <p className="cost-savings-text">{hintText(h, t)}</p>
      {h.kind === 'model' &&
        (h.saving ? (
          <p className="cost-savings-saving" data-testid="cost-savings-saving">
            {t('cost.savings.saving', { total: formatUsd(h.saving.total), perRun: formatUsd(h.saving.perRun), to: h.working.to })}
          </p>
        ) : (
          <span className="tag tag-warn" data-testid="cost-savings-no-price">
            {t('cost.missingPrice')}
          </span>
        ))}
      <div className="cost-savings-actions">
        <Pill tone="quiet" onClick={onOpen} aria-expanded={open} data-testid="cost-savings-working-toggle">
          {open ? `▾ ${t('cost.savings.hideWorking')}` : `▸ ${t('cost.savings.working')}`}
        </Pill>
        {h.links.map((l) => (
          <Pill key={l} tone="notice" onClick={() => onView?.(...SAVINGS_LINKS[l].view)} data-testid={`cost-savings-link-${SAVINGS_LINKS[l].testId}`}>
            {t(`cost.savings.link.${l}`)}
          </Pill>
        ))}
        <Pill tone="quiet" onClick={onDismiss} data-testid="cost-savings-dismiss">
          {t('cost.savings.dismiss')}
        </Pill>
      </div>
      {open && (
        <ul className="cost-savings-working lcars-reveal" data-testid="cost-savings-working">
          {workingLines(h, t).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * US-1302 FR6, FR7, NFR4: the Savings section. Asks main for the hints when it shows (never during the overview load);
 * with `intent`, only that intent's hints and the stage hints of the `stages` it ran. Dismissed hints hide; "show
 * dismissed" lists them, each with a way back. Nothing shows without a project id.
 */
export function SavingsSection({ projectId, space, intent = null, stages = [], onView }) {
  const { t } = useTranslation();
  const [hints, setHints] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (!projectId || !window.bridge?.getSavings) return undefined;
    let live = true;
    window.bridge.getSavings(projectId, space).then(
      (r) => {
        if (!live) return;
        setHints(r?.hints ?? []);
        setDismissed(r?.dismissed ?? []);
      },
      (err) => console.error('project:savings', err?.message ?? err) // the panel keeps its other figures
    );
    return () => {
      live = false;
    };
  }, [projectId, space]);
  if (!projectId) return null;
  const dismiss = (id, on) => {
    setDismissed((d) => (on ? [...d, id] : d.filter((x) => x !== id)));
    window.bridge.dismissSaving(projectId, id, on).then(
      (ids) => Array.isArray(ids) && setDismissed(ids),
      (err) => console.error('project:savings-dismiss', err?.message ?? err)
    );
  };
  const mine = (hints ?? []).filter((h) => intent == null || h.intent === intent || (h.intent == null && stages.includes(h.stage)));
  const shown = mine.filter((h) => !dismissed.includes(h.id));
  const hidden = mine.filter((h) => dismissed.includes(h.id));
  return (
    <section className="cost-savings" data-testid="cost-savings">
      <h3 className="section-title">{t('cost.savings.title')}</h3>
      {hints == null && <p className="muted">{t('cost.savings.reading')}</p>}
      {hints != null && !shown.length && (
        <p className="muted" data-testid="cost-savings-none">
          {t('cost.savings.none')}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="cost-savings-list">
          {shown.map((h) => (
            <SavingsHint
              key={h.id}
              hint={h}
              open={open === h.id}
              onOpen={() => setOpen((o) => (o === h.id ? null : h.id))}
              onView={onView}
              onDismiss={() => dismiss(h.id, true)}
            />
          ))}
        </ul>
      )}
      {hidden.length > 0 && (
        <Pill tone="quiet" onClick={() => setShowDismissed((s) => !s)} aria-expanded={showDismissed} data-testid="cost-savings-show-dismissed">
          {showDismissed ? t('cost.savings.hideDismissed') : t('cost.savings.showDismissed', { n: hidden.length })}
        </Pill>
      )}
      {showDismissed && hidden.length > 0 && (
        <ul className="cost-savings-dismissed" data-testid="cost-savings-dismissed">
          {hidden.map((h) => (
            <li key={h.id}>
              <span className="muted">{hintText(h, t)}</span>
              <Pill tone="quiet" onClick={() => dismiss(h.id, false)} data-testid="cost-savings-restore">
                {t('cost.savings.restore')}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CostTab({ cost, intentCost, pipeline, models, rework = null, projectId = null, space, dirName = null, onView }) {
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
      <ReworkSection rework={rework} />
      <SavingsSection projectId={projectId} space={space} intent={dirName} stages={intentCost.byStage.map((r) => r.name)} onView={onView} />
      <CostTable title={t('cost.perStage')} rows={inPipelineOrder(intentCost.byStage, pipeline)} totalUsd={total.usd} testId="cost-tab-stages" />
      <CostTable title={t('cost.perAgent')} rows={intentCost.byAgent} totalUsd={total.usd} testId="cost-tab-agents" />
      <CostTable title={t('cost.perModel')} rows={intentCost.byModel} totalUsd={total.usd} testId="cost-tab-models" />
      <h3 className="section-title">{t('cost.participantModels')}</h3>
      <ModelTable models={models} agentModels={intentCost.agentModels} onlyParticipants />
    </div>
  );
}
