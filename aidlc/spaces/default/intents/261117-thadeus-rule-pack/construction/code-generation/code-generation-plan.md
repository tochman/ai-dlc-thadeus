# Code Generation Plan: US-0212 THADEUS cost rule pack

## Summary

- Builds: a "Cost rules" sub-block in Configuration that adds, edits or removes a marked rule block in every space's `project.md` and `phases/construction.md`, with a diff, clash warnings, a compile and a restore on failure.
- Touches: new `src/shared/costRules.js`, `src/main/costRules.js`, `src/renderer/CostRulesSection.jsx`; small changes to `src/main/plans.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/ProjectSettingsView.jsx`, `src/renderer/ProjectView.jsx`, `sv.json`, `en.json`.
- Tests: about 14 new tests, 9 main (node) and 5 renderer (jsdom), plus the existing i18n key check.

## Design in short

- **No separate storage.** The pack is on when the block is in the files. The editor starts from the lines in the current block, or the shipped pack when there is none. Turning it off removes the block.
- **Targets are a fixed table** (NFR1): `project` and `phases/construction` (the phase table also allows `ideation`, `inception`, `operation`). Spaces come from `listSpaces` (`projectService.js`). Every path goes through `resolveInRoot`.
- **Writes** reuse `writeAtomic` from `fileWrite.js` with `expect` checking the file still reads as previewed (FR5.2, NFR4). The diff is kept in main, as the Guard Policy lock does (`p.costRules`), so the renderer sends only the lines and on/off.
- **Compile** reuses `compileEveryHarness` from `plans.js` (exported), which runs `aidlc engine graph compile` through `runFixed` per installed harness. On failure every file of the save is written back from its `before` text (FR5.4).
- **Diff panel** reuses `ChangePanel` from `ConfigEdit.jsx`.
- **LCARS**: a new `costRules` id in `PROJECT_SECTIONS`, shown in the arm for AI-DLC projects only, using the existing `Section`, `field`, `lcars-select`, `btn` and `tag` classes. Status shows as text plus tag, never colour alone (NFR3).

## Steps

- [x] Step 1 (structure): add `src/shared/costRules.js` with the markers, the shipped pack (FR4.1–FR4.4, English) and the clash pairs (FR6.1); module header names US-0212. Story: US-0212.
- [x] Step 2 (runner): verify the runner with the unit-scoped command in `unit-test-instructions.md` (`tests/main/costRules.test.js` is new, so the first run is the Red of Step 3).
- [x] Step 3 (business logic, Red): `tests/main/costRules.test.js` for the pure functions: block added at the end when absent (FR2.2); content replaced when present, bytes outside identical (FR2.1); off removes markers and gives the file byte-identical to before the pack (FR2.3); one marker or start after end is refused with the problem named (FR2.4); a target outside the table or a bad space is refused (NFR1); clash check quotes pack line, rule, file and space (FR6.1, FR6.2); shipped pack is at most 8 lines and 800 characters (NFR2). Record the failing output.
- [x] Step 4 (business logic, Green): `blockState`, `withBlock`, `targetFile`, `findClashes` in `src/main/costRules.js`.
- [x] Step 5 (business logic, Refactor) with the tests green.
- [x] Step 6 (file access, Red): tests over a temp project with two spaces: `status` names every space and whether each file has the block (FR1.2, FR3.2); `preview` gives one diff per file and per space, warnings, and broken files as errors not written (FR5.1, FR2.4); `apply` refuses a file changed since the preview (FR5.2); `apply` runs the compile with fixed arguments and returns its output (FR5.3); a failing compile, timeout or missing `aidlc` puts every written file back byte for byte and says so (FR5.4). `exec` is injected; no real CLI. Record the failing output.
- [x] Step 7 (file access, Green): `costRulesStatus`, `previewCostRules`, `applyCostRules` in `src/main/costRules.js`; export `compileEveryHarness` from `src/main/plans.js`.
- [x] Step 8 (file access, Refactor) with the tests green.
- [x] Step 9 (API, Red + Green): IPC `costRules:status`, `costRules:preview`, `costRules:apply` in `src/main/ipc.js` (apply refuses without a preview, like `config:guardLockApply`), bridge calls in `src/preload/index.js`; extend the preload test's list of bridge calls if it pins them.
- [x] Step 10 (frontend, Red): `tests/renderer/CostRulesSection.test.jsx`: lists spaces with present/absent as text (FR1.2); lines grouped by target file and editable (FR1.1); Preview shows the diff and writes only on confirm (FR5.1); compile output and the restore message are shown (FR5.3, FR5.4); clash warnings and broken-file errors are shown without blocking (FR6.2, FR2.4). Record the failing output.
- [x] Step 11 (frontend, Green): `src/renderer/CostRulesSection.jsx`; `costRules` in `PROJECT_SECTIONS` and the arm filter in `App.jsx` (AI-DLC projects only); mount in `ProjectView.jsx`; keys in `sv.json` and `en.json` (NFR3). `data-testid`s shaped `cost-rules-<role>`.
- [x] Step 12 (frontend, Refactor) with the tests green; run the unit-scoped command and `tests/main/i18nKeys.test.js`.
- [x] Step 13 (docs and traceability): code summary and traceability in this record. Feature docs keep US-0212 at 🚧 until Build and Test is approved.

Not in this plan: turning the pack on in this repository (done through the app at the manual release check, Q6), coverage tooling and ESLint/Prettier setup (team items not owned by this story).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "standard",
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
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
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
  "input_sha256": "sha256:966ae7aa76a3ff867860dd0a2f0ee2fa471dead8c2ee6b26e903919b9f425698",
  "contract_sha256": "sha256:89b142ff38d5934191dfc83fed7aed0fa585c14d568cc2a017bf79391c7e68d1"
}
```
