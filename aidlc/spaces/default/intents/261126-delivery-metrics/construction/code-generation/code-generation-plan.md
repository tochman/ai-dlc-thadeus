# Code Generation Plan — US-1304 Delivery metrics

## Summary

- Builds: a Delivery section in the Velocity view with lead time, release frequency, change failure rate, time to recover and pull request figures.
- Touches: `src/main/parsers/delivery.js` (new), `src/main/platforms/{github,gitlab,bitbucket,index}.js`, `src/main/ipc.js`, `src/renderer/VelocityView.jsx`, the locales, `docs/features/epic-00-fixes.md`.
- Tests: about 22 new unit tests (13 delivery calculations, 4 platform reads, 5 view) plus the existing suite.

## Approach

- The pure calculations live in a new `src/main/parsers/delivery.js` beside `velocity.js` (NFR2). They take `storyMetrics`' stories, the tags, the fix stories, the prerelease tags and the merged pull requests, and do no I/O.
- Lead time (FR1.1) is the existing `toReleaseMs` from `storyMetrics`. The story table's "To release" column is renamed "Lead time" rather than repeated (FR1.2).
- Merged pull requests and releases are new platform reads in the common shape: `listMergedPulls` (GitHub: one GraphQL call that includes the changes-requested review count; GitLab/Bitbucket: one REST page with review rounds `null`) and `listReleases` (GitHub only, FR3.4). Each is one page of 50, marked `ponytail:`.
- `project:velocity` adds `delivery` to its result. A failing platform call becomes a named missing source and never breaks the view (NFR3).

## Steps

- [x] Step 1: Verify the runner: `npx vitest run tests/main/delivery.test.js` (Red: the file does not exist yet). [NFR2]
- [x] Step 2: Business logic, Red: write `tests/main/delivery.test.js` for `parseFaultIn` (a fix story's `- **Fault in:** vX.Y.Z` line), `failedReleases` (prerelease or Fault in; the count of fix stories without the line), `changeFailureRate`, `timeToRecover` (first later tag holding a fixing story; next tag for a prerelease-only failure; "not recovered yet" as `null` + flag), `releasesPerMonth` (from the first tag's month to now), `median`, `pullFigures` (open→merge, rounds = changes + 1, grouped per release by merge time between tags) and `deliveryMetrics` (the per-release rows and readouts). Record the failing output. [FR1.3, FR2.1, FR3.1–FR3.3, FR4.1, FR4.2, FR5.1, FR5.2, FR6.1]
- [x] Step 3: Business logic, Green: implement `src/main/parsers/delivery.js` until Step 2 passes. [same]
- [x] Step 4: Business logic, Refactor while green; header comment names US-1304.
- [x] Step 5: Data access, Red: extend `tests/main/platforms.test.js` with `listMergedPulls` for GitHub (GraphQL reply → `{number, createdAt, mergedAt, changes}`), GitLab and Bitbucket (`changes: null`), and `listReleases` for GitHub (`{tag, prerelease}`) plus `unknown-platform` for the others. Record the failing output. [FR3.4, FR5.1, FR5.3]
- [x] Step 6: Data access, Green: add `merged()` / `releases()` to the platform modules and `listMergedPulls` / `listReleases` to `platforms/index.js`. [same]
- [x] Step 7: Data access, Refactor while green.
- [x] Step 8: API, Red: extend `tests/main/ipc.test.js` so `project:velocity` returns `delivery` with the platform parts present, and with a failing or missing platform as named missing sources (`kind: 'releases'`, `kind: 'pulls'`). Record the failing output. [FR3.4, FR5.3, FR6.2, NFR3]
- [x] Step 9: API, Green: in `ipc.js`, read both lists with `asValue` beside the tags, find the EPIC-00 stories in `features`, and call `deliveryMetrics`. [same]
- [x] Step 10: API, Refactor while green.
- [x] Step 11: Frontend, Red: extend `tests/renderer/VelocityView.test.jsx`: the four readouts (`velocity-delivery-lead`, `-frequency`, `-failure`, `-recover`), the pull request medians, a per-release row (`velocity-delivery-release`) with failed-and-why as text, "not recovered yet", the fix stories without `Fault in` count, a missing source named, and the "Lead time" column header. Record the failing output. [FR1.2, FR6.1, FR6.2, NFR4]
- [x] Step 12: Frontend, Green: a `Delivery` component in `VelocityView.jsx` in the existing LCARS readout/table style, every text through `t()`; add the keys to `sv.json` and `en.json`. [same]
- [x] Step 13: Frontend, Refactor while green; run `tests/main/i18nKeys.test.js`. [NFR4]
- [x] Step 14: Docs: add the `- **Fault in:** vX.Y.Z` line to the fix story description in `docs/features/epic-00-fixes.md`'s intro. [FR3.3, NFR1]
- [x] Step 15: Run ESLint and Prettier on the changed files. [NFR5]

## Story traceability

All steps implement US-1304 (EPIC-13). FR/NFR IDs are in brackets per step.

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
