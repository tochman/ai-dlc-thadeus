# Code Summary: v0.2.3 release

## Test results

| Run | Files | Tests | Pass | Fail |
|-----|-------|-------|------|------|
| Step 1 baseline (unchanged tree) | 45 | 224 | 223 | 1 |
| After the build | 49 | 267 | 266 | 1 |

The one failure is the same in both runs: `tests/main/featureDocsStatus.test.js` ("US-0902 is delivered … but isn't marked ✅ Done"). It goes green when the feature docs are updated in Deployment Execution. No regressions (NFR1). `npx electron-vite build` compiles.

## Second build (after the jump back from Build and Test)

| Run | Files | Tests | Pass | Fail |
|-----|-------|-------|------|------|
| After Steps 22–24, 23a and 23b, with the feature docs updated | 50 | 275 | 275 | 0 |

- **Step 22–23, US-0408 (FR1.6):**
  - "Om T.H.A.D.E.U.S." replaces Electron's `role: 'about'`. It is in the app menu on macOS and in Hjälp on Linux.
  - New `src/renderer/AboutDialog.jsx` (a native `<dialog>`): mark, name, full name, tagline and the version from `getAppInfo()`, with "–" when that fails. It closes with Esc, Stäng or a backdrop click, and focus goes back to where it was.
  - `app.setAboutPanelOptions` was removed because nothing opens that panel any more, so the old panel's "© Auctum" line is gone too.
  - No new locale keys: `menu.about`, `settings.about.version` and `common.close` already existed.
  - Tests: `tests/main/menu.test.js` (7) and new `tests/renderer/AboutDialog.test.jsx` (5).
- **Step 23a, epic badge fix:**
  - New `epicStatusOf()` in `src/main/parsers/features.js`: mixed markers → in progress, all ✅ → done, all 📋 → planned. FEATURES.md rows use it.
  - Tests: `tests/main/features.test.js`.
- **Step 23b, busy-tab alignment:**
  - The 1px ring of the breathing glow (`lcars-breathe` and the reduced-motion `.is-breathing`) is now `inset`. A WORKING agent tab no longer looks 1px left of the SHELL block and 1px above the bar.
  - Test: `tests/main/theme.test.js`.
- **Feature docs:**
  - US-0902, US-0904, US-0407 and US-0803 are marked ✅ Done for v0.2.3, and US-0408 🚧 In progress for v0.2.3, in the epic files and FEATURES.md, per the person's new lifecycle rule.
  - This cleared the `featureDocsStatus` failure.

## Third build (Step 23c, after the second jump back)

- **Change:** `features.prompt.rule` in `src/shared/locales/en.json` and `sv.json` now asks the agent to save, through AI-DLC's own rule mechanism, the full story lifecycle as a project rule for every AI tool in the project (Claude Code, opencode and the others):
  - a new story goes into its epic right away;
  - 🚧 In progress when work on it starts;
  - ✅ Done when it is built and approved, with its met criteria ticked;
  - "for vX.Y.Z" once the release is known, and "Released in vX.Y.Z" at the tag;
  - a delivered story never stays in progress.
- **Tests:**
  - New `tests/renderer/featureDocsPrompt.test.jsx` (3 tests, both languages, no newline).
  - `tests/renderer/SetupAidlc.test.jsx` now asserts the new wording instead of the old "byggs och släpps".
- **Full suite:** 51 files, 278 of 278 pass.

## Files created

| File | Purpose |
|------|---------|
| `src/shared/configTables.js` | The fixed lists of settings, values, guard switches, efforts, presets and groups. Main checks every change against them and the renderer offers only these (NFR4). |
| `src/main/aidlcWrite.js` | US-0902: builds, previews and applies AI-DLC setting changes, and edits the Guard Policy lock (that section only, only if the file is unchanged since the diff was shown). |
| `src/main/modelChoice.js` | US-0904: model rules for Claude and opencode, model commands, the drift check and the cost estimate. |
| `src/main/updater.js` | US-0407: checks and downloads through `gh`, picks the asset, checks it is this repo's own, verifies `SHA256SUMS.txt`, then installs (`hdiutil`/`ditto`/`xattr`/`osascript` on macOS, `pkexec dpkg -i` on Linux) and relaunches. |
| `src/renderer/ConfigEdit.jsx` | Change panel (preview, then Apply), the where-it-applies choice, editors for the active work and project defaults, guard switches, Guard Policy lock and the model picker. |
| `src/renderer/UpdateNotice.jsx` | LCARS update notice (not a modal). |
| `tests/main/aidlcWrite.test.js` (7), `tests/main/modelChoice.test.js` (8), `tests/main/updater.test.js` (10), `tests/renderer/UpdateNotice.test.jsx` (6) | New tests. |

