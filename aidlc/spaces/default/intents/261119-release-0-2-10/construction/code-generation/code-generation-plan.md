# Code Generation Plan — v0.2.10 release

## Summary

- Builds: the v0.2.10 version bump and the "Released in v0.2.10" markers for the six slice stories, guarded by a new check in the release test
- Touches: `package.json`, `package-lock.json`, `docs/releases/0.2.10.md`, `docs/FEATURES.md`, `docs/features/epic-00-fixes.md`, `epic-02-cost-and-models.md`, `epic-06-feature-docs.md`, `tests/main/releaseVersion.test.js`
- Tests: 2 new tests in the existing release test (now 7, it is version-generic); the existing suite stays green

Branch `release/v0.2.10` from `main` (team.md branch naming). No story code changes (NFR1).

## Steps

- [x] **Step 1: Runner check.** `npx vitest run tests/main/releaseVersion.test.js tests/main/featureDocsStatus.test.js` passes on `main` before any change.
- [x] **Step 2: Version bump (FR1).** `npm version 0.2.10 --no-git-tag-version` bumps `package.json` and `package-lock.json`. The existing tests then check `docs/releases/0.2.10.md` (exists, titled, slice all ✅) and the lock file.
- [x] **Step 3: Red (FR2).** Add two tests to `tests/main/releaseVersion.test.js`:
  1. Every story in the slice table carries `✅ Released in v<version>` in its own story heading in its epic file, and its row in the slice table reads `✅ Released in v<version>`.
  2. No epic `**Status (…)**` line or `FEATURES.md` row still says "done, for v<version>" or "for v<version>" for a slice story.

  Run them and record the failing output (the six stories still say "Done, for v0.2.10").
- [x] **Step 4: Green (FR2).** For US-0028, US-0029, US-0215, US-0030, US-0608 and US-0031: story heading `✅ Released in v0.2.10`; the epic Status lines (EPIC-00, EPIC-02, EPIC-06) and their `FEATURES.md` rows say `released in v0.2.10`; the slice table in `docs/releases/0.2.10.md` says `✅ Released in v0.2.10`. Tick the three docs items of the release checklist ("acceptance criteria", "Status lines and rows", "Released in v0.2.10"); the `.dmg` and tag items stay open for Deployment Execution.
- [x] **Step 5: Refactor.** Tidy the test helpers while green; Prettier on the changed files; run `tests/main/featureDocsStatus.test.js`.
- [x] **Step 6: Docs and traceability.** Write `code-summary.md`.

Later stages cover the rest: Build and Test runs the full suite and the release PR's CI (FR1.1); Deployment Execution covers the hand checks (FR3), the `.dmg` (FR4), the merge and tag (FR5) and the smoke test (FR6).

## Traceability

| Requirement | Steps |
|---|---|
| FR1 | 2 |
| FR2 | 3, 4, 5 |
| NFR1 | all (docs, version and test only) |
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
