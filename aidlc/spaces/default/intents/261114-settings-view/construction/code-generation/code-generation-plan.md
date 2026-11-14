# Code Generation Plan — US-0405 Settings view with native file pickers

## Summary

- Builds: a Settings view inside the content frame (Verktyg, Utseende, Projekt, Om) with native file and folder pickers, saved tool paths used everywhere the app starts a tool, and the old Inställningar dialog removed.
- Touches: `src/main/tools.js` (new), `settings.js`, `exec.js`, `models.js`, `setup.js`, `aidlcConfig.js`, `harness.js`, `pty.js`, `ipc.js`, `preload/index.js`, `src/renderer/SettingsView.jsx` (new), `App.jsx`, `AppSettingsDialog.jsx` (removed), `theme.css`, `src/shared/locales/sv.json` and `en.json`, plus the tests they carry.
- Tests: 6 test files touched — `tests/main/tools.test.js` (new), `settings.test.js`, `pty.test.js`, `tests/renderer/SettingsView.test.jsx` (new, replaces `AppSettingsDialog.test.jsx`), `AppShell.test.jsx`, and `i18nKeys.test.js` — around 24 cases, all unit level.

## Traceability

| Story | Requirement | Plan steps |
|-------|-------------|------------|
| US-0405 | FR1.1–FR1.3 the view, its four sections, keyboard and screen readers | 9, 10, 11 |
| US-0405 | FR2.1–FR2.5 Verktyg: detection, versions, pickers, validation, next start | 3, 4, 5, 6, 7, 8, 9, 10 |
| US-0405 | FR3.1 Utseende: the five appearance settings | 9, 10 |
| US-0405 | FR4.1–FR4.3 Projekt: default folder, recent projects, link to Projektinställningar | 3, 4, 7, 8, 9, 10 |
| US-0405 | FR5.1 Om: versions, mark, links | 7, 8, 9, 10 |
| US-0405 | FR6.1–FR6.3 one home per setting | 9, 10 |
| US-0405 | FR7.1–FR7.3 storage and safety | 3, 4, 5, 6, 7 |
| US-0405 | NFR1 accessibility, NFR2 localisation, NFR3 layout, NFR4 responsiveness, NFR5 tests | 3–12 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "ultra-express",
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
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
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
  "input_sha256": "sha256:6f8adf2d6d2f23d3a600d90970ef67f4819d061b592e46d5c9ed4bfe67a35dd3",
  "contract_sha256": "sha256:91a3ddbca508f56d1a2f627eda0975405de847674beb23f092e1f43f68275812"
}
```

Test-after is the contract's methodology: each layer below is implemented and then its tests are written and run, in the order of the steps.

## Brownfield safeguards

- **Blast radius:** `settings.js` (read keys), `exec.js`/`models.js`/`setup.js`/`aidlcConfig.js`/`harness.js` (every `aidlc` or `claude` run), `pty.js` (agent and shell start), `ipc.js` and `preload/index.js` (the bridge surface), `App.jsx` (the left arm and the content frame), `AppSettingsDialog.jsx` (removed), `theme.css`, both locale files.
- **Baseline:** `npm test` runs green on `main` before this plan starts (every test in `tests/main` and `tests/renderer`).
- **Rollback:** `git checkout -- .` and `git clean -fd` for the new files; nothing is written outside the repo, and no project folder is touched.
- **No duplicates:** existing files are edited in place; only `tools.js` and `SettingsView.jsx` are new.

## Steps

- [x] **Step 1 — Project structure and production configuration skeleton.** Brownfield: no scaffolding. Confirm the target paths (`src/main/tools.js`, `src/renderer/SettingsView.jsx`) sit in the existing trees and that `electron.vite.config.mjs` and `vitest.config.mjs` already cover `src/**` and `tests/**`; change no configuration.

- [x] **Step 2 — Verify the test runner and record the exact unit-scoped command.** Run the existing runner once (`npx vitest run tests/main/settings.test.js`) to confirm it works, then record in `unit-test-instructions.md` the command scoped to this work's files only:
  `npx vitest run tests/main/tools.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/i18nKeys.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AppShell.test.jsx`

- [x] **Step 3 — Data model: the new settings keys.** In `src/main/settings.js`, extend `sanitize()` with `toolPaths` (`{ aidlc?, claude?, shell? }`, each kept only when it is a non-empty absolute string without a NUL byte) and `defaultProjectFolder` (same rule), and export `TOOL_IDS`. Keep every other key as it is, so no existing setting changes shape. Apply `toolPaths` to the tool resolver on every read and write (see Step 5) so a saved path reaches every starter.

- [x] **Step 4 — Data model tests.** Extend `tests/main/settings.test.js` with one case: a valid `toolPaths` and `defaultProjectFolder` survive a write and a re-read, `setSettings` never drops them when the tabs are saved, and a relative path, a non-string or a NUL byte is dropped so the automatic path applies (FR7.1). Run the file's command and keep it green.

- [x] **Step 5 — Repository/data access: the tool resolver.** New `src/main/tools.js`:
  - a module-level map with `setToolPaths(paths)` and `toolPath(name)` → the saved absolute path for that bare name, else the name itself (FR2.4, NFR1: no string ever reaches a shell);
  - `defaultShell()` → `process.env.SHELL` or the platform default (the rule `pty.js` and `exec.js` already use);
  - `resolveOnPath(name, { exec })` → the first executable file named `name` in the login shell's PATH (`loginPath` from `exec.js`), or null;
  - `probeTool(path, { exec })` → `runFixed(path, ['--version'], …)` (fixed argument, no shell, the 10 s timeout) as `{ found, version }`, the first line capped at 80 characters, a failure as `{ found: false, version: null, error }` (FR2.1);
  - `getTools({ exec })` → the three rows `aidlc`, `claude`, `shell` in parallel, each `{ id, path, source: 'saved'|'auto', found, version, error }`; a saved path wins, the shell falls back to `defaultShell()`, the other two to `resolveOnPath` (FR2.1);
  - `validateTool(id, file, { exec })` → rejects a non-string or relative path, a missing file, a non-executable file, and a file whose `--version` does not answer; resolves `{ ok: true, version }` otherwise (FR2.3). Errors are the translated `errors.tool*` keys.
  Then wire the resolver into `exec.js`'s callers: `models.js`, `setup.js` and `aidlcConfig.js` run `toolPath('aidlc')`; `harness.js`'s `probeCli` runs `toolPath(cli)`; `pty.js` starts the agent with `toolPath(entry.cli)` and the shell with the saved shell path (validated absolute), so `aidlc`, `claude` and the shell are started from the chosen path everywhere (FR2.4).

- [x] **Step 6 — Repository/data access tests.** New `tests/main/tools.test.js`, with an injected `exec` and a temp folder:
  - a saved path wins and is reported as `source: 'saved'`, an automatic one is resolved from PATH (`aidlc`, `claude`) and the shell is `$SHELL` (FR2.1);
  - a tool that cannot answer `--version` is reported as not found with its reason, never as an empty version (FR2.1, A3);
  - `validateTool` rejects a missing file, a non-executable file and a failing `--version`, and accepts an executable that answers (FR2.3).
  Also extend `tests/main/pty.test.js` with one case: a saved `claude` path and a saved shell path are the ones spawned, and no saved path leaves today's `claude` and `$SHELL` (FR2.4). Run and keep green.

- [x] **Step 7 — API layer: the bridge.** In `src/main/ipc.js` add handlers: `tools:info` → `getTools()`, `tools:pick` (a `dialog.showOpenDialog` with `properties: ['openFile']` and a translated title), `tools:save` (`validateTool` then write `toolPaths[id]` through `setSettings`, throwing before anything is saved when validation fails), `tools:reset` (drop the key), `settings:pickDefaultFolder` (a folder dialog with the saved folder as `defaultPath`) and `settings:clearDefaultFolder`; `project:pick` opens at the saved default folder as `defaultPath` (FR4.1); `app:info` → `{ version: app.getVersion(), aidlc: <the aidlc row from getTools> }`; `app:openExternal` accepts only the fixed keys `repo`, `features` and `docs` (the renderer never names a URL). Add the matching named functions to `src/preload/index.js`: `getTools`, `pickTool`, `saveTool`, `resetTool`, `pickDefaultFolder`, `clearDefaultFolder`, `getAppInfo`, `openExternal`, and pass `toolPaths` into `spawnSession` from the settings read in the pty handler. No generic `invoke` or `send` (C1).

- [x] **Step 8 — API layer tests.** The main-side handlers stay thin over Step 5's tested functions, so the layer's tests are the renderer tests against the named bridge functions (Step 10); `ipc.js` itself needs Electron and is not loadable under Vitest, the convention this repo already follows. Record that decision in `code-summary.md` rather than inventing an Electron harness. Verify by re-running Step 6's files.

- [x] **Step 9 — Frontend: the Settings view.** New `src/renderer/SettingsView.jsx`:
  - one view in the content frame, in the LCARS blocks (`config-section`-style), with sections **Verktyg**, **Utseende**, **Projekt**, **Om**; focus moves into the view on open (`tabIndex={-1}`, a ref, `focus()`) (FR1.1, FR1.2, FR1.3);
  - **Verktyg:** three rows from `getSettings()` first (path and source, straight from the saved settings, before any check returns), then `getTools()` fills path, version and errors; "Välj…" (native file dialog, a named `aria-label` such as "Välj sökväg till AI-DLC CLI"), "Återställ" when a path is saved; a failed validation is shown beside its row and nothing is saved; one line beside the fields says a changed path applies to the next start of that tool (FR2.1–FR2.5, NFR1, NFR4);
  - **Utseende:** Animationer (Full / Dämpad / Av), Helskärm vid start, Språk, Frågor från Claude and Ljud vid notis — the five, each with exactly the choices it has today (FR3.1);
  - **Projekt:** the default folder with the native folder dialog and a reset, the recent projects with a named remove button each, and a named button per open project that opens its Projektinställningar (FR4.1–FR4.3);
  - **Om:** the app version, the AI-DLC version found (or "hittades inte" with its reason), `AuctumMark`, and buttons for the repository and the feature docs (FR5.1);
  - export `saveLanguage` from here; delete `src/renderer/AppSettingsDialog.jsx` (FR6.1). In `App.jsx`: `appSettingsOpen` becomes the view's open state, the arm's Inställningar block and the menu's `appSettings` command both show it with `aria-current`, the header title follows it, the project panes stay mounted but hidden while it shows, close returns to the previous view, and the Projekt section's link calls the existing `openProjectSettings` (FR1.1, FR6.2, FR6.3). Every text goes through `t()` (NFR2).

- [x] **Step 10 — Frontend tests.** New `tests/renderer/SettingsView.test.jsx` (replacing `AppSettingsDialog.test.jsx`, which is deleted) with a mocked bridge:
  - the four sections and the five appearance settings render (FR1.2, FR3.1), and the existing language behaviour still holds (FR3.1, NFR2);
  - a tool row shows its automatic path, version and the next-start line; "Välj…" calls `pickTool` then `saveTool` and refreshes, a failed validation shows the reason and keeps the earlier path, "Återställ" calls `resetTool` (FR2.1–FR2.5);
  - every field is labelled, the file buttons are named, and focus lands in the view (FR1.3, NFR1);
  - the default folder pick/reset, a recent entry's removal and a project's Projektinställningar button call their bridge/props (FR4.1–FR4.3);
  - Om shows the app version, the AI-DLC version or "hittades inte", and its buttons call the fixed external keys (FR5.1).
  Update `tests/renderer/AppShell.test.jsx`: the arm's Inställningar and the menu command `appSettings` open the view in the content frame (not a dialog), the header says Inställningar, the arm block carries `aria-current`, and a radio in the view still changes `data-motion` and saves the choice. Run both files and keep them green.

- [x] **Step 11 — Environment/build configuration.** Add the view's styles to `src/renderer/theme.css` on the existing tokens: a scrollable `.settings-view`, section blocks that follow `.config-section`, rows that wrap between 1100 px and 2560 px, and the tool-row layout. Reuse `.field`, `.settings-group`, `.lcars-radio-group`, `.btn` and `.lcars-select`; add no dependency (C5). Add the new `settings.*` and `errors.tool*` keys to both `sv.json` and `en.json` (NFR2).

- [x] **Step 12 — Documentation and traceability.** Write `code-summary.md` (files, decisions, tests run and not run) and `traceability.json` (every FR/NFR ID from requirements, each `OK` target an existing file), and note in the summary that the epic file's acceptance criteria and status are updated in Deployment Execution, per the project mandate. Run the full suite (`npm test`) once to confirm nothing outside this work broke.
