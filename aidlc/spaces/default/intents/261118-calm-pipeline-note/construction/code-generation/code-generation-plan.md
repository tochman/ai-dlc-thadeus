# Code Generation Plan: US-0028 calm pipeline note

## Summary

- Builds: the pipeline view shows no note about a missing runtime-graph.json on a new intent, and one calm sentence when stages are done but the file is not on this machine
- Touches: `src/renderer/Pipeline.jsx`, `src/shared/locales/sv.json`, `src/shared/locales/en.json`, `tests/renderer/Pipeline.test.jsx`, the US-0028 markers in `docs/`
- Tests: 3 renderer tests (vitest, jsdom), written first

## Scope

Story: US-0028 in `docs/features/epic-00-fixes.md` (EPIC-00, for v0.2.10). Branch `fix/US-0028`. No Units; one build.

Today `Pipeline.jsx` line 175 shows `t('pipeline.noGraph')` whenever `hasGraph` is false. `IntentDetail.jsx` passes `hasGraph={!!detail.graph}`.

Requirements, from the story's acceptance criteria:

- **FR1** No runtime-graph.json and no stage with status `done`: no note about the file.
- **FR2** No runtime-graph.json and at least one stage with status `done`: one calm sentence that timings are kept only on the machine that ran the work. Same `muted` paragraph as today (LCARS look unchanged), `data-testid="pipeline-timings-note"`.
- **FR3** A runtime-graph.json that exists but cannot be read still warns as today through the `buildDetail` warnings. No change; check only that this fix does not touch that path.
- **FR4** The text goes through `t()` in Swedish and English.

Design: keep the key `pipeline.noGraph` (no new key, so `tests/main/i18nKeys.test.js` stays green) and change its text and its condition.

- sv: "Tidsuppgifter finns bara på den dator som körde arbetet. Status kommer från aidlc-state.md."
- en: "Timings are kept only on the machine that ran the work. Status comes from aidlc-state.md."
- Condition: `!hasGraph && pipeline.phases.some((p) => p.stages.some((s) => s.status === 'done'))`.

## Steps

- [x] Step 1: Set US-0028 to 🚧 In progress in its marker in `docs/features/epic-00-fixes.md`, that epic's `**Status (…)**` line, the `docs/FEATURES.md` row and the row in `docs/releases/0.2.10.md`. (story lifecycle rule)
- [x] Step 2: Verify the runner: `npx vitest run tests/renderer/Pipeline.test.jsx` passes on the unchanged tree.
- [x] Step 3: Frontend behavior, Red. Add to `tests/renderer/Pipeline.test.jsx` a `describe('runtime-graph note (US-0028)')` with three tests and record the failing output: (a) no graph, no done stage: no `pipeline-timings-note` (FR1); (b) no graph, one done stage: the note is shown with the Swedish calm sentence (FR2, FR4); (c) `hasGraph`: no note. (a) and (b) must fail before the fix.
- [x] Step 4: Frontend behavior, Green. Change the condition and add the test id in `src/renderer/Pipeline.jsx`; change the `pipeline.noGraph` text in `sv.json` and `en.json`. Update the module header comment to name US-0028.
- [x] Step 5: Refactor while green; run `npx vitest run tests/renderer/Pipeline.test.jsx tests/main/i18nKeys.test.js`, then `npx eslint` and `npx prettier --check` on the changed files.
- [x] Step 6: FR3 check: read where `buildDetail` warnings are shown and confirm this change leaves it alone. Note the finding in the code summary; no code change expected.

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

Only the Frontend behavior layer applies; the other layers have no change in this fix.
