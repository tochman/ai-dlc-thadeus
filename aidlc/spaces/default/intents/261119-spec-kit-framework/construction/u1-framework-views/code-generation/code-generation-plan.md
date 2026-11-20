# Code Generation Plan: U1 u1-framework-views (US1.1 / US-1401)

Branch: `feat/US-1401`, created from `main`. One squash-merged pull request: `feat(US-1401): one framework per project, and views that follow it`.

Sources: `functional-spec.md`, `rules.md` and `frontend-components.md` (BR1.1–BR1.12 plus the post-review decisions), contract C1, and U1 in `unit-of-work.md`. Every step implements US1.1. The ACs each step covers are named in brackets.

## Steps

- [x] **Step 1: Branch and story status.** Create `feat/US-1401`. Set US-1401 to 🚧 In progress, "for v0.3.0", in `docs/features/epic-14-spec-kit.md`, in the epic's Status line and in its `docs/FEATURES.md` row. [project rule]
- [x] **Step 2: Runner check.** Run the unit-scoped command from `unit-test-instructions.md` on the untouched tree and record that it passes (the baseline).
- [x] **Step 3: Business logic (shared views table), Red.** Write `tests/main/frameworkViews.test.js`. It covers:
  - the aidlc set equals today's offered set exactly;
  - the speckit set has `specs` and no AI-DLC view;
  - the null set;
  - `defaultView` per framework;
  - `features` gated by `showFeatures`.
  The tests fail. [AC1.1.2, AC1.1.5]
- [x] **Step 4: Business logic, Green.** Add `src/shared/frameworkViews.js` (pure; header comment `US-1401 FR1.2`).
- [x] **Step 5: Business logic, Refactor** with the tests green.
- [x] **Step 6: Data access (detection), Red.** Extend `tests/main/projectService.test.js` with fixture folders for:
  - AI-DLC only, Spec Kit only, both, neither, and an empty `aidlc/spaces/`;
  - `saved` overriding detection, and a `saved` framework no longer on disk being ignored;
  - `askWhenBoth` true giving `framework: null` with `source: 'ask'`;
  - the Detection shape, with `isAidlc` derived.
  The tests fail. [AC1.1.1, AC1.1.3, AC1.1.4]
- [x] **Step 7: Data access, Green.** `detectProject(root, { saved, askWhenBoth })` in `src/main/projectService.js` returns the full Detection, including `views` and `defaultView` from Step 4.
- [x] **Step 8: Data access, Refactor.**
- [x] **Step 9: Harness markers, Red.** In `tests/main/harness.test.js`, a `.opencode/`-only fixture counts as opencode installed. It fails. [AC1.1.6]
- [x] **Step 10: Harness markers, Green.** Add `'.opencode'` to opencode's `markers.dirs` in `src/shared/harnesses.js`.
- [x] **Step 11: API (IPC, watcher, menu), Red.** The tests are:
  - `tests/main/menu.test.js`: `framework` in the state whitelist, with cost and github shown only for aidlc;
  - an ipc test, or an extended existing one: `project:open` returns the Detection, and the setup watcher pushes `project:detected` when `.specify/` appears.
  They fail. [AC1.1.2, AC1.1.5]
- [x] **Step 12: API, Green.** In `src/main/menu.js`, replace the `STATE_KEYS` entry and the default. In `src/main/ipc.js`:
  - `watchForSetup` acts on a framework change, not on `!isAidlc`;
  - `project:open` starts `watchSpace` only for aidlc.
  `watchForAidlc` (in `watcher.js`) also fires on `.specify/`.
- [x] **Step 13: API, Refactor.**
- [x] **Step 14: Frontend, Red.** The renderer tests are:
  - `tests/renderer/AppShell.test.jsx`: a Spec Kit detection shows the `specs` arm and no Intents, Kostnad or Github, and the fallback view is `specs`;
  - `tests/renderer/ProjectView.test.jsx`: speckit renders `SpeckitShell`, and the AI-DLC branches are unchanged for aidlc;
  - `tests/renderer/SpeckitShell.test.jsx` (new).
  They fail. [AC1.1.1, AC1.1.2]
- [x] **Step 15: Frontend, Green.**
  - `App.jsx` and `ProjectView.jsx` read `detection.framework`, `views` and `defaultView`, and their local `offered` maps are removed;
  - add `src/renderer/SpeckitShell.jsx` (LCARS, `data-testid="speckit-shell-root"`);
  - add sv and en keys `app.specs`, `speckit.title`, `speckit.empty` and `app.featureCount`.
- [x] **Step 16: Frontend, Refactor.** Remove the remaining `isAidlc` reads in the renderer. `isAidlc` stays on the Detection only (BR1.7).
- [x] **Step 17: Build configuration.** No change is needed. Confirm that `electron-vite build` still succeeds.
- [x] **Step 18: Documentation and traceability.**
  - Write `code-summary.md` and `traceability.json`.
  - Mark US-1401 ✅ Done, tick its acceptance criteria, keep "for v0.3.0", and update the FEATURES.md row.
  - Run the full verification command: tests with coverage, ESLint, Prettier.

## Story-to-step map

| Story / AC | Steps |
|---|---|
| US1.1 AC1.1.1 (AI-DLC unchanged) | 6, 7, 14, 15, 18 (full suite) |
| AC1.1.2 (Spec Kit views only) | 3, 4, 11, 12, 14, 15 |
| AC1.1.3 (fallback detection) | 6, 7 |
| AC1.1.4 (both → ask, switched on by U4) | 6, 7 |
| AC1.1.5 (one value, one list) | 3, 4, 11, 12, 16 |
| AC1.1.6 (opencode in Spec Kit) | 9, 10 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "classic",
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
  "input_sha256": "sha256:36dbd137c1dafd3e8f4a29e23917b2a23c6dca6c2eacae2219e2473d1661458b",
  "contract_sha256": "sha256:bfe3fc216905988409d5a13f51ed4ab2709768afac7dac9ce951c1faa1c86abd"
}
```

The "Data model / database" layer does not apply: U1 has no stored data. Detection is covered as the data-access layer in Steps 6–8.
