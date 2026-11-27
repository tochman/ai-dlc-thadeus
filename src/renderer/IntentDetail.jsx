import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Pipeline, { pipelineSteps } from './Pipeline.jsx';
import Timeline from './Timeline.jsx';
import BoltDag from './BoltDag.jsx';
import ArtifactReader from './ArtifactReader.jsx';
import CostTab from './CostTab.jsx';
import ResumeButton from './ResumeButton.jsx';
import ArchiveControls from './ArchiveControls.jsx'; // US-0513
import PlanChange from './PlanChange.jsx'; // US-0509
import { ArchivedMark, ParkedMark } from './IntentList.jsx';
import TokenView from './TokenView.jsx';
import TokenDetail from './TokenDetail.jsx';
import StoryComments from './StoryComments.jsx';
import { IntentVelocity } from './VelocityView.jsx';
import { Block, DiagonalFrame, Dots, Pill, TabIn, useEntrance } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';
import { formatCostPair, isInFlight, shortModel, stagePosition, stageStatusLabel, stageTitle } from './format.js';
import { isArchived, isFinished } from '../shared/intentArchive.js';

// US-0417: the tiles' tones vary as in the mockup (Block tones; none is the plain slate block).
const TABS = [
  { id: 'pipeline' },
  { id: 'timeline', tone: 'dark' },
  { id: 'units', tone: 'steel' },
  { id: 'cost' },
  { id: 'velocity', tone: 'dark' }, // US-0303 FR1.5
  { id: 'comments' }, // US-1201 AC-4
  { id: 'files', tone: 'steel' }
];
const MODE_KEY = { 'in-flight': 'live', complete: 'complete', archived: 'archived' };

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
      {/* US-0050 item 7: the whole request opens with the shared fold. */}
      <p ref={ref} className={`request-text ${expanded ? 'lcars-reveal' : 'is-clamped'}`} data-testid="intent-detail-description">
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

/**
 * US-0417: the readouts that drop out of the diagonal frame's arm: Kostnad, Modell, Läge and the directive (FR3.5).
 * The done stages are the corner's figure and the foot bar's text (US-0037 FR3.4).
 */
function headReadouts(t, { intentCost, intent, directive }) {
  const live = isInFlight(intent?.status);
  const topModel = [...(intentCost?.byModel ?? [])].sort((a, b) => b.usd - a.usd)[0]?.name;
  const mode = MODE_KEY[intent?.status];
  const modeValue = live ? (
    <span className="readout-live">
      <span className="lcars-live-dot" aria-hidden="true" />
      {t('intents.mode.live')}
    </span>
  ) : mode ? (
    t(`intents.mode.${mode}`)
  ) : (
    (intent?.status ?? '–')
  );
  return [
    // US-0211 FR3.2: recorded, with the current-price figure beside it when they differ. US-0037 FR3.5: at the compact size.
    intentCost && {
      k: t('intents.readoutCost'),
      v: (
        <span className="readout-value--cost" data-testid="intent-detail-cost">
          {formatCostPair(intentCost.total)}
        </span>
      ),
      tone: 'steel',
      strip: 'live'
    },
    topModel && { k: t('intents.readoutModel'), v: shortModel(topModel), strip: 'quiet' },
    { k: t('intents.readoutMode'), v: modeValue, tone: 'deep', strip: live ? 'live' : undefined },
    directive?.stage && {
      k: t('intents.readoutDirective'),
      v: <span className="lcars-dblk-small">{[directive.kind, directive.stage, directive.delivery].join(' · ')}</span>,
      tone: 'deep'
    }
  ].filter(Boolean);
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
      {/* US-0417 (Shape rule): Park is an action, so a pill. */}
      <Pill tone="quiet" disabled={busy} onClick={park} data-testid="intent-park">
        {t('intents.park')}
      </Pill>
      {error !== null && (
        <p className="refresh-error" role="alert" data-testid="intent-park-error">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * US-0508 FR1.2–FR1.5: the intent's display name, edited in place. Save sends the trimmed name (empty resets it to
 * the folder name); a refusal shows its reason next to the field. Offered in every state, also while work runs.
 * The list follows on project:changed.
 */
export function RenameControl({ projectId, intent }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(null); // null: not editing
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setValue(null);
    setError(null);
  };
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await window.bridge.renameIntent(projectId, intent.dirName, value.trim());
      if (res?.ok) setValue(null);
      else setError(res?.error ?? '');
    } catch (err) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  }

  if (value === null) {
    return (
      <Pill tone="quiet" onClick={() => setValue(intent.slug ?? '')} data-testid="intent-rename">
        {t('intents.rename.open')}
      </Pill>
    );
  }
  return (
    <form className="intent-rename" onSubmit={save} onKeyDown={(e) => e.key === 'Escape' && close()} data-testid="intent-rename-form">
      <label className="field">
        <span className="field-label">{t('intents.rename.label')}</span>
        <input
          type="text"
          className="lcars-input"
          value={value}
          maxLength={60}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error !== null}
          autoFocus
          data-testid="intent-rename-input"
        />
      </label>
      <span className="muted">{t('intents.rename.hint')}</span>
      <div className="intent-rename-actions">
        <Pill type="submit" disabled={busy} data-testid="intent-rename-save">
          {t('intents.rename.save')}
        </Pill>
        <Pill tone="quiet" onClick={close} data-testid="intent-rename-cancel">
          {t('intents.rename.cancel')}
        </Pill>
      </div>
      {error !== null && (
        <p className="refresh-error" role="alert" data-testid="intent-rename-error">
          {error}
        </p>
      )}
    </form>
  );
}

