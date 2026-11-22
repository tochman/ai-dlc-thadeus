// The AI-DLC group in Settings › Tools (EPIC-05 US-0504, grouped by EPIC-04 US-0416): the CLI and its update as one
// row, and one row per harness for the files in the active project. The app only checks; an update is typed into the
// shell tab without Enter (FR1.3, FR2.3).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill } from './Lcars.jsx';
import { ToolGroup, ToolLine, ToolRow, groupStrip, toolState } from './ToolRows.jsx';
import { useWorkflowRunning, waitText } from './workflowBusy.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function programStatus(t, program) {
  if (program.status === 'newer') return program.latest ? t('aidlcUpdate.newer', { version: program.latest }) : t('aidlcUpdate.newerUnknown');
  if (program.status === 'current') return t('aidlcUpdate.upToDate');
  return program.reason;
}

/** A harness's state: a conflict stands out as missing does, changed files as newer, an error stays quiet. */
function planState(plan) {
  if (plan.error) return 'quiet';
  if (plan.conflicts?.length > 0) return 'missing';
  return plan.files?.length > 0 ? 'newer' : 'found';
}

/** One harness: its counts or "Up to date", its files folded to a count (US-0416 AC4), conflicts as warnings, its command (FR2). */
function PlanRow({ plan: given, disabled, onType }) {
  const { t } = useTranslation();
  const plan = { files: [], conflicts: [], ...given }; // a harness whose dry run failed carries only its error
  const [open, setOpen] = useState(false);
  const state = planState(plan);
  const c = plan.counts ?? {};
  const counts = plan.error ? (
    <span className="muted">{plan.error}</span>
  ) : (
    <span data-testid="aidlc-update-plan-counts">
      {state === 'found'
        ? t('aidlcUpdate.upToDate')
        : t('aidlcUpdate.counts', { create: c.create ?? 0, update: c.update ?? 0, merge: c.merge ?? 0, remove: c.remove ?? 0 })}
    </span>
  );
  const chip =
    state === 'quiet'
      ? t('aidlcUpdate.unknown')
      : state === 'found'
        ? t('aidlcUpdate.upToDate')
        : t('aidlcUpdate.filesDiffer', { n: plan.files.length + plan.conflicts.length });
  return (
    <ToolRow
      testId={`aidlc-update-plan-${plan.harness}`}
      state={state}
      name={t('aidlcUpdate.projectTitle')}
      version={plan.label}
      empty={counts}
      chip={chip}
      actions={
        state !== 'found' &&
        !plan.error && (
          <Pill onClick={() => onType(plan.command)} disabled={disabled} data-testid="aidlc-update-plan-update">
            {t('aidlcUpdate.updateProject')}
          </Pill>
        )
      }
    >
      {plan.conflicts.map((p) => (
        <p key={p} className="refresh-error tool-row-note" role="alert">
          {t('aidlcUpdate.conflict', { path: p })}
        </p>
      ))}
      {plan.files.length > 0 && (
        <button type="button" className="tool-row-fold" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="aidlc-update-plan-files">
          {open ? t('common.hide') : t('aidlcUpdate.showFiles', { n: plan.files.length })}
        </button>
      )}
      {open && (
        <ul className="tool-row-files">
          {plan.files.map((f) => (
            <li key={f.path}>
              <code>{f.path}</code> <span className="muted">{f.action}</span>
            </li>
          ))}
        </ul>
      )}
    </ToolRow>
  );
}

/**
 * US-0504 FR1–FR5, US-0416 AC1: the AI-DLC group. `tool` is the scanned `aidlc` row (path, source, version), with
 * `onChoose`/`onReset`/`error` as for every tool; without it the row shows the version the update check read.
 * `terminal` is the active project's terminal ({type, anyBusy}) or null with no project open. `lastIntentChangeAt` is
 * useProject's in-flight intent `{name, stage, at}`, null when none (US-0041). Each new `checkRequest` (the view's
 * "Check for updates" pill) checks again with force.
 * @param {{projectId: string|null, terminal: object|null, lastIntentChangeAt: {name: string, stage: string|null, at: number|null}|null,
 *          tool?: object|null, error?: string|null, onChoose?: (id: string) => void, onReset?: (id: string) => void, checkRequest?: number}} props
 */
