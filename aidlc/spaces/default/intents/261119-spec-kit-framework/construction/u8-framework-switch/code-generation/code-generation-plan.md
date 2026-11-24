# Code Generation Plan: U8 u8-framework-switch (US2.3 / US-1407)

## Summary

- Builds: the framework switch (contract C10): a Framework section in the project's Configuration, with a preview, the setup run when one is needed, then the one file write and the views following.
- Touches: `src/main/frameworkSwitch.js` (new), `src/main/ipc.js`, `src/preload/index.js`, `src/shared/frameworkViews.js`, `src/renderer/FrameworkSection.jsx` (new), `src/renderer/ProjectView.jsx`, `src/shared/locales/{sv,en}.json`, `src/renderer/theme.css`, `vitest.config.mjs`.
- Tests: about 30 tests, test first: 12 main (target check, preview, switch), 7 IPC (watchers, push, serialising, read-only), 1 timed, 10 renderer (section states, preview, setup, errors).

Sources: `functional-spec.md`, `rules.md` (BR8.1–BR8.6) and `frontend-components.md` in `../functional-design/`; `performance-design.md`, `security-design.md` and `logical-components.md` in `../nfr-design/`; C1, C2, C3 and C10 in `contract-summary.md`; U8 in `unit-of-work.md`; FR8, NFR1–NFR5, NFR7 in `requirements.md`. Infrastructure Design was skipped for this Unit (no infrastructure). No new dependency.

Branch: US-1407 gets its own `feat/US-1407` branch from `main` and its own pull request (team rule). It reuses U2's `writeProjectFile` and U6's `loadSpeckitFeatures`, both on `main`. It does not need U4's `chooseFramework`.

Two points from the NFR Design review, settled here:
- **Watcher swap per direction.** `applyDetection` is not `watchForSetup`'s code as it stands: that only closes the setup watcher, and `watchSpace`/`watchSpeckit` return early when their watcher exists. So `applyDetection` closes only the old framework's watcher and leaves the rest alone (hooks, head, config, editor, `.thadeus`, installer): to Spec Kit it closes `p.watcher` and clears `p.space`, then `watchSpeckit`; to AI-DLC it closes `p.speckitWatcher`, then `watchSpace(activeSpace)`. Any `p.setupWatcher` is closed in both directions. `watchForSetup` keeps its behaviour by calling it.
- **Overlapping calls.** `project:switch` is serialised per project with a promise kept on the project record (`p.switching`); a second call waits for the first and then finds `to` equal to the current framework, so it is refused by BR8.1 with no write and no second watcher.

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

## Steps

The data model and repository layers do not apply: U8 stores nothing new. The one file is U2's `.thadeus/project.json`, written through `writeProjectFile`, which is unchanged.

- [x] **Step 1. Structure** (US-1407). Create `feat/US-1407` from `main`. Set US-1407 to 🚧 In progress in `docs/features/epic-14-spec-kit.md` and its `docs/FEATURES.md` row. No new folders.
- [x] **Step 2. Runner** (US-1407). Check that vitest runs the commands in `unit-test-instructions.md`: add `tests/main/frameworkSwitchTimed.test.js` to `TIMED` in `vitest.config.mjs` (NFR7.3), so it runs in the retried `scripts` project.
- [x] **Step 3. Business logic, Red** (AC2.3.1–AC2.3.4; BR8.1–BR8.5; NFR3.4–NFR3.7, NFR5.1, NFR7.3). Write `tests/main/frameworkSwitch.test.js` and `tests/main/frameworkSwitchTimed.test.js` against temp fixture folders. Record the failing run.
  - `switchTarget`: the current framework, `''`, `'SPECKIT'`, `'../x'`, an object and `undefined` each throw a translated reason, with no fs call.
  - `switchPreview`: Spec Kit missing gives `setupNeeded: true`; both present gives `false`; `keeps` is the fixed folder names only; open intents across two spaces are listed and completed or archived ones are not (through `inProgress()`); features with open tasks are listed; a features read that throws gives `unread: ['feature']`, a warning and no throw; zero fs write, rename or remove calls.
  - `switchFramework`: target folder missing gives `setupNeeded` and no write; present writes once through `writeProjectFile` and returns the new detection; a failed write gives `writeFailed` and leaves the file as it was; nothing under `.specify/`, `specs/` or `aidlc/` changes.
  - Timed: 20 intents and 20 features give a preview within 2 s.
