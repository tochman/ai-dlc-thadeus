# Code Generation Plan: US-0802 Set up AI-DLC for another harness

## Summary

- Builds: a harness choice in setup (all six), setup that the app runs itself after a preview, and "Add harness…" in Projektinställningar
- Touches: `src/main/setup.js`, `src/shared/harnesses.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/SetupAidlc.jsx`, `ProjectSettingsDialog.jsx`, `ProjectView.jsx`, locales
- Tests: about 8 new unit tests in 3 extended test files, plus the existing suite kept green

## Context

- Zero-Unit work. Requirements: `inception/requirements-analysis/requirements.md` (FR1–FR5, NFR1–NFR3).
- Decisions from the person: setup offers all six harnesses [Q1]; the app runs setup itself after the preview, with Apply [Q2].
- Builds on US-0801: `src/shared/harnesses.js` (the table) and `src/main/harness.js` (`detectHarnesses`).

## Design decisions

- **The setup id per harness** goes in the table as `setupId` (`claude`, `opencode`, `codex`, `kiro`, `cursor`, `copilot`), checked with `aidlc … config --harness <id> --dry-run` during the build. A helper `setupHarness(id)` returns the entry or null. Only those ids reach the CLI (FR1.4).
- **`setup.js`:**
  - `getSetupInfo(root, { harness })` previews `aidlc --project-dir <root> config --harness <id> --dry-run`.
  - `buildSetupCommand` is replaced by `runSetup(root, choices, availablePlugins, { exec })`. It validates every choice, then runs the steps one after another with `runFixed` (fixed argument arrays, no shell, a longer timeout):
    1. `git init -b main`, when needed;
    2. `aidlc --project-dir <root> config --harness <id> --yes`;
    3. `aidlc config project --plugins … --yes`;
    4. `aidlc config models --preset … --project --yes`.
  - It stops at the first failure and returns `{ ok, steps: [{ command, ok, output|error }] }` (FR2.2, FR2.3).
  - A per-root lock refuses a second concurrent run (NFR3).
- **Adding mode** (`mode: 'add'`): the same preview and run, skipping git init. `runSetup` refuses when the last preview reported `remove > 0` or a conflict (FR3.2).
- **IPC:**
  - `setup:info` takes `{ harness }`.
  - `setup:run` replaces `setup:command`.
  - After a successful run, the cached detection for the project is cleared and re-run (FR4.1).
- **Renderer:**
  - `SetupAidlc.jsx` gets a Harness select listing all six. Each shows whether its CLI was found; the four that can't run in the agent tab get a note.
  - Changing the harness re-runs the preview. **Apply** shows that it is running, then each step's result, with the CLI error in plain words on failure.
  - On success, if the new harness is selectable and isn't the current one, the app offers to switch the agent tab, using US-0801's switch with its busy check (FR4.2).
- **Projektinställningar:** "Lägg till harness… / Add harness…" opens SetupAidlc in add mode. Installed harnesses are shown as installed and can't be picked (FR3.1).

## Steps

### Step 1: Project structure and production configuration
- [x] Add `setupId` to each entry in `src/shared/harnesses.js`, and a `setupHarness(id)` helper (FR1.1, FR1.4).
- [x] Check the six ids with `aidlc --project-dir <a temporary folder inside the record dir> config --harness <id> --dry-run`. Record what the CLI accepts in code-summary.md, then delete the folder.

### Step 2: Verify the test runner and record the unit-scoped command
- [x] Run `npx vitest run tests/` before any edit and record the baseline.

### Step 3: Business logic: setup — implement
- [x] `src/main/setup.js`:
  - `getSetupInfo(root, { harness, exec })` with the harness in the preview;
  - `runSetup(root, choices, availablePlugins, { exec })` with validation, sequential steps, stop-on-failure, the per-root lock, the add-mode guard and a timeout (FR1.4, FR2.1–FR2.4, FR3.2, NFR3).

### Step 4: Business logic — write and run its tests
- [x] `tests/main/setup.test.js` (extend and update). Cover:
  - the preview uses the chosen harness;
  - an unknown harness is refused;
  - `runSetup` runs the steps in order with fixed argument arrays and stops at the first failure;
  - a second concurrent run is refused;
  - add mode refuses a preview with removals or conflicts.

  Update the existing assertions on `--harness claude` and the typed command (FR1.4, FR2.1–FR2.3, FR3.2, NFR2, NFR3).
- [x] `tests/main/harness.test.js` (extend): `setupHarness` accepts the six ids and refuses others (FR1.1, FR1.4).
- [x] Run them with the command in `unit-test-instructions.md`.

### Step 5: API / endpoint — implement
- [x] `src/main/ipc.js`: `setup:info` with `{ harness }`; `setup:run`; clear and re-run detection after success (FR2.2, FR4.1).
- [x] `src/preload/index.js`: `runSetup` replaces `buildSetupCommand`.

### Step 6: API / endpoint — write and run its tests
- [x] Covered through `setup.test.js` (the handlers are thin). Run them with the command in `unit-test-instructions.md`.

### Step 7: Frontend behavior — implement
- [x] `SetupAidlc.jsx`:
  - the Harness select (`data-testid="setup-harness"`), with its default from detection and CLI-found or not-runnable notes;
  - the preview re-runs on change;
  - Apply (`data-testid="setup-apply"`) shows running, then the result or the error;
  - after success, the offer to switch the agent tab (FR1.1–FR1.3, FR2.2, FR2.4, FR4.2).
- [x] `ProjectSettingsDialog.jsx`: "Add harness…" (`data-testid="project-settings-add-harness"`) opens setup in add mode, with installed harnesses shown but not selectable (FR3.1).
- [x] `ProjectView.jsx`: wire the add mode and the switch offer.
- [x] Locales: new keys in sv and en with the same placeholders (FR5.1).

### Step 8: Frontend behavior — write and run its tests
- [x] `tests/renderer/SetupAidlc.test.jsx` (update and extend). Cover:
  - choosing opencode re-runs the preview with `opencode`;
  - Apply calls `runSetup` with the choices and shows a failure's error;
  - after a successful opencode setup the switch offer appears;
  - a not-runnable harness shows its note.

  Remove the old typed-command assertions (FR1.1–FR1.3, FR2.2, FR4.2).
- [x] `tests/renderer/ProjectSettingsDialog.test.jsx` (extend): "Add harness…" lists installed harnesses as installed (FR3.1).
- [x] Run them, then the full suite (NFR2).

### Step 9: Environment / build configuration
- [x] Run `npx electron-vite build`.

### Step 10: Documentation and traceability
- [x] Comments in `setup.js` on the step order and the add-mode guard.
- [ ] `code-summary.md` and `traceability.json` in the record (the conductor writes these).

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

Layers not applicable: Data model / database behavior and Repository / data access (no stored data beyond what the `aidlc` CLI writes).
