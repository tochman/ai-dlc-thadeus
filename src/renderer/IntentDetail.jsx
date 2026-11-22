import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pipeline, { pipelineSteps } from './Pipeline.jsx';
import Timeline from './Timeline.jsx';
import BoltDag from './BoltDag.jsx';
import ArtifactReader from './ArtifactReader.jsx';
import CostTab from './CostTab.jsx';
import ResumeButton from './ResumeButton.jsx';
import { ParkedMark } from './IntentList.jsx';
import TokenView from './TokenView.jsx';
import TokenDetail from './TokenDetail.jsx';
import StoryComments from './StoryComments.jsx';
import { IntentVelocity } from './VelocityView.jsx';
import { Dots, Frame, Hairlines } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';
import { formatCostPair, isInFlight, shortModel, stagePosition, stageStatusLabel, stageTitle } from './format.js';

const TABS = [
  { id: 'pipeline', tone: 'mid' },
  { id: 'timeline', tone: 'mid' },
  { id: 'units', tone: 'mid' },
  { id: 'cost', tone: 'mid' },
  { id: 'velocity', tone: 'mid' }, // US-0303 FR1.5
  { id: 'comments', tone: 'mid' }, // US-1201 AC-4
  { id: 'files', tone: 'dark' }
];
const MODE_KEY = { 'in-flight': 'live', complete: 'complete' };

/** "Pågår · Reverse Engineering", or the current stage's own status when it is not in progress (FR3.3). */
function currentText(pipeline, slug) {
  const stage = pipeline.phases.flatMap((p) => p.stages).find((s) => s.slug === slug);
  const status = stage?.status ?? 'in-progress';
  return { text: `${stageStatusLabel(status) ?? status} · ${stageTitle(slug)}`, needsYou: status === 'awaiting-approval' };
}

/** The request clamped to two lines; "Visa mer" only when it is actually longer than that (F-01). */
export function RequestText({ text }) {
  const { t } = useTranslation();
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
          {expanded ? t('intents.showLess') : t('intents.showMore')}
        </button>
      )}
    </div>
  );
}

