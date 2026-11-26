# Code Generation Plan — US-1305 Quality signals next to cost

## Summary

- Builds: quality signals per intent beside its cost, a cost-and-quality scatter plot in the project Cost view, and each release's fix stories and prerelease mark beside its cost.
- Touches: `src/main/parsers/quality.js` (new), `src/main/projectService.js`, `src/renderer/CostTab.jsx`, `src/renderer/CostPanel.jsx`, `src/renderer/FeaturesView.jsx`, the locales.
- Tests: about 24 new unit tests (12 quality counting, 4 file reading, 8 view) plus the existing suite.

## Approach

- The counting is pure in a new `src/main/parsers/quality.js` (NFR2): `qualityOf({events, testResults, reviews})` returns `{revisions: {total, byStage}, loopBacks, findings: {bySeverity, open, fixed}, failedRuns, postMerge, trouble}`. A part whose source is missing is `null` ("no record", FR1.7); `trouble` adds only the parts that exist.
- `projectService.js` reads each intent's `construction/build-and-test/test-results.md` and its `**/reviews/review-*.md` files (relative paths inside the intent folder only), and adds `quality` to every `summary.perIntent[dir]` in `loadCrossMachineCost`, next to `addRework` and from the same audit events already read there. A file that cannot be read is logged and counted as missing; it never breaks the cost view.
- The intent's Cost tab (`CostTab.jsx`) gets a `QualitySection` beside the rework section (FR2.1).
- The project Cost view (`CostPanel.jsx`) gets a `QualityChart`: an SVG scatter of cost against trouble count, one dot per intent with a cost, each a focusable element with a tooltip (name, cost, trouble), and a table of the same rows for screen readers that doubles as the intent rows with their trouble count (FR2.2, FR4).
- Features › Releases (`FeaturesView.jsx`) shows, beside each release's cost, its fix stories and "prerelease" from the `delivery.releases` rows of the existing `project:velocity` result, read once when the Releases view opens; a missing platform shows the existing missing-source text (FR3).

## Steps

- [x] Step 1: Verify the runner: `npx vitest run tests/main/quality.test.js` (Red: the file does not exist yet). [NFR2]
- [x] Step 2: Business logic, Red: write `tests/main/quality.test.js`: revision cycles per stage from `GATE_REJECTED`; loop-back entries; findings per severity with Fixed/Resolved (any case) as fixed and the rest open; failed runs = loop-backs + one for a final `Not Met`/`Unverified` verdict + `SENSOR_FAILED` events; both post-merge headings; trouble = the sum of the present parts; missing `test-results.md` or no review files gives `null` parts, never 0; malformed tables are skipped. Record the failing output. [FR1.1–FR1.7]
- [x] Step 3: Business logic, Green: implement `src/main/parsers/quality.js`. [same]
- [x] Step 4: Business logic, Refactor while green; header comment names US-1305.
- [x] Step 5: Data access, Red: extend the project service tests (the file that covers `loadCrossMachineCost`) so every `perIntent` entry has `quality` from a temp project with a `test-results.md` and a `reviews/review-01.md`, an intent without them gets `null` parts, and an unreadable file is a missing source, not a throw. Record the failing output. [FR1.7, FR2, NFR2]
- [x] Step 6: Data access, Green: the file reads and `addQuality` in `projectService.js`. [same]
- [x] Step 7: Data access, Refactor while green.
- [x] Step 8: Frontend, Red: extend `tests/renderer/CostTab.test.jsx` (`cost-quality`, revision cycles per stage, findings open/fixed, "no record"), `tests/renderer/CostPanel.test.jsx` (`cost-quality-chart` with one dot per intent, `cost-quality-table` rows with cost and trouble), and the Features view test (`features-view-release-quality` with fix story IDs and "prerelease"). Record the failing output. [FR2, FR3, FR4, NFR3]
- [x] Step 9: Frontend, Green: `QualitySection`, `QualityChart` and the release quality line in the existing LCARS chip, table and chart styles; every text through `t()`, keys in `sv.json` and `en.json`; dot meaning carried by position and the table, not colour. [same]
- [x] Step 10: Frontend, Refactor while green; run `tests/main/i18nKeys.test.js`. [NFR3]
- [x] Step 11: Run ESLint and Prettier on the changed files. [NFR4]

## Story traceability

All steps implement US-1305 (EPIC-13). FR/NFR IDs are in brackets per step. NFR1 (read only) holds because no step writes outside `src/` and `tests/`.

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
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).\n- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.\n- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.\n- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.\n- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check."
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
  "input_sha256": "sha256:62e0e9fa98cd86fbefaed196456b1ab91473689ff98919dd339561dd96d35b90",
  "contract_sha256": "sha256:b4ae8e1ec7217b124511fee47f9c29395d19f01a4e3b3abd23c00abd3e6afb59"
}
```
