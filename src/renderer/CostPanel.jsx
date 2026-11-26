// The project's Cost view (FR3, FR4.6, FR6). US-0417: in the curved diagonal frame, summary figures as readout blocks,
// the token mix as flat meters and the share per scope as a segmented meter, all read-only.
// US-0211 FR3.2: totals show "recorded · at current prices"; chart points carry the current figure in their tooltip.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CostLabel, CostNotes, CostTable, MachinesLine, ModelTable } from './CostTab.jsx';
import { DiagonalFrame, Meter, Pill, Readout, ReadoutTable, SectionHeading, SegMeter, useEntrance } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';
import { currentTip, formatCost, formatCostPair, formatTokens, formatUsd, shortModel, tokenBreakdown } from './format.js';

const BAR_W = 14;
const BAR_GAP = 6;
const CHART_H = 60;

/** Cost per intent over time as plain SVG bars, ordered by date prefix (FR3.2). */
function CostChart({ timeline }) {
  const { t } = useTranslation();
  if (timeline.length === 0) return null;
  const max = Math.max(...timeline.map((x) => x.usd), 0.01);
  const width = timeline.length * (BAR_W + BAR_GAP);
  return (
    <figure className="cost-chart">
      <svg viewBox={`0 0 ${width} ${CHART_H}`} width="100%" height={CHART_H} preserveAspectRatio="none" role="img" aria-label={t('cost.chartLabel')}>
        {timeline.map((x, i) => {
          const h = Math.max(1, (x.usd / max) * (CHART_H - 2));
          return (
            <rect key={x.dirName} x={i * (BAR_W + BAR_GAP)} y={CHART_H - h} width={BAR_W} height={h}>
              <title>{[`${x.date ?? '–'} ${x.slug}: ${formatUsd(x.usd)}`, currentTip(x)].filter(Boolean).join('\n')}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="muted">{t('cost.chartCaption', { from: timeline[0].date ?? '–', to: timeline.at(-1).date ?? '–' })}</figcaption>
    </figure>
  );
}

// US-0417: one colour per scope, the same in the segmented share meter and the table's legend squares.
const SCOPE_TONES = [
  ['key', 'white'],
  ['live', 'steel'],
  ['mid', 'mid'],
  ['deep', 'deep'],
  ['done', 'done']
];
const toneOf = (i) => SCOPE_TONES[i % SCOPE_TONES.length];
const SHARE_SEGMENTS = 20;
const MIX = ['cacheRead', 'cacheWrite', 'input', 'output'];
const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

const sortedScopes = (byScope) => Object.entries(byScope ?? {}).sort((a, b) => b[1].usd - a[1].usd);

function ScopeTable({ scopes }) {
  const { t } = useTranslation();
  if (scopes.length === 0) return null;
  const columns = [
    { label: t('cost.scope') },
    { label: t('cost.total'), align: 'right', value: true },
    { label: t('cost.intents'), align: 'right', value: true },
    { label: t('cost.average'), align: 'right', value: true }
  ];
  const rows = scopes.map(([scope, s], i) => ({
    id: scope,
    legend: toneOf(i)[1],
    // US-0211 FR3.2: a scope's sum is never "price missing"; its missingPrice only adds the *.
    cells: [scope, `${formatCostPair({ usd: s.usd, currentUsd: s.currentUsd })}${s.missingPrice ? '*' : ''}`, s.count, formatUsd(s.avg)]
  }));
  return (
    <div data-testid="cost-panel-scopes">
      <SectionHeading as="h3" title={t('cost.perScope')} />
      <ReadoutTable caption={t('cost.perScope')} columns={columns} rows={rows} />
    </div>
  );
}

/** US-0417: the token mix as flat meters (read-only, no knobs) and the share per scope as a segmented meter. */
function Mix({ total, scopes, totalUsd }) {
  const { t } = useTranslation();
  const all = MIX.reduce((s, k) => s + (total.tokens?.[k] ?? 0), 0);
  // ponytail: each scope's segments rounded on their own, capped at 20; largest remainder if the rounding ever shows.
  const segments = [];
  scopes.forEach(([, s], i) => {
    const n = Math.round((pct(s.usd, totalUsd) / 100) * SHARE_SEGMENTS);
    for (let j = 0; j < n && segments.length < SHARE_SEGMENTS; j++) segments.push(toneOf(i)[0]);
  });
  while (segments.length < SHARE_SEGMENTS) segments.push('off');
  const shareList = scopes.map(([scope, s]) => `${scope} ${Math.round(pct(s.usd, totalUsd))} %`).join(', ');
  return (
    <div className="cost-mix">
      <div>
        <SectionHeading as="h3" title={t('cost.tokenMix')} />
        {MIX.map((k) => {
          const share = pct(total.tokens?.[k] ?? 0, all);
          return (
            <div key={k} className="cost-mix-row">
              <span className="cost-mix-label">{t(`tokens.${k}`)}</span>
              <Meter label={t(`tokens.${k}`)} value={share} text={`${Math.round(share)} %`} />
              <span className="cost-mix-value">{Math.round(share)} %</span>
            </div>
          );
        })}
      </div>
      {scopes.length > 0 && (
        <div>
          <SectionHeading as="h3" title={t('cost.shareScope')} />
          <SegMeter label={t('cost.shareScopeLabel', { list: shareList })} segments={segments} className="cost-share" />
        </div>
      )}
    </div>
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
  const { t } = useTranslation();
  const [ownOpen, setOwnOpen] = useState(false);
  const entering = useEntrance('cost'); // US-0417: the shared entrance on entering Cost
  const open = openProp ?? ownOpen;
  const toggle = onToggle ?? (() => setOwnOpen((o) => !o));
  if (!cost) return null;
  const project = cost.available ? cost.project : null;
  const scopes = sortedScopes(cost.byScope);
  const n = Object.keys(cost.perIntent ?? {}).length;
  // US-0417: the summary figures drop out of the diagonal frame's arm as readout blocks.
  const readouts = project
    ? [
        { k: t('cost.intents'), v: n, strip: 'quiet' },
        { k: t('cost.average'), v: formatUsd(n > 0 ? project.total.usd / n : null), tone: 'steel', strip: 'live' },
        { k: t('cost.tokensHeader'), v: formatTokens(project.total.totalTokens), tone: 'deep' },
        { k: t('cost.scopes'), v: scopes.length, tone: 'deep' }
      ]
    : [];

  return (
    <section className={`cost-panel${entering ? ' is-entering' : ''}`} data-testid="cost-panel">
      <DiagonalFrame
        title={t('cost.title')}
        sub={t('cost.estimateMeta')}
        tag="usage-ledger"
        corner={project ? { label: t('cost.corner', { n }), value: formatUsd(project.total.usd) } : undefined}
        footer={t('cost.coversClaude')}
        readouts={readouts}
      >
        <div className="cost-panel-head">
          {/* In the Cost view it folds back to the intents (FR2.2); on its own it shows and hides the tables. */}
          <Pill tone="quiet" onClick={toggle} aria-expanded={open} data-testid="cost-panel-toggle">
            {open ? `▾ ${t('common.hide')}` : `▸ ${t('common.show')}`}
          </Pill>
        </div>
        {/* The ledger is filled by the Claude hooks and the model table reads --harness claude (US-0801 FR7.2). */}
        <p className="muted" data-testid="cost-panel-harness">
          {t('cost.coversClaude')}
        </p>
        {!project && <p className="muted">{cost.reason}</p>}
        {project && (
          <>
            <p className="cost-big">
              <Tooltip text={t('cost.label')} focusable>
                <span className="cost-big-usd">
                  {formatCostPair(project.total)}
                  {!project.complete && '*'}
                </span>
              </Tooltip>
              <span className="cost-big-tokens">{t('cost.tokens', { amount: formatTokens(project.total.totalTokens) })}</span>
            </p>
            <MachinesLine machines={project.machines} partial={project.partial} />
            <Readout rows={readoutRows(project)} totalUsd={project.total.usd} />
            <Mix total={project.total} scopes={scopes} totalUsd={project.total.usd} />
          </>
        )}
        {/* US-0050 item 7: the tables open with the shared fold. */}
        {open && project && (
          <div className="cost-panel-body lcars-reveal">
            {cost.stale && (
              <p className="banner banner-warn" role="status">
                {t('cost.stale', { warning: cost.warning })}
              </p>
            )}
            <p className="cost-total">
              <CostLabel complete={project.complete} />
              <span className="cost-total-usd" data-testid="cost-panel-total">
                {formatCostPair(project.total)}
              </span>
              <span className="muted">{tokenBreakdown(project.total.tokens)}</span>
            </p>
            <CostNotes rates={cost.rates} byModel={project.byModel} audit={!!project.auditFiveMinute} />
            {project.legacy && (
              <Tooltip text={t('cost.legacyTitle')} focusable>
                <p className="cost-legacy" data-testid="cost-panel-legacy">
                  {t('cost.legacy', { cost: formatCost(project.legacy), tokens: formatTokens(project.legacy.totalTokens) })}
                </p>
              </Tooltip>
            )}
            <CostChart timeline={cost.timeline} />
            <CostTable title={t('cost.perModel')} rows={project.byModel} totalUsd={project.total.usd} testId="cost-panel-models" />
            <CostTable title={t('cost.perAgent')} rows={project.byAgent} totalUsd={project.total.usd} testId="cost-panel-agents" />
            <ScopeTable scopes={scopes} />
            <SectionHeading as="h3" title={t('cost.modelsPerAgent')} />
            <ModelTable models={models} agentModels={project.agentModels} />
          </div>
        )}
      </DiagonalFrame>
    </section>
  );
}
