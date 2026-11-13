# Code Generation Plan: US-0801 Choose the harness per project

## Summary

- Builds: harness detection, a per-project "Agent-terminal" choice (Claude Code / opencode), and an agent tab that runs the chosen harness
- Touches: new `src/main/harness.js`; `pty.js`, `ipc.js`, `settings.js`, `preload`; `TerminalPanel.jsx`, `TerminalContext.jsx`, `terminalControl.js`, `ResumeButton.jsx`, `ProjectView.jsx`, `ProjectSettingsDialog.jsx`, `App.jsx`, `RefreshPanel.jsx`, `CostPanel/CostTab`, `menu.js`, locales, `theme.css`
- Tests: about 10 new unit tests in 1 new and 5 extended test files, plus the existing suite kept green

## Context

- Zero-Unit work. Requirements: `inception/requirements-analysis/requirements.md` (FR1–FR8, NFR1–NFR4). The code scan is in `inception/reverse-engineering/developer-scan.md`, with file and line references.
- Decisions from the person:
  - Claude Code and opencode are selectable; other harnesses are detected only [Q1].
  - The tab's internal id is renamed to `agent` [Q2].
  - opencode's readiness is checked against the installed opencode v2.1.4 and adapted if needed [Q3].

## Design decisions

- **One harness table in the main process**, `src/main/harness.js`:
  - It exports `HARNESSES`. Each entry has `id`, `label`, its folder markers, its CLI name, its `selectable` flag, its command table (`aidlc: '/aidlc'`, …) and an optional readiness rule.
  - It also exports `detectHarnesses(root)` (folder markers plus parallel `runFixed(<cli>, ['--version'])` probes) and `resolveHarness(setting, detected)`.
  - Only `claude` and `opencode` are `selectable` [Q1].
- **The pty** gets the kind `agent` plus a validated `harness` id and starts `$SHELL -l -i -c <cli from the table>`. An unknown id is refused in main (FR3.3, NFR4).
- **The setting** is `projectSettings[root].harness` (`claude | opencode`), sanitized like the other project settings. The four places that must change together are `sanitizeProject`, `setProjectSettings`, the `ipc.js` field pick and `ProjectSettingsDialog`.
- **Detection runs** when a project opens, in the background, and is cached on the open project like `p.models`. It is exposed through `harness:detect` IPC, and the renderer shows "checking" until it finishes (NFR3).
- **Renaming to `agent`** covers the tab id, state key, menu action (`terminal` → `agent`), the CSS class, and the test ids `terminal-panel-*-agent` [Q2].
- **Commands come from the table:**
  - Resume, the quick commands and the post-setup restart look up the harness's command table.
  - Where a command is missing, the button is disabled with a reason (FR4.2).
  - Switching while the tab is Arbetar shows a confirmation before the old session is killed (FR6.1).
- **opencode readiness (FR4.3):** during the build, start the installed `opencode` once in a pty and check whether it goes quiet for 1.5 s.
  - If it does, the shared rule stays.
  - If it does not, the table gets a readiness rule for opencode that the shared code uses.
  - The finding goes in code-summary.md.
- **Texts:** keys that are really about the agent tab take `{harness}`, with the same placeholders in sv and en. Cost and model views get "covers Claude Code" (FR7.2, FR8.1).

## Steps

### Step 1: Project structure and production configuration
- [x] Create `src/main/harness.js` with `HARNESSES`, `detectHarnesses`, `resolveHarness` (FR1.1, FR1.2, FR1.3, FR2.2, FR3.3).
- Traces to: FR1, FR2.2, FR3.3.

### Step 2: Verify the test runner and record the unit-scoped command
- [x] Run `npx vitest run tests/` before any edit and record the baseline in `code-summary.md`.
- [x] Confirm the command in `unit-test-instructions.md` runs.

### Step 3: Business logic: settings and harness resolution — implement
- [x] `src/main/settings.js`: sanitize `projectSettings[root].harness`, and accept it in `setProjectSettings` (FR2.3).
- [x] opencode readiness check against the installed opencode, recorded in the table (FR4.3).

