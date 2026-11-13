# Requirements: US-0701 i18n foundation and English

## Sources

- Initial description: "US-0701 is next: i18n foundation and English (EPIC-07, docs/features/epic-07-internationalisation.md)" [desc]
- Story US-0701 and its acceptance criteria in `docs/features/epic-07-internationalisation.md` [desc]
- Workflow-selected scope: bugfix base with reverse engineering skipped (plan `i18n-express`) [scope]
- Answers in `requirements-analysis-questions.md` [Q1]–[Q4]
- Current code: `src/renderer/*.jsx`, `src/renderer/format.js`, `src/renderer/featureDocsPrompt.js`, `src/main/menu.js`, `src/main/notify.js`, `src/main/settings.js`

## Intent analysis

The console speaks only Swedish today, and its texts are written straight into the components and the main process. The goal is that a developer who does not read Swedish can use it. Every interface text comes from a translation file, English and Swedish ship with the app, and the language can be switched at once without a restart. This also lays the base that US-0702 (user-supplied language files) builds on, so the file format chosen here is the one translators will write.

- **Type:** enhancement, cross-cutting (renderer and main process)
- **Complexity:** standard. The work is broad (every view) but shallow (no new domain logic).

## Functional requirements

### FR1: Every user-facing text is looked up by key

- **FR1.1** Every user-facing string in the renderer (views, dialogs, buttons, labels, status texts, tooltips, `aria-label`s, error messages) is rendered through `t('<namespace>.<key>', values)`. No hard-coded interface text is left in the components, including the label maps in `src/renderer/format.js` (`STAGE_STATUS_LABEL`, `UNIT_STATUS_LABEL`, `CATEGORY_LABEL`, `COST_LABEL`, `COST_EXPLANATION`). [desc]
- **FR1.2** Every user-facing string in the main process is looked up by key: the application menus from US-0404 (`src/main/menu.js`), native dialogs, notifications (`src/main/notify.js`) and error messages shown to the user. [desc]
- **FR1.3** The ready-made requests the app types into the Claude terminal (for example `src/renderer/featureDocsPrompt.js`) are looked up by key and follow the chosen language. [Q1]
- **FR1.4** Pass/fail: a search of `src/renderer` and `src/main` finds no Swedish interface text outside `sv.json`, apart from what FR6 excludes and developer-only console logs.

### FR2: Two shipped language files

