// US-0509 FR1-FR3, FR5: "Change plan" in the detail of an intent in flight. Its dialog shows what another plan would change
// and types AI-DLC's line into the agent tab without Enter; AI-DLC changes the plan, and the person decides by sending it.
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { intentListNear } from './ArchiveControls.jsx';
import LcarsDialog from './LcarsDialog.jsx';
import { Pill } from './Lcars.jsx';
import { blockReason, missingCommandReason, unsafeNameReason, workBlockOf } from './ResumeButton.jsx';
import { useTerminal } from './TerminalContext.jsx';
import Tooltip from './Tooltip.jsx';
import { isInFlight, stageTitle } from './format.js';
import { harnessCommand } from '../shared/harnesses.js';
import { checkDescription, planChange, quoted } from '../shared/planChange.js';
import { validPlanName } from '../shared/planName.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const WAYS = ['ready', 'tailored'];
const GROUPS = ['added', 'dropped', 'kept', 'passed'];
const stagesOf = (pipeline) => pipeline.phases.flatMap((p) => p.stages);

/** US-0509 FR1.1, FR2.9: why the plan of this intent cannot be changed at all (a key), or null. */
function goneReason(intent, detail) {
  if (!isInFlight(intent.status) || intent.missingOnDisk || intent.missingInIndex) return 'notInFlight';
  return intent.error || detail.stale || stagesOf(detail.pipeline).length === 0 ? 'unreadable' : null;
}

