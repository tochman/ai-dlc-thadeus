// "Inställningar" for the whole app (EPIC-04 FR4.2), opened from the left arm. Saved in the app's own
// settings.json, like the open tabs. A native modal <dialog> keeps focus inside it and closes on Esc.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_SETTINGS } from '../shared/i18n.js';

const ANIMATION_IDS = ['full', 'reduced', 'off'];
// Waiting questions from AI-DLC (EPIC-05 US-0505 FR4.1).
const ALERT_IDS = ['popup-notify', 'popup', 'off'];
const SOUND_IDS = ['on', 'off'];
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * Saves the "Språk / Language" choice, then switches to the language main resolved from it (auto follows the
 * OS). Every view re-renders in the new language, with no reload (EPIC-07 US-0701 FR4.4).
 */
export async function saveLanguage(language) {
  await window.bridge.setSettings({ language });
  await i18n.changeLanguage(await window.bridge.getLanguage());
}

/** LCARS radio blocks: a label.lcars-block around a visually hidden radio. */
function RadioBlocks({ name, ids, labelKey, value, onPick }) {
  const { t } = useTranslation();
  return (
    <div className="lcars-radio-group">
      {ids.map((id) => (
        <label key={id} className={`lcars-block ${value === id ? 'lcars-block--active' : 'lcars-block--mid'}`}>
          <input
            type="radio"
            className="sr-only"
            name={`app-${name}`}
            checked={value === id}
            onChange={() => onPick(id)}
            data-testid={`app-settings-${name}-${id}`}
          />
          {t(`${labelKey}.${id}`)}
        </label>
      ))}
    </div>
  );
}

/**
 * @param {{open: boolean, onClose: () => void, value: 'full'|'reduced'|'off',
 *          onChange: (value: string) => Promise<unknown>,
 *          questionAlerts?: 'popup-notify'|'popup'|'off', notificationSound?: boolean,
 *          onSave?: (partial: object) => Promise<unknown>,
 *          language?: 'auto'|'sv'|'en', onLanguage?: (language: string) => Promise<unknown>}} props
 *   value is the mode in effect; onSave saves questionAlerts or notificationSound; onLanguage saves the language
 */
export default function AppSettingsDialog({
  open,
  onClose,
  value,
  onChange,
  questionAlerts = 'popup-notify',
  notificationSound = true,
  onSave = async () => {},
  language = 'auto',
  onLanguage = saveLanguage
}) {
  const { t } = useTranslation();
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
      setError(t('settings.saveFailed', { error: errorText(err) }));
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
          <h2 id="app-settings-title">{t('settings.title')}</h2>
          <fieldset className="settings-group">
            <legend>{t('settings.languageLegend')}</legend>
            <select className="lcars-select"
              aria-label={t('settings.languageLegend')}
              value={language}
              onChange={(e) => save(() => onLanguage(e.target.value))}
              data-testid="settings-language"
            >
              {LANGUAGE_SETTINGS.map((id) => (
                <option key={id} value={id}>
                  {t(`settings.language.${id}`)}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset className="settings-group">
            <legend>{t('settings.animationsLegend')}</legend>
            <RadioBlocks name="animations" ids={ANIMATION_IDS} labelKey="settings.animations" value={value} onPick={(id) => save(() => onChange(id))} />
            <p className="muted settings-help">{t('settings.animationsHelp')}</p>
          </fieldset>
          <fieldset className="settings-group">
            <legend>{t('settings.alertsLegend')}</legend>
            <RadioBlocks
              name="alerts"
              ids={ALERT_IDS}
              labelKey="settings.alerts"
              value={questionAlerts}
              onPick={(id) => save(() => onSave({ questionAlerts: id }))}
            />
            <p className="muted settings-help">{t('settings.alertsHelp')}</p>
          </fieldset>
          <fieldset className="settings-group">
            <legend>{t('settings.soundLegend')}</legend>
            <RadioBlocks
              name="sound"
              ids={SOUND_IDS}
              labelKey="settings.sound"
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
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
