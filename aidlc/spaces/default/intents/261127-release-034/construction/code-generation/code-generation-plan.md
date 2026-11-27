# Code Generation Plan — US-0906 Visual Plan Designer

## Summary

- **Builds:** a plan designer inside the Plans view. AI-DLC plans: stage nodes in pipeline order, on/off toggles, add and remove, defaults side panel. Spec Kit: a locked core spine with hooks placed before or after each step.
- **Touches:** `src/shared/planDesign.js` (new, pure rules), `src/main/plans.js`, `src/main/speckitHooksEdit.js` (new), `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/PlanDesigner.jsx` (new), `src/renderer/PlansView.jsx`, the Spec Kit rules view, `sv.json`, `en.json`, the LCARS styles, and the feature docs.
- **Tests:** vitest `main` for the rules and the two writers, `renderer` (jsdom) for the designer; TDD, Red before Green for each FR.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "standard",
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
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
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
  "input_sha256": "sha256:62e0e9fa98cd86fbefaed196456b1ab91473689ff98919dd339561dd96d35b90",
  "contract_sha256": "sha256:b4ae8e1ec7217b124511fee47f9c29395d19f01a4e3b3abd23c00abd3e6afb59"
}
```

## Design choices

- **No canvas library.** React Flow is not installed. The canvas is an ordered list of LCARS stage blocks with native drag and drop plus keyboard moves (ponytail: no free placement; add React Flow if people ask for branching layouts). A plan has no branches, so a list shows it fully (FR1.2).
- **AI-DLC stage edits** change only the `stages` map of the own plan's composed-grid block, through the existing preview and apply path in `plans.js` (same `before` check, then a recompile through the `aidlc` CLI). "Save as a new plan" keeps using `aidlc engine scope save` (FR3.2). Stock plans are read-only; editing one starts with saving it as an own plan.
- **Rules** come from the compiled `.claude/tools/data/stage-graph.json`: only stages in the graph can be added, pipeline order is the graph's order and cannot be changed by dragging (a move is refused with its reason), initialization stages cannot be turned off, and a plan needs at least one stage on.
- **Spec Kit** keeps its core commands (constitution, specify, clarify, plan, tasks, analyze, implement) as a locked spine. Hooks go in `before_<step>` or `after_<step>`, with an installed extension, a safe command name (`SAFE_NAME`) and a mode (mandatory, optional, off). The file is edited as a YAML document so comments and other keys stay.

## Steps

1. **Runner.** Confirm the commands in `unit-test-instructions.md` run (vitest 5.1, `main` and `renderer` projects).
2. **Set the story to 🚧** in the epic file, the epic's Status line and `FEATURES.md`.
3. **Rules, FR1.1, FR1.2, FR2.2 — Red.** `tests/main/planDesign.test.js`: nodes in graph order with on/off; an unknown stage, a move out of order, an initialization stage turned off and an empty plan are each refused with a reason key. **Green:** `src/shared/planDesign.js` (`designOf`, `checkStageEdit`). **Refactor.**
4. **Spec Kit rules, FR2.3 — Red.** Same file: a hook on a spine step is allowed; a hook on an unknown step, an unsafe command, an unknown extension, and removing a spine step are refused. **Green:** `checkHookEdit`, `SPECKIT_SPINE`. **Refactor.**
5. **AI-DLC writer, FR2.1, FR3.1, FR3.2, FR4.1 — Red.** `tests/main/plans.test.js`: `planEditDiff` with `{stages}` changes only the grid block and lists the diff; a refused edit throws its reason; apply refuses a file changed since the preview; apply recompiles. **Green:** extend `planEditDiff`, `previewPlanEdit` and `applyPlanEdit`. **Refactor.**
6. **Spec Kit writer, FR3.1, FR3.3, FR4.1 — Red.** `tests/main/speckitHooksEdit.test.js`: the preview shows the diff and writes nothing; apply writes `.specify/extensions.yml` with comments kept; apply refuses a changed file; a path out of the root is refused. **Green:** `src/main/speckitHooksEdit.js` (`previewHookEdit`, `applyHookEdit`). **Refactor.**
7. **Bridge.** Add `previewHookEdit` and `applyHookEdit` to `ipc.js` and `preload/index.js`, with a test beside the existing ipc tests.
8. **Designer, FR1.1, FR2.1, FR2.2, FR3.1, FR4.1, NFR1–NFR3 — Red.** `tests/renderer/PlanDesigner.test.jsx`: stage blocks in order with off shown; the defaults side panel; toggle, add and remove each lead to the preview, and nothing is applied before Apply; a refused edit shows its reason in a live region; keyboard toggle and move with Space and arrow keys; no animation under reduced motion; the plan reloads on `onConfigChanged`. **Green:** `src/renderer/PlanDesigner.jsx`, opened from `PlansView.jsx`, reusing `ChangePanel`. **Refactor.**
9. **Spec Kit designer, FR2.3 — Red.** Same test file: the spine is shown locked, hooks show before or after their step, adding and removing a hook goes through the preview. **Green:** the Spec Kit branch of `PlanDesigner.jsx`, opened from the Spec Kit rules view. **Refactor.**
10. **Texts and look.** Every text through `t()` with keys in `sv.json` and `en.json`; LCARS blocks; `data-testid` values `plan-designer-<role>`; module headers name `US-0906 FR…`.
11. **Checks.** Run the targeted tests, ESLint and Prettier on the touched files.
12. **Docs.** Tick the met acceptance criteria and set the story to ✅ after Build and Test.
