# Code Generation Plan: US-1302 Savings hints

## Summary

- Builds: a pure savings module that finds three kinds of hint (lighter model, low cache share, many turns) with their working and estimated saving; a Savings section in the project cost panel and the hints of one intent in its cost tab; per-project dismissals kept in `.thadeus/savings-dismissed.json`.
- Touches: new `src/main/savings.js`; `src/main/ipc.js` (two handlers beside `intent:rework`); the preload; `src/renderer/CostPanel.jsx`, `src/renderer/CostTab.jsx`, `src/renderer/ProjectView.jsx` and `src/renderer/App.jsx` (the setting links); `src/renderer/theme.css`; `sv.json` and `en.json`; tests in `tests/main/savings.test.js`, `tests/renderer/CostPanel.test.jsx`, `tests/renderer/CostTab.test.jsx`; the feature docs.
- Tests: about 20 unit tests for the module and the dismissal file, 2 for the handlers, about 8 renderer tests.

## Design

- Reuses: `summarizeLedger` per-stage `byModel` and `agentModels` (`parsers/ledger.js`), `repriceModel` and `normalizeModel` (`reprice.js`), `loadRates` (`modelRates.js`), `stageAttempts` and the rejection count from `rework.js`, `loadTokenHistory` and `readTranscriptCalls` (`tokenHistory.js`), `isArchived` (`shared/intentArchive.js`), `writeAtomic` and `resolveInRoot` as in `intentNames.js`.
- `modelFamilies(rates)`: the table's families (opus, sonnet, haiku) ordered by output price; `cheaperFamily(model, rates)` the next one down, or null.
- `lighterModelHints({ intents, perIntent, attemptsByIntent, rates })` (FR2): per stage across all intents (FR1 baseline), the runs, their rejections and output per run; a hint when the dearest family is most of the stage's cost (assumption), output per run is below the median over all stages' runs, rejections are at most 1 in 10, and runs number at least 3. Saving = the stage's tokens priced at its models minus the same tokens priced at the cheaper family, per run and in total. No rate for either model gives `saving: null` (NFR2). The agent is the one `agentModels` attributes; else none (constraint).
- `cacheShareHints({ intents, perIntent })` (FR3): share = cacheRead / (input + cacheWrite + cacheRead); the project median over all intents; a hint for each intent not archived whose share is at least 20 points below it.
- `turnsHints({ intents, attemptsByIntent, callsByIntent })` (FR4): turns per attempt = transcript calls inside its window; the median per stage over earlier runs; a hint when a run is at least twice it and the stage has at least 5 earlier runs. An intent with no transcript calls gives none (assumption).
- Every hint: `{ id, kind, intent?, stage?, agent?, saving?, working: {figures, thresholds, prices}, link }` (FR5); `id` is `kind:intent-or-stage`. Archived intents feed the baselines but get no hint (FR1). Sort: largest saving first, then the rest (FR7).
- Dismissals (FR6, NFR1): `readDismissed(root)` / `setDismissed(root, id, on)` on `.thadeus/savings-dismissed.json` (`{ "<id>": "<ISO time>" }`), written atomically, refused outside the root, an unreadable file counts as empty. Nothing else is written.
- IPC: `project:savings` (all hints and the dismissed ids) runs when the Savings section is shown, not during the overview load (NFR4); it reads transcripts through `loadTokenHistory`'s cache. `project:savings-dismiss` sets or clears one id. The intent tab filters the same result by intent.
- Links (FR2.5, FR4, NFR1): they only open a view: Configuration `aidlc` (model per agent, US-0904), Configuration `costRules` (US-0212), and the project's settings at `project-handoff` (US-0213), through `onView` and a new `onOpenProjectSettings` prop. No setting is changed.
- `ponytail:` comments on the median baselines (no outlier trimming) and on the transcript read per project when the section opens.

## Steps

- [x] Step 1: Verify the runner: `npx vitest run tests/renderer/CostTab.test.jsx tests/renderer/CostPanel.test.jsx` green before any change; `tests/main/savings.test.js` joins the command in Step 2.
- [x] Step 2 (FR1, FR2, FR3, FR5, Business logic Red): `tests/main/savings.test.js`: families from a rate table; a lighter-model hint with its saving per run and total; no hint with 2 runs, with 2 rejections in 10, with output above the median, on a Sonnet stage that has Haiku below it only when it qualifies; `saving: null` without a rate; the agent named only when attributed; a cache hint 20 points below the median and none at 19; archived intents in the baseline but without a hint; the working carries figures and thresholds. Record the failing output.
- [x] Step 3 (FR1, FR2, FR3, FR5, Green): `modelFamilies`, `cheaperFamily`, `lighterModelHints`, `cacheShareHints` in `src/main/savings.js`.
- [x] Step 4 (FR4, FR6, FR7, Red): turns counted inside attempt windows; a hint at twice the median after 5 runs, none after 4, none without transcripts; sort order; dismissals read, set, cleared, a broken file read as empty, a path outside the root refused. Record the failing output.
- [x] Step 5 (FR4, FR6, FR7, Green): `turnsHints`, `savingsHints`, `readDismissed`, `setDismissed`.
- [x] Step 6 (NFR4, API Red): tests for `project:savings` (hints and dismissed ids from fixture ledger, audit and transcripts) and `project:savings-dismiss`. Record the failing output.
- [x] Step 7 (API Green): the two IPC handlers and the preload calls.
- [x] Step 8 (FR2.5, FR4–FR7, NFR1–NFR3, Frontend Red): `CostPanel.test.jsx`: the Savings section lists hints largest saving first; a hint unfolds its working; dismiss hides it and calls the handler; "show dismissed" brings it back; "no hints" in one line; each link calls `onView` or `onOpenProjectSettings` and nothing else; "no price" instead of a saving. `CostTab.test.jsx`: only that intent's hints. Record the failing output.
- [x] Step 9 (Frontend Green): the section in `CostPanel.jsx` and `CostTab.jsx` (`data-testid` values `cost-savings-*`), the prop through `ProjectView.jsx` and `App.jsx`, LCARS styling in `theme.css`, keys in `sv.json` and `en.json`.
- [x] Step 10 (Refactor): tidy with the three test files and `tests/main/i18nKeys.test.js` green; doc comments name `US-1302 FRn`.
- [x] Step 11 (Docs and traceability): US-1302 to ✅ Done, for v0.3.2, ticked criteria, the epic Status line, the FEATURES.md row and the release plan's status and progress rows.

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
