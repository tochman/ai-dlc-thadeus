# Code Generation Plan: US-0044, the intent view fits the window

## Summary

- Builds: the intent view without horizontal overflow, with no empty band under the title, with room under the tabs, and with the Live tokens panel inside the left arm (US-0044)
- Touches: `src/renderer/theme.css`, possibly `src/renderer/Lcars.jsx` (DiagonalFrame) and `src/renderer/IntentDetail.jsx`; a new `tests/e2e/intentLayout.spec.js`
- Tests: one built-app end-to-end spec with 4 layout checks (one per acceptance criterion) at two window widths, plus the existing suite

## Context

Story: US-0044 in `docs/features/epic-00-fixes.md`. Two screenshots of v0.2.14 on the `spec-kit-framework` intent show the defects. They are layout faults (widths, gaps, overflow), so jsdom cannot see them: the narrowest test that reproduces them is the built app in Electron (Playwright, as `tests/e2e/planning.spec.js` does). Work on branch `fix/US-0044` from `origin/main`, in the worktree `.claude/worktrees/fix-0044`. Spec Kit's files are left alone.

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

Only the frontend layer applies: no data model, repository, logic or API change.

## Steps

- [x] **Step 1: Branch and story.** Create the worktree `.claude/worktrees/fix-0044` on a new branch `fix/US-0044` from `origin/main`, and run `npm ci` there if `node_modules` is missing. US-0044 goes to 🚧 In progress (its marker, the EPIC-00 Status line and its FEATURES.md row) in the story's commit on the branch.
- [x] **Step 2: Runner.** Verify that `npx electron-vite build` and `npx playwright test tests/e2e/planning.spec.js` run in the worktree (the existing built-app spec), and record the exact commands in `unit-test-instructions.md`.
- [x] **Step 3: Red (frontend).** Write `tests/e2e/intentLayout.spec.js` (US-0044). It sets up a temporary AI-DLC project like `planning.spec.js`. The project has one in-flight intent whose request names 12 stories, with a unit graph of 9 units in 3 columns, a long slug, an audit with a NOT-READY review and live token rows, so the head, chips, tabs, Units graph, Review view and Live tokens panel all render. It opens the intent at window widths 1280 and 1920 and checks:
  - AC1: `.intent-detail` has no horizontal overflow (`scrollWidth <= clientWidth`), and the chips row, the tab row, the head actions, the frame's tag and every button in the head lie inside the frame's right edge.
  - AC2: on the Units tab, the graph panel is no wider than the frame body, and the graph scrolls inside it.
  - AC3: the gap between the frame's top bar and the chips row is at most 40 px, and on the Review tab its first heading starts at least 12 px below the tab row.
  - AC4: the Live tokens panel and its chart lie inside the left arm, above the frame's lower curve.
  Build, run, and record the failing output (each AC fails on the current code, as the screenshots show).
- [x] **Step 4: Green (frontend).** Measure in the built app which element sets each width, then make the smallest change that passes each check, in the US-0417 language: `min-width: 0` or `max-width: 100%` where a flex or grid child takes its content's width, wrapping (or a scroll inside its own row) for the chips and tabs, the Units graph in its own scrolling panel, the top padding of `.lcars-df-in` matched to the head, a gap under `.detail-tabs`, and the Live tokens panel held to the arm's width and height (a smaller chart, or the panel moved to the head's Activity block when the arm has no room). Comments name `US-0044` and the AC.
- [x] **Step 5: Refactor.** Remove any rule the fix made unused, keep `tests/main/theme.test.js` (the US-0417 LCARS rules) green, and run the existing renderer tests for `IntentDetail`, `TokenView`, `BoltDag` and `Lcars`.
- [x] **Step 6: Documentation and traceability.** Write `code-summary.md` and `traceability.json` for this record. Tick met acceptance criteria in US-0044 only after Build and Test.
</content>
</invoke>
