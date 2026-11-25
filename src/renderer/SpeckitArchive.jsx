// US-1411 FR1, FR2.1, FR2.2, FR6: Archive or Unarchive in a Spec Kit feature's detail. Archive asks first and is
// unavailable, with its reason, for the active feature; Unarchive runs at once. Main checks the feature again (FR1.4).
// Not US-0513's ArchiveDialog: there is no reason, progress or commit here. The wording they share is intents.archive.*.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LcarsDialog from './LcarsDialog.jsx';
import { Pill } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * @param {{projectId: string, feature: object, onChanged: () => Promise<void>, getList: () => HTMLElement|null}} props
 *   onChanged: reads the features again; getList: where focus goes when the control that had it is gone (FR6.2)
 */
export default function SpeckitArchive({ projectId, feature, onChanged, getList }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // in the dialog while it is open, else beside the pill
  const unarchived = useRef(false); // the person's own unarchive: its pill goes
  const { archived, tasks } = feature;
  const openTasks = tasks.total - tasks.done;
  const unavailable = feature.active ? t('speckit.archive.active') : null;

  useEffect(() => {
    if (archived || !unarchived.current) return;
    unarchived.current = false;
    if (document.activeElement === document.body) getList()?.focus(); // not when the person has moved on meanwhile
  }, [archived, getList]);

  /** Sends one call; the features are read again before it counts as done. Resolves true when main did it. */
  async function send(call) {
    setBusy(true);
    setError(null);
    try {
      const res = await call(projectId, feature.dir);
      if (res?.ok) await onChanged();
      else setError(res?.error ?? '');
      return res?.ok === true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function ask() {
    if (unavailable) return; // aria-disabled, so it keeps focus and its tooltip (US-0414 FR2.4)
    setError(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    if (!busy) setError(null);
  }

  async function archive() {
    if (busy) return;
    // Closed after the read: the Archive pill is gone by then, so the dialog gives focus to the list (FR6.2).
    if (await send(window.bridge.archiveSpeckitFeature)) setOpen(false);
  }

  async function unarchive() {
    if (busy) return;
    unarchived.current = true;
    if (!(await send(window.bridge.unarchiveSpeckitFeature))) unarchived.current = false;
  }

  const problem = error !== null && (
    <p className={open ? 'lcars-dlg-error' : 'refresh-error'} role="alert" data-testid="speckit-archive-error">
      {error}
    </p>
  );

  return (
    <div className="intent-park">
      {/* Different keys: once archived, the control that opened the dialog is really gone. */}
      {archived ? (
        <Pill key="unarchive" tone="quiet" aria-disabled={busy} onClick={unarchive} data-testid="speckit-archive-remove">
          {t('intents.archive.unarchive')}
        </Pill>
      ) : (
        <Tooltip key="archive" text={unavailable}>
          <Pill tone="quiet" aria-disabled={!!unavailable} onClick={ask} data-testid="speckit-archive-open">
            {t('intents.archive.open')}
          </Pill>
        </Tooltip>
      )}
      {!open && problem}
      <LcarsDialog
        open={open}
        onClose={close}
        title={t('speckit.archive.title')}
        testId="speckit-archive-dialog"
        className="archive-dialog"
        fallbackFocus={getList}
      >
        <div className="archive-form">
          <p className="speckit-archive-name" data-testid="speckit-archive-name">
            {feature.number ? `${feature.number} · ${feature.name}` : feature.name}
          </p>
          <p>{t('speckit.archive.hidden')}</p>
          {openTasks > 0 && (
            <p className="banner banner-warn" data-testid="speckit-archive-warning">
              {t('speckit.archive.openTasks', { n: openTasks })}
            </p>
          )}
          {problem}
          <div className="setup-actions">
            <Pill tone="primary" aria-disabled={busy} onClick={archive} data-testid="speckit-archive-confirm">
              {t('intents.archive.open')}
            </Pill>
            <Pill tone="quiet" onClick={close} data-testid="speckit-archive-cancel">
              {t('common.cancel')}
            </Pill>
          </div>
        </div>
      </LcarsDialog>
    </div>
  );
}
