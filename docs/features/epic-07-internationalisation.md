# EPIC-07: Internationalisation

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> The console is written in Swedish today, with the strings in the components. To be usable by more people it should speak English as well, and anyone should be able to add their own language without rebuilding the app: drop a translation file in a folder and the language shows up.

**Stories:** US-0701, US-0702

**Status (2026-11-14):** ✅ US-0701 released in v0.2.1. US-0702 📋 Planned.

---

## User Stories

**US-0701: i18n foundation and English** ✅ Released in v0.2.1
- As a **developer who does not read Swedish**, in order to **use the console in a language I understand**, I would like to **all interface text to come from translation files, with English and Swedish shipped**.
- **Epic:** EPIC-07
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] Every user-facing string in the renderer and in the main process (dialogs, menus from US-0404, error messages, notifications) is looked up by key, for example `t('intents.resume', { stage, n, m })`. No hard-coded interface text is left in the components.
  - [x] Two language files are shipped: `sv.json` (today's texts) and `en.json` (English). Keys are namespaced by view (`app.*`, `intents.*`, `pipeline.*`, `cost.*`, `terminal.*`, `features.*`, `setup.*`, `settings.*`, `menu.*`).
  - [x] Interpolation (`{stage}`) and plural forms (`{n, plural, one {# händelse} other {# händelser}}`, or a simple `one`/`other` pair per key) are supported. Numbers, money and dates are formatted with `Intl` for the chosen language.
  - [x] **Choosing a language:** "Språk / Language" in the app settings, with "Automatiskt" (from the operating system's language, `app.getLocale()`) as the default. The choice is saved in the app's own `settings.json`. The view switches language at once, with no restart.
  - [x] A key that is missing in the chosen language falls back to English, then to the key itself. It is never shown as empty. In development a missing key is logged once.
  - [x] **Not translated:** content from the project (intent names, stage names, audit events, file contents, Claude's output) and AI-DLC's own terms that are identifiers (`express`, `in-flight`, stage slugs).
  - [x] A test checks that `sv.json` and `en.json` have the same keys, and that every `t('…')` key used in the code exists in `en.json`.
  - [x] LCARS labels keep working in both languages: long English or Swedish words do not break blocks. Labels shrink or wrap instead of overflowing.
- **Dependencies:** US-0403 (the new UI), US-0404 (menus)

**US-0702: Add your own language with a translation file** 📋 Planned
- As a **user who speaks another language**, in order to **use the console in my language without waiting for a new release**, I would like to **put a translation file in a folder and have the app find it and offer the language**.
- **Epic:** EPIC-07
- **Priority:** Low
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [ ] The app looks for translation files in a user folder, `<userData>/locales/` (for example `~/Library/Application Support/aidlc-dash/locales/` and `~/.config/aidlc-dash/locales/`), in addition to the shipped `sv.json` and `en.json`. A file named after a language code (`de.json`, `fi.json`, `pt-BR.json`) adds that language.
  - [ ] **Discovered automatically:** the language list in the settings shows the shipped languages and every valid file found, by the name the file gives itself (`"$meta": { "name": "Deutsch", "code": "de", "author": "…", "version": "…" }`). The folder is watched, so a new or changed file shows up without a restart.
  - [ ] **Safe to load:** the file is plain JSON with string values only. It is never run as code and never rendered as HTML. Values are checked: unknown keys are ignored, and values with different `{placeholders}` from English are rejected per key, with a warning. A file that cannot be read gives a short message and is skipped, and the app keeps working.
  - [ ] **Partial files are fine:** keys a user file lacks fall back to English. The settings show how complete the language is ("Deutsch · 86 %").
  - [ ] **Start a translation:** a button "Skapa översättningsfil" / "Create translation file" writes a template to the user folder: every key with the English text and an empty `$meta`. It opens the folder in Finder or the file manager. This writes only to the app's own folder, never into a project.
  - [ ] **Documentation:** a short "How to translate" in `docs/` describes the format, placeholders, plural forms and where the folder is, so users can share their files (for example as a pull request that adds the file to the shipped languages).
  - [ ] A user file with the same code as a shipped language overrides the shipped one, so typos can be corrected locally. The settings show that it is overridden.
- **Dependencies:** US-0701
