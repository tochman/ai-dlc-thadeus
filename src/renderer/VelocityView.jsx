// US-0303 Project velocity. VelocityView is the project view "Velocity" with its own arm block (FR3.5): readouts, a bar
// chart of finished intents and stories per week or month with the average intent length as a line (FR3.3), a table
// per intent and per story, the stories per release (FR2.3), and a sources footer that names the records it used and
// every missing one with its path (FR4.2, FR4.3). IntentVelocity is the intent detail's Velocity tab (FR1.5), computed
// here from the intent's events with the same pure functions. Status is always text, never colour alone (NFR2).
// US-1304 FR6: the Delivery section with the DORA readouts, the pull request medians and a row per release.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { intentMetrics } from '../main/parsers/velocity.js';
import { locale } from '../shared/i18n.js';
import Tooltip from './Tooltip.jsx';
import { Block, DiagonalFrame, TabIn, useEntrance } from './Lcars.jsx';
import { formatDuration, stageTitle } from './format.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** A span, or "unknown" when the records cannot give one (FR2.2). */
function useText() {
  const { t } = useTranslation();
  return {
    t,
    dur: (ms) => (ms == null ? t('velocity.unknown') : formatDuration(ms)),
    day: (ms) => (ms == null ? t('velocity.unknown') : new Date(ms).toLocaleDateString(locale()))
  };
}

function Readout({ label, value, testId }) {
  return (
    <div className="readout" data-testid={testId}>
      <span className="readout-label">{label}</span>
      <span className="readout-value readout-value--sm">{value}</span>
    </div>
  );
}

function Unfinished() {
  const { t } = useTranslation();
  return (
    <span className="lcars-chip lcars-chip--warn" data-testid="velocity-intent-unfinished">
      {t('velocity.notFinished')}
    </span>
  );
}

const BAR_W = 12;
const GAP = 4;
const GROUP_W = 2 * BAR_W + 3 * GAP;
const CHART_H = 90;

/** Finished intents (steel) and stories (light steel) per period as plain SVG bars, the average intent length as a step line. */
function VelocityChart({ buckets }) {
  const { t, dur } = useText();
  const maxCount = Math.max(1, ...buckets.flatMap((b) => [b.intents, b.stories]));
  const maxAvg = Math.max(1, ...buckets.map((b) => b.avgActiveMs ?? 0));
  const height = (n) => (n / maxCount) * (CHART_H - 4);
  const points = buckets.flatMap((b, i) =>
    b.avgActiveMs == null ? [] : [i * GROUP_W, i * GROUP_W + GROUP_W].map((x) => `${x},${CHART_H - (b.avgActiveMs / maxAvg) * (CHART_H - 4)}`)
  );
  const line = (b) => t('velocity.chart.bucket', { key: b.key, intents: b.intents, stories: b.stories, avg: dur(b.avgActiveMs) });
  return (
    <figure className="velocity-chart">
      <svg
        viewBox={`0 0 ${Math.max(buckets.length, 1) * GROUP_W} ${CHART_H}`}
        width="100%"
        height={CHART_H}
        preserveAspectRatio="none"
        role="img"
        aria-label={buckets.map(line).join('; ') || t('velocity.chart.empty')}
        data-testid="velocity-chart"
      >
        {buckets.map((b, i) => (
          <Tooltip key={b.key} text={line(b)}>
            <g>
              <rect className="is-intents" x={i * GROUP_W + GAP} y={CHART_H - height(b.intents)} width={BAR_W} height={height(b.intents)} />
              <rect className="is-stories" x={i * GROUP_W + 2 * GAP + BAR_W} y={CHART_H - height(b.stories)} width={BAR_W} height={height(b.stories)} />
            </g>
          </Tooltip>
        ))}
        {points.length > 0 && <polyline className="velocity-chart-average" points={points.join(' ')} data-testid="velocity-chart-average" />}
      </svg>
      <figcaption className="velocity-legend">
        <span className="velocity-key velocity-key--intents" aria-hidden="true" />
        {t('velocity.chart.intents')}
        <span className="velocity-key velocity-key--stories" aria-hidden="true" />
        {t('velocity.chart.stories')}
        <span className="velocity-key velocity-key--average" aria-hidden="true" />
        {t('velocity.chart.average')}
      </figcaption>
    </figure>
  );
}