export default function AidlcUpdate({
  projectId = null,
  terminal = null,
  lastIntentChangeAt = null,
  tool = null,
  error = null,
  onChoose,
  onReset,
  checkRequest = 0
}) {
  const { t } = useTranslation();
  const [program, setProgram] = useState(null);
  const [plans, setPlans] = useState(null);
  const [plansError, setPlansError] = useState(null);
  const working = useWorkflowRunning(terminal, lastIntentChangeAt); // FR4: the refresh panel's rule
  const disabled = working || !terminal;

  // FR3: the start-up program check and the project dry runs on open; `force` runs both again.
  const check = useCallback(
    async (force) => {
      setPlansError(null);
      // Through Promise.resolve, so even a failing bridge ends as a reason on the row, never a broken view (FR5).
      const programDone = Promise.resolve()
        .then(() => window.bridge.getAidlcUpdateStatus(force))
        .then(setProgram, (err) => setProgram({ status: 'unavailable', reason: errorText(err) }));
      const plansDone = projectId
        ? Promise.resolve()
            .then(() => window.bridge.getAidlcProjectPlans(projectId))
            .then(setPlans, (err) => setPlansError(t('aidlcUpdate.loadFailed', { error: errorText(err) })))
        : null;
      await Promise.all([programDone, plansDone]);
    },
    [projectId, t]
  );
  useEffect(() => {
    check(false);
  }, [check]);
  useEffect(() => {
    if (checkRequest) check(true);
  }, [checkRequest]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the pill asks, not when the project changes

  const type = (cmd) => terminal?.type('shell', cmd, { submit: false });
  const cli = tool ?? { id: 'aidlc', path: null, source: 'auto', found: program ? true : null, version: program?.version ?? null };
  const base = toolState(cli);
  const newer = program?.status === 'newer';
  const state = base !== 'missing' && newer ? 'newer' : base;
  const chip = state === 'newer' || (state === 'found' && program?.status === 'current') ? programStatus(t, program) : undefined;
  const states = [state, ...(plans ?? []).map(planState)];

  return (
    <ToolGroup id="aidlc" title={t('settings.tools.groups.aidlc')} count={1 + (plans?.length ?? 0)} strip={groupStrip(states)}>
      <ToolLine
        row={cli}
        error={error}
        onChoose={onChoose ?? (() => {})}
        onReset={onReset ?? (() => {})}
        state={state}
        chip={chip}
        before={
          program &&
          program.status !== 'current' && (
            <Pill tone="primary" disabled={disabled} onClick={() => type(program.command)} data-testid="aidlc-update-program-update">
              {t('aidlcUpdate.updateProgram')}
            </Pill>
          )
        }
      >
        {program?.status === 'unavailable' && (
          <p className="muted tool-row-note" data-testid="aidlc-update-program-reason">
            {program.reason}
          </p>
        )}
        {newer && terminal && <p className="tool-row-note">{t('aidlcUpdate.updateDo')}</p>}
        {!terminal && <p className="muted tool-row-note">{t('aidlcUpdate.needsProject')}</p>}
      </ToolLine>
      {projectId && (
        <div data-testid="aidlc-update-project">
          {plansError && <p className="refresh-error tool-row-note">{plansError}</p>}
          {!plans && !plansError && <p className="muted tool-row-note">{t('settings.tools.checking')}</p>}
          {plans?.length === 0 && <p className="muted tool-row-note">{t('aidlcUpdate.noHarness')}</p>}
          {plans?.map((plan) => (
            <PlanRow key={plan.harness} plan={plan} disabled={disabled} onType={type} />
          ))}
        </div>
      )}
      {/* US-0041: the wait notice, once for the group. */}
      {working && (
        <p className="refresh-wait tool-row-note" role="status">
          {waitText(t, lastIntentChangeAt)}
        </p>
      )}
    </ToolGroup>
  );
}
