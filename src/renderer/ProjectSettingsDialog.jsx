// "Projektinställningar" for one project tab (EPIC-06 FR3). Saved in the app's own settings, never in the project.
// A native modal <dialog> keeps focus inside it and closes on Esc (NFR3).
import { useEffect, useRef, useState } from 'react';
import { isValidFeaturesPath } from '../main/parsers/features.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const MODES = [
  { id: 'auto', label: 'Automatiskt', help: 'Visas när översikten finns.' },
  { id: 'show', label: 'Visa', help: 'Visas alltid. Utan dokument förklaras formatet.' },
  { id: 'hide', label: 'Dölj', help: 'Visas aldrig.' }
];

/**
 * @param {{open: boolean, onClose: () => void, projectId: string, name?: string,
 *          settings: {featureDocs: string, featuresPath: string}, onSetup?: () => void}} props
 *   onSetup: given when the project uses AI-DLC but has no feature docs (FR3.6, FR4.5)
 */
export default function ProjectSettingsDialog({ open, onClose, projectId, name, settings, onSetup }) {
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
          <h2 id={`project-settings-title-${projectId}`}>Projektinställningar{name ? `: ${name}` : ''}</h2>
          <fieldset className="settings-group">
            <legend>Feature-beskrivningar</legend>
            {MODES.map((m) => (
              <label key={m.id} className="check">
                <input
                  type="radio"
                  name={`feature-docs-${projectId}`}
                  checked={mode === m.id}
                  onChange={() => setMode(m.id)}
                  data-testid={`project-settings-mode-${m.id}`}
                />
                {m.label} <span className="muted">{m.help}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span className="field-label">Sökväg till översikten</span>
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
              Sökvägen ska vara relativ till projektet, sluta på .md och inte innehålla ..
            </p>
          )}
          {error && (
            <p className="refresh-error" role="alert">
              {error}
            </p>
          )}
          {onSetup && (
            <p className="settings-setup">
              <span className="muted">Projektet har inga feature-beskrivningar ännu.</span>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onSetup();
                  onClose();
                }}
                data-testid="project-settings-setup"
              >
                Sätt upp feature-beskrivningar
              </button>
            </p>
          )}
          <div className="setup-actions">
            <button type="submit" className="btn btn-accent" disabled={!validPath || saving} data-testid="project-settings-save">
              Spara
            </button>
            <button type="button" className="btn" onClick={onClose} data-testid="project-settings-cancel">
              Avbryt
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
