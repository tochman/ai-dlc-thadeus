// Translation for the main process and the renderer (EPIC-07 US-0701). Each process bundles its own copy of
// this module, so `i18n` below is that process's one instance; both read the same two files.
//
// For translators (US-0702): the files are plain JSON in ./locales, nested by view (app, intents, pipeline,
// cost, github, terminal, features, setup, settings, menu, common, errors); a key is the dotted path, e.g.
// `intents.resume.atStage`. Texts use ICU MessageFormat: `{name}` is a value the app fills in, and plurals are
// written inside one text, `{n, plural, one {# event} other {# events}}`, with each language's own plural
// categories. Keep every `{placeholder}` of a key in your translation. A key missing in the chosen language
// falls back to English, then to the key itself, so a text is never empty. Texts are data, never HTML.
import i18next from 'i18next';
import ICU from 'i18next-icu';
import sv from './locales/sv.json';
import en from './locales/en.json';

export const LANGUAGES = ['sv', 'en'];
export const LANGUAGE_SETTINGS = ['auto', ...LANGUAGES];
const LOCALE = { sv: 'sv-SE', en: 'en' };
const DEV = import.meta.env?.DEV === true;
const logged = new Set();

/**
 * The language to use for a `language` setting: sv or en as chosen; auto (or anything else) follows the OS,
 * Swedish when its locale starts with sv, otherwise English (FR4.2).
 */
export function resolveLanguage(setting, osLocale) {
  if (LANGUAGES.includes(setting)) return setting;
  return /^sv(?:[-_]|$)/i.test(String(osLocale ?? '')) ? 'sv' : 'en';
}

const i18n = i18next.createInstance();
i18n.use(new ICU()).init({
  resources: { sv: { translation: sv }, en: { translation: en } },
  lng: 'sv', // what the app spoke before US-0701; main and the renderer set the real language at start
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  initAsync: false, // the files are bundled, so t() works as soon as this module is imported
  returnEmptyString: false, // an empty text counts as missing and falls back (FR5.1)
  returnNull: false,
  parseMissingKeyHandler: (key) => key,
  // Development only: each key missing in every language is logged once per language (FR5.2).
  saveMissing: DEV,
  missingKeyHandler: (_lngs, _ns, key) => {
    const id = `${i18n.language}|${key}`;
    if (logged.has(id)) return;
    logged.add(id);
    console.warn(`[i18n] missing key "${key}" (${i18n.language})`);
  }
});

export const t = (key, values) => i18n.t(key, values);

/** The Intl locale of the current language, for dates and numbers (FR3.4). */
export const locale = () => LOCALE[i18n.language] ?? LOCALE.en;

export default i18n;
