# Code Generation Plan: US-0901 See a project's AI-DLC configuration

## Summary

- Builds: a read-only Configuration view per project, fed by `aidlc config --show --json` and `aidlc config list --json`, with a harness picker, plan list, error state and live reload
- Touches: new `src/main/aidlcConfig.js` and `src/renderer/ConfigView.jsx`; changes to `ipc.js`, `watcher.js`, preload, `shared/harnesses.js`, `App.jsx`, `ProjectView.jsx`, `ProjectSettingsDialog.jsx`, `theme.css`, both locale files
- Tests: about 13 new unit tests in 2 new files plus 2 in existing files; the existing suite stays green

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

## Layers that do not apply

- Data model / database: none (no storage; the app writes nothing, NFR1).
- Environment/build configuration: none (no new dependency, no config change; vitest already covers `tests/`).

## Steps

- [x] **Step 1: Verify the test runner.** `vitest.config.mjs` and the `tests/main`, `tests/renderer` folders already exist. Record the unit-scoped command in `unit-test-instructions.md` and run it once on the unchanged tree (new files absent → only the existing two files run).

- [x] **Step 2: Harness table (data).** In `src/shared/harnesses.js` add `perAgentModels: false` to the Cursor and Copilot entries (FR4.4) and a tiny helper `scopesDir(entry)` = `<first marker dir>/scopes` (`.claude/scopes`, `.aidlc/scopes`) (FR3.1). Nothing else in the table changes.

- [x] **Step 3: Repository / data access — `src/main/aidlcConfig.js` (new).** `getAidlcConfig(root, { harness, activeScope, exec })`, never throws (NFR3):
  - runs `aidlc config --show --json --harness <h>` and `aidlc config list --json` in parallel through `runFixed` (FR2.1, NFR2);
  - parses into `{ harness, models, flags, active, provider, plugins, plans, errors }`, keeping only shown fields (FR2.8): models from `effective` with sources (FR2.2), every flag in `sources` with its value from `effective` or `null` (FR2.3), active-work keys split into value and bracketed source (FR2.4), provider (FR2.5), plugins (FR2.6); each value whose source is `env` gets `env: true` (FR2.7);
  - a failing command fills `errors.show` or `errors.list` and leaves its sections `null`, the other command's sections still come back (FR5.3); `aidlc` not found sets `errors.missing: true` (FR5.1);
  - plans: reads frontmatter `name` and `description` from `scopesDir(harness)` and `aidlc/scopes/` through `listDir`/`readText` (root-confined), marks `own: true` for `aidlc/scopes/`, drops a shipped entry with the same `name` as an own one, marks `active` when `name === activeScope`, skips unreadable or nameless files with `console.warn` (FR3.1–FR3.4).

- [x] **Step 4: Tests for Step 3 — `tests/main/aidlcConfig.test.js` (new),** with an injected `exec` and a temp project folder:
  1. happy path: both commands → every section filled, harness argument passed, no shell (FR2.1–FR2.6, FR2.8, NFR2);
  2. an `env` source is marked (FR2.7);
  3. `config list` fails → active section `null` with its error, the other sections still filled (FR5.3);
  4. `aidlc` not found → `errors.missing`, no sections, no throw (FR5.1, NFR3);
  5. plans: own marked, harness copy not duplicated, active highlighted, a nameless file skipped (FR3.1–FR3.4).

- [x] **Step 5: API / endpoint.**
  - `src/main/watcher.js`: `watchFiles` also accepts `.json` file targets (today only `.md`).
  - `src/main/ipc.js`: `config:get (projectId, harness)` checks that `harness` is in the table and installed in the project (from the cached detection), else throws (FR4.3); reads the active intent's scope from the cached intent list; calls `getAidlcConfig`. A `configWatcher` (`watchFiles` on `aidlc.settings.json`, `aidlc.settings.local.json`, `aidlc/scopes`, `.claude/scopes`, `.aidlc/scopes`) sends `config:changed`; started on open, closed in `closeWatcher` (FR6.1, FR6.2 through the existing debounce).
  - `src/preload/index.js`: `getAidlcConfig: call('config:get')`, `onConfigChanged: subscribe('config:changed')`.

- [x] **Step 6: Tests for Step 5.**
  6. `tests/main/watcher.test.js`: a `.json` file target fires `onChange` (FR6.1).
  7. `tests/main/aidlcConfig.test.js`: the exported harness check refuses an id outside the table and one not installed (FR4.3).

- [x] **Step 7: Frontend behavior.**
  - `src/renderer/ConfigView.jsx` (new): loading state (NFR4); six sections in order (FR1.2); each row shows value and source, `env` rows marked (FR2.7); harness picker only when more than one harness is installed, defaulting to the agent tab's harness, and changing it reloads only the view (FR4.1, FR4.2); models greyed with one line on a harness with `perAgentModels: false` (FR4.4); on `errors.missing` or a failed command one sentence with the error and a "Set up AI-DLC" button, and no earlier values (FR5.1, FR5.2); reloads on `config:changed`, and on `project:changed` when the index or the active intent changed, only while visible, else on next show (FR6.1).
  - `src/renderer/ProjectView.jsx`: view `config` renders `ConfigView` (intents view stays mounted, hidden); setup button opens the existing add-harness setup.
  - `src/renderer/App.jsx`: arm block "Konfiguration / Configuration" for AI-DLC projects, view `config` allowed in `showView` and the menu's `view` command (FR1.1).
  - `src/renderer/ProjectSettingsDialog.jsx`: a button that opens the view (FR1.1).
  - `src/renderer/theme.css`: a few rules for the config tables, reusing existing tokens.
  - `src/shared/locales/sv.json`, `en.json`: the new `config.*` keys in both (FR1.3).

- [x] **Step 8: Tests for Step 7.**
  8. `tests/renderer/ConfigView.test.jsx` (new): renders the six sections with values and sources from a mocked bridge (FR1.2, FR2.2–FR2.6);
  9. one installed harness → no picker; two → picker with only those two, choosing one calls `getAidlcConfig` with it (FR4.1, FR4.2);
  10. Cursor → models greyed with the reason (FR4.4);
  11. a failed read → one-sentence error, setup button, no stale values from an earlier read (FR5.1, FR5.2);
  12. `config:changed` while visible reloads (FR6.1);
  13. `tests/renderer/AppShell.test.jsx`: the arm block opens the Configuration view (FR1.1);
  14. `tests/main/i18nKeys.test.js` already checks sv/en parity and covers the new keys (FR1.3).

- [x] **Step 9: Run the unit-scoped command, then the full suite** (`npm test`) to keep the existing suite green.

- [x] **Step 10: Documentation and traceability.** `code-summary.md` and `traceability.json` in this record folder. The feature docs (`docs/FEATURES.md`, the epic file) are updated in Deployment Execution, as the project rule says.

## Story traceability

| Step | US-0901 requirement |
|------|---------------------|
| 2 | FR3.1, FR4.4 |
| 3–4 | FR2.1–FR2.8, FR3.1–FR3.4, FR5.1, FR5.3, NFR1–NFR3 |
| 5–6 | FR4.3, FR6.1, FR6.2, NFR2 |
| 7–8 | FR1.1–FR1.3, FR4.1, FR4.2, FR4.4, FR5.1, FR5.2, FR6.1, NFR4 |
