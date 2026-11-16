# Code Generation Plan: US-0504, update the AI-DLC framework from the console

## Summary

- Builds: an "AI-DLC program" row and an "AI-DLC in this project" row in Settings › Tools that check for updates and type the update command into the shell tab
- Touches: new `src/main/aidlcUpdate.js`, `src/renderer/AidlcUpdate.jsx`, `src/renderer/workflowBusy.js`; `src/main/ipc.js`, `src/main/index.js`, `src/preload/index.js`, `src/renderer/SettingsView.jsx`, `src/renderer/RefreshPanel.jsx`, the locales
- Tests: about 10 new tests in `tests/main/aidlcUpdate.test.js` and `tests/renderer/AidlcUpdate.test.jsx`

## Design in brief

- **Main, `src/main/aidlcUpdate.js` (US-0504).**
  - Pure `readUpdateCheck(stdout, exitCode)` gives `{status: 'newer'|'current'|'unavailable', latest, reason}`. The JSON from `aidlc update --check --json` is read first. Exit 5 means newer and 0 means current. `ok:false` (for example offline) gives `unavailable` with the CLI's own message (FR1.2, FR5).
  - `checkProgram({exec})` runs `aidlc --version` and `aidlc update --check --json` through `runFixed` with a 30 s timeout. A rejected call with exit code 5 is read from `err.stdout`/`err.code`. It never throws (FR1.1, FR1.2, NFR1, NFR2).
  - Pure `readProjectPlan(json)` gives `{counts, files: [{path, action}] without 'preserve', conflicts}` (FR2.1, FR2.2).
  - `projectPlan(root, harnessId, {exec})` runs `aidlc --project-dir <root> config --harness <id> --dry-run --json`. The harness id must be a `setupId` in `HARNESSES` (NFR1).
  - Pure `programCommand()` gives `'aidlc update'`; `projectCommand(harnessId)` gives `'aidlc config --harness <id> --yes'` and refuses an unknown id (FR1.3, FR2.3).
- **When (FR3).** `index.js` runs `checkProgram` once after the first window has loaded and keeps the result in main. IPC `aidlc:updateStatus(force)` returns it, running again when `force` is set (the button). IPC `aidlc:projectPlans(projectId)` runs the dry run for each harness the project has installed (from the existing harness detection). Settings › Tools asks on open and on the button.
- **Shared busy rule (FR4), `src/renderer/workflowBusy.js`.** RefreshPanel's `working` rule moves here as `isWorkflowRunning(terminal, lastIntentChangeAt, now)` (a busy agent tab, or an AI-DLC write in the last 5 minutes). RefreshPanel imports it with no behaviour change.
- **Renderer, `src/renderer/AidlcUpdate.jsx`.** Two rows under the tool cards in Settings › Tools, in the existing `.lcars-card` style:
  - **Program:** the version, "Newer: vX" or "Up to date" or the reason, and "Update AI-DLC".
  - **Project:** one line per harness with its counts, an unfoldable file list, conflicts as warnings, and "Update the project files". Hidden with no active project (assumption 1).
  - **Check for updates** re-runs both. The update buttons call `terminal.type('shell', cmd, { submit: false })` and are disabled while `isWorkflowRunning` is true, with the existing wait message (FR4).
- **Texts (FR6).** New `aidlcUpdate.*` keys in both locales.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
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
    "methodology": "tdd",
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
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:3a3e99f1e55b225dce936715ddd095cabaceeab0e44cf8ec6eeab8daf73e4d52",
  "contract_sha256": "sha256:c203aae185bed3ce09c3c921ca1ec08a65e296b2cff7f7791c1a0522e7468af4"
}
```

Layers:

- No database or repository layer.
- The business logic is `aidlcUpdate.js` and the shared busy rule (Steps 3–4).
- The API is the IPC handlers and the start-up check (Step 5).
- The frontend is the Settings rows (Steps 6–7).

## Steps

- [x] **Step 1: Structure.** New files `src/main/aidlcUpdate.js`, `src/renderer/AidlcUpdate.jsx`, `src/renderer/workflowBusy.js`, with header comments naming US-0504.
- [x] **Step 2: Runner.** Verify `npx vitest run tests/main/setup.test.js tests/renderer/RefreshPanel.test.jsx tests/renderer/SettingsView.test.jsx` passes as it stands; record the counts.
- [x] **Step 3: Business logic, Red.** `tests/main/aidlcUpdate.test.js`, failing tests:
  1. `readUpdateCheck` gives newer (exit 5, with the latest version), current (exit 0) and unavailable with the CLI's message (`ok:false`, offline) (FR1.2, FR5).
  2. `checkProgram` reads the version and a check that exits 5 (a rejected `runFixed` with `code: 5` and stdout), and never throws when `aidlc` is missing (FR1.1, NFR2).
  3. `readProjectPlan` keeps create, update, merge and remove files, drops preserve, and lists conflicts; nothing to change gives an empty list (FR2.1, FR2.2).
  4. `projectPlan` runs `--dry-run --json` with fixed arguments and refuses an unknown harness id; `projectCommand` and `programCommand` give the exact commands (FR1.3, FR2.3, NFR1).
  5. `isWorkflowRunning` is true for a busy agent tab or a write within 5 minutes, and false otherwise (FR4).
- [x] **Step 4: Business logic, Green and Refactor.** Implement `aidlcUpdate.js` and `workflowBusy.js`; RefreshPanel uses the shared rule, and its tests stay green.
- [x] **Step 5: API.** Add `aidlc:updateStatus` and `aidlc:projectPlans` IPC handlers, the preload bridge, and the start-up check in `index.js` after the window loads (FR3, NFR2). Covered by Step 3 and the renderer tests' bridge mock.
- [x] **Step 6: Frontend, Red.** `tests/renderer/AidlcUpdate.test.jsx` (Swedish UI, bridge and terminal mocked):
  6. The program row shows the version and "newer vX"; "Update AI-DLC" types `aidlc update` into the shell tab without submitting (FR1).
  7. The project row lists each harness with its counts, unfolds its files and shows a conflict warning; "Up to date" when nothing changes; its button types `aidlc config --harness claude --yes` (FR2).
  8. "Check for updates" asks again with `force`; an unavailable check shows its reason (FR3, FR5).
  9. Both update buttons are disabled while a workflow runs; the project row is hidden with no active project (FR4, assumption 1).
  10. Every new text exists in both locales (`tests/main/i18nKeys.test.js`, FR6).
- [x] **Step 7: Frontend, Green and Refactor.** Implement `AidlcUpdate.jsx` and place it in Settings › Tools under the tool cards.
- [x] **Step 8: Documentation and traceability.** Write `code-summary.md` and `traceability.json` (`upstream_ids` with leaf IDs plus `coverage[{id, status, target}]`, every target a real file).

Environment/build configuration: none (NFR3).