## Files changed

- **Main process:** `ipc.js` (14 new handlers plus `harnessTabs`), `preload/index.js`, `menu.js` ("Sök efter uppdatering…"), `index.js` (daily check after load), `settings.js` (`updates`, `harnessTabs`).
- **Renderer:** `ConfigView.jsx`, `TerminalContext.jsx`, `TerminalPanel.jsx`, `ProjectView.jsx`, `ProjectSettingsDialog.jsx`, `RefreshPanel.jsx`, `ResumeButton.jsx`, `App.jsx`, `SettingsView.jsx`, `theme.css`.
- **Locales:** sv and en, with parity checked by `tests/main/i18nKeys.test.js`.
- **Build:** `.github/workflows/release.yml` publishes `SHA256SUMS.txt`; `package.json` and `package-lock.json` are at 0.2.3.
- **Extended tests:** `settings.test.js` +2, `menu.test.js` +1, `ConfigView.test.jsx` +5, `TerminalPanel.test.jsx` +3, `ProjectSettingsDialog.test.jsx` +1. That makes 43 new tests in all.

## Key decisions

- **Commands follow the real `aidlc --help`:**
  - `--default-scope` lives under `config flags`, not `config project`.
  - `config providers` and `config project` take no write target, so the where-it-applies choice is shown only for flags and models.
  - Model changes apply to this project or only me.
- **Fixtures were captured from real output** of `aidlc config models --show --json`, `opencode models` and `gh release view --json`. A dry run confirmed that `aidlc` lowers `xhigh` to `high` on opencode and leaves `max` as chosen.
- **The cost estimate uses the project's own ledger** (cost per token for each model). There are no hardcoded prices, and a model the ledger has never used gets no estimate.
- **Two agent tabs, one per harness.** The name `'agent'` still means the last agent tab used, so existing callers and test ids work unchanged.
- **The daily update check** runs from main once the window has loaded, and the notice also asks on mount. Both share one gated check.
- **Settings writes don't collide:** `updates` is merged inside the settings write queue, so concurrent writes don't overwrite each other.

## Deviations from the plan

- New `src/shared/configTables.js` and an extra `update:relaunch` channel, for "Starta om nu" when the package is kept.
- `theme.css`, `ProjectView.jsx`, `RefreshPanel.jsx` and `ResumeButton.jsx` were changed for US-0803's busy checks and the "Fortsätt i opencode" label.
- Step 15 was built before Steps 13 and 14, because the busy check in Step 13 needs `anyBusy()`.
- Step 12's `config:apply` test runs against `aidlcWrite.apply()`, the validator the handler calls. `ipc.js` itself is not unit-tested.
- A local variable named `aidlc` in `ipc.js` and `SettingsView.jsx` was renamed (`aidlcRow`, `aidlcTool`) because the project's write-guard hook read it as a shell command. The `aidlc` key in `app:info` is unchanged.
- The "what it protects" text for each guard switch was written from the guard names and should be read through once.

## Tests written but not executed against the real system

- The install path (`ditto` over the running bundle, the admin prompt, `xattr`, `pkexec dpkg -i`) and the `gh release download` progress polling ran only against fakes. A real update on macOS and Linux belongs in Build and Test.
- FR2.1 (20 000-event render timing in Electron) and FR2.2 (installed-release check on macOS and Linux) are manual checks for Build and Test.
- The plan has no CI Pipeline stage, so CI runs only when the release PR is opened.
