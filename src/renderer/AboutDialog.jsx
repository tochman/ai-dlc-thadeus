// "Om T.H.A.D.E.U.S." from the app menu (macOS) or Hjälp (Linux) (EPIC-04 US-0408), in the shared LCARS dialog frame
// of US-0417 (LcarsDialog): the brand corner, the title on its bar with Close as the last pill, readout blocks in the
// arm made from the app's own version and platform (NFR3), the mark with the name, full name and tagline, readout rows
// for version and platform, and a Licences pill that opens the bundled third-party licence list (US-1101 FR6.2).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuctumMark from './AuctumMark.jsx';
import LcarsDialog from './LcarsDialog.jsx';
import { Pill } from './Lcars.jsx';
import { APP_FULL_NAME, APP_NAME, APP_REPO, APP_TAGLINE, APP_VENDOR } from '../shared/appName.js';

const OS = { darwin: 'macOS', linux: 'Linux', win32: 'Windows' };

/** The arm's code readouts, from the app's own version and platform ("00-02", "04", "DAR", "000204"). */
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
  const os = OS[platform] ?? platform ?? '–';
  const shown = `v${version ?? '–'}`;
  const readouts = [
    { k: t('aboutDialog.version'), v: codes[0] },
    { k: t('aboutDialog.patch'), v: codes[1] },
    { k: t('aboutDialog.platform'), v: codes[2], key: true },
    { k: t('aboutDialog.build'), v: codes[3] }
  ];

  return (
    <LcarsDialog
      open={open}
      onClose={onClose}
      title={t('aboutDialog.title')}
      sub={`${shown} · ${os}`}
      readouts={readouts}
      footer={`${APP_VENDOR} · ${APP_REPO}`}
      testId="about-dialog"
      className="about-dialog"
    >
      <div className="about-head lcars-e-rise">
        <AuctumMark size={96} className="about-mark" />
        <div>
          <p className="about-name">{APP_NAME}</p>
          <p className="about-full" data-testid="about-dialog-fullname">
            {APP_FULL_NAME}
          </p>
          <p className="about-tag" data-testid="about-dialog-tagline">
            {APP_TAGLINE}
          </p>
        </div>
      </div>
      <dl className="lcars-kv lcars-e-rise">
        <dt>{t('aboutDialog.version')}</dt>
        <dd className="is-key" data-testid="about-dialog-version">
          {shown}
        </dd>
        <dt>{t('aboutDialog.platform')}</dt>
        <dd data-testid="about-dialog-platform">{os}</dd>
        <dt>{t('aboutDialog.madeBy')}</dt>
        <dd>{APP_VENDOR}</dd>
        <dt>{t('aboutDialog.repository')}</dt>
        <dd className="is-mono">{APP_REPO}</dd>
      </dl>
      <div className="lcars-pills">
        <Pill tone="quiet" onClick={openLicenses} data-testid="about-dialog-licenses">
          {t('aboutDialog.licenses')}
        </Pill>
      </div>
      {licensesError && (
        <p className="lcars-dlg-error" role="alert" data-testid="about-dialog-licenses-error">
          {t('aboutDialog.licensesFailed', { error: licensesError })}
        </p>
      )}
    </LcarsDialog>
  );
}
