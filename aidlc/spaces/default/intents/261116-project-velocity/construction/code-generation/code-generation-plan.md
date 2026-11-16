# Code Generation Plan: US-0303 Project velocity

## Summary

- Builds: velocity metrics per intent, per story and per project, a "Velocity" project view and a "Velocity" tab in the intent detail
- Touches: `src/main/parsers/velocity.js` (new), `git.js`, `projectService.js`, `ipc.js`, `preload/index.js`, `VelocityView.jsx` (new), `IntentDetail.jsx`, `ProjectView.jsx`, `App.jsx`, `theme.css`, `locales/{sv,en}.json`
- Tests: about 14 new tests (vitest): 9 node tests for the metrics, the git history and the loader, and 5 jsdom tests for the view and the tab

## Approach

- **Pure metrics module** `src/main/parsers/velocity.js` (no Node imports, bundled into both sides like `features.js`). Its input is the merged events (`{timeMs, event, fields}`), so the intent tab computes its numbers in the renderer from `detail.events` and needs no new IPC.
- **One project loader** `loadVelocity(root, space, intents, features)` in `projectService.js`, following `loadCrossMachineCost`. It reads every intent's audit (archived included, FR3.4) and keeps "missing" (no `audit/`) apart from "unreadable" (a read error) and "empty" (FR4.2).
- **Story history** through one new fixed git call, `storyMarkerHistory(root, featuresDir)`: `git log --first-parent --reverse --format=%x00%H%x09%cI -p --unified=0 -- <featuresDir>`, with `featuresDir` through `safeArg`. A pure parser finds the first date at which each `US-XXXX` head line gained 🚧 or ✅ (FR2.1, FR2.4).
- **View**: `VelocityView.jsx` with an LCARS `Frame`, readouts, a per-intent table, a story table and a plain-SVG bar chart (week/month switch) with the average as a line. Its "sources" footer names the records used and lists the missing ones with their paths (FR4.3). It reloads on `project:changed`/`features:changed` through the existing hooks. No new dependency.

## Metric rules (from requirements.md)

