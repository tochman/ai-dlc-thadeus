# Code Generation Plan — US-0058

## Summary

- Builds: opencode agent activity in Activity and Astrometrics, alongside the Cost and Velocity support already in this branch.
- Touches: `src/main/opencodeDb.js`, activity aggregation and Pulse integration, plus focused tests.
- Tests: targeted Vitest coverage for database mapping, activity rows, and Astrometrics touches.

## Scope and evidence

The quick-fix scope skips requirements and design artifacts. The story in `docs/features/epic-00-fixes.md` requires opencode activity in Cost, Velocity, Activity, and Astrometrics. The existing Code Generation summary and branch contain the Cost work; preserve it. Continue from the documented cause: opencode's shared server does not inherit the app's `THADEUS_SESSION_DIR`, so the project plugin cannot report live activity. Reuse the read-only opencode database integration already added for Cost, and adapt its available session/tool timeline to the existing activity model and Pulse path. Do not change the database or opencode permission behavior. Keep the Astrometrics work in US-0058 only to the extent it can use the existing Pulse touch model; record any unsupported event data as a gap rather than inventing it.

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

## Steps

- [x] 1. **Baseline and runner.** Run the existing focused command in `unit-test-instructions.md`; record its result before changing code.
- [x] 2. **Database timeline — Red / Green / Refactor.** Add fixtures and tests proving session identity, message timestamps, tool calls, child sessions, and malformed or missing records are handled safely. Extend the read-only opencode reader only for fields the database actually provides; keep existing Cost behavior green.
- [x] 3. **Activity mapping — Red / Green / Refactor.** Test conversion of the database timeline into the existing harness-neutral activity events, including main/child session grouping, tool start/end, completed/idle states, and text-free output. Implement the mapper and preserve existing `agentActivity` behavior.
- [x] 4. **Activity integration — Red / Green / Refactor.** Test that opencode rows reach the Activity view for the owning project and disappear or become idle consistently with existing rows. Connect the mapped data to `agentEvents` without adding a parallel renderer model.
- [x] 5. **Astrometrics — Red / Green / Refactor.** Test that supported opencode tool events enter the existing Pulse touch model with project-relative paths only. Connect supported touches; leave unsupported database fields out and document any remaining gap.
- [x] 6. **Existing Cost and Velocity.** Re-run the current Cost/parser and project-service tests; retain the prior implementation and verify attribution remains intact.
- [x] 7. **Completion files.** Update `code-summary.md`, create `traceability.json` with the stage tool, run focused tests, ESLint and Prettier on touched files, and summarize anything not run.
