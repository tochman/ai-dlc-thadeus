// "Om T.H.A.D.E.U.S." from the app menu (macOS) or Hjälp (Linux) (EPIC-04 US-0408), in the LCARS panel design
// of US-0409: a rounded elbow frame (left arm, top and bottom bars) with small code labels, the name top right, the
// full name, tagline and version in light bars with coloured end tabs, an EXIT block in the arm and a status row.
// Layout and colour only follow the person's reference; every text is the app's own (NFR3), the code labels come
// from the version and platform. A native modal <dialog>; closes on Esc, EXIT or a click on the backdrop, and gives
// focus back. A LICENSES block under EXIT opens the bundled third-party licence list (US-1101 FR6.2).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuctumMark from './AuctumMark.jsx';
import { APP_FULL_NAME, APP_NAME, APP_TAGLINE } from '../shared/appName.js';

const OS = { darwin: 'macOS', linux: 'Linux', win32: 'Windows' };

/** The frame's code labels, from the app's own version and platform ("00-02", "04", "DAR", "000204"). */
export function codeLabels(version, platform) {
  const [a = 0, b = 0, c = 0] = String(version ?? '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
  const pad = (n) => String(n).padStart(2, '0');
  const os =
    String(platform ?? '')
      .slice(0, 3)
      .toUpperCase() || '–';
  return [`${pad(a)}-${pad(b)}`, pad(c), os, `${pad(a)}${pad(b)}${pad(c)}`];
}

/** @param {{open: boolean, onClose: () => void}} props */
export default function AboutDialog({ open, onClose }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const returnFocus = useRef(null);
  const [version, setVersion] = useState(null);
  const [licensesError, setLicensesError] = useState(null);
  const platform = window.bridge?.platform ?? null;

  // openPath resolves with its own error text ('' when the viewer opened); an IPC failure rejects.
  const openLicenses = () => {
    setLicensesError(null);
    window.bridge
      .openLicenses()
      .then((err) => err && setLicensesError(err))
      .catch((err) => setLicensesError(err?.message ?? String(err)));
  };

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

  const codes = codeLabels(version, platform);
  const bars = [
    ['slate', APP_FULL_NAME, 'about-dialog-fullname'], // US-0417: amber is the mark and focus only
    ['steel-light', APP_TAGLINE, 'about-dialog-tagline'],
    ['coral-soft', `v${version ?? '–'}`, 'about-dialog-version-bar']
  ];

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
        <div className="about-lcars">
          <h2 id="about-dialog-title" className="sr-only">
            {t('menu.about', { app: APP_NAME })}
          </h2>
          <div className="about-lcars-arm">
            <span className="about-lcars-code" aria-hidden="true">
              {codes[0]}
            </span>
            <span className="about-lcars-code" aria-hidden="true">
              {codes[1]}
            </span>
            <button type="button" className="about-lcars-exit" onClick={onClose} data-testid="about-dialog-close">
              {t('aboutDialog.exit')}
            </button>
            <button type="button" className="about-lcars-exit about-lcars-licenses" onClick={openLicenses} data-testid="about-dialog-licenses">
              {t('aboutDialog.licenses')}
            </button>
            <span className="about-lcars-code" aria-hidden="true">
              {codes[2]}
            </span>
          </div>
          <div className="about-lcars-top" aria-hidden="true">
            <span className="about-lcars-code about-lcars-code--bar">{codes[3]}</span>
          </div>
          <div className="about-lcars-main">
            <p className="about-lcars-title">{APP_NAME}</p>
            <div className="about-lcars-content">
              <AuctumMark size={120} className="splash-mark" />
              <div className="about-lcars-bars">
                {bars.map(([tone, text, testId]) => (
                  <div key={testId} className="about-lcars-row">
                    <div className="about-lcars-bar">
                      <span className="about-lcars-bar-text" data-testid={testId}>
                        {text}
                      </span>
                      <span className={`about-lcars-tab about-lcars-tone--${tone}`} aria-hidden="true" />
                      <span className={`about-lcars-line about-lcars-tone--${tone}`} aria-hidden="true" />
                    </div>
                    <span className="about-lcars-bullet" aria-hidden="true">
                      <span className={`about-lcars-dot about-lcars-tone--${tone}`} />
                      <span className={`about-lcars-hair about-lcars-tone--${tone}`} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {licensesError && (
              <p className="about-lcars-error" role="alert" data-testid="about-dialog-licenses-error">
                {t('aboutDialog.licensesFailed', { error: licensesError })}
              </p>
            )}
          </div>
          <div className="about-lcars-foot" aria-hidden="true" />
          <p className="about-lcars-status">
            <span data-testid="about-dialog-version">{t('settings.about.version', { version: version ?? '–' })}</span>
            <span aria-hidden="true"> · </span>
            <span data-testid="about-dialog-platform">{OS[platform] ?? platform ?? '–'}</span>
          </p>
        </div>
      )}
    </dialog>
  );
}