function IntentTable({ rows }) {
  const { t, dur } = useText();
  return (
    <table className="cost-table" data-testid="velocity-intents">
      <caption>{t('velocity.intents.title')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('velocity.intents.intent')}</th>
          <th scope="col">{t('velocity.intents.status')}</th>
          <th scope="col">{t('velocity.active')}</th>
          <th scope="col">{t('velocity.parked')}</th>
          <th scope="col">{t('velocity.waiting')}</th>
          <th scope="col">{t('velocity.reviews')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.dirName} data-testid="velocity-intent-row">
            <td>{r.slug}</td>
            <td>
              {r.finished ? <span className="lcars-chip">{t('velocity.finished')}</span> : <Unfinished />}
              {r.archived && <span className="lcars-chip lcars-chip--quiet">{t('velocity.archived')}</span>}
              {r.empty && <span className="lcars-chip lcars-chip--quiet">{t('velocity.empty')}</span>}
            </td>
            <td>{dur(r.activeMs)}</td>
            <td>{formatDuration(r.parkedMs)}</td>
            <td>{formatDuration(r.waitingMs)}</td>
            <td>{t('velocity.reviewCount', { reviews: r.reviews, rejections: r.rejections })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StoryTable({ stories }) {
  const { t, dur, day } = useText();
  if (stories.length === 0) return null;
  return (
    <table className="cost-table" data-testid="velocity-stories">
      <caption>{t('velocity.stories.title')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('velocity.stories.story')}</th>
          <th scope="col">{t('velocity.stories.started')}</th>
          <th scope="col">{t('velocity.stories.done')}</th>
          <th scope="col">{t('velocity.stories.released')}</th>
          <th scope="col">{t('velocity.stories.toDone')}</th>
          <th scope="col">{t('velocity.stories.leadTime')}</th>
        </tr>
      </thead>
      <tbody>
        {stories.map((s) => (
          <tr key={s.id} data-testid="velocity-story-row">
            <td>
              <Tooltip text={s.title} focusable>
                <span>{s.id}</span>
              </Tooltip>
            </td>
            <td>
              {day(s.startMs)}
              {s.startSource && <span className="muted"> · {t(`velocity.stories.from.${s.startSource}`)}</span>}
            </td>
            <td>{day(s.doneMs)}</td>
            <td>{s.release ? `${s.release} · ${day(s.releasedMs)}` : '–'}</td>
            <td>{dur(s.toDoneMs)}</td>
            <td data-testid="velocity-story-release">{dur(s.toReleaseMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Sources({ sources }) {
  const { t, day } = useText();
  const { git } = sources;
  return (
    <footer className="velocity-sources" data-testid="velocity-sources">
      <h3 className="section-title">{t('velocity.sources.title')}</h3>
      <p className="muted">{t('velocity.sources.records', { intents: sources.intents, shards: sources.shards })}</p>
      {sources.epicFiles.length > 0 && (
        <p className="muted">
          {t('velocity.sources.epics')}{' '}
          {sources.epicFiles.map((f) => (
            <code key={f}>{f} </code>
          ))}
        </p>
      )}
      {git && <p className="muted">{t('velocity.sources.git', { dir: git.dir, commits: git.commits, from: day(git.fromMs), to: day(git.toMs) })}</p>}
      {sources.missing.length > 0 && (
        <>
          <h3 className="section-title">{t('velocity.sources.missingTitle')}</h3>
          <ul className="refresh-list">
            {sources.missing.map((m) => (
              <li key={`${m.kind}-${m.path}`} data-testid="velocity-missing">
                <span className="lcars-chip lcars-chip--warn">{t(`velocity.missing.${m.kind}`)}</span> <code>{m.path}</code>
                {m.error && <span className="muted"> · {m.error}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </footer>
  );
}

/** US-1304 FR6.1, FR6.2: the delivery readouts, the pull request medians, a row per release and its sources. */
function Delivery({ delivery }) {
  const { t, dur } = useText();
  const { readouts: r, pulls } = delivery;
  const num = (n, opts) => (n == null ? t('velocity.unknown') : new Intl.NumberFormat(locale(), { maximumFractionDigits: 1, ...opts }).format(n));
  const why = (row) =>
    [row.prerelease && t('velocity.delivery.prerelease'), row.fixes.length > 0 && t('velocity.delivery.faultIn', { stories: row.fixes.join(', ') })]
      .filter(Boolean)
      .join(' · ');
  return (
    <section className="velocity-delivery" data-testid="velocity-delivery">
      <h3 className="section-title">{t('velocity.delivery.title')}</h3>
      <div className="velocity-readouts">
        <Readout label={t('velocity.delivery.lead')} value={dur(r.leadMs)} testId="velocity-delivery-lead" />
        <Readout label={t('velocity.delivery.frequency')} value={num(r.perMonth)} testId="velocity-delivery-frequency" />
        <Readout
          label={t('velocity.delivery.failure')}
          value={num(r.failureRate, { style: 'percent', maximumFractionDigits: 0 })}
          testId="velocity-delivery-failure"
        />
        <Readout label={t('velocity.delivery.recover')} value={dur(r.recoverMs)} testId="velocity-delivery-recover" />
      </div>
      <p className="muted" data-testid="velocity-delivery-pulls">
        {pulls
          ? t('velocity.delivery.pulls', { count: pulls.count, open: dur(pulls.medianOpenMs), rounds: num(pulls.medianRounds) })
          : t('velocity.delivery.noPulls')}
      </p>
      {delivery.releases.length > 0 && (
        <table className="cost-table" data-testid="velocity-delivery-releases">
          <caption>{t('velocity.delivery.perRelease')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('velocity.delivery.release')}</th>
              <th scope="col">{t('velocity.delivery.stories')}</th>
              <th scope="col">{t('velocity.delivery.lead')}</th>
              <th scope="col">{t('velocity.delivery.failed')}</th>
              <th scope="col">{t('velocity.delivery.toRecover')}</th>
              <th scope="col">{t('velocity.delivery.pullCount')}</th>
              <th scope="col">{t('velocity.delivery.openToMerge')}</th>
            </tr>
          </thead>
          <tbody>
            {delivery.releases.map((row) => (
              <tr key={row.release} data-testid="velocity-delivery-release">
                <td>{row.release}</td>
                <td>{row.stories}</td>
                <td>{dur(row.leadMs)}</td>
                <td>
                  {row.failed ? (
                    <>
                      <span className="lcars-chip lcars-chip--warn">{t('velocity.delivery.failed')}</span>
                      <span className="muted"> {why(row)}</span>
                    </>
                  ) : (
                    <span className="lcars-chip">{t('velocity.delivery.ok')}</span>
                  )}
                </td>
                <td>
                  {!row.failed ? (
                    '–'
                  ) : row.recovered ? (
                    dur(row.recoverMs)
                  ) : (
                    <span className="lcars-chip lcars-chip--warn">{t('velocity.delivery.notRecovered')}</span>
                  )}
                </td>
                <td>{row.pulls ?? t('velocity.unknown')}</td>
                <td>{dur(row.medianOpenMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {delivery.withoutFaultIn > 0 && (
        <p className="muted" data-testid="velocity-delivery-nofault">
          {t('velocity.delivery.withoutFaultIn', { n: delivery.withoutFaultIn })}
        </p>
      )}
      <p className="muted" data-testid="velocity-delivery-sources">
        {t('velocity.delivery.sources')}
      </p>
      {delivery.missing.length > 0 && (
        <ul className="refresh-list" data-testid="velocity-delivery-missing">
          {delivery.missing.map((m) => (
            <li key={m.kind}>
              <span className="lcars-chip lcars-chip--warn">{t(`velocity.missing.${m.kind}`)}</span> <code>{m.path}</code>
              {m.error && <span className="muted"> · {m.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The project view "Velocity" (FR3.5). Reloads on project:changed and features:changed, after main's own debounce (NFR3). */
export default function VelocityView({ projectId, space }) {
  const { t, dur } = useText();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState('week');
  const entering = useEntrance(`velocity:${projectId}`); // US-0417: the shared entrance on entering Velocity

  const load = useCallback(async () => {
    try {
      setData(await window.bridge.getVelocity(projectId, space));
      setError(null);
    } catch (err) {
      setError(t('velocity.loadFailed', { error: errorText(err) }));
    }
  }, [projectId, space, t]);

  useEffect(() => {
    load();
    const offProject = window.bridge.onProjectChanged?.((c) => c.projectId === projectId && c.space === space && load());
    const offFeatures = window.bridge.onFeaturesChanged?.((c) => c.projectId === projectId && load());
    return () => {
      offProject?.();
      offFeatures?.();
    };
  }, [projectId, space, load]);

  const p = data?.project;
  // US-0417: the four figures drop out of the diagonal frame's arm as readout blocks.
  const readouts = p
    ? [
        { k: t('velocity.readout.finished'), v: <span data-testid="velocity-readout-finished">{p.finished}</span>, tone: 'steel', strip: 'live' },
        { k: t('velocity.readout.running'), v: <span data-testid="velocity-readout-running">{p.running}</span>, strip: 'quiet' },
        { k: t('velocity.readout.average'), v: <span data-testid="velocity-readout-average">{dur(p.avgActiveMs)}</span>, tone: 'deep' },
        { k: t('velocity.readout.stories'), v: <span data-testid="velocity-readout-stories">{p.storiesDone}</span>, tone: 'deep' }
      ]
    : [];
  return (
    <section className={`velocity-view${entering ? ' is-entering' : ''}`} data-testid="velocity-view">
      <DiagonalFrame title={t('velocity.title')} sub={t('velocity.meta')} tag={space} readouts={readouts}>
        {error && (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p className="muted">{t('velocity.loading')}</p>}
        {data && (
          <>
            <div className="velocity-units" role="group" aria-label={t('velocity.unit.label')}>
              {['week', 'month'].map((u) => (
                <Block
                  key={u}
                  as="button"
                  selected={unit === u}
                  tone={unit === u ? undefined : 'dark'}
                  size="sm"
                  aria-pressed={unit === u}
                  onClick={() => setUnit(u)}
                  data-testid={`velocity-unit-${u}`}
                >
                  {t(`velocity.unit.${u}`)}
                </Block>
              ))}
            </div>
            {/* US-0050 item 3: Week | Month slides the chart in. */}
            <TabIn tab={unit} data-testid="velocity-unit-content">
              <VelocityChart buckets={p[unit]} />
            </TabIn>
            <IntentTable rows={data.intents} />
            <StoryTable stories={data.stories} />
            {data.releases.length > 0 && (
              <>
                <h3 className="section-title">{t('velocity.releases')}</h3>
                <ul className="refresh-list">
                  {data.releases.map((r) => (
                    <li key={r.release} data-testid="velocity-release">
                      {t('velocity.releaseLine', { release: r.release, n: r.stories.length, stories: r.stories.join(', ') })}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {data.delivery && <Delivery delivery={data.delivery} />}
            <Sources sources={data.sources} />
          </>
        )}
      </DiagonalFrame>
    </section>
  );
}

/** The intent detail's Velocity tab: phases, stages, waiting and review rounds of one intent (FR1.1–FR1.5). */
export function IntentVelocity({ events, finished }) {
  const { t, dur } = useText();
  const m = useMemo(() => intentMetrics(events, { finished }), [events, finished]);
  const span = (row) => (row.open ? <span className="lcars-chip lcars-chip--quiet">{t('velocity.open')}</span> : dur(row.ms));
  return (
    <section className="velocity-intent" data-testid="velocity-intent">
      <div className="velocity-readouts">
        <Readout label={t('velocity.total')} value={dur(m.totalMs)} testId="velocity-readout-total" />
        <Readout label={t('velocity.active')} value={dur(m.activeMs)} testId="velocity-readout-active" />
        <Readout label={t('velocity.parked')} value={formatDuration(m.parkedMs)} testId="velocity-readout-parked" />
        <Readout label={t('velocity.waiting')} value={formatDuration(m.waitingMs)} testId="velocity-readout-waiting" />
        <Readout
          label={t('velocity.reviews')}
          value={t('velocity.reviewCount', { reviews: m.reviews, rejections: m.rejections })}
          testId="velocity-readout-reviews"
        />
      </div>
      {!m.finished && <Unfinished />}
      <table className="cost-table">
        <caption>{t('velocity.phases')}</caption>
        <tbody>
          {m.phases.map((r) => (
            <tr key={r.name} data-testid="velocity-phase-row">
              <td>{r.name}</td>
              <td>{span(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="cost-table">
        <caption>{t('velocity.stages')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('velocity.stage')}</th>
            <th scope="col">{t('velocity.time')}</th>
            <th scope="col">{t('velocity.waiting')}</th>
            <th scope="col">{t('velocity.reviews')}</th>
            <th scope="col">{t('velocity.rejections')}</th>
          </tr>
        </thead>
        <tbody>
          {m.stages.map((r) => (
            <tr key={r.name} data-testid="velocity-stage-row">
              <td>{stageTitle(r.name)}</td>
              <td>{span(r)}</td>
              <td data-testid="velocity-stage-waiting">{formatDuration(r.waitingMs)}</td>
              <td data-testid="velocity-stage-reviews">{r.reviews}</td>
              <td>{r.rejections}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
