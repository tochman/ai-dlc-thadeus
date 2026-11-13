# Code Generation Plan: US-0701 i18n foundation and English

## Summary

- Builds: i18next translation for the whole app (Swedish and English), a language setting with live switching, and key checks
- Touches: new `src/shared/i18n.js` + `src/shared/locales/{sv,en}.json`; every view in `src/renderer/`; `src/main/{menu,notify,ipc,settings,index}.js` and main-process user-facing errors; `theme.css`; `package.json`
- Tests: about 14 new unit tests in 4 new test files and 3 extended ones, plus the existing suite kept green

## Context

- Zero-Unit work: one iteration, with requirements from `inception/requirements-analysis/requirements.md` (FR1–FR8, NFR1–NFR4). There is no unit-of-work, functional design or fresh code map; the work is scoped from the requirements and the code as it stands.
- Brownfield: files are changed in place. Swedish texts keep their wording (they move into `sv.json`); English is written here (FR2.3).
- Not translated (FR6): project content (intent names, stage names as AI-DLC writes them, audit events, file contents, Claude output) and identifier terms (`express`, `in-flight`, stage slugs). Developer-only `console.*` messages stay as they are.

## Design decisions

- **One shared i18n module** `src/shared/i18n.js`, imported by both the main process and the renderer, so the files and rules are the same on both sides. It creates an i18next instance with `i18next-icu`, the two bundled resource files, `fallbackLng: 'en'`, `returnEmptyString: false`, a `parseMissingKeyHandler` that returns the key, and a dev-only `missingKeyHandler` that logs each missing key once per language (FR5). It exports `resolveLanguage(setting, osLocale)`: `sv`/`en` as chosen; `auto` (or anything invalid) gives `sv` when the OS locale starts with `sv`, otherwise `en` (FR4.2, assumption in requirements).
- **Placeholders and plurals**: ICU `{name}` and `{n, plural, one {…} other {…}}` via `i18next-icu` (FR3.2, FR3.3).
- **Formatting**: `formatTime`, durations where a unit word is shown, numbers and USD amounts use `Intl` with the current language (`sv-SE` / `en`) (FR3.4).
- **Language setting**: `language: 'auto' | 'sv' | 'en'` in the app's `settings.json`, sanitized like the other keys (FR4.3).
- **Live switch** (FR4.4, NFR3): the renderer's settings dialog saves `language` through `settings:set`. In the main process, `settings:set` notices a changed language, calls `changeLanguage` on the main instance and rebuilds the menu (`applyMenu`). A new IPC `i18n:language` (exposed in preload as `getLanguage`) returns the resolved language; the renderer calls it on start and after a save and then `changeLanguage`, so every view re-renders through `useTranslation` with no reload.
- **Main-process errors** that reach the screen (`reason`, `warning` and thrown `Error` messages in `features.js`, `projectService.js`, `setup.js`, `settings.js`, `ipc.js`, `git.js`, `projectAccess.js`, `pty.js`, `parsers/features.js`) are produced with the main instance's `t()`, so they arrive in the chosen language.
- **Claude prompts** (`featureDocsPrompt.js`) are looked up by key and follow the language (FR1.3).
- **LCARS labels** (FR8): the label and block rules in `theme.css` get `min-width: 0`, `overflow-wrap: anywhere`, `hyphens: auto` and a `clamp()` font size where a block has a fixed width, so long words shrink or wrap instead of overflowing.
- **Tests stay on Swedish by default**: a Vitest setup file for the renderer project initializes i18n in `sv`, so existing assertions on Swedish text keep passing; new tests switch to `en` where they check English.

## Steps

