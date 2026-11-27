# Code Generation Plan — US-0055 A failed replay is kept after a real planning commit

## Summary

- Builds: the planning sync marks only replayed changes committed after a real commit; failed and clashed ones stay waiting with their reason, and the Releases view shows it.
- Touches: `src/main/planningSync.js`, `src/main/planningRecord.js`, `src/renderer/FeaturesView.jsx`, `src/shared/locales/{sv,en}.json`, their tests.
- Tests: 5 new (3 sync, 1 record, 1 view), test first.

## Cause

In `replayStep`, `going` leaves out content conflicts (`clashes`) but not the `failed` ids from `replayIn` (an action that threw, or an action that clashed). After a real commit, `committed = [...done, ...going]` marks them committed, and `pushStep` then drops every committed entry. The "nothing to commit" path already filters `failed`.

## Traceability

| AC | Step |
|---|---|
| AC1 replay + fail: only the replayed one is committed, the failed one waits with its reason | 3–5, 6–8 |
| AC2 after the push the failed one is still waiting | 3–5 |
| AC3 a clashed action the same way | 3–5 |

## Steps

- [x] Step 1: Structure: no new files; brownfield edits in place.
- [x] Step 2: Runner: vitest as configured; scoped command in `unit-test-instructions.md`, run once before Step 3.
- [x] Step 3: Data model (record) Red: in `tests/main/planningRecord.test.js`, `markWaiting(ids, reasons)` keeps the entries `pending` with `reason`; `markCommitted` drops `reason`. Run, record the failure.
- [x] Step 4: Data model Green: add `markWaiting` to `planningRecord.js`; `markCommitted` removes `reason`.
- [x] Step 5: Business logic Red: in `tests/main/planningSync.test.js` (US-0055 block, real git repo as the US-0053 tests do): (a) a cycle with one action that replays and one that throws: after the commit only the first is `committed`, the second is `pending` with a reason; (b) after the push (bare origin) the failed one is still in `waitingList` as `pending` with its reason; (c) the same with an action that clashes (`res.conflict`). Run, record the failure.
- [x] Step 6: Business logic Green: `replayIn` returns `failed` as `{id, reason}` (the error message, or the clash text); `replayStep` leaves failed ids out of `going`, calls `markWaiting` for them, and `waitingList` passes `reason` on. Comment `US-0055 FR1`.
- [x] Step 7: Refactor: drop the now redundant `!failed.includes` in `already`; suite green.
- [x] Step 8: Frontend Red: in `tests/renderer/FeaturesView.test.jsx`, a waiting entry with `reason` shows it in its line (`planning-entry`). Run, record the failure.
- [x] Step 9: Frontend Green: `entryText` adds `t('features.planning.entry.failed', { reason })`; key in `sv.json` and `en.json`.
- [x] Step 10: Refactor: ESLint and Prettier on the changed files; scoped run green.
- [x] Step 11: Docs and traceability: `code-summary.md`, `traceability.json`; US-0055 set to 🚧 In progress in `docs/features/epic-00-fixes.md`, its FEATURES.md row and the 0.3.2 release plan.

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

Repository/data access and API/endpoint layers: no change (the record file and the IPC handler pass entries through as they are).
