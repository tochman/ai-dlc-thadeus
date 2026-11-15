# Code Generation Plan — US-0411 Pipeline stages as LCARS cards

## Summary

- Builds: each pipeline stage as an `.lcars-card` with name header, status body, agent/duration footer and a unit level bar; colour by state
- Touches: `src/main/parsers/runtimeGraph.js`, `src/main/parsers/pipeline.js`, `src/renderer/Pipeline.jsx`, `src/renderer/theme.css`, `src/shared/locales/{sv,en}.json`
- Tests: about 8 — 3 parser tests in `tests/main/parsers.test.js`, 5 renderer tests in a new `tests/renderer/Pipeline.test.jsx`

Source: `inception/requirements-analysis/requirements.md` (US-0411, FR1–FR5, NFR1–NFR3). Zero-Unit work; brownfield, files changed in place.

## Design in brief

- `parseRuntimeGraph` adds per stage `unitsApproved` (instances with outcome `approved`) and `unitsSeen` (instance count).
- `mergePipeline` adds per stage `units: { approved, total } | null` — `null` when the stage has no instances; `total` = `bolt_dag` unit count, else `unitsSeen` (assumption in requirements) — and `failed: true` when the runtime outcome is set and not `approved`.
- `Pipeline.jsx` exports `levelBar(stage)` → `{ segments: [bool…], label }`: one segment per unit up to 8, lit = approved; above 8, 8 segments with `floor(approved / total × 8)` lit (all 8 only when every unit is approved); no units → one segment, lit when `status === 'done'`.
- `StageBlock` renders the `<button>` as `lcars-card stage-card`: head (`stage-name`, right), body (today's `stage-top` line), foot (`stage-code` = agent short name `aidlc-x-agent` → `x`, plus duration; `stage-level` segments with `role="img"` and the `t()` label).
- Colours (theme.css): current / in progress / revising = steel fill; awaiting approval = coral fill; done = grey outline; skipped = muted; `is-mismatch` / `is-failed` = amber outline and flag. Glow reuses `is-breathing` / `is-attn`, so Dämpad and Av already apply (FR4, NFR1). Black text on steel and coral as today (NFR2).

## Steps

- [x] Step 1: Verify the runner: `npx vitest run tests/main/parsers.test.js tests/renderer/Pipeline.test.jsx` (record in `unit-test-instructions.md`). (NFR3)
- [x] Step 2: Data access — Red: in `tests/main/parsers.test.js` add tests that `parseRuntimeGraph` counts `unitsApproved`/`unitsSeen`, that `mergePipeline` gives `units` (bolt_dag total, instance fallback, `null` without instances), and `failed` for a `rejected` outcome. Record the failing output. (FR2.1, FR3.4)
- [x] Step 3: Data access — Green: implement in `runtimeGraph.js` and `pipeline.js`. (FR2.1, FR3.4)
- [x] Step 4: Data access — Refactor with the suite green.
- [x] Step 5: Business logic — Red: in new `tests/renderer/Pipeline.test.jsx`, test `levelBar` for 2 of 5 units, 10 units with 5 approved (8 segments, 4 lit), 9 of 9 (all lit), no units done / not done. Record the failing output. (FR2.1–FR2.3)
- [x] Step 6: Business logic — Green: export `levelBar` from `Pipeline.jsx`. (FR2)
- [x] Step 7: Business logic — Refactor with the suite green.
- [x] Step 8: Frontend — Red: render `Pipeline` and assert each stage is an `lcars-card` with the name in its head, agent short name and duration in its foot, the level bar's accessible label ("2 av 5 enheter godkända"), classes for current / awaiting approval / done / skipped / mismatch, and that clicking still opens the stage's files. Record the failing output. (FR1, FR2.4, FR3, FR5)
- [x] Step 9: Frontend — Green: rewrite `StageBlock` as the card; add keys `pipeline.levelUnits`, `pipeline.levelDone`, `pipeline.levelTodo`, `pipeline.failed` to `sv.json` and `en.json`. (FR1, FR2.4, FR5)
- [x] Step 10: Frontend — Refactor: replace the `stage-block` rules in `theme.css` with `stage-card` rules on top of `.lcars-card` (colours above, level-bar segments, Dämpad/Av static glow via the existing `is-breathing`/`is-attn` rules). (FR3, FR4, NFR1, NFR2)
- [x] Step 11: Run the full suite `npx vitest run tests/` green (includes `tests/main/i18nKeys.test.js`). (NFR3)
- [x] Step 12: Documentation: header comments name `US-0411` and the FR they implement; write `code-summary.md` and `traceability.json`.

No configuration, migration or deployment changes. The story and epic docs are updated at the end of the workflow, as the team's rules say.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
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
  "input_sha256": "sha256:5d2edc438462ecd58d1a189f25096b14e109e68759a39bd787110cab4319df72",
  "contract_sha256": "sha256:4b20260229f72394250d9ed3f4261eb56cb5d29b1135cd7ade31c323a93c7425"
}
```

Layers not in this change: data model / database, API / endpoint (no schema or IPC change; the new fields ride the existing project payload).
