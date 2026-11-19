# Code Generation Plan: US-0032 one committer for feature docs

## Summary

- Builds: the rule "on `main`, never commit the feature docs; THADEUS does" in the shipped THADEUS rule pack, and an offer of new pack lines to projects that already have the pack
- Touches: `src/shared/costRules.js`, `src/main/costRules.js`, `src/renderer/CostRulesSection.jsx`, `src/shared/locales/{sv,en}.json`, their tests, `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`
- Tests: 4 new unit tests (shared pack, main status, renderer offer, pack limits kept), existing suite green

Story: US-0032 (`docs/features/epic-00-fixes.md`). Scope quick-fix, zero-Unit, brownfield.

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

Layers with no work here (data model, repository, API) are left out: the pack is a constant, read by one main module and one view.

- [x] Step 1: Set US-0032 to 🚧 In progress in its marker, EPIC-00's status line and its `FEATURES.md` row (story lifecycle rule). — AC: lifecycle
- [x] Step 2: Verify the runner: `npx vitest run tests/main/costRules.test.js tests/renderer/CostRulesSection.test.jsx` passes on the unchanged tree.
- [x] Step 3 (Business logic, shared pack) — Red: in `tests/main/costRules.test.js`, a test that `COST_RULES_PACK.project` holds the line "On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them." Record the failing output. — AC1, AC5
- [x] Step 4 — Green: add the line to `COST_RULES_PACK.project` in `src/shared/costRules.js`. The NFR2 limits test (≤ 8 lines, ≤ 800 characters) stays green, and `findClashes` finds no clash for the line against the repository's own `team.md` (new test: "Docs and small chores may go straight to `main`" does not clash). — AC1, AC4
- [x] Step 5 (Business logic, main status) — Red: in `tests/main/costRules.test.js`, `costRulesStatus` on a space whose `project.md` block holds the older pack (without the new line) returns `missing: { project: [<new line>] }`, and `missing` is empty for a space with the full pack or no block. Record the failing output. — AC1 (a project that already has the pack is offered the new line)
- [x] Step 6 — Green: `costRulesStatus` in `src/main/costRules.js` adds `missing`: per target, the shipped lines not in the present block's lines (only when the block is present).
- [x] Step 7 (Frontend behavior) — Red: in `tests/renderer/CostRulesSection.test.jsx`, a status with `missing.project` shows a note naming the missing line and a button (`data-testid="cost-rules-add-missing"`); clicking it appends the line to the project text area; nothing is saved until the usual preview is confirmed. Record the failing output. — AC1
- [x] Step 8 — Green: `CostRulesSection.jsx` renders the note and the button; new keys `costRules.missingTitle` and `costRules.addMissing` in `sv.json` and `en.json` (LCARS classes already used in the section).
- [x] Step 9 — Refactor with `tests/main/costRules.test.js`, `tests/renderer/CostRulesSection.test.jsx` and `tests/main/i18nKeys.test.js` green.
- [x] Step 10: Documentation and traceability: module header comments name US-0032; `code-summary.md` and `traceability.json` in the record.

The story-branch exemption (AC2) is carried by the rule's own words ("On `main`"); no code is needed for it. AC3 ("exactly one commit") follows from agents following the rule and is checked by hand, not by a unit test: it needs an agent session.
