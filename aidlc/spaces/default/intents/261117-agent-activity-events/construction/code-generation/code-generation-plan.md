# Code Generation Plan: US-0214 (agent activity from hook events, legend toggles)

## Summary

- Builds: Agent progress rows for each agent tab's main chat and its dispatched agents, from report-only hook events (Claude Code and opencode V2), with their live state, plus click-to-hide legend toggles on every multi-series token diagram
- Touches: `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`, `src/main/{agentHooks,agentAdapters,agentEvents,agentProgress,ipc}.js`, `src/main/parsers/agentProgress.js`, new `src/shared/agentActivity.js`, `src/renderer/{AgentProgress,TokenDetail}.jsx`, `src/renderer/tokenChart.js`, `src/shared/locales/{sv,en}.json`, feature docs
- Tests: about 40 new tests in 9 files (node + jsdom), test first for each behaviour; full suite stays green

Brownfield: every file is changed in place. Requirements: `inception/requirements-analysis/requirements.md`. No Units: one build.

## Steps

### Step 1: Runner and baseline
- [x] Run the targeted baseline (`unit-test-instructions.md` § Baseline) and record the passing counts. (NFR4)

### Step 2: Root cause of the missed agent (OQ1, FR2.3)
- [x] Red: in `tests/main/agentProgress.test.js`, reproduce the screenshot case: a Code Generation agent dispatched by the conductor (the audit and inflight state as `261117-session-handoff-dialog` left them) gives no row today. Record the failing output.
- [x] Green: fix the cause in `parsers/agentProgress.js` / `projectService.workingAgents`, so the audit fallback (FR4.1) is right too.
- [x] Refactor with the suite green.

### Step 3: Activity model — pure (FR2, FR3)
- [x] Red: new `tests/main/agentActivity.test.js`, testing a pure reducer in new `src/shared/agentActivity.js`. Activity events go in; the output is one row per main chat (per agent tab, labelled with its harness) and one per dispatched agent under its parent. Cases:
  - tool start and end matched by `tool_use_id`;
  - writing and thinking;
  - waiting (permission, question, elicitation, notification);
  - idle at `Stop`, and idle after 30 s with no event (an interrupt);
  - error with its type;
  - precedence: error > waiting > tool > writing/thinking > idle;
  - time in the current state;
  - agent start and end within one event;
  - opencode `parentID` children;
  - only tool names and types reach a row, never agent text (NFR2).
- [x] Green: `src/shared/agentActivity.js`.
- [x] Refactor.

### Step 4: Hook kinds and installer (FR1.1, FR1.3, NFR1)
- [x] Red: `tests/main/dialogScript.test.js`, `agentHooks.test.js`, `agentHooksInstaller.test.js`.
  - A new report-only kind `activity` covers `PreToolUse` (`*`), `PostToolUse`, `PostToolUseFailure`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, `MessageDisplay`, `StopFailure` and `PermissionRequest`.
  - Every one of these entries is `async`; they never wait and exit 0.
  - The existing synchronous `question` and `permission` entries are unchanged.
  - The US-0213 release is added to `RELEASES`, so an install from it reads as out of date.
- [x] Green: `dialog.sh` and `agentHooks.js`.
- [x] Refactor.

### Step 5: opencode plugin (FR1.2)
- [x] Red: `tests/main/opencodePlugin.test.js`. `session.tool.*`, `session.text.*`, `session.reasoning.*`, `session.status`, `permission.asked`, `form.created`, `session.execution.failed`/`interrupted` and `session.created` (with `parentID`) each become one `activity` event. Handlers are fire-and-forget, and every name is kept in the `OC` constants.
- [x] Green: `thadeus-dialog.js`.
- [x] Refactor.

### Step 6: Adapters and store (FR1, FR2.3)
- [x] Red: `tests/main/agentAdapters.test.js` and `agentEvents.test.js`.
  - `parse('activity')` reads only known fields (event name, `tool_name`, `tool_use_id`, `agent_id`, `agent_type`, `error`, `notification_type`, `parentID`) and refuses anything else.
  - Activity events never open a page.
  - The store keeps the reducer's state per project and pushes a change within 2 s.
- [x] Green: `agentAdapters.js`, `agentEvents.js`, and an `agent:activity` push in `ipc.js`.
- [x] Refactor.

### Step 7: Agent progress rows (FR2, FR3, FR4)
- [x] Red: `tests/renderer/AgentProgress.test.jsx` (new or extended).
  - Main rows labelled with their harness, with their agents under them.
  - State and time in state.
  - "No agents are working" only when nothing is active.
  - Hooks missing or out of date: a notice with the update offer, and the audit rows below it.
  - LCARS classes and `data-testid` `agent-progress-*`.
- [x] Green: `AgentProgress.jsx` and `src/main/agentProgress.js` (hook rows first, audit rows as the fallback).
- [x] Refactor.

### Step 8: Legend toggles (FR5, NFR3)
- [x] Red: `tests/renderer/TokenDetail.test.jsx` and `tests/main/tokenChart.test.js`.
  - Legend entries are buttons with `aria-pressed`; click, Enter and Space toggle a series.
  - The y-domain rescales to the shown series.
  - The last shown series cannot be hidden.
  - The hover box and the Table show only the shown series.
  - The choice is kept per project and diagram while the app runs.
  - This holds on every multi-series diagram.
- [x] Green: `TokenDetail.jsx`, `tokenChart.js`, and keys in `sv.json` and `en.json`.
- [x] Refactor.

### Step 9: Docs and traceability
- [x] Add implementation notes to US-0214 in `docs/features/epic-02-cost-and-models.md` (status and ticks at Build and Test). Write `code-summary.md` and `traceability.json`.

### Step 10: Repair from Build and Test (loop-back 1)
- [x] Fix the 8 tests that Steps 4–5 broke, all of which passed before this work:
  - 7 in `tests/main/opencodePluginReply.test.js` (idle handler, BR6.2/RD15): ignore the new `activity` events and their log line, keeping each test's checks on `reply`, `status` and the `event write failed` line.
  - `tests/main/dialogScriptReply.test.js` test 8 (NFR5.24/SCD10): match `case $kind in … | activity)` and the new `waits=0` lines, keeping every check on the branch.
- [x] Run the full suite (`npx vitest run tests/`) and confirm 0 failures.

## Traceability

| Requirement | Steps |
|---|---|
| FR1.1–FR1.3 | 4, 5, 6 |
| FR2.1–FR2.4 | 2, 3, 6, 7 |
| FR3.1–FR3.3 | 3, 7 |
| FR4.1 | 2, 7 |
| FR5.1–FR5.4 | 8 |
| NFR1 | 4, 5 |
| NFR2 | 3, 6 |
| NFR3 | 7, 8 |
| NFR4 | 1–8 |

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
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
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
  "input_sha256": "sha256:966ae7aa76a3ff867860dd0a2f0ee2fa471dead8c2ee6b26e903919b9f425698",
  "contract_sha256": "sha256:89b142ff38d5934191dfc83fed7aed0fa585c14d568cc2a017bf79391c7e68d1"
}
```
