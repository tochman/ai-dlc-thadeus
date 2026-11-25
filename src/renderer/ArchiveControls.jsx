// US-0513 FR1.1, FR1.4, FR2.1, FR2.2: Archive or Unarchive in an intent's detail. Archive asks first (ArchiveDialog) and
// waits, with its reason, while an agent has the active intent; Unarchive runs at once. Main checks both again (FR1.5).
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ArchiveDialog, { ArchiveOutcome, commitText, useArchiveRun } from './ArchiveDialog.jsx';
import { Pill } from './Lcars.jsx';
import { workBlockOf } from './ResumeButton.jsx';
import { useTerminal } from './TerminalContext.jsx';
import Tooltip from './Tooltip.jsx';
import { isInFlight } from './format.js';
import { isArchived } from '../shared/intentArchive.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** US-0513 FR7.2, US-0509: the project's own intent list, or what opens it while it is folded: focus when a control is gone. */
export function intentListNear(el) {
  const body = el?.closest('.project-body');
  return body?.querySelector('.is-folded [data-testid="list-drawer-open"]') ?? body?.querySelector('[data-testid="intent-list-rows"]');
}

/**
 * ponytail: `activeSpace` is AI-DLC's active space as it was when the project was opened; main reads it again and is the
 * one that decides.
 * @param {{projectId: string, intent: object, space: string, activeSpace?: string|null}} props
 */
export default function ArchiveControls({ projectId, intent, space, activeSpace }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const run = useArchiveRun(projectId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false); // an unarchive runs
  const [said, setSaid] = useState(null); // its result: { text } or { error }
  const ref = useRef(null);
  if (intent.missingOnDisk || intent.missingInIndex) return null; // FR1.1
  if (activeSpace && activeSpace !== space) {
    return (
      <p className="muted intent-archive-space" data-testid="intent-archive-space">
        {t('intents.archive.otherSpace', { space, active: activeSpace })}
      </p>
    );
  }

  const block = intent.active && isInFlight(intent.status) ? workBlockOf(terminal, intent) : null;
  const unavailable = block && t(`intents.archive.blocked.${block}`);

  function ask() {
    if (unavailable) return; // aria-disabled, so it keeps focus and its tooltip (US-0414 FR2.4)
    run.reset();
    setSaid(null);
    setOpen(true);
  }

  async function unarchive() {
    setBusy(true);
    setSaid(null);
    try {
      const res = await window.bridge.unarchiveIntent(projectId, intent.dirName);
      setSaid(res?.ok ? { text: [t('intents.archive.unarchived'), commitText(t, res.commit)].filter(Boolean).join(' ') } : { error: res?.error ?? '' });
    } catch (err) {
      setSaid({ error: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="intent-park" ref={ref}>
      {/* Different keys: once archived, the control that opened the dialog is really gone, and focus goes to the list (FR7.2). */}
      {isArchived(intent) ? (
        <Pill key="unarchive" tone="quiet" disabled={busy} onClick={unarchive} data-testid="intent-unarchive">
          {t('intents.archive.unarchive')}
        </Pill>
      ) : (
        <Tooltip key="archive" text={unavailable}>
          <Pill tone="quiet" aria-disabled={!!unavailable} onClick={ask} data-testid="intent-archive">
            {t('intents.archive.open')}
          </Pill>
        </Tooltip>
      )}
      {said?.text && (
        <p className="muted" role="status" data-testid="intent-unarchive-result">
          {said.text}
        </p>
      )}
      {said?.error !== undefined && (
        <p className="refresh-error" role="alert" data-testid="intent-unarchive-error">
          {said.error}
        </p>
      )}
      {!open && (run.busy || run.result !== null || run.error !== null) && <ArchiveOutcome run={run} />} {/* FR1.5: closed while it ran */}
      <ArchiveDialog open={open} intents={[intent]} run={run} onClose={() => setOpen(false)} fallbackFocus={() => intentListNear(ref.current)} />
    </div>
  );
}
