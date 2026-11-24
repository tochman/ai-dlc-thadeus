// The updater's face (EPIC-04 US-0407, in the US-0417 look). Main checks GitHub through `gh`, at most once a day on
// start and whenever the menu asks; this shows the offer, the download, the Linux password (EPIC-00 US-0034) and the
// outcome. US-0417: one LCARS Update dialog (LcarsDialog) with the states checking, up to date, available,
// downloading, password, ready to restart and error. A start-up find stays a calm notice, not a modal, and that
// notice is the way into the dialog; the menu's check, and openUpdateDialog() (Settings › Tools), open the dialog
// at once. What the updater does is unchanged. No URL, file or version to download ever leaves the renderer: main
// keeps the offered release itself (NFR3).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileContent } from './ArtifactReader.jsx';
import LcarsDialog from './LcarsDialog.jsx';
import { Pill, SectionHeading, SegMeter } from './Lcars.jsx';
import { APP_REPO } from '../shared/appName.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const percent = (p) => (p?.total > 0 ? Math.min(100, Math.round((p.received / p.total) * 100)) : null);
const CELLS = 20;
const cells = (pct) => Array.from({ length: CELLS }, (_, i) => (pct == null ? 'deep' : i < Math.round((pct / 100) * CELLS) ? 'live' : 'off'));
// Phases that belong to an update under way: the menu's check just shows them again instead of asking GitHub.
const UNDER_WAY = ['downloading', 'installing', 'password', 'installed'];
// Phases the small notice stands for while the dialog is closed.
const NOTICE = ['offer', ...UNDER_WAY];

/** US-0417: the event openUpdateDialog() sends; UpdateNotice, mounted once in App, opens the dialog on it. */
export const UPDATE_OPEN_EVENT = 'thadeus:open-update-dialog';

/** US-0417: opens the Update dialog and checks now, as the menu's "Sök efter uppdatering…" does (Settings › Tools). */
export function openUpdateDialog() {
  window.dispatchEvent(new CustomEvent(UPDATE_OPEN_EVENT));
}

/**
 * @param {{busy: boolean, checkRequest?: number}} props
 *   busy: an agent tab in any project is "Arbetar", so a restart asks first; checkRequest: bumped by the menu's
 *   "Sök efter uppdatering…", which opens the dialog, checks now and also says "no update" and why a check could not run
 */
