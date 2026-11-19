// The update notice (EPIC-04 US-0407): a calm LCARS notice, not a modal. Main checks GitHub through `gh`, at most
// once a day on start and whenever the menu asks; this shows the offer, the download progress and the outcome.
// No URL, file or version to download ever leaves the renderer: main keeps the offered release itself (NFR3).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileContent } from './ArtifactReader.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const percent = (p) => (p?.total > 0 ? Math.min(100, Math.round((p.received / p.total) * 100)) : null);

/**
 * @param {{busy: boolean, checkRequest?: number}} props
 *   busy: an agent tab in any project is "Arbetar", so a restart asks first; checkRequest: bumped by the menu's
 *   "Sök efter uppdatering…", which checks now and also reports "no update" and why a check could not run
 */
export default function UpdateNotice({ busy, checkRequest = 0 }) {
  const { t } = useTranslation();
  const bridge = window.bridge;
  const [offer, setOffer] = useState(null); // the available update {version, tag, notes, asset}
  const [phase, setPhase] = useState('hidden'); // hidden | offer | downloading | installing | password | installed | error | message
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState(null);
  const [failed, setFailed] = useState(null); // {error, file, manual}
  const [kept, setKept] = useState(null);
  // US-0034: when pkexec cannot ask on Linux, the notice asks; the password lives only here until sent, then is cleared.
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const [pending, setPending] = useState(null); // the .deb waiting for the password
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  function show(state, { forced = false } = {}) {
    if (state?.status === 'available') {
      setOffer(state);
      setPhase((p) => (p === 'hidden' || p === 'message' ? 'offer' : p));
    } else if (forced) {
      setMessage(state?.status === 'unavailable' ? state.reason : t('update.upToDate'));
      setPhase('message');
    }
  }

  // The start-up check (main limits it to once a day) and main's own pushes: an offer and download progress.
  useEffect(() => {
    bridge
      .checkUpdate?.({ force: false })
      .then((state) => show(state))
      .catch((err) => console.warn('Uppdateringskontrollen misslyckades:', errorText(err)));
    return bridge.onUpdateState?.((state) => {
      if (state?.status === 'downloading') setProgress(state);
      else if (phaseRef.current === 'hidden') show(state);
    });
  }, []);

  useEffect(() => {
    if (!checkRequest) return;
    bridge
      .checkUpdate({ force: true })
      .then((state) => show(state, { forced: true }))
      .catch((err) => show({ status: 'unavailable', reason: errorText(err) }, { forced: true }));
  }, [checkRequest]);

  async function update() {
    // A restart ends the terminal sessions, so a working agent tab is asked about first.
    if (busy && !window.confirm(t('update.confirmRestart'))) return;
    setFailed(null);
    setPhase('downloading');
    setProgress(null);
    try {
      const got = await bridge.downloadUpdate();
      if (got.status !== 'downloaded') throw Object.assign(new Error(got.error), { file: null });
      setPhase('installing');
      await finishInstall(await bridge.installUpdate());
    } catch (err) {
      setFailed({ error: errorText(err), file: err.file ?? null, manual: err.manual ?? null });
      setPhase('error');
    }
  }

  async function finishInstall(done) {
    if (done.status === 'needs-password') {
      setPending(done.file);
      setWrongPassword(done.wrong === true);
      setPhase('password');
      return;
    }
    if (done.status !== 'installed') throw Object.assign(new Error(done.error), { file: done.file, manual: done.manual });
    if (done.kept) {
      setKept(done.kept); // cleanup is off: the path stays visible until the restart
      setPhase('installed');
      return;
    }
    await bridge.relaunchApp();
  }

  async function sendPassword(event) {
    event.preventDefault();
    const typed = password;
    setPassword('');
    setPhase('installing');
    try {
      await finishInstall(await bridge.installUpdate({ password: typed }));
    } catch (err) {
      setFailed({ error: errorText(err), file: err.file ?? null, manual: err.manual ?? null });
      setPhase('error');
    }
  }

  function cancelPassword() {
    setPassword('');
    setFailed({ error: null, file: pending, manual: `sudo apt install ${pending}` });
    setPhase('error');
  }

  async function skip() {
    try {
      await bridge.skipUpdate(offer.version);
      setPhase('hidden');
    } catch (err) {
      setFailed({ error: errorText(err), file: null });
      setPhase('error');
    }
  }

  if (phase === 'hidden') return null;
  const pct = percent(progress);
  const reveal = bridge.platform === 'darwin' ? t('common.revealFinder') : t('common.revealFiles');
  return (
    <aside className="panel update-notice" role="status" aria-live="polite" data-testid="update-notice">
      {phase === 'message' ? (
        <p data-testid="update-notice-message">{message}</p>
      ) : (
        <>
          <h2>{t('update.title', { version: offer?.version ?? '' })}</h2>
          {phase === 'offer' && (
            <>
              {offer?.notes ? (
                <div className="update-notice-notes" data-testid="update-notice-notes">
                  <FileContent rel="release-notes.md" content={offer.notes} />
                </div>
              ) : (
                <p className="muted">{t('update.noNotes')}</p>
              )}
              {!offer?.asset && <p className="refresh-error">{t('update.noPackage')}</p>}
            </>
          )}
          {phase === 'downloading' && <p data-testid="update-notice-progress">{pct == null ? t('update.downloading') : t('update.downloadingPct', { pct })}</p>}
          {phase === 'installing' && <p>{t('update.installing')}</p>}
          {phase === 'installed' && (
            <p data-testid="update-notice-kept">
              {t('update.kept')} <code>{kept}</code>
            </p>
          )}
          {phase === 'password' && (
            <form id="update-notice-password-form" onSubmit={sendPassword} data-testid="update-notice-password">
              <p>{t('update.passwordPrompt')}</p>
              {wrongPassword && (
                <p className="refresh-error" role="alert" data-testid="update-notice-wrong-password">
                  {t('update.wrongPassword')}
                </p>
              )}
              <label>
                {t('update.password')}{' '}
                <input
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="update-notice-password-input"
                />
              </label>
            </form>
          )}
          {phase === 'error' && failed?.error && (
            <p className="refresh-error" role="alert" data-testid="update-notice-error">
              {failed.error}
            </p>
          )}
          {phase === 'error' && failed?.manual && (
            <p data-testid="update-notice-manual">
              {t('update.manual')} <code>{failed.manual}</code>
            </p>
          )}
        </>
      )}
      <div className="setup-actions">
        {phase === 'offer' && (
          <>
            <button className="btn btn-accent" disabled={!offer?.asset} onClick={update} data-testid="update-notice-update">
              {t('update.now')}
            </button>
            <button className="btn" onClick={() => setPhase('hidden')} data-testid="update-notice-later">
              {t('update.later')}
            </button>
            <button className="btn btn-quiet" onClick={skip} data-testid="update-notice-skip">
              {t('update.skip')}
            </button>
          </>
        )}
        {phase === 'password' && (
          <>
            <button type="submit" form="update-notice-password-form" className="btn btn-accent" disabled={!password} data-testid="update-notice-install">
              {t('update.install')}
            </button>
            <button className="btn" onClick={cancelPassword} data-testid="update-notice-password-cancel">
              {t('common.cancel')}
            </button>
          </>
        )}
        {phase === 'installed' && (
          <button className="btn btn-accent" onClick={() => bridge.relaunchApp()} data-testid="update-notice-relaunch">
            {t('update.relaunch')}
          </button>
        )}
        {phase === 'error' && failed?.file && (
          <button
            className="btn"
            onClick={() => bridge.revealUpdate().catch((err) => setFailed({ error: errorText(err), file: null }))}
            data-testid="update-notice-reveal"
          >
            {reveal}
          </button>
        )}
        {(phase === 'error' || phase === 'message') && (
          <button className="btn" onClick={() => setPhase('hidden')} data-testid="update-notice-close">
            {t('common.close')}
          </button>
        )}
      </div>
    </aside>
  );
}
