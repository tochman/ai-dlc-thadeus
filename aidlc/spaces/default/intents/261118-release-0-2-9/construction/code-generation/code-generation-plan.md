# Code Generation Plan: v0.2.9 release

## Summary

- Builds: the v0.2.9 version bump, the rename note in the release plan, and a check that the packaged version has a finished release plan
- Touches: `package.json`, `package-lock.json`, `docs/releases/0.2.9.md`, new `tests/main/releaseVersion.test.js`
- Tests: 5 unit tests in one new file; the existing suite stays green

Branch `release/v0.2.9` from `main` (team.md branch naming). The release does not change story code (NFR1).

## Steps

- [x] **Step 1: Runner check.** Run `npx vitest run tests/main/releaseVersion.test.js` once the file exists. The vitest `main` project picks it up.
- [x] **Step 2: Red (FR1, FR6).** Write `tests/main/releaseVersion.test.js` with these tests:
  1. `docs/releases/<package.json version>.md` exists.
  2. Its title reads `Release plan v<version>`.
  3. Every row in its slice table is ✅ (Done or Released), with none 🚧 or 📋.
  4. It carries the manual-download note for users on v0.2.8 or earlier (FR5). The test checks the version is 0.2.9 and the text contains `download v0.2.9 by hand`.
  5. `package-lock.json`'s top-level `version` equals `package.json`'s.

  Run the tests and record the failures: on 0.2.8, tests 3 and 4 fail against `docs/releases/0.2.8.md`, or test 1 does.
- [x] **Step 3: Green (FR1).** Run `npm version 0.2.9 --no-git-tag-version`, which bumps `package.json` and `package-lock.json`.
- [x] **Step 4: Green (FR5).** Add a `## For users on v0.2.8 or earlier` section to `docs/releases/0.2.9.md`. It says the repository moved to `tochman/ai-dlc-thadeus` (US-0027), so those copies cannot update themselves and v0.2.9 is downloaded by hand once from the GitHub release. Later updates work as usual.
- [x] **Step 5: Refactor.** Tidy the test helpers while the suite stays green. Run Prettier on the new files.
- [x] **Step 6: Docs and traceability.** Write `code-summary.md` and `traceability.json`.

Later stages, not this plan, cover the rest:
- Build and Test: the full suite and the release PR's green CI (FR1.1).
- Deployment Execution: the hand checks (FR2), the `.dmg` (FR3), the tag (FR4), the GitHub note (FR5), "Released in v0.2.9" (FR6) and the smoke test (FR7).

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

Only the business-logic layer applies (a docs/version check). The data model, repository, API and frontend layers are left out because the release changes none of them.
