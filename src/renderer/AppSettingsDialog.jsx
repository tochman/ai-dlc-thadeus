// "Inställningar" for the whole app (EPIC-04 FR4.2), opened from the left arm. Saved in the app's own
// settings.json, like the open tabs. A native modal <dialog> keeps focus inside it and closes on Esc.
import { useEffect, useRef, useState } from 'react';

const OPTIONS = [
  { id: 'full', label: 'Full' },
  { id: 'reduced', label: 'Dämpad' },
  { id: 'off', label: 'Av' }
];
// Waiting questions from AI-DLC (EPIC-05 US-0505 FR4.1).
const ALERT_OPTIONS = [
  { id: 'popup-notify', label: 'Popup och notis' },
  { id: 'popup', label: 'Bara popup' },
  { id: 'off', label: 'Av' }
];
const SOUND_OPTIONS = [
  { id: 'on', label: 'På' },
  { id: 'off', label: 'Av' }
];
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** LCARS radio blocks: a label.lcars-block around a visually hidden radio. */
function RadioBlocks({ name, options, value, onPick }) {
  return (
    <div className="lcars-radio-group">
      {options.map((o) => (
        <label key={o.id} className={`lcars-block ${value === o.id ? 'lcars-block--active' : 'lcars-block--mid'}`}>
          <input
            type="radio"
            className="sr-only"
            name={`app-${name}`}
            checked={value === o.id}
            onChange={() => onPick(o.id)}
            data-testid={`app-settings-${name}-${o.id}`}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/**
 * @param {{open: boolean, onClose: () => void, value: 'full'|'reduced'|'off',
 *          onChange: (value: string) => Promise<unknown>,
 *          questionAlerts?: 'popup-notify'|'popup'|'off', notificationSound?: boolean,
 *          onSave?: (partial: object) => Promise<unknown>}} props value is the mode in effect;
 *   onSave saves questionAlerts or notificationSound
 */
export default function AppSettingsDialog({
  open,
  onClose,
  value,
  onChange,
  questionAlerts = 'popup-notify',
  notificationSound = true,
  onSave = async () => {}
}) {
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

  async function save(run) {
    setError(null);
    try {
      await run();
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
            <RadioBlocks name="animations" options={OPTIONS} value={value} onPick={(id) => save(() => onChange(id))} />
            <p className="muted settings-help">
              Dämpad: statisk glöd, inga loopar och inget svep. Av: inga animationer. Utan eget val blir det Dämpad när datorn ber om
              mindre rörelse, annars Full.
            </p>
          </fieldset>
          <fieldset className="settings-group">
            <legend>Frågor från Claude</legend>
            <RadioBlocks
              name="alerts"
              options={ALERT_OPTIONS}
              value={questionAlerts}
              onPick={(id) => save(() => onSave({ questionAlerts: id }))}
            />
            <p className="muted settings-help">
              En popup när AI-DLC väntar på ditt svar, och en systemnotis när appen ligger i bakgrunden eller frågan gäller ett annat
              projekt.
            </p>
          </fieldset>
          <fieldset className="settings-group">
            <legend>Ljud vid notis</legend>
            <RadioBlocks
              name="sound"
              options={SOUND_OPTIONS}
              value={notificationSound ? 'on' : 'off'}
              onPick={(id) => save(() => onSave({ notificationSound: id === 'on' }))}
            />
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
