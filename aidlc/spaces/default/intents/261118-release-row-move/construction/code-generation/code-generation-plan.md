# Code Generation Plan: US-0029 release row move

## Summary

- Builds: a story moved to another release is removed from the old release's plan file and added to the new one
- Touches: `src/main/parsers/releases.js`, `src/main/releases.js`, `tests/main/releasesPlan.test.js`, the US-0029 markers in `docs/`
- Tests: 4 main-project tests (vitest, node), written first

## Scope

Story: US-0029 in `docs/features/epic-00-fixes.md` (EPIC-00, for v0.2.10). Branch `fix/US-0029`. No Units; one build.

Today `setStoryRelease` calls `writePlanRow`, which only adds a row to the new version's `docs/releases/X.Y.Z.md`. The old version is known before the write from `releaseOf(story.statusText).planned`.

Requirements, from the story's acceptance criteria:

- **FR1** A story listed in release A's plan file and moved to release B: its row is removed from A's slice table and added to B's.
- **FR2** When A's slice table has no rows left, A is written back as the heading only (`planHeading(version)`), as a new release is created. If A holds other text, only the empty table is removed.
- **FR3** A plan file changed since it was read is not overwritten (the existing `writeFileSafe` hash check).
- **FR4** A test fails without the fix and passes with it; the existing suite stays green.

Design:

- New pure `removePlanRows(planText, ids)` in `src/main/parsers/releases.js`, next to `addPlanRows`. It drops the slice-table rows whose first cell is one of `ids`. When none are left, it drops the table's header and separator too, and closes up the blank lines. Text without such a row comes back unchanged.
- In `src/main/releases.js`, `setStoryRelease` reads the old version before the marker write. After `writePlanRow` for the new version, when the old version is set and differs, a new `dropPlanRow` removes the row from the old file. A missing old file does nothing. The write uses `writeFileSafe` with the hash of the text read.
- Kept as it is: removing a story from its release (`version` null) still leaves the plan file alone (the existing test `leaves the plan file alone…`). The build-order table (`| # | Story | Why |`) is not touched; only the slice table that `addPlanRows` writes.

## Steps

- [x] Step 1: Set US-0029 to 🚧 In progress in its marker in `docs/features/epic-00-fixes.md`, that epic's `**Status (…)**` line, the `docs/FEATURES.md` row and the row in `docs/releases/0.2.10.md`. (story lifecycle rule)
- [x] Step 2: Verify the runner: `npx vitest run tests/main/releasesPlan.test.js` passes on the unchanged tree.
- [x] Step 3: Business logic, Red. Add to `tests/main/releasesPlan.test.js` a `describe('removePlanRows (US-0029)')` with two tests: (a) a row is removed and every other line stays (FR1); (b) the last row is removed from a heading-plus-table file and the result is `planHeading` (FR2). Record the failing output (the export is missing).
- [x] Step 4: Business logic, Green. Add `removePlanRows` to `src/main/parsers/releases.js` with a doc comment naming US-0029 FR1, FR2.
- [x] Step 5: Repository / data access, Red. Add to the `setStoryRelease and the plan file` describe two tests: (c) a story set to v1.0.0, then moved to v1.1.0: `1.0.0.md` is the heading only and `1.1.0.md` lists the story (FR1, FR2); (d) the old plan file also lists another story: after the move only the moved row is gone and the other row stays (FR1). Record the failing output.
- [x] Step 6: Repository / data access, Green. Read the old version in `setStoryRelease`, add `dropPlanRow` in `src/main/releases.js` and call it after `writePlanRow`. Update the comment at line 45 and the module header to name US-0029.
- [x] Step 7: Refactor while green; run `npx vitest run tests/main/releasesPlan.test.js tests/main/releases.test.js`, then `npx eslint` and `npx prettier --check` on the changed files.

FR3 needs no new test: `dropPlanRow` uses the same `writeFileSafe(…, { expectHash })` call as `writePlanRow`, whose refusal is already tested in `tests/main/fileWrite.test.js`. The code summary names the line.

Not in this stage: the full suite (Build and Test runs it once), ✅ and ticked criteria (after approval of Build and Test).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "quick-fix",
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
  "input_sha256": "sha256:9aed65a26f9fdb3cdc2a9b9e8d5386b5ad5965c9172db7aa95fb358c8862fa52",
  "contract_sha256": "sha256:e42d2ce00548216337e3ac8ba31fbb15976e2ab1e72c6bda55737f9afac62bcd"
}
```

Only the Business logic and Repository / data access layers apply; the other layers have no change in this fix.
