// "Projektinställningar" for one project tab (EPIC-06 FR3). Saved in the app's own settings, never in the project.
// A native modal <dialog> keeps focus inside it and closes on Esc (NFR3).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidFeaturesPath } from '../main/parsers/features.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const MODES = ['auto', 'show', 'hide'];

/**
 * @param {{open: boolean, onClose: () => void, projectId: string, name?: string,
 *          settings: {featureDocs: string, featuresPath: string}, onSetup?: () => void}} props
 *   onSetup: given when the project uses AI-DLC but has no feature docs (FR3.6, FR4.5)
 */
export default function ProjectSettingsDialog({ open, onClose, projectId, name, settings, onSetup }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [mode, setMode] = useState(settings.featureDocs);
  const [path, setPath] = useState(settings.featuresPath);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setMode(settings.featureDocs);
      setPath(settings.featuresPath);
      setError(null);
      if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    } else if (d.open) {
      d.close ? d.close() : d.removeAttribute('open');
    }
  }, [open]); // the form starts from the saved settings each time it opens

  const validPath = isValidFeaturesPath(path);

  async function save(e) {
    e.preventDefault();
    if (!validPath) return;
    setSaving(true);
    setError(null);
    try {
      await window.bridge.setProjectSettings(projectId, { featureDocs: mode, featuresPath: path });
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
