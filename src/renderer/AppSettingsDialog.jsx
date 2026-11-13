// "Inställningar" for the whole app (EPIC-04 FR4.2), opened from the left arm. Saved in the app's own
// settings.json, like the open tabs. A native modal <dialog> keeps focus inside it and closes on Esc.
import { useEffect, useRef, useState } from 'react';

const OPTIONS = [
  { id: 'full', label: 'Full' },
  { id: 'reduced', label: 'Dämpad' },
  { id: 'off', label: 'Av' }
];
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * @param {{open: boolean, onClose: () => void, value: 'full'|'reduced'|'off',
 *          onChange: (value: string) => Promise<unknown>}} props value is the mode in effect
 */
export default function AppSettingsDialog({ open, onClose, value, onChange }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setError(null);
      if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    } else if (d.open) {
      d.close ? d.close() : d.removeAttribute('open');
    }
  }, [open]);

  async function pick(id) {
    setError(null);
    try {
      await onChange(id);
    } catch (err) {
      setError(`Inställningen kunde inte sparas: ${errorText(err)}`);
    }
  }

  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      aria-labelledby="app-settings-title"
      onCancel={(e) => {
        e.preventDefault(); // Esc: close through our own state
        onClose();
      }}
      data-testid="app-settings-dialog"
    >
      {open && (
        <div>
          <h2 id="app-settings-title">Inställningar</h2>
          <fieldset className="settings-group">
            <legend>Animationer</legend>
            <div className="lcars-radio-group">
              {OPTIONS.map((o) => (
                <label key={o.id} className={`lcars-block ${value === o.id ? 'lcars-block--active' : 'lcars-block--mid'}`}>
                  <input
                    type="radio"
                    className="sr-only"
                    name="app-animations"
                    checked={value === o.id}
                    onChange={() => pick(o.id)}
                    data-testid={`app-settings-animations-${o.id}`}
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <p className="muted settings-help">
              Dämpad: statisk glöd, inga loopar och inget svep. Av: inga animationer. Utan eget val blir det Dämpad när datorn ber om
              mindre rörelse, annars Full.
            </p>
          </fieldset>
          {error && (
            <p className="refresh-error" role="alert">
              {error}
            </p>
          )}
          <div className="setup-actions">
            <button type="button" className="btn" onClick={onClose} data-testid="app-settings-close">
              Stäng
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
