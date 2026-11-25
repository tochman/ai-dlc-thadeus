# Code Generation Plan: change the plan of an intent that has started (US-0509)

## Summary

- Builds: "Change plan" in an intent's detail, its dialog with the preview of what changes, the line typed unsent into the agent tab, and stage counts that stay right after a switch
- Touches: new `src/shared/planChange.js` and `src/renderer/PlanChange.jsx`; changes in `parsers/state.js`, `parsers/pipeline.js`, `projectService.js`, `IntentDetail.jsx`, `Pipeline.jsx`, `ResumeButton.jsx`, `PlansView.jsx`, `theme.css` and both locale files
- Tests: about 50 new ones, test first: the comparison and parsers, the control and dialog, and one Playwright test at 1280

## Design

**The comparison** (`src/shared/planChange.js`, pure). `planChange(pipeline, plan, { projectType })` gives `{ added, dropped, kept, passed, currentDropped }` in the pipeline's order. `plan` is `getPlanStages`' answer.
- `kept`: every done stage, also one the plan does not have.
- A stage still ahead, or one that is open: in the plan and not in the work now is `added`; in the work and not in the plan is `dropped`. `currentDropped` names the current stage when it is dropped.
- `passed`: in the plan, not done, and behind the current stage, or skipped earlier.
- Reverse Engineering is left out of the plan in a new project (`Project Type` Greenfield, or missing, as in AI-DLC), unless it is done (FR2.5).
- A plan stage the state file does not list goes last under `added`.

The file also has `checkDescription(text)` (one clean line, or `empty` / `tooLong` at 500), and `quoted(text)`, moved from `PlansView.jsx` and changed to turn every control character and line or paragraph separator into a space. The Plans view then has the same guard (NFR1).

**The pipeline after a switch** (FR4.1). AI-DLC keeps `[x]` on a done stage the new plan drops, and leaves `[ ]` with EXECUTE on a stage the work has passed; it counts the first and not the second. The app does the opposite today. `mergePipeline` gets a `behind` mark (before the current stage), counts done stages whatever their suffix, and leaves out not-started ones behind. `Pipeline.jsx` shows the first as done and the second as "Not run". When Construction is built unit by unit (`Construction Iteration: unit-major`), its stages are never behind, as the work goes back to them. `parseState` gives `projectType` and `constructionIteration`.

**The plan's name** (FR4.2). The state file is written first and is what AI-DLC runs on, so the detail and the list take `scope` from it before `intents.json`.

**The control** (`PlanChange.jsx`, in the head's actions beside Archive). Hidden as FR1.1 says; a missing state file or one without stages counts as unreadable. Unavailable, as `aria-disabled` with a `Tooltip`, in this order: other space, no AI-DLC command, parked, then the working rule. The rule is `workBlockOf`: for the active intent `running` is let through, which also lets through `elsewhere` in an open session, since the rule tests `running` first (FR1.3); for another intent it is the whole rule on the active intent (FR1.4). Resume's texts are reused for the rule and for an unsafe folder name.

**The dialog** (on `LcarsDialog`). It is mounted by the control also when the intent stops being in flight while it is open, with the reason shown and confirm unavailable (FR2.9). Two choices as native radio buttons: ready-made (a native select, the own plans first, without the current scope) and tailored (a textarea). Plans come from `listPlans` for `terminal.harness.id`, and a plan's stages from `getPlanStages` when it is chosen; a late answer for another choice is dropped. No new IPC. The change lists are headed by text.

**Typing.** On confirm the rule is asked again. The dialog closes first, so focus is back on the control, and then `terminal.type` or `terminal.sequence` is called, which moves it to the agent tab. The line is `<command> --scope <plan>` (the name checked with `validPlanName` and against the list) or `<command> compose <quoted>`.

## Steps

- [x] **Step 1** Run the existing tests as `unit-test-instructions.md` says, to see the runner green.

Data: the parsers
- [x] **Step 2 Red** `parsers.test.js`: `projectType` and `constructionIteration`; a done stage with SKIP is counted; a not-started EXECUTE stage behind the current one is not, and is `behind`; unit-major Construction stages are not behind; no current stage gives none behind. FR4.1
- [x] **Step 3 Green, refactor** `parsers/state.js`, `parsers/pipeline.js`.
- [x] **Step 4 Red, green** `projectService.test.js`: the list's scope is the state's when `intents.json` differs, and `intents.json`'s when there is no state. `projectService.js`. FR4.2

Business logic
- [x] **Step 5 Red** `tests/main/planChange.test.js`: added, dropped, kept, passed, the dropped current stage, nothing left to change, a tailored plan's own stages as the base, an earlier skipped stage, greenfield and brownfield Reverse Engineering, a stage not in the state file, order; `checkDescription` (empty, 500, 501, line breaks, control characters such as ESC and C1); `quoted` with quotes and backslashes. FR2.4, FR2.5, FR2.7, NFR1, NFR2
- [x] **Step 6 Green, refactor** `src/shared/planChange.js`; `PlansView.jsx` and its test take `quoted` from there.

Interface
- [x] **Step 7 Red** `Pipeline.test.jsx`, `IntentDetail.test.jsx`: a done stage with SKIP shows as done, a passed one as "Not run" by text, the dots agree; the name shown after a switch from a tailored plan, with the list's scope still old; "Step n of m" follows a new detail; "Change plan" sits in the head's actions. FR4.1, FR4.2
- [x] **Step 8 Red** `tests/renderer/PlanChange.test.jsx`, the control: hidden for complete, archived, missing on disk, missing in the index, unreadable state; each reason of FR1.2 to FR1.5, reachable by focus; open and idle session does not block the active intent; another intent waits by the whole rule. FR1.1–FR1.6
- [x] **Step 9 Red** the same file, the dialog: what it names, the list without the current scope, the stages read only for the chosen plan, the four groups and the texts for a skipped current stage and for nothing to change, the note on approval, loading, none and failed as three texts, a plan whose stages fail, the late answer, the description's limits, Cancel and Escape type nothing and give focus back, changes while open. FR2.1–FR2.9, FR5.2, NFR3
- [x] **Step 10 Red** the same file, typing: both lines unsent, the switch first for another intent, an unsafe folder, blocked at the last moment, focus order. FR1.6, FR3.1–FR3.3, NFR1
- [x] **Step 11 Green, refactor** `PlanChange.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `ResumeButton.jsx` (exports its folder-name check and missing-command reason); texts in `sv.json` and `en.json` (`i18nKeys.test.js` green); LCARS styles in `theme.css`. FR5.1
- [x] **Step 12 Red, green** `tests/e2e/intentLayout.spec.js`: at 1280 the actions stay inside the frame and the dialog, opened on a plan with many stages, has no horizontal overflow and its buttons can be reached. Its fixture gets plans and an audit log older than 10 minutes. FR5.3, NFR2

Close
- [x] **Step 13** The unit's commands green, ESLint and Prettier clean on the changed files; module headers name US-0509 and their requirements.

**Nothing to build:** no main-process handler, no AI-DLC file written; the live reload is the present watcher's (checked in Step 7).

**Left to Build and Test:** the full suite with coverage, every Playwright spec, and the story's markers and criteria in the feature docs.

## Requirement to step

| Requirement | Steps |
|---|---|
| FR1 | 8, 10, 11 |
| FR2 | 5, 6, 9, 11 |
| FR3 | 10, 11 |
| FR4 | 2–4, 7, 11 |
| FR5 | 7, 9, 11, 12 |
| NFR1–NFR3 | 5, 6, 9, 10, 12, and test first throughout |

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
