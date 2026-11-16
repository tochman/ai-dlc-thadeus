// The token detail view (EPIC-02 US-0208): opened from the small token view, it replaces the intent's main panel with
// tokens over time (the stored readings, FR2), by stage, by agent and by model (the ledger totals), and a right column
// with mode, totals, the recorded time and the rate. Charts are visx in LCARS colours from theme.css; every series has a
// text label, tooltips show on focus too, and the motion follows data-motion (FR3–FR7, NFR3).
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, Bar as VisxBar, LinePath } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridColumns, GridRows } from '@visx/grid';
import { Tooltip, useTooltip } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { Bar, Frame } from './Lcars.jsx';
import { formatTokens, formatUsd, shortModel, stageTitle } from './format.js';
import { agentName } from '../main/parsers/ledger.js';
import { SPLIT_KINDS, STACK_KINDS, elapsedLabel, rateSeries, splitRows, stackSeries } from './tokenChart.js';

const LEGEND = [...STACK_KINDS].reverse(); // top of the stack first
const CHART_H = 260;
const M = { top: 8, right: 12, bottom: 28, left: 52 };
const totalOf = (r) => STACK_KINDS.reduce((s, k) => s + r[k], 0);

/** Two LCARS switch blocks; the pressed one is steel (design-system-mapping). A switch never moves focus. */
function Switch({ id, options, value, onChange }) {
  const { t } = useTranslation();
  return (
    <span className="token-detail-switch">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          className={`lcars-block lcars-block--sm lcars-block--${value === o ? 'active' : 'dark'}`}
          onClick={() => onChange(o)}
          data-testid={`${id}-${o}`}
        >
          {t(`tokenDetail.${o}`)}
        </button>
      ))}
    </span>
  );
}

function Empty({ text, testId }) {
  return (
    <p className="token-detail-empty" data-testid={testId}>
      {text}
    </p>
  );
}

/** The stacked areas with grid, axes, a coral marker and the tooltip; arrow keys pick a reading (FR3.1, FR4, NFR3). */
function OverTimeChart({ width, readings }) {
  const { t } = useTranslation();
  const tipId = useId();
  const svgRef = useRef(null);
  const { tooltipOpen, tooltipData: at, tooltipLeft, showTooltip, hideTooltip } = useTooltip();
  const layers = stackSeries(readings);
  const points = layers.at(-1).points;
  const iw = Math.max(width - M.left - M.right, 10);
  const ih = CHART_H - M.top - M.bottom;
  const x = scaleLinear({ domain: [0, points.at(-1).t || 1], range: [0, iw] });
  const y = scaleLinear({ domain: [0, Math.max(...points.map((p) => p.y1), 1)], range: [ih, 0], nice: true });
  const show = (i) => showTooltip({ tooltipData: i, tooltipLeft: M.left + x(points[i].t), tooltipTop: M.top });

  function onPointerMove(e) {
    const t0 = x.invert(e.clientX - svgRef.current.getBoundingClientRect().left - M.left);
    let best = 0;
    points.forEach((p, i) => (Math.abs(p.t - t0) < Math.abs(points[best].t - t0) ? (best = i) : null));
    show(best);
  }
  function onKeyDown(e) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step) {
      e.preventDefault();
      show(Math.min(Math.max((tooltipOpen ? at : points.length - 1) + step, 0), points.length - 1));
    } else if (e.key === 'Escape' && tooltipOpen) {
      e.stopPropagation(); // hides the tooltip, not the view
      hideTooltip();
    }
  }

  const r = tooltipOpen ? readings[at] : null;
  const total = totalOf(readings.at(-1));
  return (
    <div
      className="token-detail-chart"
      tabIndex={0}
      role="group"
      aria-label={t('tokenDetail.chartKeys')}
      aria-describedby={tooltipOpen ? tipId : undefined}
      onFocus={() => show(points.length - 1)}
      onBlur={hideTooltip}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerLeave={hideTooltip}
      data-testid="token-detail-over-time"
    >
      <svg
        ref={svgRef}
        width={width}
        height={CHART_H}
        role="img"
        aria-label={t('tokenDetail.overTimeLabel', { elapsed: elapsedLabel(points.at(-1).t), tokens: formatTokens(total) })}
      >
        <Group left={M.left} top={M.top}>
          <g className="token-detail-grid">
            <GridRows scale={y} width={iw} numTicks={4} />
            <GridColumns scale={x} height={ih} numTicks={8} />
          </g>
          <g className="token-detail-areas">
            {layers.map((l) => (
              <Area
                key={l.kind}
                data={l.points}
                x={(d) => x(d.t)}
                y0={(d) => y(d.y0)}
                y1={(d) => y(d.y1)}
                className={`token-detail-area token-kind--${l.kind}`}
              />
            ))}
          </g>
          <line className="token-detail-baseline" x1={0} x2={iw} y1={ih} y2={ih} />
          {r && <line className="token-detail-marker" x1={x(points[at].t)} x2={x(points[at].t)} y1={0} y2={ih} />}
          <AxisLeft scale={y} numTicks={3} tickFormat={formatTokens} hideAxisLine hideTicks tickLabelProps={{ className: 'token-detail-axis' }} />
          <AxisBottom top={ih} scale={x} numTicks={5} tickFormat={elapsedLabel} hideAxisLine hideTicks tickLabelProps={{ className: 'token-detail-axis' }} />
        </Group>
      </svg>
      {r && (
        <Tooltip
          unstyled
          applyPositionStyle
          left={Math.min(tooltipLeft + 12, width - 220)}
          top={M.top}
          className="token-detail-tooltip"
          id={tipId}
          role="tooltip"
          data-testid="token-detail-tooltip"
        >
          <span className="token-detail-tooltip-head">{elapsedLabel(points[at].t)}</span>
          {LEGEND.map((k) => (
            <span key={k} className="token-detail-tooltip-row">
              <span>{t(`tokens.${k}`)}</span>
              <span>{formatTokens(r[k])}</span>
            </span>
          ))}
          <span className="token-detail-tooltip-row token-detail-tooltip-cost">
            <span>{t('tokenDetail.cost')}</span>
            <span>{formatUsd(r.usd)}</span>
          </span>
        </Tooltip>
      )}
    </div>
  );
}

