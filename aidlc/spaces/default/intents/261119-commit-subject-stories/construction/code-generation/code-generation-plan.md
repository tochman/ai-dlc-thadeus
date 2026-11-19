# Code Generation Plan: US-0033 commit subject names only the stories that changed

## Summary

- Builds: a per-change `named` list of the stories a feature-doc change is about (heading for a story, row key for a story row, changed clauses for epic lines and FEATURES.md rows), used for the commit subject, which is cut after five stories
- Touches: `src/main/parsers/features.js` (`splitChange`), `src/main/planningSync.js` (`subjectOf` and its two callers), `tests/main/planningSplit.test.js`, `tests/main/planningSync.test.js`, `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`
- Tests: 5 new unit tests (story block, story row, epic lines and new story, the five-story cut, the own-story split kept), existing suite green

Story: US-0033 (`docs/features/epic-00-fixes.md`). Scope quick-fix, zero-Unit, brownfield.

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

## Steps

Only the business-logic layer has work: `splitChange` and `subjectOf` are pure functions. Data model, repository, API and frontend layers are left out (the Features view already shows `storyIds`, which get better with no change there).

Cause: a change's `ids` come from `storyBlocks`, which gives a story row (`row:US-1405`) and every text block outside a story (the "Stories:" line, the "Status" line, a `FEATURES.md` row) every `US-` id in its text. `ids` also decides what is the story branch's own (US-0608 FR3), so it stays as it is; the subject gets its own list.

- [x] Step 1: Set US-0033 to 🚧 In progress in its marker, EPIC-00's status line and its `FEATURES.md` row (story lifecycle rule). — AC: lifecycle
- [x] Step 2: Verify the runner: `npx vitest run tests/main/planningSplit.test.js tests/main/planningSync.test.js` passes on the unchanged tree.
- [x] Step 3 (Business logic, `splitChange`) — Red: in `tests/main/planningSplit.test.js`, each change carries `named`:
  - a changed story block names its heading id only, not the ids its Dependencies, Background or Notes mention (AC1);
  - a changed release-plan row `| US-1405 | … | US-0503 |` names `US-1405` only (the `3349d29` case, AC1);
  - an epic's "Stories:" line that gains `US-0032`, its "Status" line that gains `🚧 US-0032 …`, and a `FEATURES.md` epic row whose `US-0032` clause changes from 🚧 to ✅ each name `US-0032` only; a new story block plus those lines names `US-0032` alone (the `b2ed89e` case, AC2, AC3);
  - a changed text block where no clause with an id changed names nothing (AC2).
  Record the failing output.
- [x] Step 4 — Green: in `src/main/parsers/features.js`, `splitChange` adds `named` to each change: a story block's own id; a `row:US-XXXX` block's key id; any other block, the ids whose clauses differ between `before` and `after` (clauses split on `·`, `|`, `, `, `. `, `; ` and line breaks, compared as sorted lists per id). `ids`, `keep` and the own-story test are unchanged.
- [x] Step 5 (Business logic, own-story split kept) — a test in `tests/main/planningSplit.test.js` that the existing story-branch split gives the same `keep` and `changes[].ids` as before for the `b2ed89e` case (AC5). It passes at once (the split is not changed); this is the guard.
- [x] Step 6 (Business logic, `subjectOf`) — Red: in `tests/main/planningSync.test.js`, `subjectOf` with content entries naming seven stories reads `docs: update US-1401, US-1402, US-1403, US-1404, US-1405 and 2 more`, with five reads all five, and with none reads `docs: update the feature docs` (AC4, AC2). Record the failing output.
- [x] Step 7 — Green: `subjectOf` in `src/main/planningSync.js` cuts each id list after five with "and N more"; `recordOnTarget` and `recordOnStory` record `storyIds` from `changes[].named` instead of `changes[].ids`.
- [x] Step 8 — Refactor with `tests/main/planningSplit.test.js`, `tests/main/planningSync.test.js` and `tests/main/features.test.js` green.
- [x] Step 9: Documentation and traceability: the doc comments of `splitChange` and `subjectOf` name US-0033; `code-summary.md` and `traceability.json` in the record.

AC6 ("a test fails without the fix, with both commits as cases") is Step 3's `3349d29` and `b2ed89e` cases.
