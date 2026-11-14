// "Initiera AI-DLC" on the "not an AI-DLC project" screen (US-0503, FR4), and "Add harness" from
// Projektinställningar (US-0802 FR3). Nothing in the folder changes until the person has seen the preview
// for the chosen harness and pressed Apply; main then runs the steps (US-0802 FR2.2, FR2.4).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { withSlots } from './format.js';
import { HARNESSES, defaultSetupHarness, selectableHarness, setupHarness } from '../shared/harnesses.js';

export const INSTALL_URL = 'https://github.com/awslabs/aidlc-workflows';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function Prerequisites({ info }) {
  const { t } = useTranslation();
  return (
    <ul className="setup-checks" data-testid="setup-aidlc-checks">
      <li>
        <strong>{t('setup.aidlcLabel')}</strong> {info.aidlc.installed ? t('setup.installed', { version: info.aidlc.version }) : t('setup.missing')}
      </li>
      <li>
        <strong>{t('setup.gitLabel')}</strong> {info.git.isRepo ? t('setup.isRepo') : t('setup.notRepo')}
      </li>
      <li>
        <strong>{t('setup.harnessesLabel')}</strong> {info.harnesses.length ? info.harnesses.join(', ') : t('setup.noHarnesses')}
      </li>
    </ul>
  );
}

/**
 * All six harnesses (US-0802 FR1.1), each with whether its CLI was found (FR1.3); in add mode the installed
 * ones are shown as installed and can't be picked (FR3.1).
 */
function HarnessSelect({ value, onChange, detected, add, disabled }) {
  const { t } = useTranslation();
  const byId = Object.fromEntries((detected ?? []).map((d) => [d.id, d]));
  const entry = setupHarness(value);
  return (
    <>
      <label className="field">
        <span className="field-label">{t('setup.harnessLabel')}</span>
        <select className="lcars-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} data-testid="setup-harness">
          {HARNESSES.filter((h) => h.setupId).map((h) => {
            const found = byId[h.id];
            const installed = add && found?.installed;
            const notes = [
              installed && t('setup.harnessInstalled'),
              found?.cli && t(found.cli.found ? 'setup.cliFound' : 'setup.cliNotFound'),
              !h.selectable && t('setup.filesOnly')
            ].filter(Boolean);
            return (
              <option key={h.id} value={h.id} disabled={installed}>
                {notes.length ? `${h.label} (${notes.join(', ')})` : h.label}
              </option>
            );
          })}
        </select>
      </label>
      {entry && !entry.selectable && (
        <p className="muted" role="note" data-testid="setup-harness-note">
          {t('setup.notRunnable')}
        </p>
      )}
    </>
  );
}

/** What Apply did: the outcome, or the failed step in one sentence with the CLI's error as details (FR2.2). */
function Result({ result }) {
  const { t } = useTranslation();
  const failed = result.steps.find((s) => !s.ok);
  if (!failed) return null; // success is shown by the caller, with the harness name
  return (
    <div className="refresh-error" role="alert" data-testid="setup-result-failed">
      <p>{t('setup.stepFailed', { command: failed.command })}</p>
      <pre className="code-block">{failed.error}</pre>
    </div>
  );
}