- Active time = `WORKFLOW_STARTED` → `WORKFLOW_COMPLETED` (or the last event while running) minus the `WORKFLOW_PARKED`→`WORKFLOW_UNPARKED` spans. Parked time is its own figure (FR1.1).
- Phase and stage spans pair start → completed/skipped on `fields.Phase` / `fields.Stage`. An unpaired start is "open" (FR1.2).
- Waiting = `STAGE_AWAITING_APPROVAL` → `GATE_APPROVED`/`GATE_REJECTED`, plus `PLAN_APPROVAL_*` request → decision, summed per stage (FR1.3).
- Review rounds = `REVIEW_COMPLETED` count, plus rejections = `GATE_REJECTED` count, per stage (FR1.4).
- Story: 🚧 = the start of the earliest intent whose description or `dirName` contains the ID, else git 🚧. ✅ = the git ✅ date. Released = the tag date of `Released in vX.Y.Z`. A zero or missing span is `null`, shown as "unknown" (FR2.1, FR2.2).
- Week = ISO week, local time. Unfinished intents are left out of the finished counts and the averages (FR3.1, FR3.2, FR4.1).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "express",
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
  "input_sha256": "sha256:3a3e99f1e55b225dce936715ddd095cabaceeab0e44cf8ec6eeab8daf73e4d52",
  "contract_sha256": "sha256:c203aae185bed3ce09c3c921ca1ec08a65e296b2cff7f7791c1a0522e7468af4"
}
```

## Steps

The data model / database layer is not applicable (no database; the records are read-only files).

- [x] **Step 1: Structure.** No new configuration. New files: `src/main/parsers/velocity.js`, `src/renderer/VelocityView.jsx`, `tests/main/velocity.test.js`, `tests/main/velocityLoad.test.js`, `tests/renderer/VelocityView.test.jsx`. (US-0303)
- [x] **Step 2: Runner.** Verify `npx vitest run tests/main/velocity.test.js` runs (vitest 5.1.0, `vitest.config.mjs`, projects `main`/`renderer`). Record the baseline: `npx vitest run tests/` passes before any change. (NFR5)
- [x] **Step 3: Repository / data access, Red.** Write failing tests:
  - `git.test.js`: `storyMarkerHistory` calls `git` with fixed args and an injected `exec`, and returns null when git fails;
  - `velocity.test.js`: `parseMarkerHistory` gives the first 🚧/✅ date per story from a sample `git log -p` text;
  - `velocityLoad.test.js`: `loadVelocity` over a fixture space with one finished intent, one running intent, one with no `audit/` and one unreadable intent, the last two named in `sources.missing` with their paths. (FR2.4, FR4.2)
- [x] **Step 4: Repository / data access, Green.** Add `storyMarkerHistory` to `git.js` and `loadVelocity` to `projectService.js` (each `Promise.all` over the intents, catch per intent). (FR2.4, FR3.4, FR4.2, NFR4)
- [x] **Step 5: Repository / data access, Refactor**, with the suite green.
- [x] **Step 6: Business logic, Red.** Write failing tests in `velocity.test.js` for:
  - `intentMetrics`: total and active time with a parked span, phase and stage spans with an open stage, waiting from gates plus a plan approval, review rounds and rejections, and a running intent marked unfinished;
  - `storyMetrics`: 🚧 from a naming intent, the git fallback, the tag date, and a zero span shown as unknown, plus stories per release;
  - `projectMetrics`: ISO-week and month buckets in local time, finished counts and the average leaving out unfinished intents, archived intents counted.
  
  (FR1.1–FR1.4, FR2.1–FR2.3, FR3.1–FR3.4, FR4.1, FR4.4)
- [x] **Step 7: Business logic, Green.** Implement `velocity.js`. (same IDs)
- [x] **Step 8: Business logic, Refactor**, with the suite green, plus a 20 000-event timing check in `velocity.test.js` (under 1 s). (NFR3)
- [x] **Step 9: API, Red.** Extend `tests/main/ipc.test.js` and `preload.test.js`: `project:velocity` returns `loadVelocity`'s result, and `window.bridge.getVelocity` exists. (FR3.5)
- [x] **Step 10: API, Green.** Add the `project:velocity` handler in `ipc.js` (cached intent list plus `loadFeatures` plus tags plus the git history) and `getVelocity: call('project:velocity')` in `preload/index.js`.
- [x] **Step 11: API, Refactor**, with the suite green.
- [x] **Step 12: Frontend, Red.** Write failing `tests/renderer/VelocityView.test.jsx` tests:
  - the project view shows the readouts, the week/month switch and the chart;
  - an unfinished intent is marked "not finished", and a missing record is named with its path;
  - the sources footer lists the records used;
  - `IntentDetail` has a Velocity tab with that intent's phase, stage, waiting and review numbers;
  - the arm block `arm-velocity` opens the view.
  
  (FR1.5, FR3.3, FR3.5, FR4.1–FR4.3, NFR2)
- [x] **Step 13: Frontend, Green.** Build `VelocityView.jsx` (exporting `IntentVelocity` for the tab). Wire `view === 'velocity'` in `ProjectView.jsx`, an `ArmBlock` in `App.jsx` beside Cost, a `{ id: 'velocity' }` tab in `IntentDetail.jsx`, and LCARS classes in `theme.css`. All tooltips go through `Tooltip.jsx`, status has text and not only colour, and `data-testid` values are `velocity-*`. (FR1.5, FR3.3, FR3.5, NFR2)
- [x] **Step 14: Frontend, Refactor**, with the suite green.
- [x] **Step 15: i18n.** Add `velocity.*` keys and ICU placeholders to both `sv.json` and `en.json`. `i18nKeys.test.js` stays green. (NFR1)
- [x] **Step 16: Full suite.** `npx vitest run tests/` passes, with no change to the coverage settings. (NFR5)
- [x] **Step 17: Documentation and traceability.** Header comments name `US-0303 FRx`. Write `code-summary.md` and `traceability.json`. The feature-doc ✅ markers are set at delivery, not here.

## Blast radius

Medium. New files carry most of the work. The edits to `ipc.js`, `preload/index.js`, `App.jsx`, `ProjectView.jsx` and `IntentDetail.jsx` add one handler, one bridge member, one arm block, one view branch and one tab, and change no existing behaviour.
