// US-0513 FR1.2, FR1.3, FR4.2, FR4.3, FR5: the one confirmation for archiving an intent or several, with the run's
// progress and its result. The run lives in its owner (useArchiveRun), so closing the dialog does not stop it (FR4.4).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LcarsDialog from './LcarsDialog.jsx';
import { Pill } from './Lcars.jsx';
import { checkReason } from '../shared/intentArchive.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const IDLE = { busy: false, intents: [], n: 0, total: 0, result: null, error: null };

/**
 * US-0513 FR4.3, FR4.4: one archive run: `busy` with its progress (`n` of `total`), then `result` (main's answer) or
 * `error`. A single refused intent is an error, so the form stays with its reason. `onDone` is told when a run ended
 * with a result.
 */
export function useArchiveRun(projectId, onDone) {
  const [run, setRun] = useState(IDLE);

  async function start(intents, reason) {
    const dirNames = intents.map((i) => i.dirName);
    setRun({ ...IDLE, busy: true, intents, n: 1, total: dirNames.length });
    const off = window.bridge.onArchiveProgress((p) => p.projectId === projectId && setRun((cur) => ({ ...cur, n: p.n, total: p.total })));
    let end;
    try {
      const res = await window.bridge.archiveIntents(projectId, dirNames, reason);
      const refused = dirNames.length === 1 ? res?.refused?.[0]?.error : undefined;
      end = res?.ok && refused === undefined ? { result: res } : { error: refused ?? res?.error ?? '' };
    } catch (err) {
      end = { error: errorText(err) };
    } finally {
      off();
    }
    setRun({ ...IDLE, intents, ...end });
    if (end.result) onDone?.();
  }

  /** Forgets the last result; a run that goes on is left alone. */
  const reset = () => setRun((cur) => (cur.busy ? cur : IDLE));
  return { ...run, start, reset };
}

/** US-0513 FR5: what became of the commit, for an archive and an unarchive; nothing when there was nothing to commit. */
export function commitText(t, commit) {
  return commit ? t(`intents.archive.commit.${commit.state}`, { reason: commit.reason ?? '' }) : null;
}

/** US-0513 FR4.3, FR5: a run's progress, else its result or error: in the dialog, and in the list once that is closed. */
export function ArchiveOutcome({ run }) {
  const { t } = useTranslation();
  const { busy, result, error } = run;
  const name = (dirName) => run.intents.find((i) => i.dirName === dirName)?.slug ?? dirName;
  const commit = commitText(t, result?.commit);
  return (
    <div className="archive-outcome" role="status" data-testid="archive-outcome">
      {busy && <p data-testid="archive-outcome-progress">{t('intents.archive.progress', { n: run.n, total: run.total })}</p>}
      {error !== null && <p className="refresh-error">{error}</p>}
      {result && (
        <>
          <p data-testid="archive-outcome-done">{t('intents.archive.done', { n: result.archived.length })}</p>
          {result.refused.length > 0 && (
            <>
              <p className="refresh-error">{t('intents.archive.refused', { n: result.refused.length })}</p>
              <ul>
                {result.refused.map((r) => (
                  <li key={r.dirName} data-testid="archive-outcome-refused">{`${name(r.dirName)}: ${r.error}`}</li>
                ))}
              </ul>
            </>
          )}
          {commit && <p data-testid="archive-outcome-commit">{commit}</p>}
        </>
      )}
    </div>
  );
}

/** The question itself; mounted while the dialog is open, so each opening starts with an empty reason. */
function ArchiveForm({ intents, run, onCancel }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState(null);
  const error = problem ?? run.error;

  function confirm() {
    const checked = checkReason(reason);
    if (checked.error) return setProblem(t(`intents.archive.reasonError.${checked.error}`));
    return run.start(intents, checked.reason);
  }

  return (
    <div className="archive-form">
      <ul className="archive-names" data-testid="archive-dialog-names">
        {intents.map((i) => (
          <li key={i.dirName} data-testid="archive-dialog-name">
            {i.slug ?? i.dirName}
          </li>
        ))}
      </ul>
      <p>{t('intents.archive.nothingDeleted', { n: intents.length })}</p>
      {intents.flatMap((i) =>
        [i.status !== 'complete' && 'warnUnfinished', i.active && 'warnActive'].filter(Boolean).map((key) => (
          <p key={`${i.dirName}:${key}`} className="banner banner-warn" data-testid="archive-dialog-warning">
            {t(`intents.archive.${key}`, { name: i.slug ?? i.dirName })}
          </p>
        ))
      )}
      <label className="field">
        <span className="field-label">{t('intents.archive.reason')}</span>
        {/* A textarea: pasted line breaks become spaces instead of vanishing (FR1.3). */}
        <textarea
          className="lcars-input"
          rows={2}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setProblem(null);
          }}
          aria-invalid={problem !== null}
          data-testid="archive-dialog-reason"
        />
      </label>
      <span className="muted">{t('intents.archive.reasonHint')}</span>
      {run.busy && <ArchiveOutcome run={run} />}
      {error !== null && (
        <p className="lcars-dlg-error" role="alert" data-testid="archive-dialog-error">
          {error}
        </p>
      )}
      <div className="setup-actions">
        <Pill tone="primary" disabled={run.busy} onClick={confirm} data-testid="archive-dialog-confirm">
          {t('intents.archive.confirm', { n: intents.length })}
        </Pill>
        <Pill tone="quiet" onClick={onCancel} data-testid="archive-dialog-cancel">
          {run.busy ? t('common.close') : t('common.cancel')}
        </Pill>
      </div>
    </div>
  );
}

/**
 * US-0513 FR1.2, FR4.2, FR7.2: `intents` is the choice when the dialog opened; while a run goes on, or is done, the
 * run's own intents show. The result stays until the dialog is closed. Closing before the start runs nothing.
 * @param {{open: boolean, intents: object[], run: ReturnType<typeof useArchiveRun>, onClose: () => void,
 *          fallbackFocus?: () => HTMLElement|null|undefined}} props
 */
export default function ArchiveDialog({ open, intents, run, onClose, fallbackFocus }) {
  const { t } = useTranslation();
  const shown = run.busy || run.result ? run.intents : intents;
  function close() {
    run.reset();
    onClose();
  }
  return (
    <LcarsDialog
      open={open}
      onClose={close}
      title={t('intents.archive.title', { n: shown.length })}
      testId="archive-dialog"
      className="archive-dialog"
      fallbackFocus={fallbackFocus}
    >
      {run.result ? <ArchiveOutcome run={run} /> : <ArchiveForm intents={shown} run={run} onCancel={close} />}
    </LcarsDialog>
  );
}
