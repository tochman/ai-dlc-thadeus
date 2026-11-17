// The model profile question and its result (US-0210 US1.2, US1.3): a native LCARS <dialog> like DocsDialog, never
// window.confirm (NFR4). Asks "Switch to the critical profile?" (FR2.1) or before switching back (FR1.4); a switch back
// without asking runs at once. Shows every command with its output or error (FR4.2, FR4.3, FR5.2).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * @param {{ask: {kind: 'critical'|'back', intent: string|null, confirm: boolean}|null,
 *          answer: (yes: boolean) => Promise<{ok: boolean, results: object[], error?: string, active?: string}>,
 *          onClose: () => void}} props
 */
export default function ProfileSwitchDialog({ ask, answer, onClose }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  async function reply(yes) {
    setRunning(true);
    try {
      const res = await answer(yes);
      if (!yes) return onClose();
      setResult(res);
    } catch (err) {
      setResult({ ok: false, results: [], error: String(err?.message ?? err) });
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    setResult(null);
    const d = ref.current;
    if (d && ask && !d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    if (d && !ask && d.open) d.close ? d.close() : d.removeAttribute('open');
    if (ask && !ask.confirm) reply(true); // FR3.1: "Ask before switching back" is off
  }, [ask]);

  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      aria-labelledby="profile-switch-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!running) onClose();
      }}
      data-testid="profile-switch-dialog"
    >
      {ask && (
        <div>
          <h2 id="profile-switch-title">{t('settings.project.sections.modelProfiles')}</h2>
          {ask.confirm && (
            <p data-testid="profile-switch-question">{t(`modelProfiles.ask.${ask.kind === 'back' ? 'back' : 'critical'}`, { intent: ask.intent ?? '' })}</p>
          )}
          {running && (
            <p className="muted" role="status">
              {t('modelProfiles.running')}
            </p>
          )}
          {result && (
            <div data-testid="profile-switch-results">
              {result.results.length > 0 && <p className="field-label">{t('modelProfiles.results')}</p>}
              {result.results.map((r, i) => (
                <div key={i}>
                  <code>{r.command}</code>
                  <pre className={r.ok ? undefined : 'refresh-error'}>{r.ok ? r.output : r.error}</pre>
                </div>
              ))}
              {result.ok ? (
                <p role="status">{t('modelProfiles.done', { profile: t(`modelProfiles.profile.${result.active ?? 'none'}`) })}</p>
              ) : (
                <p className="refresh-error" role="alert">
                  {result.error ?? t('modelProfiles.failed')}
                </p>
              )}
            </div>
          )}
          <div className="setup-actions">
            {ask.confirm && !result && (
              <>
                <button type="button" className="btn btn-accent" disabled={running} onClick={() => reply(true)} data-testid="profile-switch-yes">
                  {t('modelProfiles.yes')}
                </button>
                <button type="button" className="btn" disabled={running} onClick={() => reply(false)} data-testid="profile-switch-no">
                  {t('modelProfiles.no')}
                </button>
              </>
            )}
            {result && (
              <button type="button" className="btn" onClick={onClose} data-testid="profile-switch-close">
                {t('common.close')}
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
