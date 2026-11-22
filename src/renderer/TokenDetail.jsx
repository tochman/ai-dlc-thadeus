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
import { Tooltip as ChartTooltip, useTooltip } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { Block, DiagonalFrame, Pill, SectionHeading, useEntrance } from './Lcars.jsx';
import { formatCost, formatCostPair, formatTokens, formatUsd, shortModel, stageTitle } from './format.js';
import { agentName } from '../main/parsers/ledger.js';
import { SPLIT_KINDS, STACK_KINDS, elapsedLabel, rateSeries, runFigures, splitRows, stackSeries, toggleKind } from './tokenChart.js';
import AgentProgress from './AgentProgress.jsx';
import Tooltip from './Tooltip.jsx';

// US-0507 FR5.2: a finished row drops off after FINISHED_KEEP_MS (src/main/parsers/agentProgress.js); ask again then.
const FINISHED_RECHECK_MS = 60000;

const LEGEND = [...STACK_KINDS].reverse(); // top of the stack first
const CHART_H = 260;
const M = { top: 8, right: 12, bottom: 28, left: 52 };
const totalOf = (r) => STACK_KINDS.reduce((s, k) => s + r[k], 0);
const CHART_TIP_W = 220;

/** The chart tooltip's left edge: right of the marker, inside the chart on both sides (US-0414 FR3.2). */
export const chartTipLeft = (left, width) => Math.max(0, Math.min(left + 12, width - CHART_TIP_W));

/** Two square switch blocks in a section's heading row; the pressed one is light (US-0417: selection is brightness). A switch never moves focus. */
function Switch({ id, options, value, onChange }) {
  const { t } = useTranslation();
  return (
    <span className="token-detail-switch">
      {options.map((o) => (
        <Block
          key={o}
          as="button"
          aria-pressed={value === o}
          selected={value === o}
          tone={value === o ? undefined : 'dark'}
          size="sm"
          onClick={() => onChange(o)}
          data-testid={`${id}-${o}`}
        >
          {t(`tokenDetail.${o}`)}
        </Block>
      ))}
    </span>
  );
}

// US-0214 FR5.4: the shown series per project and diagram, kept while the app runs.
// ponytail: module memory only; it is gone at the next start, which FR5.4 asks for. Settings if it should outlive a run.
const shownMemory = new Map();
function useShown(projectId, diagram, all) {
  const key = `${projectId}\0${diagram}`;
  const [shown, setShown] = useState(() => shownMemory.get(key) ?? all);
  const toggle = (kind) =>
    setShown((now) => {
      const next = toggleKind(now, all, kind);
      shownMemory.set(key, next);
      return next;
    });
  return [shown, toggle];
}

/** US-0214 FR5.1, FR5.2, NFR3: one toggle button per series, top of the stack first; the label always stays. */
function Legend({ kinds, shown, onToggle, testId }) {
  const { t } = useTranslation();
  return (
    <ul className="token-detail-legend" data-testid={testId}>
      {kinds.map((k) => (
        <li key={k}>
          <button
            type="button"
            className="token-detail-legend-toggle"
            aria-pressed={shown.includes(k)}
            onClick={() => onToggle(k)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault(); // the toggle runs once, not again as the button's own click
              onToggle(k);
            }}
          >
            <span className={`token-detail-key token-kind--${k}`} aria-hidden="true" />
            {t(`tokens.${k}`)}
          </button>
        </li>
      ))}
    </ul>
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
function OverTimeChart({ width, readings, shown }) {
  const { t } = useTranslation();
  const tipId = useId();
  const svgRef = useRef(null);
  const { tooltipOpen, tooltipData: at, tooltipLeft, showTooltip, hideTooltip } = useTooltip();
  const layers = stackSeries(readings, shown); // US-0214 FR5.2: the y-domain below is the shown series' top
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
          {/* US-0417: tick scales, faint, on both axes. */}
          <AxisLeft
            scale={y}
            numTicks={3}
            tickFormat={formatTokens}
            hideAxisLine
            tickLength={4}
            tickClassName="token-detail-tick"
            tickLabelProps={{ className: 'token-detail-axis' }}
          />
          <AxisBottom
            top={ih}
            scale={x}
            numTicks={5}
            tickFormat={elapsedLabel}
            hideAxisLine
            tickLength={4}
            tickClassName="token-detail-tick"
            tickLabelProps={{ className: 'token-detail-axis' }}
          />
        </Group>
      </svg>
      {r && (
        <ChartTooltip
          unstyled
          applyPositionStyle
          left={chartTipLeft(tooltipLeft, width)}
          top={M.top}
          className="lcars-tip token-detail-tooltip"
          id={tipId}
          role="tooltip"
          data-testid="token-detail-tooltip"
        >
          <span className="token-detail-tooltip-head">{elapsedLabel(points[at].t)}</span>
          {LEGEND.filter((k) => shown.includes(k)).map((k) => (
            <span key={k} className="token-detail-tooltip-row">
              <span>{t(`tokens.${k}`)}</span>
              <span>{formatTokens(r[k])}</span>
            </span>
          ))}
          <span className="token-detail-tooltip-row token-detail-tooltip-cost">
            <span>{t('tokenDetail.cost')}</span>
            <span>{formatUsd(r.usd)}</span>
          </span>
        </ChartTooltip>
      )}
    </div>
  );
}