### Step 4: Business logic — write and run its tests
- [x] `tests/main/harness.test.js` (new):
  - detection from folder markers, including `.github/` holding AI-DLC files and a failing `--version` probe counted as not found;
  - `resolveHarness` defaults (only one installed, several, none, an invalid setting);
  - only `claude` and `opencode` are selectable (FR1.1, FR1.3, FR2.1, FR2.2).
- [x] `tests/main/settings.test.js` (extend): `harness` is kept when valid and dropped when invalid, per project (FR2.3, FR2.4).
- [x] Run them with the command in `unit-test-instructions.md`.

### Step 5: API / endpoint: pty, IPC, preload, menu — implement
- [x] `src/main/pty.js`: the kind `agent` with a validated harness id; the command comes from the table; anything else is refused (FR3.2, FR3.3, NFR4).
- [x] `src/main/ipc.js`:
  - pass `harness` through the project-settings save;
  - add `harness:detect`, cached per open project;
  - make `pty:spawn` take the harness id (FR1.2, FR2.3).
- [x] `src/preload/index.js`: `detectHarnesses` (narrow API).
- [x] `src/main/menu.js`: the `agent` action, labelled through `menu.agent` (FR3.1).

### Step 6: API / endpoint — write and run its tests
- [x] `tests/main/pty.test.js` (extend): the agent kind starts `claude` or `opencode` from the table, and an unknown id is refused (FR3.2, FR3.3, NFR4).
- [x] `tests/main/menu.test.js` (extend): the agent menu entry sends `agent` (FR3.1).
- [x] Run them with the command in `unit-test-instructions.md`.

### Step 7: Frontend behavior — implement
- [x] Rename `claude` → `agent` in `TerminalPanel.jsx`, `TerminalContext.jsx`, `ResumeButton.jsx`, `ProjectView.jsx`, `RefreshPanel.jsx`, `App.jsx`, `theme.css` and the test ids. The tab label shows the harness name (FR3.1, FR3.2, FR3.4).
- [x] Resume, the quick commands and the post-setup restart use the harness's command table. A missing command is disabled with a reason (FR4.1, FR4.2).
- [x] The not-installed or not-found warning in the tab offers "choose another harness" and starts nothing (FR5.1).
- [x] `ProjectSettingsDialog.jsx`: an "Agent-terminal" select (`data-testid="project-settings-harness"`) listing the selectable harnesses with their versions, and the others as "not supported yet" (disabled) (FR2.1).
- [x] Switching while the tab is Arbetar asks for confirmation before the session restarts (FR6.1).
- [x] Cost and model views get "covers Claude Code" (FR7.1, FR7.2).
- [x] Locales: `{harness}` texts and the new keys in sv and en (FR8.1).

### Step 8: Frontend behavior — write and run its tests
- [x] `tests/renderer/TerminalPanel.test.jsx` (update and extend):
  - the `agent` test ids;
  - the tab label shows "opencode" when opencode is chosen;
  - quick commands typed into the agent tab;
  - a busy tab asks before switching (FR3.1, FR3.2, FR4.1, FR6.1).
- [x] `tests/renderer/ProjectSettingsDialog.test.jsx` (extend): choosing opencode saves `harness: 'opencode'`, and an unsupported detected harness is listed but disabled (FR2.1, FR2.3).
- [x] `tests/renderer/ResumeButton.test.jsx` (extend): Resume is disabled with a reason when the harness lacks the command (FR4.2).
- [x] Run them with the command in `unit-test-instructions.md`; then run the full suite and fix existing tests that broke from the rename (NFR2).

### Step 9: Environment / build configuration
- [x] Run `npx electron-vite build`.

### Step 10: Documentation and traceability
- [x] A short comment at the top of `src/main/harness.js` on adding a harness: a table entry plus its commands.
- [ ] `code-summary.md` and `traceability.json` in the record (the conductor writes these after the build).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
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
  "input_sha256": "sha256:c8f84e35190e007d9863fad236154d0269ab9bf633fc2a3ff106ed965ba4a9b9",
  "contract_sha256": "sha256:bb76c1b22f8307be6e5780d50cabab891684449d5b164bd0e825e9e4e5c61e5b"
}
```

Layers not applicable: Data model / database behavior and Repository / data access. The only stored data is the `harness` key, covered in Step 3.
