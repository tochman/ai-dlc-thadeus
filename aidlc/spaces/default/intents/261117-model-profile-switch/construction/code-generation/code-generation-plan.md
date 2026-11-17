# Code Generation Plan: US-0210 model profile switch

## Summary

- Builds: critical/economy model profiles in Project Settings, a switch offer when a critical intent starts, and the switch back when the last one ends
- Touches: `src/main/modelProfiles.js` (new), `modelChoice.js`, `settings.js`, `ipc.js`, `preload/index.js`, `renderer/ModelProfilesSection.jsx` and `ProfileSwitchDialog.jsx` (new), `ProjectSettingsView.jsx`, `ProjectView.jsx`, `sv.json`/`en.json`, epic-02 + FEATURES.md
- Tests: about 22 unit tests (vitest) across 5 test files, written first (TDD)

Zero-Unit express work, brownfield. Stories US1.1–US1.3 (`inception/user-stories/stories.md`), requirements FR1–FR5, NFR1–NFR5.

## Design in short

- **Profile** = `{ from?: string, models: { [agent]: model } }`. Settings per project: `modelProfiles: { criticalPlans: string[], critical, economy, askBeforeBack: boolean, active: 'critical'|'economy'|null }` in `userData/settings.json` (FR1.5).
- **Commands**: `buildModelCommand` gets one new field `from` (`--from <name>`, name `^[a-z0-9][a-z0-9-]*$`, NFR2). `profileCommands(profile, harness, models)` gives `--from` first, then one `--agent <a> --model <m>` per agent with a model (FR2.2). `runProfile` runs them in order through the existing `run()` and stops at the first failure (FR4.3).
- **Tracker** (pure): `createProfileTracker()` keeps `seen`, `switchedFor`, `declined`. `baseline(intents)` marks open intents as seen (FR2.4). `update(intents, settings)` returns `{ ask: intent }` for a new critical intent while critical is not active (FR2.1, FR2.5), and `{ switchBack: true }` when the last switched-for intent is completed/archived (FR3.1–FR3.3). Plan = `plan ?? scope`; open = `inProgress()`.
- **Main wiring**: `watchSpace` baselines the tracker; `onChange` with `indexChanged` calls `checkProfiles(projectId)`, which sends `modelProfile:ask { kind: 'critical'|'back', intent }` (or, for back without "ask first", switches directly). The renderer answers through `modelProfile:answer(projectId, kind, yes, harness)`; harness comes from the renderer's existing `resolveHarness` (FR5.1), checked by `checkHarness` + `harnessModelOptions`, whose `editable: false` gives the FR5.2 message. Result goes back with the commands and outputs (FR4.2); `active` is saved only on full success. Then `config:changed` is sent, as `models:apply` does.
- **Saved AI-DLC profile names**: read from `config models --show --json` → `data.profiles` (object keys or array of names); none → the `--save-as` hint (FR1.2).
- **UI**: new Configuration section `modelProfiles` (next to `costRules`, AI-DLC projects only), LCARS `Section`/`RadioBlocks`; dialog is a native `<dialog className="settings-dialog">` like `DocsDialog`, never `window.confirm` (NFR4).

## Steps

- [x] Step 1: Story start: set US-0210 to 🚧 In progress in `docs/features/epic-02-cost-and-models.md` (marker + epic **Status** line) and its `docs/FEATURES.md` row. [US1.1–US1.3]
- [x] Step 2: Verify the runner: `npx vitest run tests/main/modelChoice.test.js` passes on the unchanged tree; record the command in `unit-test-instructions.md`. [all]
- [x] Step 3: Data model - Red: in `tests/main/settings.test.js`, tests that `modelProfiles` is saved and read back per project, invalid parts fall back to defaults, and a bad profile name is refused with the earlier value kept. Record the failing output. [US1.1 AC1.1.4–AC1.1.6]
- [x] Step 4: Data model - Green: `sanitizeModelProfiles` in `src/main/modelProfiles.js`, used in `sanitizeProject` and validated in `setProjectSettings` (`settings.js`); pass `modelProfiles` through in `projectSettings:set` (`ipc.js`). [US1.1]
- [x] Step 5: Data model - Refactor with tests green.
- [x] Step 6: Business logic - Red: `tests/main/modelChoice.test.js`: `from` builds `--from <name>` and a bad name is refused. New `tests/main/modelProfiles.test.js`: `profileCommands` order and empty agents skipped; `runProfile` stops at the first failure and reports it; tracker: new critical intent asks once, decline never asks again, baseline intents and non-critical intents never ask, critical-active does not ask, two critical intents switch back only after both end, declined intent end gives no switch back, archived counts as ended; `savedProfileNames` parses `data.profiles`. Record failing output. [US1.2 AC1.2.1–AC1.2.5, US1.3 AC1.3.1, AC1.3.3–AC1.3.5]
- [x] Step 7: Business logic - Green: `from` in `buildModelCommand`/`policyArgs` (`modelChoice.js`); `profileCommands`, `runProfile`, `createProfileTracker`, `savedProfileNames` in `modelProfiles.js`.
- [x] Step 8: Business logic - Refactor with tests green.
- [x] Step 9: API - Red: in `tests/main/ipc.test.js`, `modelProfile:answer` with yes runs the commands with a faked exec and saves `active` only on success; a harness with no model table gives the FR5.2 message and runs nothing; a failure keeps `active`. Record failing output. [US1.2 AC1.2.2, AC1.2.5, AC1.2.6, US1.3 AC1.3.6]
- [x] Step 10: API - Green: `ipc.js` tracker per project, `checkProfiles` on `indexChanged`, handlers `modelProfile:answer` and `modelProfile:saved` (saved profile names + model options); `preload/index.js` calls and an `onModelProfileAsk` listener.
- [x] Step 11: API - Refactor with tests green.
- [x] Step 12: Frontend - Red: `tests/renderer/ModelProfilesSection.test.jsx` (lists plans with a critical choice, profile pickers, the `--save-as` hint, ask-before-back toggle saves, shows the active profile) and `tests/renderer/ProfileSwitchDialog.test.jsx` (shows the question, Yes/No call back, shows each command's output and a failure message). Record failing output. [US1.1 AC1.1.1–AC1.1.5, US1.2 AC1.2.1–AC1.2.3, US1.3 AC1.3.2]
- [x] Step 13: Frontend - Green: `ModelProfilesSection.jsx`, `ProfileSwitchDialog.jsx`; add `modelProfiles` to `PROJECT_SECTIONS` and `AIDLC_SECTIONS` (`ProjectSettingsView.jsx`), render both in `ProjectView.jsx`; keys in `sv.json` and `en.json` (NFR1, `tests/main/i18nKeys.test.js`).
- [x] Step 14: Frontend - Refactor with tests green; run all five test files together.
- [x] Step 15: Docs: header comments name `US-0210 FR…`; acceptance criteria in epic-02 ticked only after Build and Test approves (story lifecycle). [all]

No new dependency, no build or CI change. Test configuration is the existing `vitest.config.mjs`.

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

Layers left out: Repository / data access (the settings file is the data layer, covered by Steps 3–5); Environment/build configuration (no change).
