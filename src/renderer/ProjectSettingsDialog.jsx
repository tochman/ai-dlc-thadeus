// "Projektinställningar" for one project tab (EPIC-06 FR3). Saved in the app's own settings, never in the project.
// A native modal <dialog> keeps focus inside it and closes on Esc (NFR3).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidFeaturesPath } from '../main/parsers/features.js';
import { HARNESSES, selectableHarness } from '../shared/harnesses.js';
import { useTerminal } from './TerminalContext.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const MODES = ['auto', 'show', 'hide'];

/**
 * The "Agent-terminal" options (US-0801 FR2.1): the selectable harnesses with their CLI version, and the
 * detected ones that are not supported yet, disabled.
 */
function harnessOptions(detected, t) {
  const byId = Object.fromEntries((detected ?? []).map((d) => [d.id, d]));
  return HARNESSES.filter((h) => h.selectable || byId[h.id]?.installed || byId[h.id]?.cli?.found).map((h) => {
    const cli = byId[h.id]?.cli;
    const note = !h.selectable ? t('settings.project.harnessUnsupported') : cli?.found ? cli.version : cli ? t('settings.project.harnessNotFound') : null;
    return { id: h.id, disabled: !h.selectable, text: note ? `${h.label} (${note})` : h.label };
  });
}

/**
 * Switching the agent tab closes its session: true at once while it is free or ended, else the person is
 * asked first (US-0801 FR6.1). Shared with the switch offer after setup (US-0802 FR4.2).
 */
export function confirmHarnessSwitch(terminal, from, to, t) {
  if (terminal?.state('agent') !== 'busy') return true;
  return window.confirm(
    t('settings.project.harnessSwitchConfirm', { from: selectableHarness(from)?.label ?? from, to: selectableHarness(to)?.label ?? to })
  );
}

/**
 * @param {{open: boolean, onClose: () => void, projectId: string, name?: string,
 *          settings: {featureDocs: string, featuresPath: string}, onSetup?: () => void,
 *          harness?: string|null, harnesses?: Array<object>|null, onAddHarness?: () => void}} props
 *   onSetup: given when the project uses AI-DLC but has no feature docs (FR3.6, FR4.5)
 *   harness: the harness the agent tab runs now; harnesses: the detection, null while it runs (US-0801)
 *   onAddHarness: given in an AI-DLC project; opens setup in add mode (US-0802 FR3.1)
 *   onOpenConfig: given in an AI-DLC project; shows the Configuration view (US-0901 FR1.1)
 */
export default function ProjectSettingsDialog({
  open,
  onClose,
  projectId,
  name,
  settings,
  onSetup,
  harness = null,
  harnesses = null,
  onAddHarness,
  onOpenConfig
}) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const ref = useRef(null);
  const [mode, setMode] = useState(settings.featureDocs);
  const [path, setPath] = useState(settings.featuresPath);
  const [chosen, setChosen] = useState(harness);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setMode(settings.featureDocs);
      setPath(settings.featuresPath);
      setChosen(harness);
      setError(null);
      if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    } else if (d.open) {
      d.close ? d.close() : d.removeAttribute('open');
    }
  }, [open]); // the form starts from the saved settings each time it opens

  useEffect(() => setChosen((c) => c ?? harness), [harness]); // detection finished while the dialog was open

  const validPath = isValidFeaturesPath(path);

  async function save(e) {
    e.preventDefault();
    if (!validPath) return;
    // Only a changed harness is saved, so the detected default is not pinned by saving other settings.
    const switching = chosen && chosen !== harness;
    if (switching && !confirmHarnessSwitch(terminal, harness, chosen, t)) return;
    setSaving(true);
    setError(null);
    try {
      await window.bridge.setProjectSettings(projectId, { featureDocs: mode, featuresPath: path, ...(switching ? { harness: chosen } : {}) });
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="panel settings-dialog"
      aria-labelledby={`project-settings-title-${projectId}`}
      onCancel={(e) => {
        e.preventDefault(); // Esc: close through our own state
        onClose();
      }}
      data-testid="project-settings-dialog"
    >
      {open && (
        <form onSubmit={save}>
          <h2 id={`project-settings-title-${projectId}`}>
            {name ? t('settings.project.titleFor', { name }) : t('settings.project.title')}
          </h2>
          <fieldset className="settings-group">
            <legend>{t('settings.project.featureDocsLegend')}</legend>
            {MODES.map((id) => (
              <label key={id} className="check">
                <input
                  type="radio"
                  name={`feature-docs-${projectId}`}
                  checked={mode === id}
                  onChange={() => setMode(id)}
                  data-testid={`project-settings-mode-${id}`}
                />
                {t(`settings.project.mode.${id}`)} <span className="muted">{t(`settings.project.modeHelp.${id}`)}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span className="field-label">{t('settings.project.pathLabel')}</span>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              aria-invalid={!validPath}
              aria-describedby={validPath ? undefined : `project-settings-path-error-${projectId}`}
              data-testid="project-settings-path"
            />
          </label>
          {!validPath && (
            <p className="refresh-error" id={`project-settings-path-error-${projectId}`} role="alert">
              {t('settings.project.pathInvalid')}
            </p>
          )}
          <label className="field">
            <span className="field-label">{t('settings.project.harnessLabel')}</span>
            <select className="lcars-select"
              value={chosen ?? ''}
              onChange={(e) => setChosen(e.target.value)}
              disabled={!harness}
              data-testid="project-settings-harness"
            >
              {!harness && <option value="">{t('terminal.checking')}</option>}
              {harnessOptions(harnesses, t).map((o) => (
                <option key={o.id} value={o.id} disabled={o.disabled}>
                  {o.text}
                </option>
              ))}
            </select>
          </label>
          {onAddHarness && (
            <p className="settings-setup">
              <span className="muted" data-testid="project-settings-installed-harnesses">
                {t('settings.project.installedHarnesses', {
                  list: (harnesses ?? []).filter((d) => d.installed).map((d) => d.label).join(', ') || '–'
                })}
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onAddHarness();
                  onClose();
                }}
                data-testid="project-settings-add-harness"
              >
                {t('settings.project.addHarness')}
              </button>
            </p>
          )}
          {onOpenConfig && (
            <p className="settings-setup">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onOpenConfig();
                  onClose();
                }}
                data-testid="project-settings-open-config"
              >
                {t('settings.project.openConfig')}
              </button>
            </p>
          )}
          {error && (
            <p className="refresh-error" role="alert">
              {error}
            </p>
          )}
          {onSetup && (
            <p className="settings-setup">
              <span className="muted">{t('settings.project.noDocs')}</span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onSetup();
                  onClose();
                }}
                data-testid="project-settings-setup"
              >
                {t('features.setup')}
              </button>
            </p>
          )}
          <div className="setup-actions">
            <button type="submit" className="btn btn-accent" disabled={!validPath || saving} data-testid="project-settings-save">
              {t('common.save')}
            </button>
            <button type="button" className="btn" onClick={onClose} data-testid="project-settings-cancel">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