/** Tokens over time with its Diagram / Table switch (FR3.1, FR4, FR6). */
function OverTime({ readings, live }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('diagram');
  const start = readings[0]?.at ?? 0;
  let body;
  if (readings.length === 0) {
    body = <Empty text={t(live ? 'tokenDetail.empty.noReadingsLive' : 'tokenDetail.empty.noReadingsDone')} testId="token-detail-over-time-empty" />;
  } else if (mode === 'table') {
    body = (
      <div className="token-detail-table-wrap">
        <table className="token-detail-table">
          <caption>{t('tokenDetail.tableCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('tokenDetail.elapsed')}</th>
              {STACK_KINDS.slice()
                .reverse()
                .map((k) => (
                  <th key={k} scope="col">
                    {t(`tokens.${k}`)}
                  </th>
                ))}
              <th scope="col">{t('tokenDetail.cost')}</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.at}>
                <td>{elapsedLabel(r.at - start)}</td>
                {LEGEND.map((k) => (
                  <td key={k}>{formatTokens(r[k])}</td>
                ))}
                <td>{formatUsd(r.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (readings.length === 1) {
    body = <Empty text={t('tokenDetail.empty.oneReading')} testId="token-detail-over-time-empty" />;
  } else {
    body = (
      <>
        <ParentSize className="token-detail-size">{({ width }) => (width > 0 ? <OverTimeChart width={width} readings={readings} /> : null)}</ParentSize>
        <ul className="token-detail-legend" data-testid="token-detail-legend">
          {LEGEND.map((k) => (
            <li key={k}>
              <span className={`token-detail-key token-kind--${k}`} aria-hidden="true" />
              {t(`tokens.${k}`)}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <section className="token-detail-section">
      <div className="token-detail-section-head">
        <h3>{t('tokenDetail.overTime')}</h3>
        <i className="token-detail-rule" aria-hidden="true" />
        <Switch id="token-detail-over-time" options={['diagram', 'table']} value={mode} onChange={setMode} />
      </div>
      {body}
    </section>
  );
}

/** One split card, by stage, agent or model, in tokens by kind or in dollars (FR3.3, FR4, FR6). */
function SplitCard({ id, rows, keepOrder = false, nameOf, hasEntry }) {
  const { t } = useTranslation();
  const [measure, setMeasure] = useState('tokens');
  const shown = splitRows(rows ?? [], measure, { keepOrder });
  const max = Math.max(...shown.map((r) => r.value), 0);
  const valueText = (r) => (measure === 'usd' ? (r.missingPrice ? t('cost.missingPrice') : formatUsd(r.usd)) : formatTokens(r.totalTokens));
  return (
    <section className={`token-detail-card token-detail-card--${id}`} data-testid={`token-detail-split-${id}`}>
      <div className="token-detail-section-head">
        <h3>{t(`tokenDetail.by.${id}`)}</h3>
        <Switch id={`token-detail-split-${id}`} options={['tokens', 'usd']} value={measure} onChange={setMeasure} />
      </div>
      {!hasEntry ? (
        <Empty text={t('tokenDetail.empty.noEntry')} />
      ) : shown.length === 0 ? (
        <Empty text={t('tokenDetail.empty.noRows')} />
      ) : (
        <ul className="token-detail-rows">
          {shown.map((r) => (
            <li key={r.name} className="token-detail-row" tabIndex={0}>
              <span className="token-detail-row-name">{r.other ? t('tokenDetail.other') : nameOf(r.name)}</span>
              <svg className="token-detail-row-bar" viewBox="0 0 1000 12" preserveAspectRatio="none" aria-hidden="true">
                <g className="token-detail-bar-grow" style={{ transform: `scaleX(${max > 0 ? r.value / max : 0})` }}>
                  {
                    r.parts.reduce(
                      (acc, p) => {
                        const w = r.value > 0 ? (p.value / r.value) * 1000 : 0;
                        acc.bars.push(<VisxBar key={p.kind} x={acc.x} y={0} width={Math.max(w - 3, 0)} height={12} className={`token-kind--${p.kind}`} />);
                        acc.x += w;
                        return acc;
                      },
                      { x: 0, bars: [] }
                    ).bars
                  }
                </g>
              </svg>
              <span className="token-detail-row-value">{valueText(r)}</span>
              <span className="token-detail-row-tip">
                {[
                  ...SPLIT_KINDS.map((k) => `${t(`tokens.${k}`)} ${formatTokens(r.tokens[k])}`),
                  r.missingPrice ? t('cost.missingPrice') : formatUsd(r.usd)
                ].join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The stepped token rate in the right column, tokens per minute between readings (FR3.2). */
function RateLine({ readings, live }) {
  const { t } = useTranslation();
  const rates = rateSeries(readings);
  const now = rates.at(-1)?.rate;
  const steps = rates.flatMap((r, i) => [
    { t: rates[i - 1]?.t ?? 0, rate: r.rate },
    { t: r.t, rate: r.rate }
  ]);
  const x = scaleLinear({ domain: [0, rates.at(-1)?.t || 1], range: [0, 200] });
  const y = scaleLinear({ domain: [0, Math.max(...rates.map((r) => r.rate), 1)], range: [42, 4] });
  return (
    <div className="readout">
      <span className="readout-label">{t('tokenDetail.rateNow')}</span>
      {steps.length > 0 && (
        <svg
          className="token-detail-rate"
          viewBox="0 0 200 50"
          preserveAspectRatio="none"
          role="img"
          aria-label={t('tokenDetail.rateLabel', { n: rates.length })}
        >
          <LinePath data={steps} x={(d) => x(d.t)} y={(d) => y(d.rate)} className={`token-detail-rate-line${live ? ' is-live' : ''}`} />
          <line className="token-detail-rate-base" x1={0} x2={200} y1={46} y2={46} />
        </svg>
      )}
      <span className="readout-value readout-value--xs" data-testid="token-detail-rate">
        {t('tokens.rate', { rate: now == null ? '–' : formatTokens(Math.round(now)) })}
      </span>
    </div>
  );
}

/**
 * US-0208 FR1–FR7: the detail. `readings` come from main with `tokens:readings` on open and again on each cost
 * refresh while live (FR5). Back and Esc call `onBack`; focus goes to the h2 on open (FR1, NFR3).
 * @param {{projectId: string, dirName: string, intent: object|null, cost: object|null, live: boolean, stageOrder: string[], onBack: () => void}} props
 */
export default function TokenDetail({ projectId, dirName, intent, cost, live, stageOrder = [], onBack }) {
  const { t } = useTranslation();
  const [readings, setReadings] = useState([]);
  const headRef = useRef(null);
  const intentCost = cost?.available ? (cost.perIntent?.[dirName] ?? null) : null;
  const refresh = live ? cost : null; // a new cost summary while live asks again; a finished intent asks once

  useEffect(() => headRef.current?.focus(), []);
  useEffect(() => {
    let current = true;
    window.bridge.getTokenReadings(projectId, dirName).then(
      (list) => current && setReadings(Array.isArray(list) ? list : []),
      (err) => console.error('tokens:readings', err?.message ?? err) // keeps the last readings; the next refresh tries again
    );
    return () => {
      current = false;
    };
  }, [projectId, dirName, refresh]);

  const order = (slug) => (stageOrder.includes(slug) ? stageOrder.indexOf(slug) : stageOrder.length);
  const byStage = [...(intentCost?.byStage ?? [])].sort((a, b) => order(a.name) - order(b.name));
  const topModel = [...(intentCost?.byModel ?? [])].sort((a, b) => b.usd - a.usd)[0]?.name;
  const last = readings.at(-1);
  const modeText = live ? t('intents.mode.live') : t('tokenDetail.recorded');

  return (
    <>
      <Frame className="token-detail">
        <div
          className="token-detail-view"
          data-testid="token-detail"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onBack();
          }}
        >
          <Bar
            className="token-detail-bar"
            segs={[
              ['slate-3', 5],
              ['slate-3', 1],
              ['slate-3', 4],
              ['slate-2', 2]
            ]}
          />
          <header className="token-detail-head">
            <button type="button" className="lcars-block lcars-block--sm lcars-block--dark token-detail-back" onClick={onBack} data-testid="token-detail-back">
              {t('tokenDetail.back')}
            </button>
            <div className="token-detail-titles">
              <h2 ref={headRef} tabIndex={-1} className="token-detail-title">
                {t('tokenDetail.title', { name: intent?.slug ?? dirName })}
              </h2>
              <div className="lcars-chips">
                {intent?.scope && <span className="lcars-chip">{intent.scope}</span>}
                <span className="lcars-chip">{modeText}</span>
                <span className="lcars-chip lcars-chip--active">{dirName}</span>
              </div>
            </div>
          </header>
          <OverTime readings={readings} live={live} />
          <div className="token-detail-splits">
            <SplitCard id="stage" rows={byStage} keepOrder nameOf={stageTitle} hasEntry={!!intentCost} />
            <SplitCard id="agent" rows={intentCost?.byAgent} nameOf={agentName} hasEntry={!!intentCost} />
            <SplitCard id="model" rows={intentCost?.byModel} nameOf={shortModel} hasEntry={!!intentCost} />
          </div>
          <Bar
            className="token-detail-bar"
            segs={[
              ['slate-3', 3],
              ['steel-deep', 1],
              ['slate-3', 5]
            ]}
          />
        </div>
      </Frame>
      <aside className="token-detail-side" aria-label={t('intents.readout')} data-testid="token-detail-side">
        <div className="readout">
          <span className="readout-label">{t('intents.readoutMode')}</span>
          <span className={`readout-value readout-value--sm ${live ? 'readout-value--steel' : ''}`} data-testid="token-detail-mode">
            {live ? (
              <span className="readout-live">
                <span className="lcars-live-dot" aria-hidden="true" />
                {modeText}
              </span>
            ) : (
              modeText
            )}
          </span>
        </div>
        <div className="readout">
          <span className="readout-label">{t('tokenDetail.tokens')}</span>
          <span className="readout-value token-detail-big" data-testid="token-detail-tokens">
            {formatTokens(intentCost?.total.totalTokens)}
          </span>
        </div>
        <div className="readout">
          <span className="readout-label">{t('tokenDetail.cost')}</span>
          <span className="readout-value readout-value--steel token-detail-big" data-testid="token-detail-cost">
            {intentCost ? (intentCost.total.missingPrice ? t('cost.missingPrice') : formatUsd(intentCost.total.usd)) : '–'}
          </span>
        </div>
        <div className="readout">
          <span className="readout-label">{t('tokenDetail.recordedLabel')}</span>
          <span className={`readout-value readout-value--sm${last ? '' : ' muted'}`} data-testid="token-detail-recorded">
            {last ? `${elapsedLabel(last.at - readings[0].at)} · ${t('tokenDetail.readings', { n: readings.length })}` : t('tokenDetail.noReadings')}
          </span>
        </div>
        <RateLine readings={readings} live={live} />
        {topModel && (
          <div className="readout">
            <span className="readout-label">{t('intents.readoutModel')}</span>
            <span className="readout-value readout-value--sm" data-testid="token-detail-model">
              {shortModel(topModel)}
            </span>
          </div>
        )}
      </aside>
    </>
  );
}
