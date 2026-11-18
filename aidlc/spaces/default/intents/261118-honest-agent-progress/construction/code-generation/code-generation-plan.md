# Code Generation Plan: US-0030 honest agent progress

## Summary

- Builds: true permission state per agent, task and activity text on agent rows, step counts on hook rows, and a "seen N ago" note on old rows
- Touches: `src/main/agentAdapters.js`, `src/shared/agentActivity.js`, `src/main/agentEvents.js`, `src/renderer/AgentProgress.jsx`, `src/shared/locales/{sv,en}.json`, and their tests
- Tests: about 12 unit tests (node and jsdom), one per requirement, written first (TDD)

Zero-Unit work (express). Inputs: `inception/requirements-analysis/requirements.md` (FR1–FR5, NFR1–NFR4) and the causes in `inception/reverse-engineering/developer-scan.md`. Story: US-0030 (`docs/features/epic-00-fixes.md`). No data model, repository or API layer changes: the testable layers are business logic (the adapter and the activity model) and frontend behaviour.

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

Not applicable layers: data model / database, repository / data access, and API / endpoint (no IPC channel changes; `agent:activity` and `agentActivity:list` keep their shape plus new optional row fields). Environment/build configuration: none.

## Steps

- [x] **Step 1 — Structure.** No new files beyond tests; confirm the module headers name US-0030 when touched.
- [x] **Step 2 — Runner.** Verify `npx vitest run tests/main/agentActivity.test.js` runs green before any change; record the commands in `unit-test-instructions.md`.
- [x] **Step 3 — Business logic, Red.** Add failing tests:
  - `tests/main/agentAdapters.test.js`: a Claude Code PreToolUse with `tool_input.description` yields a bounded `detail` (≤ 80 chars, one line, cleaned through `src/shared/agentText.js`); a PreToolUse of the Agent tool yields the task description; a long or multi-line text is cut; a payload with no description yields none (FR2.1, FR4.1, FR4.2, NFR1).
  - `tests/main/agentActivity.test.js`: a permission event with an agent id lands on that agent's row, and main shows `waiting` with reason `agent` and the agent's type (FR1.1, FR1.2); a permission state clears on the answer event and on that agent's next event (FR1.3); main waiting for a background agent never has reason `permission` (FR1.4); a subagent row carries the task from the paired Agent-tool call (FR2.1); `view()` exposes `lastMs` and a row quiet for 30 s is marked stale, waiting rows included, and a new event clears it (FR5.1, FR5.2).
  - `tests/main/agentEvents.test.js`: a `permission` dialog event with an agent id is fed with that id; an answer through `permissions.answer` feeds an activity event that clears the wait (FR1.1, FR1.3).
  Run them and record the failing output.
- [x] **Step 4 — Business logic, Green.** `agentAdapters.js`: keep a bounded `detail` (tool description) and `task` (Agent tool description) through `agentText.js`; `agentEvents.js`: pass the agent id on permission events and feed an `answered` activity on an answer; `agentActivity.js`: per-agent permission waits, main `waiting` reason `agent`, clear on answer/next event, pair the Agent-tool task with the next SubagentStart of the same type (by `tool_use_id` when present, else by order), expose `lastMs` and `stale` after 30 s. Only enough to pass.
- [x] **Step 5 — Business logic, Refactor.** Tidy with the suite above green; update the adapter tests' identifier-only assertions to the bounded fields on purpose (NFR1).
- [x] **Step 6 — Frontend, Red.** `tests/renderer/AgentProgress.test.jsx`: the task shows next to the agent's name (FR2.1) and is absent when unknown (FR2.2); the activity shows the description, else "running <tool>" (FR4.1, FR4.2); main shows "waiting for <agent>" (FR1.2); a hook row whose agent has a plan shows "step n of m" from the audit rows, and none without a plan (FR3.1, FR3.2); a stale row shows "seen N ago" and it updates (FR5.1, NFR3). Run and record the failing output.
- [x] **Step 7 — Frontend, Green.** `AgentProgress.jsx`: render `task` and `detail`; join hook rows to the audit rows' `steps` by agent type (and stage where known); render `waiting` reason `agent`; render the stale note with a 10 s tick. New keys in `sv.json` and `en.json` (`tokenDetail.progress.*`), LCARS classes, state also in text (NFR2).
- [x] **Step 8 — Frontend, Refactor.** Tidy with the tests green; run `tests/main/i18nKeys.test.js`.
- [x] **Step 9 — Real payload check.** Look at a real Claude Code SubagentStart and PreToolUse(Agent) payload in this project's hook channel (read-only) to confirm the pairing assumption; record the finding in `code-summary.md`.
- [x] **Step 10 — Documentation and traceability.** Module header and doc comments name US-0030 and the FR; write `code-summary.md` and `traceability.json`.

## Story traceability

| Step | Requirements |
|------|--------------|
| 3–5 | FR1.1–FR1.4, FR2.1, FR2.2, FR4.1, FR4.2, FR5.1, FR5.2, NFR1, NFR3 |
| 6–8 | FR1.2, FR2.1, FR2.2, FR3.1, FR3.2, FR4.1, FR4.2, FR5.1, NFR2, NFR3 |
| 9 | Assumption on task pairing |
| all | NFR4 (test first; suite green) |
