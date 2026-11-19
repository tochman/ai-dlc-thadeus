# Code Generation Plan — v0.2.11 release

## Summary

- Builds: the v0.2.11 version bump and the "Released in v0.2.11" markers for US-0032 and US-0033
- Touches: `package.json`, `package-lock.json`, `docs/releases/0.2.11.md`, `docs/FEATURES.md`, `docs/features/epic-00-fixes.md`
- Tests: no new tests; the existing version-generic release test (7 tests) goes red on the bump and green on the markers; the existing suite stays green

Branch `release/v0.2.11` from `main` (team.md branch naming). No story code changes (NFR1).

## Steps

- [x] **Step 1: Runner check.** `npx vitest run tests/main/releaseVersion.test.js tests/main/featureDocsStatus.test.js` passes before any change.
- [x] **Step 2: Red (FR1, FR2).** `npm version 0.2.11 --no-git-tag-version` bumps `package.json` and `package-lock.json`. The release test, which reads the version from `package.json`, now checks `docs/releases/0.2.11.md` and fails on the "Released in v0.2.11" checks (both stories still say "Done, for v0.2.11"). Record the failing output.
- [x] **Step 3: Green (FR2).** For US-0032 and US-0033: story heading `✅ Released in v0.2.11`; EPIC-00's `**Status (…)**` line and its `FEATURES.md` row say `released in v0.2.11`; the slice table in `docs/releases/0.2.11.md` says `✅ Released in v0.2.11`. Tick the docs items of the release checklist (acceptance criteria, Status lines and rows, the "Released in v0.2.11" part of the release PR item); the `.dmg` and tag items stay open for Deployment Execution.
- [x] **Step 3b: Test fix, asked for by the person (2026-11-19).** `tests/main/featureDocsStatus.test.js` counts a finished intent's stories as delivered even when it never ran Code Generation, so the finished Ideation-only check `261119-spec-kit-ideation` makes US-1401–US-1407 "delivered but not ✅ Done". Red: the test fails on that today (recorded in Step 1). Green: a finished intent's stories count as delivered only when its Code Generation stage ran; a unit test of the loader covers an intent with Code Generation skipped. The person chose to carry this in the release PR (an exception to NFR1).
- [x] **Step 4: Refactor.** Prettier on the changed files; run `tests/main/featureDocsStatus.test.js` with the release test.
- [x] **Step 5: Docs and traceability.** Write `code-summary.md` and `traceability.json`.

Later stages cover the rest: Build and Test runs the full suite and the release PR's CI (FR1.1); Deployment Execution covers the hand checks (FR3), the `.dmg` (FR4), the merge and tag (FR5) and the smoke test (FR6). Deployment Pipeline is jumped past, as for v0.2.10.

## Traceability

| Requirement | Steps |
|---|---|
| FR1 | 2 |
| FR2 | 2, 3, 4 |
| NFR1 | all (docs and version only) |
| FR1.1, FR3–FR6, NFR2 | Build and Test, Deployment Execution |

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

Only the release-docs layer applies: no data, API or frontend code changes. The Standard volume is met by the release test file as a whole (7 tests).
