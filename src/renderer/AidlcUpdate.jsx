// The AI-DLC rows in Settings › Tools (EPIC-05 US-0504): the program on this machine and the files in the active
// project. The app only checks; an update is typed into the shell tab without Enter (FR1.3, FR2.3).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkflowRunning } from './workflowBusy.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function programStatus(t, program) {
  if (!program) return t('settings.tools.checking');
  if (program.status === 'newer') return program.latest ? t('aidlcUpdate.newer', { version: program.latest }) : t('aidlcUpdate.newerUnknown');
  if (program.status === 'current') return t('aidlcUpdate.upToDate');
  return program.reason;
}

function UpdateButton({ label, disabled, onClick, testId }) {
  return (
    <button type="button" className="btn btn-accent" disabled={disabled} onClick={onClick} data-testid={testId}>
      {label}
    </button>
  );
}

/** One harness: its counts or "Up to date", the files that unfold, conflicts as warnings, and its command (FR2). */
function PlanLine({ plan, disabled, onType }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const upToDate = !plan.error && plan.files.length === 0 && plan.conflicts.length === 0;
  const c = plan.counts ?? {};
  return (
    <li className="aidlc-update-plan" data-testid={`aidlc-update-plan-${plan.harness}`}>
      <span className="field-label">{plan.label}</span>
      {plan.error ? (
        <span className="muted">{plan.error}</span>
      ) : (
        <span data-testid="aidlc-update-plan-counts">
          {upToDate
            ? t('aidlcUpdate.upToDate')
            : t('aidlcUpdate.counts', { create: c.create ?? 0, update: c.update ?? 0, merge: c.merge ?? 0, remove: c.remove ?? 0 })}
        </span>
      )}
      {plan.conflicts?.map((p) => (
        <p key={p} className="refresh-error" role="alert">
          {t('aidlcUpdate.conflict', { path: p })}
        </p>
      ))}
      {plan.files?.length > 0 && (
        <button type="button" className="btn btn-quiet" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="aidlc-update-plan-files">
          {open ? t('common.hide') : t('aidlcUpdate.showFiles', { n: plan.files.length })}
        </button>
      )}
      {open && (
        <ul className="refresh-list">
          {plan.files.map((f) => (
            <li key={f.path}>
              <code>{f.path}</code> <span className="muted">{f.action}</span>
            </li>
          ))}
        </ul>
      )}
      {!upToDate && !plan.error && (
        <UpdateButton label={t('aidlcUpdate.updateProject')} disabled={disabled} onClick={() => onType(plan.command)} testId="aidlc-update-plan-update" />
      )}
    </li>
  );
}

/**
 * US-0504 FR1–FR5: the program row (version, newer or up to date, Update AI-DLC) and, for an active project, one line per
 * installed harness. `terminal` is the active project's terminal ({type, anyBusy}) or null with no project open.
 * @param {{projectId: string|null, terminal: object|null, lastIntentChangeAt: number|null}} props
 */
export default function AidlcUpdate({ projectId = null, terminal = null, lastIntentChangeAt = null }) {
  const { t } = useTranslation();
  const [program, setProgram] = useState(null);
  const [plans, setPlans] = useState(null);
  const [plansError, setPlansError] = useState(null);
  const [checking, setChecking] = useState(false);
  const working = useWorkflowRunning(terminal, lastIntentChangeAt); // FR4: the refresh panel's rule
  const disabled = working || !terminal;

  // FR3: the start-up program check and the project dry runs on open; `force` (the button) runs both again.
  const check = useCallback(
    async (force) => {
      setChecking(true);
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
      setChecking(false);
    },
    [projectId, t]
  );
  useEffect(() => {
    check(false);
  }, [check]);

  const type = (cmd) => terminal?.type('shell', cmd, { submit: false });
  const wait = working && (
    <p className="refresh-wait" role="status">
      {t('github.wait')}
    </p>
  );

  return (
    <div className="settings-tool-grid aidlc-update">
      <div className="lcars-card settings-tool" data-testid="aidlc-update-program">
        <div className="lcars-card-head">
          <h3 className="settings-tool-name">{t('aidlcUpdate.programTitle')}</h3>
        </div>
        <div className="lcars-card-body">
          <span className="settings-tool-field">
            <span className="field-label">{t('settings.tools.versionLabel')}</span>
            <span>{program ? (program.version ?? '–') : t('settings.tools.checking')}</span>
          </span>
          <span data-testid="aidlc-update-program-status">{programStatus(t, program)}</span>
          {!terminal && <p className="muted">{t('aidlcUpdate.needsProject')}</p>}
          {wait}
        </div>
        <div className="lcars-card-foot">
          <button type="button" className="btn" disabled={checking} onClick={() => check(true)} data-testid="aidlc-update-check">
            {checking ? t('settings.tools.checking') : t('aidlcUpdate.check')}
          </button>
          <UpdateButton
            label={t('aidlcUpdate.updateProgram')}
            disabled={disabled}
            onClick={() => type(program?.command)}
            testId="aidlc-update-program-update"
          />
        </div>
      </div>
      {projectId && (
        <div className="lcars-card settings-tool" data-testid="aidlc-update-project">
          <div className="lcars-card-head">
            <h3 className="settings-tool-name">{t('aidlcUpdate.projectTitle')}</h3>
          </div>
          <div className="lcars-card-body">
            {plansError && <p className="refresh-error">{plansError}</p>}
            {!plans && !plansError && <span>{t('settings.tools.checking')}</span>}
            {plans?.length === 0 && <span className="muted">{t('aidlcUpdate.noHarness')}</span>}
            {plans?.length > 0 && (
              <ul className="refresh-list">
                {plans.map((plan) => (
                  <PlanLine key={plan.harness} plan={plan} disabled={disabled} onType={type} />
                ))}
              </ul>
            )}
            {wait}
          </div>
        </div>
      )}
    </div>
  );
}
