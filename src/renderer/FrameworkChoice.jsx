// US-1406 FR4 (contract C4, AC2.2.1–AC2.2.3): the first-open screen of a project with no saved framework, in the LCARS
// frame. It scans (what is found, which tools are on the PATH), preselects the proposal, and saves only on Confirm. A
// framework whose folder is missing goes through its setup first (US-0503 or US-1405) and is saved when it succeeds.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SetupAidlc from './SetupAidlc.jsx';
import SetupSpeckit from './SetupSpeckit.jsx';

const FRAMEWORKS = ['aidlc', 'speckit'];
const TOOL = { aidlc: 'aidlc', speckit: 'specify' }; // each framework's command-line tool (BR4.2)
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * @param {{projectId: string, root?: string, setupProps?: object}} props `setupProps` go to SetupAidlc as they are.
 * phase: scanning | scanFailed | choosing | saving | setup (BR4.4, BR4.6, NFR7.2)
 */
export default function FrameworkChoice({ projectId, root, setupProps = {} }) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [scan, setScan] = useState(null);
  const [picked, setPicked] = useState(null);
  const [phase, setPhase] = useState('scanning');
  const [error, setError] = useState(null);
  const busy = useRef(false); // one chooseFramework call at a time, even between two clicks of one render (NFR7.2)

  useEffect(() => {
    let live = true;
    setPhase('scanning');
    setError(null);
    window.bridge.frameworkScan(projectId).then(
      (next) => {
        if (!live) return;
        setScan(next);
        setPicked(next.proposal);
        setPhase('choosing');
      },
      (err) => {
        if (!live) return;
        setError({ key: 'frameworkChoice.scanFailed', reason: errorText(err) });
        setPhase('scanFailed');
      }
    );
    return () => {
      live = false;
    };
  }, [projectId, attempt]);

  /** Saves `framework`; a missing one opens its setup instead (BR4.6). On success main switches the views. */
  async function save(framework) {
    if (busy.current) return;
    busy.current = true;
    setPhase('saving');
    setError(null);
    try {
      const res = await window.bridge.chooseFramework(projectId, framework);
      // ponytail: a written choice stays on Saving until main's project:detected push replaces this screen.
      if (res.next !== 'none') setPhase('setup');
    } catch (err) {
      setError({ key: 'frameworkChoice.saveFailed', reason: errorText(err) });
      setPhase('choosing');
    } finally {
      busy.current = false;
    }
  }

  const choosing = phase === 'choosing' || phase === 'saving';
  return (
    <div className="panel empty-state setup-panel framework-choice" data-testid="framework-choice-root">
      <h2>{t('frameworkChoice.title')}</h2>
      {root && <p className="muted">{root}</p>}
      {phase === 'scanning' && <p className="muted">{t('frameworkChoice.scanning')}</p>}
      {error && (
        <p className="refresh-error" role="alert" data-testid="framework-choice-error">
          {t(error.key, { reason: error.reason })}
        </p>
      )}
      {phase === 'scanFailed' && (
        <button className="btn" onClick={() => setAttempt((n) => n + 1)} data-testid="framework-choice-retry">
          {t('frameworkChoice.retry')}
        </button>
      )}
      {choosing && scan && (
        <>
          <p>{t('frameworkChoice.intro')}</p>
          <div className="framework-choice-options" role="group" aria-label={t('frameworkChoice.title')}>
            {FRAMEWORKS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={picked === id}
                className={`lcars-block lcars-block--${picked === id ? 'active' : 'dark'} framework-choice-option`}
                disabled={phase === 'saving'}
                onClick={() => setPicked(id)}
                data-testid={`framework-choice-option-${id}`}
              >
                <strong>{t(`setup.framework.${id}`)}</strong>
                <span>{t(scan.found[id] ? 'frameworkChoice.found' : 'frameworkChoice.notFound')}</span>
                <span>{t(scan.cli[TOOL[id]] ? 'frameworkChoice.cliFound' : 'frameworkChoice.cliMissing', { tool: TOOL[id] })}</span>
                {scan.proposal === id && <span className="framework-choice-proposed">{t('frameworkChoice.proposed')}</span>}
              </button>
            ))}
          </div>
          <div className="setup-actions">
            <button className="btn btn-accent" disabled={!picked || phase === 'saving'} onClick={() => save(picked)} data-testid="framework-choice-confirm">
              {t('frameworkChoice.confirm')}
            </button>
          </div>
        </>
      )}
      {phase === 'setup' && (
        <>
          {picked === 'aidlc' ? (
            <SetupAidlc
              {...setupProps}
              onApplied={(harness) => {
                setupProps.onApplied?.(harness);
                save('aidlc');
              }}
            />
          ) : (
            <SetupSpeckit projectId={projectId} root={root} onApplied={() => save('speckit')} />
          )}
          <div className="setup-actions">
            <button className="btn" onClick={() => setPhase('choosing')} data-testid="framework-choice-back">
              {t('frameworkChoice.back')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