function Preview({ preview }) {
  const { t } = useTranslation();
  if (!preview) return null;
  const counts = ['create', 'update', 'merge', 'preserve', 'remove', 'conflict'].filter((k) => preview[k] != null);
  return (
    <div className="setup-preview" data-testid="setup-aidlc-preview">
      {preview.error && <p className="refresh-error">{preview.error}</p>}
      {(preview.notes ?? []).map((n) => (
        <p key={n} className="tag-warn" role="note" data-testid="setup-aidlc-note">
          {n}
        </p>
      ))}
      {counts.length > 0 && <p>{counts.map((k) => `${k}: ${preview[k]}`).join(' · ')}</p>}
      {preview.conflicts.length > 0 && (
        <>
          <p className="refresh-error">{t('setup.conflicts')}</p>
          <ul className="refresh-list">
            {preview.conflicts.map((f) => (
              <li key={f}>
                <code>{f}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      {preview.raw && (
        <details>
          <summary>{t('setup.fullPreview')}</summary>
          <pre className="code-block">{preview.raw}</pre>
        </details>
      )}
    </div>
  );
}

function Advanced({ plugins, presets, chosen, setChosen, preset, setPreset }) {
  const { t } = useTranslation();
  const toggle = (p) => setChosen((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));
  return (
    <details className="setup-advanced" data-testid="setup-aidlc-advanced">
      <summary>{t('setup.advanced')}</summary>
      <fieldset>
        <legend>{t('setup.plugins')}</legend>
        {plugins.length === 0 && <p className="muted">{t('setup.noPlugins')}</p>}
        {plugins.map((p) => (
          <label key={p} className="check">
            <input type="checkbox" checked={chosen.includes(p)} onChange={() => toggle(p)} data-testid="setup-aidlc-plugin" />
            {p}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t('setup.modelLevel')}</legend>
        <label className="check">
          <input type="radio" name="preset" checked={preset === null} onChange={() => setPreset(null)} />
          {t('setup.noPreset')}
        </label>
        {presets.map((p) => (
          <label key={p} className="check">
            <input type="radio" name="preset" checked={preset === p} onChange={() => setPreset(p)} data-testid={`setup-aidlc-preset-${p}`} />
            {p} <span className="muted">{t(`setup.preset.${p}`)}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}

/** Without the CLI there is nothing to set up with, so the flow stops here (FR4.2). */
function MissingTool() {
  return (
    <p data-testid="setup-aidlc-missing">
      {withSlots('setup.installTool', {
        link: (
          <a href={INSTALL_URL} target="_blank" rel="noreferrer">
            {INSTALL_URL}
          </a>
        )
      })}
    </p>
  );
}

/** Offer separate feature docs (EPIC-06 FR4.1, FR4.2). Nothing is created here; SetupDone offers the request afterwards. */
function FeatureDocsChoice({ checked, onChange, exist }) {
  const { t } = useTranslation();
  const harness = useTerminal()?.harness?.name ?? t('terminal.agent'); // the agent tab creates them (US-0801 FR8.1)
  return (
    <div className="setup-feature-docs">
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid="setup-aidlc-feature-docs" />
        {t('setup.featureDocs')}
      </label>
      <p className="muted">{exist ? t('setup.featureDocsExist') : t('setup.featureDocsNew', { harness })}</p>
    </div>
  );
}

/**
 * @param {{project: {projectId: string, root: string, detection: {reason: string}}, mode?: 'setup'|'add',
 *          harnesses?: Array<object>|null, currentHarness?: string|null, onApplied?: (id: string) => void,
 *          onSwitchHarness?: (id: string) => void, onClose?: () => void,
 *          featureDocs?: boolean, onFeatureDocsChange?: (on: boolean) => void, featureDocsExist?: boolean}} props
 *   harnesses: US-0801's detection; currentHarness: the agent tab's harness now (US-0802 FR4.2)
 *   featureDocs is held by ProjectContent so the choice survives the switch to the project view (FR4.3)
 */
export default function SetupAidlc({
  project,
  mode = 'setup',
  harnesses = null,
  currentHarness = null,
  onApplied,
  onSwitchHarness,
  onClose,
  featureDocs = false,
  onFeatureDocsChange,
  featureDocsExist = false
}) {
  const { t } = useTranslation();
  const add = mode === 'add';
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [harness, setHarness] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [preset, setPreset] = useState(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const bridge = window.bridge;

  /** The preview for `id`; a changed harness runs it again, so Apply always matches what is shown (FR2.4). */
  async function check(id = harness ?? defaultSetupHarness(harnesses, { add })) {
    setHarness(id);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setInfo(await bridge.getSetupInfo(project.projectId, { harness: id }));
    } catch (err) {
      setError(t('setup.checkFailed', { error: errorText(err) }));
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    setApplying(true);
    setError(null);
    setResult(null);
    try {
      const res = await bridge.runSetup(project.projectId, { harness, mode, plugins: chosen, preset });
      setResult(res);
      if (res.ok) onApplied?.(harness);
    } catch (err) {
      setError(t('setup.runFailed', { error: errorText(err) }));
    } finally {
      setApplying(false);
    }
  }

  const preview = info?.preview;
  const touchesExisting = (preview?.conflicts.length ?? 0) > 0 || (preview?.conflict ?? 0) > 0 || (add && (preview?.error || (preview?.remove ?? 0) > 0));
  const installed = info?.aidlc.installed === true;
  const done = result?.ok === true;
  const blocked = !installed || !preview || touchesExisting || loading || applying || done || info.harness !== harness;
  const label = setupHarness(harness)?.label ?? harness;
  // After a successful setup: offer the agent tab the new harness if it can run there (FR4.2).
  const offerSwitch = done && onSwitchHarness && selectableHarness(harness) && harness !== currentHarness;

  return (
    <div className="panel empty-state setup-panel" role="status" data-testid={add ? 'setup-add-harness' : 'project-not-aidlc'}>
      <h2>{t(add ? 'setup.addTitle' : 'setup.title')}</h2>
      {!add && <p>{project.detection.reason}</p>}
      <p className="muted">{project.root}</p>
      {!info && (
        <button className="btn btn-accent" onClick={() => check()} disabled={loading} data-testid="setup-aidlc-start">
          {loading ? t('setup.checking') : t(add ? 'setup.addTitle' : 'setup.start')}
        </button>
      )}
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
      {info && (
        <>
          <Prerequisites info={info} />
          {installed ? (
            <>
              <HarnessSelect value={harness} onChange={check} detected={harnesses} add={add} disabled={loading || applying || done} />
              <Preview preview={info.preview} />
              {info.warning && <p className="muted">{info.warning}</p>}
              <Advanced plugins={info.plugins} presets={info.presets} chosen={chosen} setChosen={setChosen} preset={preset} setPreset={setPreset} />
              {onFeatureDocsChange && <FeatureDocsChoice checked={featureDocs} onChange={onFeatureDocsChange} exist={featureDocsExist} />}
            </>
          ) : (
            <MissingTool />
          )}
          <div className="setup-actions">
            <button className="btn btn-accent" onClick={apply} disabled={blocked} data-testid="setup-apply">
              {applying ? t('setup.applying') : t('setup.apply')}
            </button>
            <button className="btn" onClick={() => check()} disabled={loading || applying}>
              {t('setup.recheck')}
            </button>
            {onClose && (
              <button className="btn btn-quiet" onClick={onClose} data-testid="setup-close">
                {t('common.close')}
              </button>
            )}
          </div>
          {result && <Result result={result} />}
          {done && (
            <p className="muted" data-testid="setup-result-ok">
              {t('setup.applied', { harness: label })}
            </p>
          )}
          {offerSwitch && (
            <p className="settings-setup" data-testid="setup-switch-offer">
              <span>{t('setup.switchOffer', { harness: label })}</span>
              <button className="btn" onClick={() => onSwitchHarness(harness)} data-testid="setup-switch">
                {t('setup.switch')}
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
