// "Om T.H.A.D.E.U.S." from the app menu (macOS) or Hjälp (Linux) (EPIC-04 US-0408): the splash screen's mark
// and name plus the running version, the same value as the Om section in Inställningar (US-0405).
// A native modal <dialog>; closes on Esc, Stäng or a click on the backdrop, and gives focus back.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuctumMark from './AuctumMark.jsx';
import { APP_FULL_NAME, APP_NAME, APP_TAGLINE } from '../shared/appName.js';

/** @param {{open: boolean, onClose: () => void}} props */
export default function AboutDialog({ open, onClose }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const returnFocus = useRef(null);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnFocus.current = document.activeElement;
      d.showModal ? d.showModal() : d.setAttribute('open', '');
    }
    if (!open && d.open) {
      d.close ? d.close() : d.removeAttribute('open');
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setVersion(null);
    window.bridge
      .getAppInfo()
      .then((info) => live && setVersion(info?.version ?? null))
      .catch((err) => console.warn('Appversionen kunde inte läsas:', err?.message ?? err)); // shown as "–"
    return () => {
      live = false;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="settings-dialog about-dialog"
      aria-labelledby="about-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      // The content div fills the dialog, so a click on the dialog element itself is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="about-dialog"
    >
      {open && (
        <div className="about-dialog-body">
          <h2 id="about-dialog-title" className="sr-only">
            {t('menu.about', { app: APP_NAME })}
          </h2>
          <AuctumMark size={160} className="splash-mark" />
          <div className="splash-name">
            <span className="splash-name-main">{APP_NAME}</span>
            <span className="splash-name-sub">{APP_FULL_NAME}</span>
            <span className="splash-name-tagline">{APP_TAGLINE}</span>
          </div>
          <p className="about-dialog-version" data-testid="about-dialog-version">
            {t('settings.about.version', { version: version ?? '–' })}
          </p>
          <div className="setup-actions">
            <button type="button" className="btn" onClick={onClose} data-testid="about-dialog-close">
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