### Step 1: Project structure and production configuration
- [x] Install the runtime dependencies named in NFR1: `npm install i18next react-i18next i18next-icu intl-messageformat` (`intl-messageformat` is the ICU formatter `i18next-icu` needs).
- [x] Create `src/shared/locales/sv.json` and `src/shared/locales/en.json` with the namespaces `app`, `intents`, `pipeline`, `cost`, `terminal`, `features`, `setup`, `settings`, `menu`, plus `common` for shared words such as status labels and `errors` for main-process messages (FR2.1, FR2.2, FR2.4).
- [x] Create `src/shared/i18n.js` as described under Design decisions (FR3.1, FR3.2, FR3.3, FR5.1, FR5.2, NFR4).
- Traces to: FR2, FR3.1–FR3.3, FR5, NFR1, NFR4.

### Step 2: Verify the test runner and record the unit-scoped command
- [x] Run `npx vitest run tests/` once before any edit and record the baseline (total, passing, failing) in `code-summary.md` (brownfield test baseline).
- [x] Add `tests/renderer/setup-i18n.js` and register it as `setupFiles` in the renderer project of `vitest.config.mjs`, initializing i18n in `sv`.
- [x] Confirm the command in `unit-test-instructions.md` runs.
- Traces to: NFR2.

### Step 3: Business logic: i18n module, settings and language resolution — implement
- [x] `src/main/settings.js`: sanitize `language` (`auto`/`sv`/`en`, invalid or missing dropped so the default `auto` applies) (FR4.3).
- [x] `src/main/i18n.js` (small): holds the main-process instance, `currentLanguage()` and `setLanguageFromSettings(settings)` using `resolveLanguage(settings.language, app.getLocale())` (FR4.2).
- [x] Move `format.js` label maps (`STAGE_STATUS_LABEL`, `UNIT_STATUS_LABEL`, `CATEGORY_LABEL`, `COST_LABEL`, `COST_EXPLANATION`) to keys, and make `formatTime` and number/money formatting use `Intl` with the current language (FR1.1, FR3.4).
- Traces to: FR1.1, FR3.4, FR4.2, FR4.3.

### Step 4: Business logic — write and run its tests
- [x] `tests/main/i18n.test.js`: ICU plural `n=1`/`n=2` in `sv` and `en`; `{placeholder}` interpolation; a key missing in `sv` falls back to the English text; a key missing in both returns the key, never `''`; `resolveLanguage` for `auto` + `sv-SE` → `sv`, `auto` + `de-DE` → `en`, `en` → `en`, invalid value → treated as `auto` (FR3.2, FR3.3, FR4.2, FR5.1).
- [x] `tests/main/settings.test.js` (extend): `language` kept when valid, dropped when invalid (FR4.3).
- [x] `tests/renderer/format.test.jsx` (new): a date formats with `sv-SE` under Swedish and with `en` under English (FR3.4, FR3.5).
- [x] Run them with the command in `unit-test-instructions.md`.

### Step 5: API / endpoint: main process, menu, notifications, IPC — implement
- [x] `src/main/menu.js`: every label through `t('menu.*')`; `applyMenu` reads the current language (FR1.2).
- [x] `src/main/notify.js`: title and gate body through `t()` (FR1.2).
- [x] `src/main/ipc.js`: the open-folder dialog title through `t()`; `settings:set` applies a changed `language` (main `changeLanguage` + `applyMenu`); new `i18n:language` handler (FR4.4).
- [x] `src/main/index.js`: set the main language from settings before the first window and menu.
- [x] `src/preload/index.js`: expose `getLanguage: call('i18n:language')` (narrow API, NFR4).
- [x] User-facing `reason` / `warning` / thrown messages in `features.js`, `projectService.js`, `setup.js`, `settings.js`, `git.js`, `projectAccess.js`, `pty.js`, `parsers/features.js` through `t('errors.*')`; `parsers/features.js` `STATUS_LABEL` through keys (FR1.2).
- Traces to: FR1.2, FR4.4, NFR4.

### Step 6: API / endpoint — write and run its tests
- [x] `tests/main/menu.test.js` (extend): with the language set to `en`, `buildMenuTemplate` returns English labels (for example `File`, `Open project…`); with `sv`, today's labels (FR1.2, FR4.4).
- [x] `tests/main/notify.test.js` (new): `notificationTitle` / `notificationBody` in English for a question and a gate (FR1.2).
- [x] Run them with the command in `unit-test-instructions.md`.

