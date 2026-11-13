# Code Summary: US-0701 i18n foundation and English

## Test baseline and result

- **Before any edit:** 33 files, 116 tests, all passing.
- **After the build:** 38 files, 138 tests, all passing (`npx vitest run tests/`). That is 116 existing tests, 20 new i18n tests, and 2 for the custom plan name.
- **This work's scoped command** (from `unit-test-instructions.md`): 8 files, 31 tests, all passing.
- **`npx electron-vite build`:** succeeds, and both language files are bundled into the main and renderer builds.
- **Tests written but not run:** none.

## Files

- **New:**
  - `src/shared/i18n.js`, `src/shared/locales/sv.json`, `src/shared/locales/en.json`
  - `src/main/i18n.js`
  - `tests/renderer/setup-i18n.js`
  - Tests: `tests/main/i18n.test.js`, `tests/main/i18nKeys.test.js`, `tests/main/notify.test.js`, `tests/renderer/format.test.jsx`, `tests/renderer/AppSettingsDialog.test.jsx`
- **Main process:** `menu.js`, `notify.js`, `ipc.js`, `index.js`, `settings.js`, `features.js`, `projectService.js`, `setup.js`, `git.js`, `projectAccess.js`, `pty.js`, `models.js`, `parsers/features.js`, `parsers/ledger.js`, `parsers/state.js`
- **Preload:** `src/preload/index.js` (adds `getLanguage`)
- **Renderer:**
  - Components: `App.jsx`, `AppSettingsDialog.jsx`, `ArtifactReader.jsx`, `BoltDag.jsx`, `CostPanel.jsx`, `CostTab.jsx`, `DocsDialog.jsx`, `FeaturesView.jsx`, `IntentDetail.jsx`, `IntentList.jsx`, `Lcars.jsx`, `Pipeline.jsx`, `ProjectSettingsDialog.jsx`, `ProjectView.jsx`, `QuestionPopup.jsx`, `RefreshPanel.jsx`, `ResumeButton.jsx`, `SetupAidlc.jsx`, `TerminalPanel.jsx`, `TerminalContext.jsx`, `Timeline.jsx`
  - Helpers and setup: `terminalControl.js`, `featureDocsPrompt.js`, `format.js`, `useFeatures.js`, `useProject.js`, `main.jsx`
  - Styles: `theme.css`
- **Config:** `package.json`, `package-lock.json`, `vitest.config.mjs`
- **Changed tests:** `menu.test.js`, `settings.test.js`, `theme.test.js`, `parsers.test.js`, `ResumeButton.test.jsx`, `RefreshPanel.test.jsx`, `IntentList.test.jsx`
- **New dependencies:** `i18next` ^27.1.1, `react-i18next` ^18.0.1, `i18next-icu` ^2.7.0, `intl-messageformat` ^12.1.5

## Key implementation decisions

- **One shared i18n module** for both processes: ICU plurals, English fallback, then the key itself. The dev-only log fires once per key that is missing in every language. `resolveLanguage` gives Swedish when the OS locale starts with `sv` and English otherwise.
- **Live switch:**
  - `settings:set` switches the main language and rebuilds the menu, only when the language changed.
  - The renderer reads the resolved language through the new `i18n:language` IPC and re-renders through `useTranslation`, with no remount, so tabs and terminals survive.
  - `main.jsx` waits for the language before the first render, so the app never shows the wrong language at start.
- **Inline elements in texts** use a small `withSlots` helper. Translated text is never parsed as markup.
- **LCARS:** `.lcars-block` and `.lcars-label` wrap long words. Tab blocks shrink their text with `clamp()`.

## Change asked for during this stage

- **Custom plan names** are now shown in place of the base scope. A custom plan's intent listed as "bugfix" because the app read only `Scope`.
  - `parsers/state.js` reads the `Plan` line, and `projectService.js` passes it on.
  - The intent list (row and filter) and the intent header show the plan name, with "Custom plan based on {scope}" on hover.
  - Tests: one parser test and one intent-list test.

## Deviations from the plan

- **Dollar amounts** keep the `$5.00` form in both languages, because existing tests pin it. There is a `ponytail:` note in the code. Dates and token counts follow the language.
- **Extra namespace and files:**
  - Added a `github` namespace for the GitHub panel.
  - Also translated four files the plan did not list but that show text: `TerminalContext.jsx`, `terminalControl.js`, `main/models.js` and `parsers/ledger.js`.
- **Removed constants:** some exported text constants (for example `COST_LABEL` and `BUSY_MESSAGE`) are gone. The two tests that imported them now compare against the Swedish text.
- **FR8.2 is checked through the CSS rules only.** jsdom cannot measure layout.
- **Texts already sent or stored** before a switch stay in the old language until they are produced again: a folder's detection reason, parser warnings and error banners that are already showing.
- **One shell edit:** the menu labels in `src/main/menu.js` were replaced by a script run from the shell instead of the file tools. The result is tested.

## Left untranslated on purpose (FR6)

- **Project content:** intent and stage names, audit fields, file contents and Claude's output.
- **Identifiers:** statuses, scope names and commands.
- **Fixed labels:** the brand name, USD and time units.
- **Language names:** "Svenska" and "English" read the same in both files.
- **Developer-only text:** `console.*` messages.
