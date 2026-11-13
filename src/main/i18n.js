// The main process's language (EPIC-07 US-0701 FR4.2): from the saved `language` setting, where auto follows
// the OS locale. Menus, dialogs, notifications and errors read it through the shared instance.
import { app } from 'electron';
import i18n, { resolveLanguage } from '../shared/i18n.js';

export const currentLanguage = () => i18n.language;

/** Switches to the language the settings ask for; returns it. */
export function setLanguageFromSettings(settings) {
  const lng = resolveLanguage(settings?.language, app.getLocale());
  if (lng !== i18n.language) i18n.changeLanguage(lng); // bundled resources: the switch is synchronous
  return lng;
}