- [x] **Step 4. Business logic, Green.** `src/main/frameworkSwitch.js` with `switchTarget`, `switchPreview(root, from, to)` and `switchFramework(root, to)`, reusing `detectProject`, `listSpaces`, `loadIntentList`, `inProgress` and `loadSpeckitFeatures`, with each list read guarded on its own. No runner import (NFR4.5).
- [x] **Step 5. Business logic, Refactor** with the suite green.
- [x] **Step 6. API, Red** (BR8.5, BR8.6; NFR3.5, NFR3.6, NFR4.5, NFR7.4, NFR7.5). In `tests/main/ipc.test.js`:
  - `project:switchPreview` and `project:switch` reject an unknown project id;
  - AI-DLC to Spec Kit closes the intents watcher and starts the Spec Kit watcher, and the hooks and config watchers stay;
  - Spec Kit to AI-DLC does the reverse, and a round trip ends with one watcher of each kind;
  - `project:detected` with the new framework is sent before the reply, and the reply carries `detection`;
  - two overlapping `switch` calls make one write, then a BR8.1 refusal;
  - a re-detection that throws after the write gives `{ ok: true, detection: null }` and a logged error;
  - neither handler calls the runner.
  Record the failing run.
- [x] **Step 7. API, Green.** In `src/main/ipc.js`: `applyDetection(projectId, detection)`, with the per-direction watcher swap above, and `watchForSetup` calling it; the handlers `project:switchPreview` and `project:switch` with the `p.switching` chain. In `src/preload/index.js`: `switchPreview` and `switchFramework`.
- [x] **Step 8. API, Refactor** with the suite green; the existing `watchForSetup` tests pass unchanged.
- [x] **Step 9. Frontend, Red** (AC2.3.1–AC2.3.4; BR8.1–BR8.4, BR8.6; NFR1.2, NFR2.2, NFR4.6, NFR7.5). Write `tests/renderer/FrameworkSection.test.jsx`. Also add to `tests/renderer/ProjectView.test.jsx` that the section shows for both frameworks. Record the failing run.
  - The section shows the current framework, and the button names the other one.
  - The preview has its setup line only when `setupNeeded`, the work in progress or "none", and the unread note.
  - Cancel does nothing.
  - Confirm with no setup calls `switchFramework` once, and a double click still sends one call.
  - Confirm with setup runs `speckitSetup` with the project's harness (or `runSetup` for AI-DLC) first; a failed or cancelled setup shows `framework-switch-error`, and `switchFramework` is not called.
  - A `setupNeeded` reply shows the preview again.
  - The reopen note shows on `detection: null`.
  - Every text comes from `t()`.
- [x] **Step 10. Frontend, Green.** Write `src/renderer/FrameworkSection.jsx`, with `SwitchPreview` inside: the LCARS section, the test ids from `frontend-components.md`, and React state `idle | preview | setup | writing | failed`. It reuses the existing AI-DLC setup page and the Spec Kit setup output. Add `'framework'` to `PROJECT_SECTIONS` in `src/shared/frameworkViews.js`, so it shows for both frameworks, and mount the section in `ProjectView.jsx`. Add the LCARS styles to `theme.css`, and the keys `framework.switch.*`, `framework.switchInvalid` and `framework.switchedReopen` to `sv.json` and `en.json`, with ICU placeholders.
- [x] **Step 11. Frontend, Refactor** with the suite green; `tests/main/i18nKeys.test.js` passes.
- [x] **Step 12. Build configuration.** None beyond Step 2. ESLint and Prettier pass on the changed files.
- [x] **Step 13. Documentation and traceability.** Header comments name `US-1407` and the rule or NFR. Write `code-summary.md`, `source-manifest.json` and `traceability.json` in this folder.
