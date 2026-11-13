import { useLayoutEffect, useRef, useState } from 'react';
import Pipeline, { pipelineSteps } from './Pipeline.jsx';
import Timeline from './Timeline.jsx';
import BoltDag from './BoltDag.jsx';
import ArtifactReader from './ArtifactReader.jsx';
import CostTab from './CostTab.jsx';
import ResumeButton from './ResumeButton.jsx';
import { Dots, Frame, Hairlines } from './Lcars.jsx';
import { STAGE_STATUS_LABEL, formatCost, isInFlight, shortModel, stagePosition, stageTitle } from './format.js';

const TABS = [
  { id: 'pipeline', label: 'Pipeline', tone: 'mid' },
  { id: 'timeline', label: 'Tidslinje', tone: 'mid' },
  { id: 'units', label: 'Units', tone: 'mid' },
  { id: 'cost', label: 'Kostnad', tone: 'mid' },
  { id: 'files', label: 'Filer', tone: 'dark' }
];
const MODE_LABEL = { 'in-flight': 'Live', complete: 'Klar' };

/** "Pågår · Reverse Engineering", or the current stage's own status when it is not in progress (FR3.3). */
function currentText(pipeline, slug) {
  const stage = pipeline.phases.flatMap((p) => p.stages).find((s) => s.slug === slug);
  const status = stage?.status ?? 'in-progress';
  return { text: `${STAGE_STATUS_LABEL[status] ?? status} · ${stageTitle(slug)}`, needsYou: status === 'awaiting-approval' };
}

/** The request clamped to two lines; "Visa mer" only when it is actually longer than that (F-01). */
export function RequestText({ text }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return undefined;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="request">
      <p ref={ref} className={`request-text ${expanded ? '' : 'is-clamped'}`} data-testid="intent-detail-description">
        {text}
      </p>
      {(overflows || expanded) && (
        <button className="request-toggle" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)} data-testid="intent-detail-description-toggle">
          {expanded ? 'Visa mindre' : 'Visa mer'}
        </button>
      )}
    </div>
  );
}

/** The readout column to the right of the frame: Stages, Kostnad, Modell, Läge (FR3.5). */
function ReadoutColumn({ pipeline, intentCost, intent, directive }) {
  const live = isInFlight(intent?.status);
  const topModel = [...(intentCost?.byModel ?? [])].sort((a, b) => b.usd - a.usd)[0]?.name;
  return (
    <aside className="readout-col" aria-label="Avläsning">
      <Hairlines />
      <div className="readout">
        <span className="readout-label">Stages</span>
        <span className="readout-value">
          {pipeline.done}/{pipeline.executed}
        </span>
      </div>
      {intentCost && (
        <div className="readout">
          <span className="readout-label">Kostnad</span>
          <span className="readout-value readout-value--steel">{formatCost(intentCost.total)}</span>
        </div>
      )}
      {topModel && (
        <div className="readout">
          <span className="readout-label">Modell</span>
          <span className="readout-value readout-value--sm">{shortModel(topModel)}</span>
        </div>
      )}
      <div className="readout">
        <span className="readout-label">Läge</span>
        <span className={`readout-value readout-value--sm ${live ? 'readout-value--steel' : ''}`}>
          {live ? (
            <span className="readout-live">
              <span className="lcars-live-dot" aria-hidden="true" />
              Live
            </span>
          ) : (
            MODE_LABEL[intent?.status] ?? intent?.status ?? '–'
          )}
        </span>
      </div>
      {directive?.stage && (
        <div className="readout">
          <span className="readout-label">Direktiv</span>
          <span className="readout-value readout-value--xs">
            {directive.kind} · {directive.stage} · {directive.delivery}
          </span>
        </div>
      )}
      <span className="readout-spacer" aria-hidden="true" />
      <Hairlines widths={[100, 100, 100, 100, 100, 100]} lit={[]} tone="steel" />
    </aside>
  );
}

export default function IntentDetail({ projectId, detail, intent, activeDirName, newKeys, cost, models, stories = [], onOpenStory }) {
  const [tab, setTab] = useState('pipeline');
  const [openFile, setOpenFile] = useState(null);
  const { state, pipeline } = detail;
  const intentCost = cost?.available ? cost.perIntent[detail.dirName] ?? null : null;
  const position = stagePosition(state?.currentStage, pipeline.done, pipeline.executed);
  const steps = pipelineSteps(pipeline);
  const now = state?.currentStage ? currentText(pipeline, state.currentStage) : null;

  function showFile(rel) {
    setOpenFile(rel);
    setTab('files');
  }

  return (
    <article className="intent-detail" data-testid="intent-detail">
      <Frame>
        <header className="intent-head">
          <div className="intent-head-main">
            <h2 className="intent-title">{intent?.slug ?? detail.dirName}</h2>
            <div className="lcars-chips">
              <span className="lcars-chip" title="Scope">
                {intent?.scope ?? state?.scope ?? '–'}
              </span>
              <span className="lcars-chip">Depth {state?.depth ?? '–'}</span>
              <span className="lcars-chip">Test {state?.testStrategy ?? '–'}</span>
              {/* Stories in the feature docs that this intent mentions (EPIC-06 FR2.6). */}
              {onOpenStory &&
                stories.map((id) => (
                  <button key={id} className="lcars-chip lcars-chip--active" title={`Öppna ${id} i Features`} onClick={() => onOpenStory(id)} data-testid="intent-detail-story-link">
                    {id}
                  </button>
                ))}
              <span className="lcars-chip lcars-chip--quiet">{detail.dirName}</span>
              {detail.stale && <span className="lcars-chip lcars-chip--warn">Visar senaste giltiga data</span>}
            </div>
          </div>
          {intent && <ResumeButton intent={intent} activeDirName={activeDirName} position={position} />}
        </header>

        {steps.length > 0 && (
          <div className="intent-progress">
            {position && (
              <span className="intent-progress-step">
                Steg {position.step} av {position.total}
              </span>
            )}
            <Dots states={steps} />
            {now && <span className={`intent-progress-now ${now.needsYou ? 'is-you' : ''}`}>{now.text}</span>}
          </div>
        )}

        {detail.request && <RequestText text={detail.request} />}
        {detail.warnings.map((w) => (
          <p key={w} className="banner banner-warn" role="status">
            {w}
          </p>
        ))}

        <div className="detail-tabs" role="tablist" aria-label="Intent-vyer">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`lcars-block lcars-block--tab lcars-block--${tab === t.id ? 'active' : t.tone}`}
              onClick={() => setTab(t.id)}
              data-testid={`intent-detail-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="detail-body" role="tabpanel">
          {tab === 'pipeline' && (
            <Pipeline pipeline={pipeline} files={detail.files} hasGraph={!!detail.graph} onOpenFile={showFile} cost={intentCost} />
          )}
          {tab === 'cost' && <CostTab cost={cost} intentCost={intentCost} pipeline={pipeline} models={models} />}
          {tab === 'timeline' && <Timeline events={detail.events} newKeys={newKeys} />}
          {tab === 'units' && <BoltDag dag={detail.graph?.boltDag ?? null} statuses={detail.units} />}
          {tab === 'files' && <ArtifactReader projectId={projectId} groups={detail.files} selected={openFile} onSelect={setOpenFile} />}
        </div>
      </Frame>
      <ReadoutColumn pipeline={pipeline} intentCost={intentCost} intent={intent} directive={detail.directive} />
    </article>
  );
}
