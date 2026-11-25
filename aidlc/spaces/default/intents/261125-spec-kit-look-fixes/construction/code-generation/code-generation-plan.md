# Code Generation Plan: US-0048, the Spec Kit views show the right count and tags, and nothing is squeezed

## Summary

- Builds: the feature count in the left arm (L1), hook tag colours (L2), unsqueezed feature rows (L3), the missing gaps (L4), options side by side (L5) and the disabled look of accent buttons in Configuration (L6).
- Touches: `src/renderer/SpeckitFeatures.jsx`, `SpeckitShell.jsx`, `ProjectView.jsx`, `theme.css`; `tests/renderer/SpeckitFeatures.test.jsx`, `AppShell.test.jsx`, new `tests/e2e/speckitLayout.spec.js`; `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`.
- Tests: 8, test first: 2 in jsdom for L1, 6 in the built app (L1 and L2–L6).

Causes, seen in the code and the built app on 2026-11-25:

- L1: `App.jsx` reads `meta.featureCount`, and nothing reports it. `SpeckitFeatures` has the features; `AidlcProject` reports `intentCount` the same way through `onMeta`.
- L2: the extension list is also a `.speckit-list`, so `.speckit-list .speckit-tag` (meant for the active feature) wins over `.speckit-mode-*`.
- L3: the number and the tag in `.speckit-list .link` can shrink, with `overflow-wrap: anywhere`.
- L4: `.speckit-features` and `.speckit-feature` have no layout rule, so their parts touch.
- L5: probably `.framework-choice-options` shrinking to its content inside `.setup-panel` (`align-items: flex-start`). The Red test settles it.
- L6: `.config-frame .btn-accent` comes after `.btn:disabled` with the same weight, so its background stays.

Branch: `fix/US-0048`, made from `main` in this folder with its uncommitted workflow files carried along. Its own pull request; the person decides on the merge.

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

Only the frontend layer applies. Every step is for US-0048.

- [x] **Step 1. Structure.** Make `fix/US-0048`. Set US-0048 to 🚧 In progress in `epic-00-fixes.md` (heading and Status line) and its `FEATURES.md` row.
- [x] **Step 2. Runner.** Run the commands in `unit-test-instructions.md` that exist today; they pass.
- [x] **Step 3. Red, L1.** `SpeckitFeatures.test.jsx`: the count is reported on load and again after a `speckit:changed` push with one feature more. `AppShell.test.jsx`: a Spec Kit project with two features shows "2 features" in the arm (replaces the "0, U6 counts them" line). Record the failing run.
- [x] **Step 4. Green, L1.** `SpeckitFeatures` reports `featureCount` through an `onMeta` passed down `ProjectView` → `SpeckitShell`.
- [x] **Step 5. Red, layout.** New `tests/e2e/speckitLayout.spec.js`, set up as `intentLayout.spec.js` does (temporary project, tool paths that point nowhere), at 1280, with L5 also at 1920. Build, run, record the failures:
  - L1: the arm says "2 features".
  - L2: the mandatory, optional and turned-off tags have three different looks (background and text colour).
  - L3: with a long feature name, the number and the Active tag are each one line high.
  - L4: a gap above 0 below Commands, and below the next command.
  - L5: the two options share the same top edge.
  - L6: the disabled switch button has the background of `.btn:disabled`.
- [x] **Step 6. Green, layout.** `theme.css` only: limit the active tag's rule to `.speckit-list .link`; `flex: none` on the row's number and tag; `display: grid` with a gap on `.speckit-features` and `.speckit-feature`; full width on `.framework-choice-options`; `:not(:disabled)` on `.config-frame .btn-accent`.
- [x] **Step 7. Refactor** with the tests green. ESLint and Prettier pass on the changed files.
- [x] **Step 8. Documentation.** Comments name US-0048. `code-summary.md` and `traceability.json` in this folder.
