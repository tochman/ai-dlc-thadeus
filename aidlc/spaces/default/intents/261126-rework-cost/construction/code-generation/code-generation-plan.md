# Code Generation Plan: US-1301 Rework cost

## Summary

- Builds: a pure rework module that splits an intent's audit into stage attempts, finds the thrown-away ones and prices them from the timestamped readings; a Rework section in the intent's cost tab; rework share and a rework part in each bar of the project's cost chart.
- Touches: new `src/main/rework.js`; `src/main/ipc.js` (one handler beside the token-history one, line ~1131); `src/main/projectService.js` (rework per intent in the overview, line ~393); the preload (expose the handler); `src/renderer/CostTab.jsx`; `src/renderer/CostPanel.jsx` (`CostChart`); `src/renderer/theme.css` (LCARS look); the `sv.json` and `en.json` locales; tests in `tests/main/rework.test.js`, `tests/renderer/CostTab.test.jsx`, `tests/renderer/CostPanel.test.jsx`; `docs/features/epic-13-insights.md`, `docs/FEATURES.md`, `docs/releases/0.3.2.md`.
- Reuses: `mergeAudits` events (`parsers/audit.js`), `loadTokenHistory` (recorded or transcript-rebuilt readings, cached), `isArchived`/`isFinished` (`src/shared/intentArchive.js`), `CostTable`.

## Design

- `stageAttempts(events)` (FR1): a window opens at `STAGE_STARTED` or `WORKFLOW_UNPARKED` and closes at the stage's approval/completion, `GATE_REJECTED`, `STAGE_JUMPED`, `STAGE_SKIPPED`, `WORKFLOW_PARKED` or `WORKFLOW_COMPLETED`; each attempt carries `stage`, `unit`, `from`, `to` and its closing event. Same window rules as `stageWindows`, now with the stage label; `stageWindows` stays as it is.
- `thrownAway(attempts, events)` (FR2): rejected (FR2.1); a `STAGE_JUMPED` BACKWARD marks, for every stage from Target to Source, the attempts since that stage's last approval: `loop-back` when Source is build-and-test, else `jumped back` (FR2.2, FR2.3); REDO marks the stage's last attempt `redone` (FR2.4). An attempt gets one reason, the first that applies.
- `costOfWindow(readings, from, to)` (FR3): the rise of the cumulative readings across the window (tokens and usd). A window the readings do not cover, or readings rebuilt from transcripts, gives `estimate: true` with a reason key. Several attempts open at once share the rise evenly and are marked an estimate. The sum is capped at the intent's total (constraint).
- `reworkOf({ events, readings, source, archived, finished, total })`: `{ total: {tokens, usd}, share, attempts: [...], estimate }`; an archived unfinished intent returns its whole total with reason `archived unfinished` (FR2.5).
- Intent tab (FR4): new IPC `intent:rework` calls `loadTokenHistory`, then `reworkOf`, so missing readings are rebuilt from transcripts [Q4].
- Overview (FR5): `projectService` computes rework per intent from the stored readings only (no transcript reads, NFR4). An intent with no stored readings gets its thrown-away attempts priced from the ledger's per-stage cost, split evenly over that stage's attempts, marked an estimate. `CostChart` draws each intent's rework as its own part of the bar; the panel shows rework's share of the total.
- `ponytail:` comments on the even split of parallel attempts and on the ledger fallback, naming their ceilings.

## Steps

- [x] Step 1: Verify the runners: `npx vitest run tests/renderer/CostTab.test.jsx tests/renderer/CostPanel.test.jsx` green before any change; the new `tests/main/rework.test.js` joins the command in Step 2.
- [x] Step 2 (FR1, FR2, Business logic Red): `tests/main/rework.test.js` with audit fixtures: attempts with stage labels; a rejection; a loop-back from build-and-test invalidating code-generation and build-and-test; a backward jump over three stages; a redo; an unpark reopening a window; parked windows not rework. Record the failing output.
- [x] Step 3 (FR1, FR2, Green): `stageAttempts` and `thrownAway` in `src/main/rework.js`.
- [x] Step 4 (FR2.5, FR3, Business logic Red): window pricing from readings; a window without readings and rebuilt readings marked estimate; two open attempts split evenly; cap at the total; archived unfinished counts all; archived after complete counts only its attempts. Record the failing output.
- [x] Step 5 (FR2.5, FR3, Green): `costOfWindow` and `reworkOf`.
- [x] Step 6 (FR4, FR5, API Red): tests for the `intent:rework` handler (readings from `loadTokenHistory`) and for the overview's rework per intent, including the ledger fallback. Record the failing output.
- [x] Step 7 (FR4, FR5, API Green): IPC handler, preload, `projectService` field.
- [x] Step 8 (FR4, NFR2, NFR3, Frontend Red): `CostTab.test.jsx`: the Rework section lists each attempt with stage, reason, tokens, cost and the estimate mark; "no rework" in one line; the reason texts name the cause. `CostPanel.test.jsx`: the share figure and the rework part of each bar. Record the failing output.
- [x] Step 9 (FR4, FR5, Frontend Green): the section in `CostTab.jsx` (`data-testid` values `cost-rework-*`), the chart part and share in `CostPanel.jsx`, LCARS styling in `theme.css`, keys in `sv.json` and `en.json`.
- [x] Step 10 (Refactor): tidy with the three test files and `tests/main/i18nKeys.test.js` green; doc comments name `US-1301 FRn`.
- [x] Step 11 (FR6, Docs and traceability): US-1301 to ✅ Done, for v0.3.2, ticked criteria, the epic Status line, the FEATURES.md row and the release plan's status and progress rows.

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