/** US-0215 FR5: the rebuilt total against the ledger's, with each reason the gap names. */
function GapLine({ gap }) {
  const { t } = useTranslation();
  const reasons = [];
  if (gap.missingSessions > 0) reasons.push(t('tokenDetail.gap.missing', { n: gap.missingSessions }));
  if (gap.outsideTokens > 0) reasons.push(t('tokenDetail.gap.outside', { tokens: formatTokens(gap.outsideTokens) }));
  // Every session read but still short: calls the main transcripts do not hold (subagents), as the real data showed.
  if (!reasons.length || (!gap.missingSessions && gap.rebuiltTokens < gap.ledgerTokens)) reasons.push(t('tokenDetail.gap.other'));
  return (
    <p className="token-detail-note" data-testid="token-detail-gap">
      {t('tokenDetail.gap.line', {
        rebuilt: formatTokens(gap.rebuiltTokens),
        ledger: formatTokens(gap.ledgerTokens),
        diff: formatTokens(Math.abs(gap.ledgerTokens - gap.rebuiltTokens)),
        reasons: reasons.join('; ')
      })}
    </p>
  );
}

/**
 * Tokens over time with its Diagram / Table switch (FR3.1, FR4, FR6); US-0214 FR5: only the shown series.
 * US-0215 FR2.5, FR3, FR5: a rebuilt history says so; with no history here the empty text says the figures come from the ledger.
 */
