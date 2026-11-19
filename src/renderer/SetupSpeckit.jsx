// "Set up Spec Kit" (US-1405 FR3, contract C3), an LCARS panel mirroring SetupAidlc.jsx. It previews first (whether
// `specify` is found, the harness, the exact command), runs only on the person's confirm, and shows the output.
// After success, main's setup watcher sees `.specify/` and switches the project to the Spec Kit views (BR3.8).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setupHarness } from '../shared/harnesses.js';

const HARNESS_IDS = ['claude', 'opencode']; // as SPECKIT_HARNESSES in main (BR3.2)
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * @param {{projectId: string, root?: string, onApplied?: () => void}} props
 * phase: previewing | missingCli | ready | running | done | failed
 */
export default function SetupSpeckit({ projectId, root, onApplied }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [phase, setPhase] = useState('previewing');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /** The preview for `harness` (null: the project's own); Run always matches what is shown (BR3.3). */
  async function preview(harness = null) {
    setPhase('previewing');
    setError(null);
    setResult(null);
    try {
      const next = await window.bridge.speckitSetupPreview(projectId, harness);
      setInfo(next);
      setPhase(next.specifyOnPath ? 'ready' : 'missingCli');
    } catch (err) {
      setError(t('setup.checkFailed', { error: errorText(err) }));
      setPhase('missingCli');
    }
  }

  useEffect(() => {
    preview();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per project
  }, [projectId]);

  async function run() {
    setPhase('running');
    setError(null);
    setResult(null);
    try {
      const res = await window.bridge.speckitSetup(projectId, info.harness);
      setResult(res);
      setPhase(res.ok ? 'done' : 'failed');
      if (res.ok) onApplied?.();
    } catch (err) {
      setError(t('setup.runFailed', { error: errorText(err) }));
      setPhase('failed');
    }
  }

  const picker = info?.specifyOnPath && info.harnesses.length !== 1;
  const failure = result && !result.ok ? t(result.error.code === 'timeout' ? 'speckitSetup.timeout' : 'speckitSetup.failed') : null;

  return (
    <div className="panel empty-state setup-panel" role="status" data-testid="setup-speckit-root">
      <h2>{t('speckitSetup.title')}</h2>
      {root && <p className="muted">{root}</p>}
      {phase === 'previewing' && <p className="muted">{t('setup.checking')}</p>}
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
      {phase === 'missingCli' && (
        <>
          {info && !info.specifyOnPath && (
            <p data-testid="setup-speckit-hint">
              {t('speckitSetup.missing')} {t('speckitSetup.installHint', { command: info.installHint })}
            </p>
          )}
          <button className="btn" onClick={() => preview()} data-testid="setup-speckit-retry">
            {t('speckitSetup.retry')}
          </button>
        </>
      )}
      {info?.specifyOnPath && phase !== 'previewing' && (
        <>
          <p className="muted">{t('speckitSetup.found', { version: info.version })}</p>
          {picker && (
            <label className="field">
              <span className="field-label">{t('speckitSetup.pickHarness')}</span>
              <select
                className="lcars-select"
                value={info.harness ?? ''}
                onChange={(e) => preview(e.target.value)}
                disabled={phase === 'running' || phase === 'done'}
                data-testid="setup-speckit-harness"
              >
                {!info.harness && <option value="">{t('speckitSetup.pickPlaceholder')}</option>}
                {HARNESS_IDS.map((id) => (
                  <option key={id} value={id}>
                    {setupHarness(id)?.label ?? id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {info.command && (
            <div className="setup-preview">
              <p>{t('speckitSetup.willRun')}</p>
              <pre className="code-block" data-testid="setup-speckit-command">
                {info.command.join(' ')}
              </pre>
              <p className="muted">{t('speckitSetup.adds', { list: info.adds.join(', ') })}</p>
              {info.notEmpty && (
                <p className="tag-warn" role="note">
                  {t('speckitSetup.existing')}
                </p>
              )}
            </div>
          )}
          <div className="setup-actions">
            <button
              className="btn btn-accent"
              onClick={run}
              disabled={!info.command || phase === 'running' || phase === 'done'}
              data-testid="setup-speckit-run"
            >
              {phase === 'running' ? t('speckitSetup.running') : t('speckitSetup.run')}
            </button>
          </div>
        </>
      )}
      {failure && (
        <p className="refresh-error" role="alert">
          {failure}
        </p>
      )}
      {phase === 'done' && <p className="muted">{t('speckitSetup.done')}</p>}
      {result && (result.output || !result.ok) && (
        <pre className="code-block" data-testid="setup-speckit-output">
          {[result.output, result.ok ? '' : result.error.message].filter(Boolean).join('\n')}
        </pre>
      )}
    </div>
  );
}