export default function IntentDetail({
  projectId,
  space = 'default',
  activeSpace = null,
  detail,
  intent,
  activeDirName,
  activeIntent = null,
  newKeys,
  cost,
  models,
  stories = [],
  onOpenStory,
  onView // US-1302 FR2.5, FR4: the savings hints' links open a Configuration section
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('pipeline');
  const [openFile, setOpenFile] = useState(null);
  const { state, pipeline } = detail;
  const intentCost = cost?.available ? (cost.perIntent[detail.dirName] ?? null) : null;
  const position = stagePosition(state?.currentStage, pipeline.done, pipeline.executed);
  const steps = pipelineSteps(pipeline);
  const now = state?.currentStage ? currentText(pipeline, state.currentStage) : null;
  const archived = isArchived(intent); // US-0513 FR2.1
  // The token detail replaces the main panel; closing it gives focus back to the small view (US-0208 FR1).
  // US-0022: the header has its own Tokens button for windows where the readout column is hidden; focus goes back to
  // whichever button opened the view.
  // US-1301 FR4: the intent's rework, asked for while the cost tab shows; kept with its folder so another intent's never shows.
  const [rework, setRework] = useState({ dirName: null, value: null });
  useEffect(() => {
    if (tab !== 'cost' || !window.bridge?.getRework) return undefined;
    let current = true;
    const dirName = detail.dirName;
    window.bridge.getRework(projectId, dirName, space).then(
      (value) => current && setRework({ dirName, value: value ?? null }),
      (err) => console.error('intent:rework', err?.message ?? err) // the tab keeps its other figures
    );
    return () => {
      current = false;
    };
  }, [tab, projectId, space, detail.dirName, cost]);
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

  const entering = useEntrance(`intent:${detail.dirName}`); // US-0417: the shared entrance, each time an intent is shown
  const live = isInFlight(intent?.status);

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

  // US-0509 FR4.2: the state file's scope first; AI-DLC runs on it and writes it before intents.json.
  const scope = state?.scope ?? intent?.scope ?? '–';
  const plan = state?.plan ?? scope;
  // Live tokens under the readouts while the work runs (EPIC-02 US-0207); a finished intent opens Activity from a block (US-0208 FR5).
  // US-0418 step 13: the Pulse view opens from the intent's arm, below the tokens.
  const arm = (
    <>
      {live ? (
        <TokenView cost={cost} dirName={detail.dirName} live onOpen={openTokens('side')} ref={tokensRef} />
      ) : (
        intentCost && (
          <Block as="button" ref={tokensRef} tone="dark" size="sm" onClick={openTokens('side')} data-testid="token-view-open">
            {t('tokenDetail.openShort')}
          </Block>
        )
      )}
      <Block as="button" tone="dark" size="sm" onClick={() => onView?.('pulse')} data-testid="intent-pulse-open">
        {t('pulse.open')}
      </Block>
    </>
  );

  return (
    <article className={`intent-detail${entering ? ' is-entering' : ''}`} data-testid="intent-detail">
      <DiagonalFrame
        className="intent-df"
        title={intent?.slug ?? detail.dirName}
        sub={plan /* the step stays once, in the progress row (US-0037 FR3.4) */}
        tag={detail.dirName}
        corner={{ label: t('intents.readoutStages'), value: `${pipeline.done} / ${pipeline.executed}` }}
        footer={<span data-testid="intent-detail-stages">{`${t('intents.readoutStages')} ${pipeline.done}/${pipeline.executed}`}</span>}
        readouts={headReadouts(t, { intentCost, intent, directive: detail.directive })}
        arm={arm}
      >
        <header className="intent-head">
          <div className="intent-head-main">
            <div className="lcars-chips">
              <Tooltip text={state?.plan ? t('intents.basedOn', { scope }) : t('intents.scopeLabel')} focusable>
                <span className="lcars-chip">{plan}</span>
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
              {detail.stale && <span className="lcars-chip lcars-chip--warn">{t('intents.stale')}</span>}
            </div>
          </div>
          {/* US-0513: the actions wrap in a narrow frame. US-0037 FR3.1, FR3.6: Park and Resume as one group, the same
              height, wrapping together. */}
          {intent && (
            <div className="intent-head-actions" data-testid="intent-head-actions">
              <RenameControl key={`rename:${intent.dirName}`} projectId={projectId} intent={intent} />
              <ArchiveControls key={`archive:${intent.dirName}`} projectId={projectId} intent={intent} space={space} activeSpace={activeSpace} />
              <PlanChange
                key={`plan:${intent.dirName}`}
                projectId={projectId}
                intent={intent}
                detail={detail}
                space={space}
                activeSpace={activeSpace}
                activeIntent={activeIntent}
              />
              <div className="intent-head-work">
                <ParkControls key={intent.dirName} projectId={projectId} intent={intent} activeDirName={activeDirName} />
                <ResumeButton projectId={projectId} intent={intent} activeDirName={activeDirName} activeIntent={activeIntent} position={position} />
              </div>
            </div>
          )}
          {/* US-0022: the way into Activity where the frame's arm is hidden (narrow windows). */}
          <Block
            as="button"
            ref={headTokensRef}
            tone="dark"
            size="sm"
            className="intent-tokens-open"
            onClick={openTokens('head')}
            data-testid="intent-detail-tokens"
          >
            {t('tokenDetail.activity')}
          </Block>
        </header>

        {(steps.length > 0 || archived) && (
          <div className="intent-progress" data-testid="intent-progress">
            {position && <span className="intent-progress-step">{t('intents.step', { step: position.step, total: position.total })}</span>}
            <Dots states={steps} />
            {/* US-0037 FR3.2, FR3.3: a parked intent shows its parked mark here, once, in place of "Pågår · <stage>"; an
                archived one its archived mark (US-0513 FR2.1). */}
            {archived ? (
              <ArchivedMark />
            ) : intent?.parked ? (
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
          {/* US-0417: the tabs are tiles, their state in a strip on top; selection is brightness. */}
          {TABS.map((x, i) => (
            <Block
              key={x.id}
              as="button"
              role="tab"
              aria-selected={tab === x.id}
              selected={tab === x.id}
              strip={tab === x.id ? 'live' : undefined}
              tone={x.tone}
              index={i}
              className="lcars-tile"
              onClick={() => setTab(x.id)}
              data-testid={`intent-detail-tab-${x.id}`}
            >
              {t(`intents.tabs.${x.id}`)}
            </Block>
          ))}
        </div>

        {/* US-0050 item 2: the tab's content slides in on a switch (TabIn, keyed by the tab). */}
        <TabIn tab={tab} className="detail-body" role="tabpanel" data-testid="intent-detail-tab-content">
          {/* US-0412 FR2.2: keyed by intent, so another intent's pipeline mounts fresh and powers up without a sweep. */}
          {tab === 'pipeline' && (
            <Pipeline key={detail.dirName} pipeline={pipeline} files={detail.files} hasGraph={!!detail.graph} onOpenFile={showFile} cost={intentCost} />
          )}
          {tab === 'cost' && (
            <CostTab
              cost={cost}
              intentCost={intentCost}
              pipeline={pipeline}
              models={models}
              rework={rework.dirName === detail.dirName ? rework.value : null}
              projectId={projectId}
              space={space}
              dirName={detail.dirName}
              onView={onView}
            />
          )}
          {tab === 'velocity' && (
            <IntentVelocity
              events={detail.events}
              finished={isFinished({ status: intent?.status, stateStatus: state?.currentStatus, archivedFrom: state?.archivedFrom })}
            />
          )}
          {tab === 'timeline' && <Timeline events={detail.events} newKeys={newKeys} />}
          {tab === 'units' && <BoltDag dag={detail.graph?.boltDag ?? null} statuses={detail.units} />}
          {tab === 'comments' && <StoryComments projectId={projectId} space={space} dirName={detail.dirName} files={detail.files} onOpenFile={showFile} />}
          {tab === 'files' && <ArtifactReader projectId={projectId} groups={detail.files} selected={openFile} onSelect={setOpenFile} />}
        </TabIn>
      </DiagonalFrame>
    </article>
  );
}
