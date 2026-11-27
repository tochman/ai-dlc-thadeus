# Code Generation Plan — US-0056 The planning sync never commits a file in the middle of a merge

## Summary

- Builds: the planning sync waits while a merge, rebase, cherry-pick or revert is in progress in the checkout, and never records or commits a feature doc holding conflict markers; the Releases view says why and names the file.
- Touches: `src/main/planningSync.js`, `src/renderer/FeaturesView.jsx`, `src/shared/locales/{sv,en}.json`, their tests.
- Tests: 6 new (5 sync, 1 view), test first.

## Cause

`recordStep` reads every changed feature doc in the checkout and, on a story branch, records the other stories' blocks and writes the story's file back (`restoreKeep`); `commitIn` commits every changed doc. Neither looks for a merge in progress (`MERGE_HEAD`, a rebase folder, `CHERRY_PICK_HEAD`) or for conflict markers, so a conflicted `docs/FEATURES.md` was recorded, committed to `main` and its row put back on the branch (f56b8f7).

## Traceability

| AC | Step |
|---|---|
| AC1 merge, rebase or cherry-pick in progress: nothing recorded, committed or pushed; says it waits | 3–4, 6–7 |
| AC2 a file with conflict markers is never recorded or committed; the file is named | 3–4, 6–7 |
| AC3 after the merge the next cycle runs as before; the story's file is not changed back | 3–4 |

## Steps

- [x] Step 1: Structure: no new files; brownfield edits in place.
- [x] Step 2: Runner: vitest as configured; scoped command in `unit-test-instructions.md`, run once before Step 3.
- [x] Step 3: Business logic Red: in `tests/main/planningSync.test.js`, a US-0056 block (real git repo with a bare origin, as the US-0053 tests): (a) `it.each` merge, rebase, cherry-pick: a story branch whose `docs/FEATURES.md` conflicts with origin's main; `runCycle` gives `error.kind 'merge'`, the record stays empty, origin's main and the conflicted file are unchanged; (b) on `main`, a feature doc with conflict markers and no merge: `runCycle` gives `error {kind: 'markers', files: ['docs/FEATURES.md']}`, nothing recorded, no commit; (c) an editor save with markers replayed into the commit is refused the same way; (d) AC3: the merge resolved and committed, the next cycle gives no error, records nothing, and the file stays as merged. Run, record the failure.
- [x] Step 4: Business logic Green: `inMerge(cwd, ctx)` (`git rev-parse --git-path` for `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `rebase-merge`, `rebase-apply`, then a stat); `recordStep` and `replayStep` return early with `{kind: 'merge'}` while it holds; `hasMarkers(text)` (a line starting with `<<<<<<<` or `>>>>>>>`, or a line that is exactly `=======`); `recordStep` skips and names such files, `commitIn` refuses to commit when one of its files has them; `runCycle` passes the error on and skips the push. Comment `US-0056 FR1`/`FR2`; `ponytail:` on the exact `=======` line (a setext underline of exactly seven `=` would count).
- [x] Step 5: Refactor: scoped run green.
- [x] Step 6: Frontend Red: in `tests/renderer/FeaturesView.test.jsx`, a planning status with `error.kind 'merge'` and one with `'markers'` show their sentences (`planning-error`), the second naming the file. Run, record the failure.
- [x] Step 7: Frontend Green: `planningErrorText` knows `merge` and `markers`; keys `features.planning.error.merge` and `.markers` in `sv.json` and `en.json`.
- [x] Step 8: Refactor: ESLint and Prettier on the changed files; scoped run green.
- [x] Step 9: Docs and traceability: `code-summary.md`, `traceability.json`; US-0056 set to 🚧 In progress in `docs/features/epic-00-fixes.md`, its FEATURES.md row and the 0.3.2 release plan.

Data model, repository, API layers: no change (the record and the IPC handler pass the result through as it is).

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
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).\n- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.\n- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.\n- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.\n- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check."
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
  "input_sha256": "sha256:88a731b4ee7244a446aff4ca6ed5dc5172b18032c5eb29d520ce15f5f12b868b",
  "contract_sha256": "sha256:0753d09afb0bc3b53aaf639e33074da4c539985c42e493c67138981db2bcb87b"
}
```