- **FR2.1** The app ships `sv.json` (today's Swedish texts, unchanged in meaning) and `en.json` (English). [desc]
- **FR2.2** Keys are namespaced by view: `app.*`, `intents.*`, `pipeline.*`, `cost.*`, `terminal.*`, `features.*`, `setup.*`, `settings.*`, `menu.*`. A further namespace is added only when a text belongs to none of these (for example `common.*` for shared words such as status labels). [desc]
- **FR2.3** I write the English texts in `en.json` myself. [Q2]
- **FR2.4** Both files are plain JSON. The main process and the renderer read the same two files.

### FR3: Interpolation, plurals and formatting

- **FR3.1** Translation is done with i18next (react-i18next in the renderer, i18next in the main process). [Q4]
- **FR3.2** Placeholders use the `{name}` form: `t('intents.resume', { stage, n, m })` fills `{stage}`, `{n}` and `{m}`. [desc]
- **FR3.3** Plurals use the ICU form inside one string per key, for example `{n, plural, one {# händelse} other {# händelser}}`, with each language's own plural rules (English `one`/`other`, Swedish `one`/`other`). [Q3]
- **FR3.4** Numbers, money and dates are formatted with `Intl` for the chosen language. `formatTime` and the cost readouts no longer hard-code `sv-SE`. [desc]
- **FR3.5** Pass/fail: `t()` with `n = 1` and `n = 2` returns the singular and plural form in both languages, and a date formats as `sv-SE` under Swedish and `en` under English.

### FR4: Choosing the language

- **FR4.1** The app settings dialog (`AppSettingsDialog.jsx`) has a "Språk / Language" choice with the options Automatiskt / Automatic, Svenska and English. [desc]
- **FR4.2** "Automatic" is the default and follows the operating system's language (`app.getLocale()`). [desc]
- **FR4.3** The choice is saved as `language` (`auto`, `sv` or `en`) in the app's own `settings.json`. An invalid or missing value is treated as `auto`, the same way `sanitize` handles the other settings. [desc]
- **FR4.4** Changing the language switches every open view at once, with no restart. The main process rebuilds the application menu and uses the new language for later dialogs and notifications. [desc]
- **FR4.5** Pass/fail: after choosing English, the settings dialog, the current view and the menu bar show English without a reload; after restarting the app, English is still chosen.

### FR5: Fallback for a missing key

- **FR5.1** A key missing in the chosen language falls back to English, then to the key itself. A text is never shown as empty. [desc]
- **FR5.2** In development a missing key is logged once per key and language. Production builds log nothing. [desc]

### FR6: What is not translated

- **FR6.1** Content from the project is shown as it is: intent names, stage names as AI-DLC writes them, audit events, file contents and Claude's output. [desc]
- **FR6.2** AI-DLC terms that are identifiers stay as they are: scope names (`express`), statuses such as `in-flight`, and stage slugs. [desc]

### FR7: Key checks

- **FR7.1** A test checks that `sv.json` and `en.json` have exactly the same keys. [desc]
- **FR7.2** A test checks that every literal `t('…')` key used in `src/` exists in `en.json`. [desc]
- **FR7.3** A test checks that each key's `{placeholders}` are the same in `sv.json` and `en.json`, so a translation cannot drop a value. This follows from FR3.2 and is the same check US-0702 needs.

### FR8: LCARS labels in both languages

- **FR8.1** LCARS labels and blocks keep their layout in both languages. A long English or Swedish word shrinks or wraps instead of overflowing its block or breaking the frame. [desc]
- **FR8.2** Pass/fail: with the longest text of each label in either language, no LCARS block overflows its container in the default window size.

## Non-functional requirements

- **NFR1** New runtime dependencies are limited to `i18next`, `react-i18next` and `i18next-icu` (with the ICU formatter it requires). No other library is added. [Q3] [Q4]
- **NFR2** The existing test suite stays green (`npm test`), and the new checks in FR7 run in the same suite.
- **NFR3** A language switch updates the visible view within one render (no reload, no restart) and does not lose open projects, the terminal session or the selected tab.
- **NFR4** Translation files are read as JSON data only, never run as code, and translated text is never rendered as HTML. The default React escaping stays on.

## Constraints

- Electron app with a React renderer, a preload bridge and a main process. Language changes reach the main process through the existing IPC and settings flow (`src/main/ipc.js`, `src/preload/index.js`, `src/main/settings.js`).
- The app writes only its own `settings.json` and never writes into a project.
- Tests run with Vitest under `tests/main` and `tests/renderer`.

## Assumptions

- [assumption] With "Automatic", an operating-system language that starts with `sv` selects Swedish, and every other language selects English.
- [assumption] ICU plurals together with i18next need the `i18next-icu` plugin. i18next's own plural format uses separate keys (`_one`, `_other`) and does not read `{n, plural, …}`.
- [assumption] Developer-only `console.error` and `console.log` messages in the main process are not user-facing and may stay as they are. Messages that reach the screen are translated.
- [assumption] Swedish texts keep their current wording. This work moves them into `sv.json` and does not rewrite them.

## Out of scope

- US-0702: user language files in `<userData>/locales/`, file watching, completeness percentages and the "Create translation file" button.
- Translating the documentation in `docs/` and the README.
- A release. The epic says this is not part of v0.2.0.

## Assumptions & Open Questions

- The four assumptions above remain assumptions until code generation confirms them against the code.
- Open: the exact key names are set during code generation, inside the namespaces in FR2.2.