/** The readout column to the right of the frame: Stages, Kostnad, Modell, Läge (FR3.5). */
function ReadoutColumn({ pipeline, intentCost, intent, directive, cost, dirName, onOpenTokens, tokensRef }) {
  const { t } = useTranslation();
  const live = isInFlight(intent?.status);
  const topModel = [...(intentCost?.byModel ?? [])].sort((a, b) => b.usd - a.usd)[0]?.name;
  const mode = MODE_KEY[intent?.status];
  return (
    <aside className="readout-col" aria-label={t('intents.readout')}>
      <Hairlines />
      {/* US-0037 FR3.4: labelled as done stages, so it does not read as a second step count. */}
      <div className="readout" data-testid="intent-detail-stages">
        <span className="readout-label">{t('intents.readoutStages')}</span>
        <span className="readout-value">
          {pipeline.done}/{pipeline.executed}
        </span>
      </div>
      {intentCost && (
        <div className="readout">
          <span className="readout-label">{t('intents.readoutCost')}</span>
          {/* US-0211 FR3.2: recorded, with the current-price figure beside it when they differ. US-0037 FR3.5: at the compact size. */}
          <span className="readout-value readout-value--steel readout-value--cost" data-testid="intent-detail-cost">
            {formatCostPair(intentCost.total)}
          </span>
        </div>
      )}
      {/* Live tokens beside the cost while the work runs (EPIC-02 US-0207). */}
      <TokenView cost={cost} dirName={dirName} live={live} onOpen={onOpenTokens} ref={tokensRef} />
      {/* A finished intent has no live view; its token detail opens from here (US-0208 FR5). */}
      {!live && intentCost && (
        <button type="button" ref={tokensRef} className="lcars-block lcars-block--sm lcars-block--dark" onClick={onOpenTokens} data-testid="token-view-open">
          {t('tokenDetail.openShort')}
        </button>
      )}
      {topModel && (
        <div className="readout">
          <span className="readout-label">{t('intents.readoutModel')}</span>
          <span className="readout-value readout-value--sm">{shortModel(topModel)}</span>
        </div>
      )}
      <div className="readout">
        <span className="readout-label">{t('intents.readoutMode')}</span>
        <span className={`readout-value readout-value--sm ${live ? 'readout-value--steel' : ''}`}>
          {live ? (
            <span className="readout-live">
              <span className="lcars-live-dot" aria-hidden="true" />
              {t('intents.mode.live')}
            </span>
          ) : mode ? (
            t(`intents.mode.${mode}`)
          ) : (
            (intent?.status ?? '–')
          )}
        </span>
      </div>
      {directive?.stage && (
        <div className="readout">
          <span className="readout-label">{t('intents.readoutDirective')}</span>
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

/**
 * US-0510 FR4.2, FR4.5: Park, on the active intent while in flight and not parked. A refusal shows AI-DLC's reason;
 * the list follows on project:changed. US-0037 FR3.2: a parked intent has no Unpark here; Resume unparks
 * ("Avparkera och fortsätt vid …") and the parked mark sits in the progress row.
 */
export function ParkControls({ projectId, intent, activeDirName }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (intent.dirName !== activeDirName || !isInFlight(intent.status) || intent.parked) return null;

  async function park() {
    setBusy(true);
    setError(null);
    try {
      const res = await window.bridge.parkIntent(projectId);
      if (!res?.ok) setError(res?.error ?? '');
    } catch (err) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="intent-park">
      <button type="button" className="lcars-block lcars-block--dark" disabled={busy} onClick={park} data-testid="intent-park">
        {t('intents.park')}
      </button>
      {error !== null && (
        <p className="refresh-error" role="alert" data-testid="intent-park-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default function IntentDetail({
  projectId,
  space = 'default',
  detail,
  intent,
  activeDirName,
  activeIntent = null,
  newKeys,
  cost,
  models,
  stories = [],
  onOpenStory
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('pipeline');
  const [openFile, setOpenFile] = useState(null);
  const { state, pipeline } = detail;
  const intentCost = cost?.available ? (cost.perIntent[detail.dirName] ?? null) : null;
  const position = stagePosition(state?.currentStage, pipeline.done, pipeline.executed);
  const steps = pipelineSteps(pipeline);
  const now = state?.currentStage ? currentText(pipeline, state.currentStage) : null;
  // The token detail replaces the main panel; closing it gives focus back to the small view (US-0208 FR1).
  // US-0022: the header has its own Tokens button for windows where the readout column is hidden; focus goes back to
  // whichever button opened the view.
  const [showTokens, setShowTokens] = useState(false);
  const tokensRef = useRef(null);
  const headTokensRef = useRef(null);
  const openedFrom = useRef(null);
  useEffect(() => {
    if (showTokens || !openedFrom.current) return;
    (openedFrom.current === 'head' ? headTokensRef : tokensRef).current?.focus();
    openedFrom.current = null;
  }, [showTokens]);
  const openTokens = (from) => () => {
    openedFrom.current = from;
    setShowTokens(true);
  };

  function showFile(rel) {
    setOpenFile(rel);
    setTab('files');
  }

  // A re-read detail (a change on disk) is the token detail's refreshKey: it asks for the agent progress again (US-0507 FR5.1).
  if (showTokens) {
    return (
      <article className="intent-detail" data-testid="intent-detail">
        <TokenDetail
          projectId={projectId}
          space={space}
          dirName={detail.dirName}
          intent={intent}
          cost={cost}
          live={isInFlight(intent?.status)}
          stageOrder={pipeline.phases.flatMap((p) => p.stages.map((s) => s.slug))}
          refreshKey={detail}
          onBack={() => setShowTokens(false)}
        />
      </article>
    );
  }

  return (
    <article className="intent-detail" data-testid="intent-detail">
      <Frame>
        <header className="intent-head">
          <div className="intent-head-main">
            <h2 className="intent-title">{intent?.slug ?? detail.dirName}</h2>
            <div className="lcars-chips">
              <Tooltip text={state?.plan ? t('intents.basedOn', { scope: intent?.scope ?? state?.scope ?? '–' }) : t('intents.scopeLabel')} focusable>
                <span className="lcars-chip">{state?.plan ?? intent?.scope ?? state?.scope ?? '–'}</span>
              </Tooltip>
              <span className="lcars-chip">{t('intents.depth', { depth: state?.depth ?? '–' })}</span>
              <span className="lcars-chip">{t('intents.test', { strategy: state?.testStrategy ?? '–' })}</span>
              {/* Stories in the feature docs that this intent mentions (EPIC-06 FR2.6). */}
              {onOpenStory &&
                stories.map((id) => (
                  <Tooltip key={id} text={t('intents.openStory', { id })}>
                    <button className="lcars-chip lcars-chip--active" onClick={() => onOpenStory(id)} data-testid="intent-detail-story-link">
                      {id}
                    </button>
                  </Tooltip>
                ))}
              <span className="lcars-chip lcars-chip--quiet">{detail.dirName}</span>
              {detail.stale && <span className="lcars-chip lcars-chip--warn">{t('intents.stale')}</span>}
            </div>
          </div>
          {/* US-0037 FR3.1, FR3.6: Park and Resume as one group, the same height, wrapping together. */}
          {intent && (
            <div className="intent-head-actions" data-testid="intent-head-actions">
              <ParkControls key={intent.dirName} projectId={projectId} intent={intent} activeDirName={activeDirName} />
              <ResumeButton projectId={projectId} intent={intent} activeDirName={activeDirName} activeIntent={activeIntent} position={position} />
            </div>
          )}
          <button
            type="button"
            ref={headTokensRef}
            className="lcars-block lcars-block--sm lcars-block--dark intent-tokens-open"
            onClick={openTokens('head')}
            data-testid="intent-detail-tokens"
          >
            {t('tokenDetail.tokens')}
          </button>
        </header>

        {steps.length > 0 && (
          <div className="intent-progress" data-testid="intent-progress">
            {position && <span className="intent-progress-step">{t('intents.step', { step: position.step, total: position.total })}</span>}
            <Dots states={steps} />
            {/* US-0037 FR3.2, FR3.3: a parked intent shows its parked mark here, once, in place of "Pågår · <stage>". */}
            {intent?.parked ? (
              <ParkedMark stage={intent.parkedStage} />
            ) : (
              now && <span className={`intent-progress-now ${now.needsYou ? 'is-you' : ''}`}>{now.text}</span>
            )}
          </div>
        )}

        {detail.request && <RequestText text={detail.request} />}
        {detail.warnings.map((w) => (
          <p key={w} className="banner banner-warn" role="status">
            {w}
          </p>
        ))}

        <div className="detail-tabs" role="tablist" aria-label={t('intents.tabsLabel')}>
          {TABS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={tab === x.id}
              className={`lcars-block lcars-block--tab lcars-block--${tab === x.id ? 'active' : x.tone}`}
              onClick={() => setTab(x.id)}
              data-testid={`intent-detail-tab-${x.id}`}
            >
              {t(`intents.tabs.${x.id}`)}
            </button>
          ))}
        </div>

        <div className="detail-body" role="tabpanel">
          {tab === 'pipeline' && <Pipeline pipeline={pipeline} files={detail.files} hasGraph={!!detail.graph} onOpenFile={showFile} cost={intentCost} />}
          {tab === 'cost' && <CostTab cost={cost} intentCost={intentCost} pipeline={pipeline} models={models} />}
          {tab === 'velocity' && (
            <IntentVelocity events={detail.events} finished={intent?.status === 'complete' || /^complete/i.test(state?.currentStatus ?? '')} />
          )}
          {tab === 'timeline' && <Timeline events={detail.events} newKeys={newKeys} />}
          {tab === 'units' && <BoltDag dag={detail.graph?.boltDag ?? null} statuses={detail.units} />}
          {tab === 'comments' && <StoryComments projectId={projectId} space={space} dirName={detail.dirName} files={detail.files} onOpenFile={showFile} />}
          {tab === 'files' && <ArtifactReader projectId={projectId} groups={detail.files} selected={openFile} onSelect={setOpenFile} />}
        </div>
      </Frame>
      <ReadoutColumn
        pipeline={pipeline}
        intentCost={intentCost}
        intent={intent}
        directive={detail.directive}
        cost={cost}
        dirName={detail.dirName}
        onOpenTokens={openTokens('side')}
        tokensRef={tokensRef}
      />
    </article>
  );
}
