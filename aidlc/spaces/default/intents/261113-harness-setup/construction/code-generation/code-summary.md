# Code Summary: US-0802 Set up AI-DLC for another harness

## Test baseline and result

- **Before any edit:** 39 files, 150 tests, all passing.
- **After the build:** 39 files, 161 tests, all passing (11 new). The scoped command passes 27 tests in 4 files.
- **`npx electron-vite build`:** succeeds.
- **Tests written but not run:** none. The IPC handlers and the `ProjectView` wiring (re-detection after setup, FR4.1) have no direct test. Nothing ran the real CLI with `--yes`.

## CLI harness ids (checked with `--dry-run` only)

aidlc 2.11.3 was run as `aidlc --project-dir <empty temp folder in the record> config --harness <id> --dry-run`.

- **All six accepted:** `claude` (create 360, preserve 1), `opencode` (376), `codex` (418), `kiro` (379), `cursor` (369) and `copilot` (374).
- **A control id is refused:** `bogus` gives "harness bogus is not installed".
- **Clean-up:** the folder stayed empty and was deleted.
- **Still open:** whether adding a harness leaves an existing AI-DLC install untouched was not checked against a real project. `runSetup`'s remove/conflict guard covers it at runtime.

## Files

- **`src/shared/harnesses.js`:**
  - a `setupId` on every entry;
  - `setupHarness(id)`;
  - `defaultSetupHarness(detected, { add })`, which picks the only harness with a found CLI, else Claude Code, else the first found. Add mode skips installed harnesses.
- **`src/main/setup.js`:**
  - `getSetupInfo(root, { harness })` previews the chosen harness.
  - `runSetup(root, choices, info)` replaces `buildSetupCommand`. It runs these steps one after another with fixed arguments, a 120 s timeout each, and stops at the first failure: git init (setup mode, no repo only), `aidlc --project-dir <root> config --harness <id> --yes`, plugins, then preset.
  - A per-root lock blocks a second run.
  - It needs a preview for the same harness and refuses conflicts. Add mode also refuses removals or a preview error.
- **`src/main/ipc.js`:** `setup:info` takes `{harness}`. `setup:run` replaces `setup:command`, and re-runs detection after success.
- **`src/preload/index.js`:** `runSetup` replaces `buildSetupCommand`.
- **`src/renderer/SetupAidlc.jsx`:**
  - The Harness select lists all six, each with CLI found or not found, "files only", and installed (disabled) in add mode.
  - Changing it re-runs the preview.
  - Apply shows running, then the result, with the CLI error on failure.
  - After success comes the offer to switch the agent tab. There is no more typing into the shell tab.
- **`src/renderer/ProjectSettingsDialog.jsx`:**
  - the installed harnesses line;
  - "Lägg till harness… / Add harness…";
  - the busy check, now an exported `confirmHarnessSwitch`.
- **`src/renderer/ProjectView.jsx`:** the add-mode panel, re-detection after setup, and the switch through `confirmHarnessSwitch`.
- **Locales:** `sv.json` and `en.json` with identical keys. Four keys no longer used were removed.
- **Tests:** `tests/main/setup.test.js`, `tests/main/harness.test.js`, `tests/renderer/SetupAidlc.test.jsx`, `tests/renderer/ProjectSettingsDialog.test.jsx`.

## Deviations from the plan

1. **`runSetup`'s third argument is the last `getSetupInfo` result,** not the plugin list. The guards need the preview, and main now decides about git init.
2. **Conflicts are refused in both modes,** not only add mode. Removals and preview errors are refused in add mode only.
3. **"Installed and can't be picked"** is tested in `SetupAidlc.test.jsx`. The dialog test checks the installed line and that the button opens add mode.
4. **Known gap:** in a project that had no AI-DLC before, the switch offer can disappear when the view changes to the AI-DLC view. The new harness is then picked automatically if it is the only one installed and no other harness was saved. In add mode the offer stays.
5. **A Close button** was added to the add-mode panel.