/** US-0509 FR2.4, FR5.2: what the chosen plan changes, each group headed by its text. */
function Preview({ change }) {
  const { t } = useTranslation();
  return (
    <div className="plan-change-preview" data-testid="plan-change-preview">
      {change.added.length + change.dropped.length === 0 && <p data-testid="plan-change-nothing">{t('intents.planChange.nothing')}</p>}
      {change.currentDropped && (
        <p className="banner banner-warn" data-testid="plan-change-current-dropped">
          {t('intents.planChange.currentDropped', { stage: stageTitle(change.currentDropped) })}
        </p>
      )}
      <div className="plan-change-groups">
        {GROUPS.filter((kind) => change[kind].length > 0).map((kind) => (
          <section key={kind} className={`plan-change-group plan-change-group--${kind}`} data-testid={`plan-change-${kind}`}>
            <h3>{t(`intents.planChange.${kind}`, { n: change[kind].length })}</h3>
            <ul>
              {change[kind].map((slug) => (
                <li key={slug}>{stageTitle(slug)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** US-0509 FR2.3, FR2.8: the ready-made plans, or why there are none to choose. `read` is null while they are read. */
function PlanChoice({ read, choices, plan, chosen, onChoose }) {
  const { t } = useTranslation();
  if (!read) {
    return (
      <p className="muted" role="status" data-testid="plan-change-loading">
        {t('intents.planChange.loading')}
      </p>
    );
  }
  if (read.error !== undefined) {
    return (
      <p className="refresh-error" role="status" data-testid="plan-change-failed">
        {t('intents.planChange.failed', { error: read.error })}
      </p>
    );
  }
  if (choices.length === 0) return <p data-testid="plan-change-none">{t('intents.planChange.none')}</p>;
  return (
    <>
      <label className="field">
        <span className="field-label">{t('intents.planChange.plan')}</span>
        <select
          className="lcars-select plan-change-select"
          value={plan?.name ?? ''}
          onChange={(e) => onChoose(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.matches(':open') && e.stopPropagation()} // closes its list, not the dialog
          data-testid="plan-change-plan"
        >
          <option value="">{t('intents.planChange.choose')}</option>
          {choices.map((p) => (
            <option key={p.name} value={p.name}>
              {[p.name, p.description].filter(Boolean).join(' – ')}
            </option>
          ))}
        </select>
      </label>
      {plan && !chosen.stages && chosen.error === undefined && (
        <p className="muted" role="status" data-testid="plan-change-stages-loading">
          {t('intents.planChange.stagesLoading')}
        </p>
      )}
      {plan && chosen.error !== undefined && (
        <p className="refresh-error" role="status" data-testid="plan-change-stages-failed">
          {t('intents.planChange.stagesFailed', { error: chosen.error })}
        </p>
      )}
    </>
  );
}

/**
 * The dialog's content; mounted while it is open, so each opening reads the plans again and starts with no choice.
 * ponytail: the plans are read once per opening and harness; a plan added meanwhile shows on the next opening.
 * @param {{blocked: string|null, onConfirm: (suffix: string) => string|null}} props `blocked`: why the line cannot be typed
 *   now; onConfirm types it, or gives the reason it did not
 */
function PlanChangeForm({ projectId, intent, detail, harness, blocked, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const [way, setWay] = useState('ready');
  const [answer, setAnswer] = useState(null); // the plans read: {harness, plans} or {harness, error}
  const [choice, setChoice] = useState(null); // {harness, name, stages?, error?}
  const [text, setText] = useState('');
  const [problem, setProblem] = useState(null);
  const id = useId();
  const { state, pipeline } = detail;

  useEffect(() => {
    if (!harness) return undefined;
    let live = true;
    const done = (res) => live && setAnswer({ harness, ...res });
    window.bridge.listPlans(projectId, harness).then(
      (res) => done({ plans: res.plans }),
      (err) => done({ error: errorText(err) })
    );
    return () => {
      live = false;
    };
  }, [projectId, harness]);

  const scope = state?.scope ?? intent.scope ?? null;
  const read = answer?.harness === harness ? answer : null;
  const choices = (read?.plans ?? []).filter((p) => p.name !== scope && validPlanName(p.name)); // NFR1
  const chosen = choice?.harness === harness ? choice : null;
  const plan = choices.find((p) => p.name === chosen?.name) ?? null;
  const stages = plan ? chosen.stages : undefined;
  const done = stagesOf(pipeline).filter((s) => s.status === 'done');

  /** NFR3: a plan's stages are read when it is chosen; an answer for another choice is dropped. */
  async function choose(name) {
    setProblem(null);
    setChoice(name ? { harness, name } : null);
    if (!name) return;
    let res;
    try {
      res = { stages: await window.bridge.getPlanStages(projectId, harness, name) };
    } catch (err) {
      res = { error: errorText(err) };
    }
    setChoice((c) => (c?.name === name && c.harness === harness ? { ...c, ...res } : c));
  }

  function confirm() {
    if (way === 'ready') {
      if (stages) return setProblem(onConfirm(`--scope ${plan.name}`));
      return setProblem(plan ? null : t('intents.planChange.chooseFirst')); // a chosen plan's own text says why it waits
    }
    const checked = checkDescription(text);
    if (checked.error) return setProblem(t(`intents.planChange.descriptionError.${checked.error}`));
    return setProblem(onConfirm(`compose ${quoted(checked.text)}`));
  }

  return (
    <div className="plan-change-form">
      <p className="plan-change-name" data-testid="plan-change-name">
        {intent.slug ?? intent.dirName}
      </p>
      <p data-testid="plan-change-current">
        {state?.plan
          ? t('intents.planChange.currentBased', { plan: state.plan, scope: scope ?? '–' })
          : t('intents.planChange.current', { plan: scope ?? '–' })}
      </p>
      <p data-testid="plan-change-done">{t('intents.planChange.done', { n: done.length, list: done.map((s) => stageTitle(s.slug)).join(', ') })}</p>
      <fieldset className="config-where">
        <legend className="field-label">{t('intents.planChange.way')}</legend>
        {WAYS.map((w) => (
          <label key={w} className="check">
            <input
              type="radio"
              name={`${id}-way`}
              checked={way === w}
              onChange={() => {
                setWay(w);
                setProblem(null);
              }}
              data-testid={`plan-change-way-${w}`}
            />
            {t(`intents.planChange.${w}`)}
          </label>
        ))}
      </fieldset>
      {way === 'ready' ? (
        <>
          <PlanChoice read={read} choices={choices} plan={plan} chosen={chosen} onChoose={choose} />
          {stages && <Preview change={planChange(pipeline, stages, { projectType: state?.projectType })} />}
        </>
      ) : (
        <>
          <label className="field">
            <span className="field-label">{t('intents.planChange.description')}</span>
            {/* A textarea: pasted line breaks become spaces instead of vanishing (as Archive's reason). */}
            <textarea
              className="lcars-input"
              rows={3}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setProblem(null);
              }}
              aria-invalid={problem !== null}
              aria-describedby={`${id}-hint`}
              data-testid="plan-change-description"
            />
          </label>
          <span className="muted" id={`${id}-hint`} data-testid="plan-change-hint">
            {t('intents.planChange.descriptionHint')}
          </span>
        </>
      )}
      <p className="muted" data-testid="plan-change-note">
        {t(`intents.planChange.${way}Note`)}
      </p>
      {blocked && (
        <p className="banner banner-warn" role="status" id={`${id}-blocked`} data-testid="plan-change-blocked">
          {blocked}
        </p>
      )}
      {problem !== null && problem !== blocked && (
        <p className="lcars-dlg-error" role="alert" data-testid="plan-change-error">
          {problem}
        </p>
      )}
      <div className="setup-actions">
        {/* aria-disabled, so it keeps focus and its reason (US-0414 FR2.4) */}
        <Pill
          tone="primary"
          aria-disabled={!!blocked || (way === 'ready' && !stages)}
          aria-describedby={blocked ? `${id}-blocked` : undefined}
          onClick={confirm}
          data-testid="plan-change-confirm"
        >
          {t('intents.planChange.confirm')}
        </Pill>
        <Pill tone="quiet" onClick={onCancel} data-testid="plan-change-cancel">
          {t('common.cancel')}
        </Pill>
      </div>
    </div>
  );
}

/**
 * ponytail: `activeSpace` is AI-DLC's active space as it was when the project was opened, as for Archive; a line typed in
 * the wrong space is still unsent, and AI-DLC names the intent it works on.
 * @param {{projectId: string, intent: object, detail: {state: object|null, pipeline: object, stale?: boolean}, space: string,
 *          activeSpace?: string|null, activeIntent?: object|null}} props activeIntent is the project's active intent
 */
export default function PlanChange({ projectId, intent, detail, space, activeSpace, activeIntent = null }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const [open, setOpen] = useState(null); // null: never opened
  const send = useRef(null); // the confirmed line, until the dialog has closed
  const ref = useRef(null);

  // The dialog's own effect runs first and gives focus back to the control; then the line takes it to the agent tab (FR5.2).
  useEffect(() => {
    if (open || !send.current) return;
    const type = send.current;
    send.current = null;
    type();
  }, [open]);

  const gone = goneReason(intent, detail);
  if (!terminal || (gone && open === null)) return null; // once opened it stays, so closing can give focus back

  /** Why the line cannot be typed now, or null. Asked at each render, and again when the line is typed (FR1.6). */
  function reasonNow() {
    if (gone) return t(`intents.planChange.${gone}`); // FR2.9
    if (activeSpace && activeSpace !== space) return t('intents.planChange.otherSpace', { space, active: activeSpace });
    const missing = missingCommandReason(terminal);
    if (missing) return missing;
    if (intent.parked) return t('intents.planChange.parked');
    const worked = intent.active ? intent : activeIntent;
    const block = workBlockOf(terminal, worked);
    // FR1.3: the person's own open, idle session is where the line goes. Another intent's switch waits for it (FR1.4).
    return block === 'running' && intent.active ? null : blockReason(terminal, block, worked);
  }
  const unavailable = reasonNow();

  /** Closes the dialog and types the line unsent, after the switch when the intent is not active (FR3); or says why not. */
  function confirm(suffix) {
    const reason = reasonNow() ?? (intent.active ? null : unsafeNameReason(intent.dirName));
    if (reason) return reason;
    const command = harnessCommand(terminal.harness);
    const line = { text: `${command} ${suffix}`, submit: false };
    send.current = () =>
      intent.active
        ? terminal.type('agent', line.text, { submit: false })
        : terminal.sequence('agent', [{ text: `${command} intent ${intent.dirName}`, submit: true }, line]);
    setOpen(false);
    return null;
  }

  return (
    <div className="intent-park" ref={ref}>
      {!gone && (
        <Tooltip text={unavailable}>
          <Pill tone="quiet" aria-disabled={!!unavailable} onClick={() => !unavailable && setOpen(true)} data-testid="plan-change-open">
            {t('intents.planChange.open')}
          </Pill>
        </Tooltip>
      )}
      <LcarsDialog
        open={open === true}
        onClose={() => setOpen(false)}
        title={t('intents.planChange.title')}
        testId="plan-change-dialog"
        className="plan-change-dialog"
        fallbackFocus={() => intentListNear(ref.current)}
      >
        <PlanChangeForm
          projectId={projectId}
          intent={intent}
          detail={detail}
          harness={terminal.harness?.id ?? null}
          blocked={unavailable}
          onConfirm={confirm}
          onCancel={() => setOpen(false)}
        />
      </LcarsDialog>
    </div>
  );
}