### Step 7: Frontend behavior — implement
- [x] Initialize i18n in `src/renderer/main.jsx` (bundled resources, language from `bridge.getLanguage()`), wrap the app so components can use `useTranslation`.
- [x] Replace hard-coded interface text with `t('<namespace>.<key>')` in every renderer component and helper: `App.jsx`, `AppSettingsDialog.jsx`, `ArtifactReader.jsx`, `BoltDag.jsx`, `CostPanel.jsx`, `CostTab.jsx`, `DocsDialog.jsx`, `FeaturesView.jsx`, `IntentDetail.jsx`, `IntentList.jsx`, `Lcars.jsx`, `Pipeline.jsx`, `ProjectSettingsDialog.jsx`, `ProjectView.jsx`, `QuestionPopup.jsx`, `RefreshPanel.jsx`, `ResumeButton.jsx`, `SetupAidlc.jsx`, `Splash.jsx`, `TerminalPanel.jsx`, `Timeline.jsx`, `useFeatures.js`, `useProject.js`, `featureDocsPrompt.js`. This includes `aria-label`s, `title`s and placeholders; project content and identifier terms stay as they are (FR1.1, FR1.3, FR6).
- [x] `AppSettingsDialog.jsx`: a "Språk / Language" select with Automatiskt / Automatic, Svenska, English (`data-testid="settings-language"`); saving calls `setSettings({ language })`, then `getLanguage()` and `changeLanguage` (FR4.1, FR4.4).
- [x] `theme.css`: LCARS label and block wrapping/shrinking rules (FR8.1).
- [x] Write the English text for every key in `en.json` (FR2.3).
- Traces to: FR1.1, FR1.3, FR2.3, FR4.1, FR4.4, FR6, FR8.1.

### Step 8: Frontend behavior — write and run its tests
- [x] `tests/renderer/AppSettingsDialog.test.jsx` (new): picking English calls `setSettings({ language: 'en' })` and the dialog's own labels switch to English without a reload (FR4.1, FR4.4, FR4.5).
- [x] `tests/main/theme.test.js` (extend): the LCARS label rule carries `overflow-wrap: anywhere` and `min-width: 0` (FR8.1, FR8.2).
- [x] `tests/main/i18nKeys.test.js` (new): `sv.json` and `en.json` have exactly the same keys (FR7.1); every literal `t('…')` key found in `src/**/*.{js,jsx}` exists in `en.json` (FR7.2); each key has the same `{placeholders}` in both files (FR7.3); no value is empty.
- [x] Regression check (bugfix floor, FR1.4): the same test fails when a Swedish interface string (any of `å`, `ä`, `ö` inside a JSX text node or a string passed as a label) is left in `src/renderer/*.jsx` or `src/main/menu.js`, with an allowlist for comments and `console.*`.
- [x] Run them with the command in `unit-test-instructions.md`; then run the full suite and fix any existing test that broke.

### Step 9: Environment / build configuration
- [x] Confirm `npm run build`'s electron-vite step bundles the JSON files in both the main and the renderer build (they are imported, so no extra config is expected), by running `npx electron-vite build`.

### Step 10: Documentation and traceability
- [x] Short comment at the top of `src/shared/i18n.js` describing the key format, ICU plurals and the fallback order (for US-0702 translators).
- [ ] `code-summary.md` and `traceability.json` in the record (the conductor writes these after the build).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "bugfix",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:933f32e0a09112bec79e6ad9d9b07d8fa79b601a7b325fbe1f9a283f191ae54c",
  "contract_sha256": "sha256:8b88443a8c617567a1344d4ec2a14fc8e4e0abe702a4048e68bc207a690b0910"
}
```

Layers not applicable here: Data model / database behavior and Repository / data access (the app has no database; the only stored data is the `language` key, covered in Step 3).
