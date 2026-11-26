# Code Generation Plan: US-0050

## Summary

- Builds: the approved motion audit (`motion-audit.md`, items 1-11): tab transitions, entrance for the views that lack it, shared folds, one-shot live-change glow, hover and dialog fixes
- Touches: `src/renderer/theme.css`, `src/renderer/Lcars.jsx`, about 20 views (IntentList, IntentDetail, VelocityView, TokenDetail, ProjectView, RefreshPanel, MachinesView, Speckit*, CostPanel, Timeline, StoryComments, PlansView, FileTree, AgentDialog and the raw dialogs), their renderer tests, `tests/main/theme.test.js`, a new `tests/e2e/motion.spec.js`, the feature docs
- Tests: about 12 renderer/CSS tests and 2 built-app tests, each red before its change

## Approved scope

`motion-audit.md` in this folder, approved by the person on 2026-11-26. Items 12-16 stay still or belong to US-0412.

## Steps

- [x] Step 1: Set US-0050 to 🚧 In progress (status marker, epic Status line, FEATURES.md row).
- [x] Step 2: Verify the runners: `npx vitest run tests/main/theme.test.js tests/renderer/Lcars.test.jsx` and `npm run build` then `npx playwright test tests/e2e/motion.spec.js`.
- [x] Step 3 (Shared motion, Red): in `tests/main/theme.test.js`, assert:
  - `lcars-tab-in` (opacity plus translate, 200 ms), `lcars-reveal` (the shared fold, from `features-story-reveal`) and `lcars-changed` (one glow, 600 ms) exist, are Full-only, and animate only transform, opacity, filter or box-shadow
  - a static stand-in for `update-dialog-run` under Reduced and Off
  - a 150 ms filter transition on `.lcars-nb`, `.lcars-pill`, `.lcars-tile` and `.lcars-chip`
  - a Full-only `@starting-style` fade on the raw dialogs

  Record the failing output.
- [x] Step 4 (Shared motion, Green): add those to `theme.css` once, beside the existing keyframes; make `features-story-reveal` use `lcars-reveal`.
- [x] Step 5 (Hook, Red): in `tests/renderer/Lcars.test.jsx`, test `useChanged(value)`. It is true for 600 ms after the value changes, never on mount, never on a re-render with the same value, and never under Reduced or Off.
- [x] Step 6 (Hook, Green): add `useChanged` to `Lcars.jsx`.
- [x] Step 7 (Tab transitions, items 2-4, Red): in each view's renderer test, under Full, the switched content carries `lcars-tab-in` and is keyed by its tab, so it plays once per switch; under Reduced it does not. Views: the IntentDetail tabpanel, Velocity Week/Month, the Activity Diagram/Table, Config Settings/Plans, Config sections, GitHub sections, AgentDialog pages.
- [x] Step 8 (Tab transitions, Green): wrap each switched body in a keyed element with `lcars-tab-in`.
- [x] Step 9 (Entrance, items 1, 5, 6, Red): intent list rows, GitHub headings and rows, and the Spec Kit features rows, progress parts and flow steps carry `lcars-e-rise`/`lcars-e-block` with `--i` capped at 12. A view that is already shown and gets new data does not replay (`is-entering` stays off). Selecting a Spec Kit feature uses `lcars-tab-in`.
- [x] Step 10 (Entrance, Green): add the classes and `--i`.
- [x] Step 11 (Folds, item 7, Red): the intent request, Cost Show/Hide, Timeline event fields, Comments resolved, Refresh panel, plan list and editor folders open with `lcars-reveal`.
- [x] Step 12 (Folds, Green).
- [x] Step 13 (Live change, item 8, Red): when an intent row's status, the intent and feature counts, a Spec Kit task's done state or a story's status changes, that element alone gets `lcars-changed` once. An update with the same values adds it nowhere.
- [x] Step 14 (Live change, Green): use `useChanged` there.
- [x] Step 15 (Built app, Red): new `tests/e2e/motion.spec.js` with the `speckitLayout` pattern:
  - (a) under Full, switching an intent tab runs an animation on the new tab content (`getAnimations()`), and under Reduced none
  - (b) with 25 intents and 2,000 timeline events, entering the intent list and the Timeline keeps frames at or under 20 ms at p95 (`requestAnimationFrame` intervals)

  Record the failing output for (a).
- [x] Step 16 (Built app, Green): build, then run the spec until it is green.
- [x] Step 17 (Refactor): tidy with the touched tests green; comments name `US-0050` and the audit item.
- [x] Step 18 (Docs): US-0050 ✅ Done, for v0.3.1, with its criteria ticked, the epic Status line and the FEATURES.md row.

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

Only the frontend layer applies; the others have no steps.
