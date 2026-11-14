# Code Summary: US-0901 See a project's AI-DLC configuration

## Test baseline and result

- **Before any edit:** the scoped command ran 3 existing files with 14 tests, all passing.
- **After the build:** the scoped command passes 29 tests in 5 files. The full `npm test` passes 181 tests in 42 files.
- **`npx electron-vite build`:** succeeds.
- **No direct test:** the `config:get` handler and the config watcher in `ipc.js`, and the preload entries. The build and `node --check` cover their syntax. Their parts are tested: `checkHarness`, `getAidlcConfig`, and `watchFiles` with a `.json` target.

## CLI check on this project (2026-11-14, read-only)

- **`aidlc config --show --json --harness claude`** is refused: "--harness cannot be combined with config --show".
- **`aidlc config --show --json`** fails every section here: "multiple project harnesses are present; pass one --harness <name>". The project now has both Claude Code and opencode.
- **`aidlc config <models|flags|providers|project> --show --json --harness <h>`** works for `claude` and `opencode`. It returns the same `{ok, data}` envelope that `config --show` nests under `sections.<name>`.
- **`aidlc config list --json`** works as described.

## Files

- **`src/shared/harnesses.js`:** `perAgentModels: false` on Cursor and Copilot, plus `scopesDir(entry)`.
- **`src/main/aidlcConfig.js` (new):**
  - `getAidlcConfig(root, { harness, activeScope, exec })` never throws. It runs the four section commands and `config list` in parallel through `runFixed`, and reads the plans at the same time.
  - The result is `{ harness, models, flags, active, provider, plugins, plans, errors }`.
  - A failed command, or an `ok:false` reply, leaves its section `null` with the message in `errors.<section>`. `aidlc` not found sets `errors.missing`.
  - Also here: `checkHarness(id, detected)` (FR4.3), `splitSource` (the bracketed source, nested brackets included) and `CONFIG_WATCH_PATHS`.
- **`src/main/models.js`:** `frontmatterField` is exported so the plans reuse it.
- **`src/main/watcher.js`:** a `watchFiles` file target can end in `.json`.
- **`src/main/ipc.js`:**
  - `config:get` runs `checkHarness`, then reads the active intent from the cached list and calls `getAidlcConfig`. It adds `activeDir`.
  - A per-project `configWatcher` sends `config:changed`. It starts on open and is closed in `closeWatcher`.
- **`src/preload/index.js`:** `getAidlcConfig` and `onConfigChanged`.
- **`src/renderer/ConfigView.jsx` (new):**
  - a loading state, then the six sections;
  - the env tag;
  - a harness picker when more than one harness is installed;
  - greyed models with the reason on Cursor and Copilot;
  - one error sentence with "Set up AI-DLC" in place of every section;
  - an error inside a section when only that command failed;
  - a reload on `config:changed`, and on `project:changed` for the index or the active intent. This happens only while the view is visible; otherwise it reloads on the next show.
- **`src/renderer/ProjectView.jsx`:** the `config` view renders `ConfigView`. The intents view stays mounted but hidden. The setup button opens the existing add-harness setup.
- **`src/renderer/App.jsx`:** the "Konfiguration / Configuration" arm block (AI-DLC projects only), the header title, and `config` in the menu's `view` command.
- **`src/renderer/ProjectSettingsDialog.jsx`:** a button that opens the view.
- **`src/renderer/theme.css`:** `config-*` rules that use the existing tokens.
- **Locales:** `app.config`, `settings.project.openConfig`, `errors.harnessNotInstalled` and the `config.*` block, in both `sv.json` and `en.json`.
- **Tests:** `tests/main/aidlcConfig.test.js` (new, 7 tests), `tests/renderer/ConfigView.test.jsx` (new, 6 tests), one new test each in `tests/main/watcher.test.js` and `tests/renderer/AppShell.test.jsx`.

## Deviations from the plan

1. **Four section commands instead of `config --show`.** AI-DLC refuses `--harness` with `--show`, and without it every section fails in a project with more than one harness. Each section is now `aidlc config <section> --show --json --harness <h>`, so five commands run instead of two. The parsing is unchanged.
2. **Errors per section** (`errors.models`, `errors.flags`, `errors.active`, `errors.provider`, `errors.plugins`) instead of `errors.show` and `errors.list`. This follows FR5.3 at section level.
3. **`config:get` also returns `activeDir`,** so the view can tell whether a `project:changed` event touched the active intent (FR6.1).
4. **The active-work section depends on the active intent.** It says "no active work" when there is no active intent, whatever `config list` answers (FR2.4).
5. **The watched plan folders** are every harness's `scopes/` folder from the table, plus `aidlc/scopes`. The plan named only `.claude/scopes` and `.aidlc/scopes`.

## Assumptions still open

- **Provider field names:** the provider record's fields are assumed to be `provider`, `region` and `profile`. No record exists on this machine (`record: null`), so the section shows "—". The code marks this with a `ponytail:` comment.
- **Copilot plan folder:** Copilot's shipped plans are assumed to be in `.github/skills/aidlc/scopes`, from its first marker. A missing folder just lists no shipped plans.
