# Code Generation Plan: U5 u5-fold-list (US-0415)

## Summary

- Builds: one LCARS fold toggle at the list column's edge in the Intents, Features and Editor views; the list folds to a narrow strip, keeps its search, filters, sort and selection, and the folded state is kept per view in the app settings
- Touches: new `src/renderer/useFold.js`, `src/main/settings.js` (`listFolded`), `src/renderer/ProjectView.jsx` (Intents), `src/renderer/FeaturesView.jsx`, `src/renderer/editor/EditorPanel.jsx`, `theme.css`, the locales, their tests
- Tests: 9 new tests (3 in `settings.test.js`, 3 in the new `useFold.test.jsx`, 1 each in `ProjectView.test.jsx`, `FeaturesView.test.jsx` and `EditorPanel.test.jsx`), test first

Story: US5.1 (US-0415), AC5.1.1–AC5.1.4; FR5.1–FR5.4; NFR1–NFR3. Design: ADR-005 (`../../../inception/domain-design/decisions.md`): a `useFold(viewId)` hook with shared classes, state in the app settings.

## Design

- Views with a list column: Intents (`.sidebar` in `ProjectView.jsx`), Features (`.sidebar` in `FeaturesView.jsx`), Editor (the file tree in `.editor-view`). View ids: `intents`, `features`, `editor`.
- `settings.js`: `sanitize` keeps `listFolded`, an object of known view ids to booleans; other ids and values are dropped. The existing `settings:get` / `settings:set` carry it, so no new channel is needed.
- `useFold(viewId)` (new, `src/renderer/useFold.js`) returns `{folded, toggle, toggleProps}`. It reads `listFolded[viewId]` from `window.bridge.getSettings()` and writes `{listFolded: {...current, [viewId]: next}}` with `setSettings`. `toggleProps` is a `<button>`'s props: `aria-expanded={!folded}`, an accessible name from `t('fold.hide')` or `t('fold.show')`, and `data-testid="list-fold-toggle"`. Enter and Space come with the button.
- Shared classes in `theme.css`: `.list-fold-toggle` (an LCARS elbow tab at the list's edge), `.is-folded` on the column (a narrow strip, about 28px, whose click also toggles), and a width transition that `@media (prefers-reduced-motion: reduce)` turns off. The list stays mounted while folded (hidden with CSS), so search, filters, sort and selection are kept (FR5.2). The main pane is already `flex: 1`, so it takes the width.
- Each view places its own toggle and adds `is-folded` to its column. In `ProjectView.jsx` this is only the Intents sidebar; the file is also the Spec Kit work's, so nothing else in it changes.

## Steps

- [ ] **Step 1** (setup): from `main`, create the branch `feat/US-0415`. Set US-0415 to 🚧 In progress, for v0.2.13, in its marker in `docs/features/epic-04-branding-and-desktop.md`, in that epic's **Status** line and in its `docs/FEATURES.md` cell. Run `npx vitest run tests/main/featureDocsStatus.test.js`.
- [ ] **Step 2** (runner): run `npx vitest run tests/main/settings.test.js tests/renderer/ProjectView.test.jsx tests/renderer/FeaturesView.test.jsx tests/renderer/EditorPanel.test.jsx` on the unchanged code and record that it is green.
- [ ] **Step 3** (data, Red): in `tests/main/settings.test.js`, add:
  - `listFolded` with known view ids and booleans is kept;
  - an unknown view id is dropped;
  - a non-boolean value is dropped (AC5.1.3).

  Run `npx vitest run tests/main/settings.test.js` and record the failing output.
- [ ] **Step 4** (Green): `sanitize` keeps `listFolded`. Run it green.
- [ ] **Step 5** (Refactor) with the tests green.
- [ ] **Step 6** (frontend, Red, hook): new `tests/renderer/useFold.test.jsx` with a small test component:
  - it starts with the stored state for its view, and another view's state does not leak (AC5.1.3);
  - a click toggles it and saves `listFolded` with the other views kept;
  - the toggle is a button with `aria-expanded` and an accessible name that follow the state, and Enter and Space work (AC5.1.4).

  Run `npx vitest run tests/renderer/useFold.test.jsx` and record the failing output.
- [ ] **Step 7** (Green): `useFold.js`, the shared classes in `theme.css`, and `fold.hide` and `fold.show` in `sv.json` and `en.json`. Run it and `npx vitest run tests/main/i18nKeys.test.js` green.
- [ ] **Step 8** (Refactor) with the tests green.
- [ ] **Step 9** (frontend, Red, views): add:
  - `ProjectView.test.jsx`: the Intents toggle folds the sidebar to the strip, and the strip brings it back with the search text still there (AC5.1.1, AC5.1.2);
  - `FeaturesView.test.jsx`: folding and opening keeps the selected story and the filter (AC5.1.2);
  - `EditorPanel.test.jsx`: the file tree folds and the editor takes the width class (AC5.1.1).

  Run `npx vitest run tests/renderer/ProjectView.test.jsx tests/renderer/FeaturesView.test.jsx tests/renderer/EditorPanel.test.jsx` and record the failing output.
- [ ] **Step 10** (Green): the toggle and `is-folded` in the three views. Run them and `npx vitest run tests/renderer/noNativeTitle.test.jsx` green.
- [ ] **Step 11** (Refactor) with the tests green.
- [ ] **Step 12** (checks): this Unit's command from `unit-test-instructions.md`, then `npx eslint` and `npx prettier --check` on the changed files.

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