function OverTime({ readings, live, shown, onToggle, source, gap }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('diagram');
  const start = readings[0]?.at ?? 0;
  const columns = LEGEND.filter((k) => shown.includes(k));
  let body;
  if (readings.length === 0) {
    const empty = source === 'none' ? 'tokenDetail.source.none' : live ? 'tokenDetail.empty.noReadingsLive' : 'tokenDetail.empty.noReadingsDone';
    body = <Empty text={t(empty)} testId="token-detail-over-time-empty" />;
  } else if (mode === 'table') {
    body = (
      <div className="token-detail-table-wrap">
        <table className="token-detail-table lcars-rt">
          <caption>{t('tokenDetail.tableCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('tokenDetail.elapsed')}</th>
              {columns.map((k) => (
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
                {columns.map((k) => (
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
        {/* US-0024 FR1: ParentSize's default box is `height: 100%`, 0 px in this section; give it the chart's height. */}
        <ParentSize className="token-detail-size" parentSizeStyles={{ width: '100%', height: CHART_H }}>
          {({ width }) => (width > 0 ? <OverTimeChart width={width} readings={readings} shown={shown} /> : null)}
        </ParentSize>
        <Legend kinds={LEGEND} shown={shown} onToggle={onToggle} testId="token-detail-legend" />
      </>
    );
  }
  return (
    <section className="token-detail-section">
      <SectionHeading
        as="h3"
        title={t('tokenDetail.overTime')}
        controls={<Switch id="token-detail-over-time" options={['diagram', 'table']} value={mode} onChange={setMode} />}
      />
      {source === 'rebuilt' && (
        <p className="token-detail-note" data-testid="token-detail-source-note">
          {t('tokenDetail.source.rebuilt')}
        </p>
      )}
      {gap && <GapLine gap={gap} />}
      {body}
    </section>
  );
}

/** US-0215 FR4: the run's figures in one strip; an unknown figure shows as "–", never 0 (FR4.6). */
function RunFigures({ intentCost, readings, wallMs, shown }) {
  const { t } = useTranslation();
  const f = runFigures({ intentCost, readings, wallMs, shown });
  const time = (ms) => (ms == null ? '–' : elapsedLabel(ms));
  const items = [
    ['input', t('tokens.input'), formatTokens(f.input)],
    ['output', t('tokens.output'), formatTokens(f.output)],
    ['cache-write', t('tokens.cacheWrite'), formatTokens(f.cacheWrite)],
    ['cache-read', t('tokens.cacheRead'), formatTokens(f.cacheRead)],
    ['cost', t('tokenDetail.figures.cost'), formatCostPair(intentCost?.total)],
    ['working', t('tokenDetail.figures.working'), time(f.workingMs)],
    ['wall', t('tokenDetail.figures.wall'), time(f.wallMs)],
    ['peak', t('tokenDetail.figures.peak'), f.peakRate == null ? '–' : t('tokens.rate', { rate: formatTokens(Math.round(f.peakRate)) })],
    ['share', t('tokenDetail.figures.share'), f.cacheShare == null ? '–' : t('tokenDetail.figures.percent', { pct: Math.round(f.cacheShare * 100) })]
  ];
  return (
    <section className="token-detail-section" data-testid="token-detail-figures">
      <SectionHeading as="h3" title={t('tokenDetail.figures.title')} />
      <dl className="token-detail-figures">
        {items.map(([id, label, value]) => (
          <div key={id} className="token-detail-figure">
            <dt className="readout-label">{label}</dt>
            <dd className="readout-value readout-value--xs" data-testid={`token-detail-figure-${id}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One split card, by stage, agent or model, in tokens by kind or in dollars (FR3.3, FR4, FR6). US-0214 FR5.1: in
 * tokens, its own legend hides kinds from the bars, the values and the tooltips. */
function SplitCard({ projectId, id, rows, keepOrder = false, nameOf, hasEntry }) {
  const { t } = useTranslation();
  const [measure, setMeasure] = useState('tokens');
  const [kinds, toggleKind] = useShown(projectId, `split-${id}`, SPLIT_KINDS);
  const shown = splitRows(rows ?? [], measure, { keepOrder, kinds });
  const max = Math.max(...shown.map((r) => r.value), 0);
  const valueText = (r) => (measure === 'usd' ? (r.missingPrice ? t('cost.missingPrice') : formatUsd(r.usd)) : formatTokens(r.value));
  return (
    <section className={`token-detail-card token-detail-card--${id}`} data-testid={`token-detail-split-${id}`}>
      <SectionHeading
        as="h3"
        title={t(`tokenDetail.by.${id}`)}
        controls={<Switch id={`token-detail-split-${id}`} options={['tokens', 'usd']} value={measure} onChange={setMeasure} />}
      />
      {!hasEntry ? (
        <Empty text={t('tokenDetail.empty.noEntry')} />
      ) : shown.length === 0 ? (
        <Empty text={t('tokenDetail.empty.noRows')} />
      ) : (
        <ul className="token-detail-rows">
          {shown.map((r) => (
            // US-0414 FR3.1: the exact figures in the shared tooltip, on hover and on focus.
            <Tooltip
              key={r.name}
              text={[
                ...SPLIT_KINDS.filter((k) => kinds.includes(k)).map((k) => `${t(`tokens.${k}`)} ${formatTokens(r.tokens[k])}`),
                formatCostPair(r) // US-0211 FR3.2: with the current-price figure when it differs
              ].join(' · ')}
            >
              <li className="token-detail-row" tabIndex={0}>
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
              </li>
            </Tooltip>
          ))}
        </ul>
      )}
      {hasEntry && measure === 'tokens' && <Legend kinds={SPLIT_KINDS} shown={kinds} onToggle={toggleKind} testId={`token-detail-split-${id}-legend`} />}
    </section>
  );
}

/** The stepped token rate in its readout block, tokens per minute between readings (FR3.2). */
function RateLine({ readings, live, shown }) {
  const { t } = useTranslation();
  const rates = rateSeries(readings, shown); // US-0214 FR5.1: the rate of the series shown over time
  const now = rates.at(-1)?.rate;
  const steps = rates.flatMap((r, i) => [
    { t: rates[i - 1]?.t ?? 0, rate: r.rate },
    { t: r.t, rate: r.rate }
  ]);
  const x = scaleLinear({ domain: [0, rates.at(-1)?.t || 1], range: [0, 200] });
  const y = scaleLinear({ domain: [0, Math.max(...rates.map((r) => r.rate), 1)], range: [42, 4] });
  return (
    <>
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
      <span className="lcars-dblk-small" data-testid="token-detail-rate">
        {t('tokens.rate', { rate: now == null ? '–' : formatTokens(Math.round(now)) })}
      </span>
    </>
  );
}

/**
 * US-0208 FR1–FR7: the detail. `readings` come from main with `tokens:readings` on open and again on each cost
 * refresh while live (FR5). Back and Esc call `onBack`; focus goes to the h2 on open (FR1, NFR3).
 * US-0507: the agent progress rows come with `agents:progress` on open and whenever `refreshKey` changes (the intent
 * detail was re-read after a change on disk, FR5.1).
 * US-0215 FR6, NFR1: main answers `{source, readings, wallMs, gap}` (or, older, a bare array); the ledger figures show
 * at once and the diagrams when the answer comes.
 * @param {{projectId: string, space?: string, dirName: string, intent: object|null, cost: object|null, live: boolean, stageOrder: string[], refreshKey?: unknown, onBack: () => void}} props
 */
export default function TokenDetail({ projectId, space = 'default', dirName, intent, cost, live, stageOrder = [], refreshKey, onBack }) {
  const { t } = useTranslation();
  const [history, setHistory] = useState({ source: null, readings: [], wallMs: null, gap: null });
  const { readings } = history;
  const [progress, setProgress] = useState([]);
  const [recheck, setRecheck] = useState(0);
  const [overTimeShown, toggleOverTime] = useShown(projectId, 'overTime', STACK_KINDS);
  const headRef = useRef(null);
  const intentCost = cost?.available ? (cost.perIntent?.[dirName] ?? null) : null;
  const refresh = live ? cost : null; // a new cost summary while live asks again; a finished intent asks once

  useEffect(() => headRef.current?.focus(), []);
  useEffect(() => {
    let current = true;
    window.bridge.getTokenReadings(projectId, dirName, space).then(
      (res) => {
        if (!current) return;
        const list = Array.isArray(res) ? res : res?.readings;
        setHistory({ source: res?.source ?? null, readings: Array.isArray(list) ? list : [], wallMs: res?.wallMs ?? null, gap: res?.gap ?? null });
      },
      (err) => console.error('tokens:readings', err?.message ?? err) // keeps the last readings; the next refresh tries again
    );
    return () => {
      current = false;
    };
  }, [projectId, space, dirName, refresh]);
  useEffect(() => {
    let current = true;
    window.bridge.getAgentProgress(projectId, dirName).then(
      (rows) => current && setProgress(Array.isArray(rows) ? rows : []),
      (err) => console.error('agents:progress', err?.message ?? err) // keeps the last rows; the next change tries again
    );
    return () => {
      current = false;
    };
  }, [projectId, dirName, refreshKey, recheck]);
  // ponytail: one timer while a finished row shows, not a poll; minutes only move on a change or this recheck.
  useEffect(() => {
    if (!progress.some((r) => r.endedMs)) return undefined;
    const timer = setTimeout(() => setRecheck((n) => n + 1), FINISHED_RECHECK_MS);
    return () => clearTimeout(timer);
  }, [progress]);

  const order = (slug) => (stageOrder.includes(slug) ? stageOrder.indexOf(slug) : stageOrder.length);
  const byStage = [...(intentCost?.byStage ?? [])].sort((a, b) => order(a.name) - order(b.name));
  const topModel = [...(intentCost?.byModel ?? [])].sort((a, b) => b.usd - a.usd)[0]?.name;
  const last = readings.at(-1);
  const modeText = live ? t('intents.mode.live') : t('tokenDetail.recorded');
  const entering = useEntrance(`activity:${dirName}`); // US-0417: Activity enters with the shared sequence
  // US-0417: the run's readouts drop out of the diagonal frame's arm, each with its state strip.
  const readouts = [
    {
      k: t('intents.readoutMode'),
      v: (
        <span className={live ? 'readout-live' : undefined} data-testid="token-detail-mode">
          {live && <span className="lcars-live-dot" aria-hidden="true" />}
          {modeText}
        </span>
      ),
      tone: 'deep',
      strip: live ? 'live' : 'done'
    },
    { k: t('tokenDetail.tokens'), v: <span data-testid="token-detail-tokens">{formatTokens(intentCost?.total.totalTokens)}</span>, strip: 'quiet' },
    {
      k: t('tokenDetail.cost'),
      v: (
        <span className="readout-value--cost" data-testid="token-detail-cost">
          {formatCostPair(intentCost?.total)}
        </span>
      ),
      tone: 'steel',
      strip: 'live'
    },
    {
      k: t('tokenDetail.recordedLabel'),
      v: (
        <span className="lcars-dblk-small" data-testid="token-detail-recorded">
          {last ? `${elapsedLabel(last.at - readings[0].at)} · ${t('tokenDetail.readings', { n: readings.length })}` : t('tokenDetail.noReadings')}
        </span>
      ),
      tone: 'deep'
    },
    { k: t('tokenDetail.rateNow'), v: <RateLine readings={readings} live={live} shown={overTimeShown} />, tone: 'deep' },
    topModel && { k: t('intents.readoutModel'), v: <span data-testid="token-detail-model">{shortModel(topModel)}</span>, strip: 'quiet' }
  ].filter(Boolean);

  return (
    <div
      className={`token-detail${entering ? ' is-entering' : ''}`}
      data-testid="token-detail"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onBack();
      }}
    >
      <DiagonalFrame
        title={t('tokenDetail.title', { name: intent?.slug ?? dirName })}
        titleRef={headRef}
        tag={dirName}
        corner={{
          label: `${t('tokenDetail.tokens')} · ${t('tokenDetail.readings', { n: readings.length })}`,
          value: formatTokens(intentCost?.total.totalTokens)
        }}
        footer={`${t('tokenDetail.figures.title')} · ${formatCost(intentCost?.total)}`}
        readouts={readouts}
      >
        <div className="token-detail-view">
          <header className="token-detail-head">
            <Pill tone="quiet" onClick={onBack} data-testid="token-detail-back">
              {t('tokenDetail.back')}
            </Pill>
            <div className="lcars-chips">
              {intent?.scope && <span className="lcars-chip">{intent.scope}</span>}
              <span className={`lcars-chip${live ? ' lcars-chip--active' : ''}`}>{modeText}</span>
            </div>
          </header>
          <AgentProgress projectId={projectId} rows={progress} live={live} />
          <OverTime readings={readings} live={live} shown={overTimeShown} onToggle={toggleOverTime} source={history.source} gap={history.gap} />
          <RunFigures intentCost={intentCost} readings={readings} wallMs={history.wallMs} shown={overTimeShown} />
          <div className="token-detail-splits">
            <SplitCard projectId={projectId} id="stage" rows={byStage} keepOrder nameOf={stageTitle} hasEntry={!!intentCost} />
            <SplitCard projectId={projectId} id="agent" rows={intentCost?.byAgent} nameOf={agentName} hasEntry={!!intentCost} />
            <SplitCard projectId={projectId} id="model" rows={intentCost?.byModel} nameOf={shortModel} hasEntry={!!intentCost} />
          </div>
        </div>
      </DiagonalFrame>
    </div>
  );
}