export default function UpdateNotice({ busy, checkRequest = 0 }) {
  const { t } = useTranslation();
  const bridge = window.bridge;
  const [offer, setOffer] = useState(null); // the available update {version, tag, notes, asset}
  const [phase, setPhase] = useState('hidden'); // hidden | checking | uptodate | offer | downloading | installing | password | installed | error
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(null);
  const [failed, setFailed] = useState(null); // {error, file, manual}
  const [kept, setKept] = useState(null);
  const [current, setCurrent] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  // US-0034: when pkexec cannot ask on Linux, the dialog asks; the password lives only here until sent, then is cleared.
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const [pending, setPending] = useState(null); // the .deb waiting for the password
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const openRef = useRef(open);
  openRef.current = open;

  function offerFrom(state) {
    setOffer(state);
    setPhase((p) => (p === 'hidden' || p === 'checking' || p === 'uptodate' ? 'offer' : p));
  }

  // The start-up check (main limits it to once a day) and main's own pushes: an offer and download progress.
  useEffect(() => {
    const bridge = window.bridge; // read here: the render's alias is not an effect dependency (US-0043)
    bridge
      .checkUpdate?.({ force: false })
      .then((state) => {
        setCheckedAt(new Date());
        if (state?.status === 'available') offerFrom(state);
      })
      .catch((err) => console.warn('Uppdateringskontrollen misslyckades:', errorText(err)));
    return bridge.onUpdateState?.((state) => {
      if (state?.status === 'downloading') setProgress(state);
      else if (phaseRef.current === 'hidden' && state?.status === 'available') offerFrom(state);
    });
  }, []);

  // The installed version, for the arm and the "current → new" line; read once, when the dialog first opens.
  useEffect(() => {
    if (!open || current) return;
    window.bridge
      .getAppInfo?.()
      .then((info) => setCurrent(info?.version ?? null))
      .catch((err) => console.warn('Appversionen kunde inte läsas:', errorText(err)));
  }, [open, current]);

  function checkNow() {
    setOpen(true);
    if (UNDER_WAY.includes(phaseRef.current)) return; // an update under way is shown, not checked again
    setFailed(null);
    setPhase('checking');
    bridge
      .checkUpdate({ force: true })
      .then((state) => {
        setCheckedAt(new Date());
        if (state?.status === 'available') offerFrom(state);
        else if (!openRef.current) setPhase('hidden');
        else if (state?.status === 'unavailable') fail({ error: state.reason });
        else setPhase('uptodate');
      })
      .catch((err) => fail({ error: errorText(err) }));
  }
  const checkRef = useRef(checkNow);
  checkRef.current = checkNow;

  useEffect(() => {
    if (checkRequest) checkRef.current();
  }, [checkRequest]);
  useEffect(() => {
    const onOpen = () => checkRef.current();
    window.addEventListener(UPDATE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(UPDATE_OPEN_EVENT, onOpen);
  }, []);

  function fail({ error = null, file = null, manual = null }) {
    setFailed({ error, file, manual });
    setPhase('error');
  }

  /** Close the dialog; an offer or an update under way stays as the notice, anything else is done. */
  function close() {
    setOpen(false);
    if (!NOTICE.includes(phaseRef.current)) setPhase('hidden');
  }

  function later() {
    setOpen(false);
    setPhase('hidden');
  }

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
      fail({ error: errorText(err), file: err.file ?? null, manual: err.manual ?? null });
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
      fail({ error: errorText(err), file: err.file ?? null, manual: err.manual ?? null });
    }
  }

  function cancelPassword() {
    setPassword('');
    fail({ file: pending, manual: `sudo apt install ${pending}` });
  }

  async function skip() {
    try {
      await bridge.skipUpdate(offer.version);
      later();
    } catch (err) {
      fail({ error: errorText(err) });
    }
  }

  const pct = percent(progress);
  const progressText = pct == null ? t('update.downloading') : t('update.downloadingPct', { pct });
  const reveal = bridge.platform === 'darwin' ? t('common.revealFinder') : t('common.revealFiles');
  const stateTitle = {
    checking: t('update.checking'),
    uptodate: t('update.upToDateTitle'),
    offer: t('update.title', { version: offer?.version ?? '' }),
    downloading: progressText,
    installing: t('update.installing'),
    password: t('update.passwordTitle'),
    installed: t('update.readyTitle'),
    error: t('update.errorTitle')
  }[phase];
  const cur = `v${current ?? '–'}`;
  const busyWarning = busy && (
    <p className="update-dialog-warn" data-testid="update-dialog-busy">
      {t('update.busyWarn')}
    </p>
  );

  return (
    <>
      {!open && NOTICE.includes(phase) && (
        <aside className="update-notice" role="status" aria-live="polite" data-testid="update-notice">
          <h2>{stateTitle}</h2>
          <div className="lcars-pills">
            <Pill tone="notice" onClick={() => setOpen(true)} data-testid="update-notice-open">
              {t('update.show')}
            </Pill>
            {phase === 'offer' && (
              <Pill tone="quiet" onClick={later} data-testid="update-notice-later">
                {t('update.later')}
              </Pill>
            )}
          </div>
        </aside>
      )}
      <LcarsDialog
        open={open}
        onClose={close}
        title={t('update.dialogTitle')}
        sub={stateTitle}
        readouts={[
          { k: t('update.installed'), v: cur },
          { k: t('update.latest'), v: offer ? `v${offer.version}` : '–', key: true },
          { k: t('update.checked'), v: checkedAt ? checkedAt.toTimeString().slice(0, 5) : '–' },
          { k: t('update.source'), v: 'GitHub · gh' }
        ]}
        footer={t('update.footer', { repo: APP_REPO })}
        testId="update-dialog"
        className="update-dialog"
      >
        {phase === 'checking' && (
          <section data-testid="update-dialog-checking">
            <SectionHeading as="h3" title={t('update.checking')} />
            <p className="update-dialog-text">{t('update.checkingText', { repo: APP_REPO })}</p>
            <SegMeter label={t('update.checking')} segments={cells(null)} className="update-dialog-run" />
          </section>
        )}
        {phase === 'uptodate' && (
          <section data-testid="update-dialog-uptodate">
            <SectionHeading as="h3" title={t('update.upToDateTitle')} />
            <p className="update-dialog-big">
              <span className="is-key">{cur}</span>
            </p>
            <p className="update-dialog-text">{t('update.upToDate')}</p>
          </section>
        )}
        {phase === 'offer' && (
          <section data-testid="update-dialog-available">
            <SectionHeading as="h3" title={stateTitle} />
            <p className="update-dialog-big" data-testid="update-dialog-versions">
              <span className="is-dim">{cur}</span> <span className="is-dim">→</span> <span className="is-key">{`v${offer?.version ?? ''}`}</span>
            </p>
            {offer?.notes ? (
              <div className="update-dialog-notes" data-testid="update-dialog-notes">
                <FileContent rel="release-notes.md" content={offer.notes} />
              </div>
            ) : (
              <p className="update-dialog-text">{t('update.noNotes')}</p>
            )}
            {!offer?.asset && <p className="update-dialog-warn">{t('update.noPackage')}</p>}
            {busyWarning}
            <div className="lcars-pills">
              <Pill tone="primary" disabled={!offer?.asset} onClick={update} data-testid="update-dialog-update">
                {t('update.now')}
              </Pill>
              <Pill onClick={later} data-testid="update-dialog-later">
                {t('update.later')}
              </Pill>
              <Pill tone="quiet" onClick={skip} data-testid="update-dialog-skip">
                {t('update.skip')}
              </Pill>
            </div>
          </section>
        )}
        {(phase === 'downloading' || phase === 'installing') && (
          <section data-testid="update-dialog-downloading">
            <SectionHeading as="h3" title={t('update.downloadTitle')} />
            <SegMeter label={progressText} segments={cells(phase === 'installing' ? 100 : pct)} />
            <p className="update-dialog-text">{phase === 'installing' ? t('update.installing') : progressText}</p>
          </section>
        )}
        {phase === 'password' && (
          <form onSubmit={sendPassword} data-testid="update-dialog-password">
            <SectionHeading as="h3" title={t('update.passwordTitle')} />
            <p className="update-dialog-text">{t('update.passwordPrompt')}</p>
            {wrongPassword && (
              <p className="update-dialog-warn" role="alert" data-testid="update-dialog-wrong-password">
                {t('update.wrongPassword')}
              </p>
            )}
            <div className="lcars-pills">
              <label className="sr-only" htmlFor="update-dialog-password-input">
                {t('update.password')}
              </label>
              <input
                id="update-dialog-password-input"
                type="password"
                autoComplete="current-password"
                autoFocus
                placeholder={t('update.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="update-dialog-password-input"
              />
              <Pill type="submit" tone="primary" disabled={!password} data-testid="update-dialog-install">
                {t('update.install')}
              </Pill>
              <Pill tone="quiet" onClick={cancelPassword} data-testid="update-dialog-password-cancel">
                {t('common.cancel')}
              </Pill>
            </div>
          </form>
        )}
        {phase === 'installed' && (
          <section data-testid="update-dialog-ready">
            <SectionHeading as="h3" title={t('update.readyTitle')} />
            <p className="update-dialog-big">
              <span className="is-key">{offer ? `v${offer.version}` : ''}</span>
            </p>
            <p className="update-dialog-text">
              {t('update.kept')} <code>{kept}</code>
            </p>
            {busyWarning}
            <div className="lcars-pills">
              <Pill tone="primary" onClick={() => bridge.relaunchApp()} data-testid="update-dialog-relaunch">
                {t('update.relaunch')}
              </Pill>
              <Pill onClick={close} data-testid="update-dialog-ready-later">
                {t('update.later')}
              </Pill>
            </div>
          </section>
        )}
        {phase === 'error' && (
          <section data-testid="update-dialog-error">
            <SectionHeading as="h3" title={t('update.errorTitle')} />
            <div className="update-dialog-err">
              {failed?.error && (
                <p role="alert" data-testid="update-dialog-error-text">
                  {failed.error}
                </p>
              )}
              {failed?.manual && (
                <p data-testid="update-dialog-manual">
                  {t('update.manual')} <code>{failed.manual}</code>
                </p>
              )}
              {!failed?.manual && <p className="update-dialog-text">{t('update.whatToDo')}</p>}
            </div>
            <div className="lcars-pills">
              <Pill tone="primary" onClick={checkNow} data-testid="update-dialog-retry">
                {t('update.retry')}
              </Pill>
              {failed?.file && (
                <Pill tone="quiet" onClick={() => bridge.revealUpdate().catch((err) => fail({ error: errorText(err) }))} data-testid="update-dialog-reveal">
                  {reveal}
                </Pill>
              )}
            </div>
          </section>
        )}
      </LcarsDialog>
    </>
  );
}
