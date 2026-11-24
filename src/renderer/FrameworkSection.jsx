// US-1407 FR8 (contract C10): Configuration › Framework, for an AI-DLC and a Spec Kit project. The person previews the
// switch (BR8.2, BR8.3), confirms, runs the other framework's setup when it is missing (BR8.4: the existing AI-DLC
// setup page or the Spec Kit setup panel, unchanged), and main writes `.thadeus/project.json` (BR8.5). The views follow
// the `project:detected` push (BR8.6). LCARS look, every text through t() (NFR2.2, NFR4.6).
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SetupAidlc from './SetupAidlc.jsx';
import SetupSpeckit from './SetupSpeckit.jsx';

const OTHER = { aidlc: 'speckit', speckit: 'aidlc' };
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** BR8.2, BR8.3: the C10 preview: the setup line when it runs, the views, the kept files and the work in progress. */
function SwitchPreview({ preview, to, busy, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const name = t(`setup.framework.${to}`);
  return (
    <div className="framework-switch-preview" data-testid="framework-switch-preview">
      <h3>{t('framework.switch.title', { framework: name })}</h3>
      {preview.setupNeeded && (
        <p className="tag-warn" data-testid="framework-switch-setup">
          {t('framework.switch.setupLine', { framework: name })}
        </p>
      )}
      <p>{t('framework.switch.views', { framework: name })}</p>
      {preview.keeps.length > 0 && <p className="muted">{t('framework.switch.keeps', { list: preview.keeps.join(', ') })}</p>}
      <h4>{t('framework.switch.inProgress')}</h4>
      {preview.inProgress.length > 0 ? (
        <>
          <ul className="framework-switch-work">
            {preview.inProgress.map((item) => (
              <li key={`${item.kind}:${item.name}`}>
                <span className="framework-switch-kind">{t(`framework.switch.kind.${item.kind}`)}</span> {item.name}
              </li>
            ))}
          </ul>
          <p className="muted">{t('framework.switch.notCarried')}</p>
        </>
      ) : (
        <p className="muted">{t('framework.switch.none')}</p>
      )}
      {(preview.unread ?? []).map((kind) => (
        <p key={kind} className="tag-warn" role="note" data-testid="framework-switch-unread">
          {t(`framework.switch.unread.${kind}`)}
        </p>
      ))}
      <div className="setup-actions">
        <button className="btn btn-accent" onClick={onConfirm} disabled={busy} data-testid="framework-switch-confirm">
          {busy ? t('framework.switch.writing') : t('framework.switch.confirm')}
        </button>
        <button className="btn" onClick={onCancel} disabled={busy} data-testid="framework-switch-cancel">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

/**
 * @param {{project: {projectId: string, root: string, detection: {framework: 'aidlc'|'speckit'|null}}, harness?: string|null,
 *          harnesses?: Array<object>|null}} props harness: the project's own; harnesses: US-0801's detection
 * state: idle | preview | setup | writing | failed
 */
export default function FrameworkSection({ project, harness = null, harnesses = null }) {
  const { t } = useTranslation();
  const [state, setState] = useState('idle');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [reopen, setReopen] = useState(false);
  const writing = useRef(false); // NFR7.5: a double click sends one switch
  const setupRun = useRef(0); // BR8.4: Cancel bumps it, so a setup that finishes after Cancel writes nothing
  const [setupId, setSetupId] = useState(0);
  const from = project.detection.framework;
  const to = OTHER[from];
  if (!to) return null; // BR8.1: a folder with no framework has nothing to switch from
  const name = (id) => t(`setup.framework.${id}`);

  const fail = (message) => {
    setError(message);
    setState('failed');
  };

  async function loadPreview() {
    setState('preview');
    setPreview(null);
    setError(null);
    setReopen(false);
    try {
      setPreview(await window.bridge.switchPreview(project.projectId, to));
    } catch (err) {
      setError(errorText(err)); // a refused `to` or project: the section stays where it was
      setState('idle');
    }
  }

  async function write() {
    if (writing.current) return;
    writing.current = true;
    setState('writing');
    try {
      const res = await window.bridge.switchFramework(project.projectId, to);
      if (res.ok) {
        setReopen(res.detection === null); // saved, but the views follow only on the next open
        setPreview(null);
        setState('idle');
      } else if (res.error.code === 'setupNeeded')
        await loadPreview(); // the folder went away since the preview
      else fail(res.error.message);
    } catch (err) {
      fail(errorText(err));
    } finally {
      writing.current = false;
    }
  }

  // BR8.4: the setup's success writes only while its run is still the current one (not cancelled since).
  const afterSetup = () => (setupId === setupRun.current ? write() : undefined);

  const close = () => {
    setError(null);
    setPreview(null);
    setState('idle');
  };

  return (
    <section className="framework-section" data-testid="framework-section">
      <p className="framework-section-current">{t('framework.switch.current', { framework: name(from) })}</p>
      <div className="setup-actions">
        <button className="btn btn-accent" onClick={loadPreview} disabled={state !== 'idle'} data-testid="framework-switch-button">
          {t('framework.switch.button', { framework: name(to) })}
        </button>
      </div>
      {reopen && (
        <p className="tag-warn" role="status" data-testid="framework-switch-reopen">
          {t('framework.switchedReopen')}
        </p>
      )}
      {state === 'preview' && !preview && <p className="muted">{t('common.reading')}</p>}
      {(state === 'preview' || state === 'writing') && preview && (
        <SwitchPreview
          preview={preview}
          to={to}
          busy={state === 'writing'}
          onConfirm={() => {
            if (!preview.setupNeeded) return write();
            setSetupId(setupRun.current);
            setState('setup');
          }}
          onCancel={close}
        />
      )}
      {state === 'setup' && (
        // BR8.4: the setup's own panel and output; the write follows only its success. A failed run keeps its output
        // here, so the person reads it before Cancel.
        <div className="framework-switch-setup-step">
          <p className="muted">{t('framework.switch.setupHint', { framework: name(to) })}</p>
          {to === 'speckit' ? (
            <SetupSpeckit projectId={project.projectId} root={project.root} onApplied={afterSetup} />
          ) : (
            <SetupAidlc project={project} harnesses={harnesses} currentHarness={harness} onApplied={afterSetup} />
          )}
          <div className="setup-actions">
            <button
              className="btn btn-quiet"
              onClick={() => {
                setupRun.current += 1;
                fail(t('framework.switch.setupStopped'));
              }}
              data-testid="framework-switch-cancel"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="banner banner-error framework-switch-error" role="alert" data-testid="framework-switch-error">
          <span>
            {error} {t('framework.switch.stays', { framework: name(from) })}
          </span>
          <button className="btn" onClick={close} data-testid="framework-switch-close">
            {t('common.close')}
          </button>
        </div>
      )}
    </section>
  );
}
