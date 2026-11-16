# Code Generation Plan: US-0507 Agent progress

## Summary

- Builds: an agent progress section in the token detail view, read from the audit log, plans, review records and git
- Touches: `src/main/parsers/agentProgress.js` (new), `src/main/agentProgress.js` (new), `parsers/units.js`, `git.js`, `watcher.js`, `ipc.js`, preload, `TokenDetail.jsx`, `AgentProgress.jsx` (new), locales
- Tests: about 14 tests (vitest), main parser, loader, units, watcher, and the renderer section

Zero-Unit, express, brownfield. Inputs: `inception/requirements-analysis/requirements.md` and the code knowledge base. No design stages ran.

## Design in brief

- **Pure read model** `parsers/agentProgress.js`: `progressRows(events, {running, nowMs})` turns the audit events into rows. Unit build: open on `WORKTREE_CREATED`/`BOLT_STARTED` (`Bolt slug`), closed by `BOLT_COMPLETED`/`BOLT_FAILED`. Review: open on `REVIEW_REQUESTED`, closed by the `REVIEW_COMPLETED` with the same `Request Id`. Other agents (a build with no Unit, a design builder): `workingAgents()` as today, minus reviewers already shown. A closed row stays for 60 s (`FINISHED_KEEP_MS`), then drops. `planSteps(text)` counts `- [x]` and `- [ ]` lines. `severityCounts(record)` counts `findings[].severity`.
- **Loader** `src/main/agentProgress.js`: `loadAgentProgress(root, space, dirName, {exec, nowMs})` adds per row: plan steps (worktree plan at `<worktree>/<record>/construction/<unit>/code-generation/code-generation-plan.md`, or `<record>/construction/code-generation/…` with no Unit), last commit subject (`git log -1 --format=%s` in the worktree or root), and severities from `<record>/.aidlc-engine/<Review Record>`. Every path through `resolveInRoot`. An unreadable source sets `row.unreadable = <path>` (FR5.3), never 0.
- **Live**: `watchIntents` gets an optional `worktreesDir` and reports a change of `…/intents/<dir>/construction/*/code-generation/code-generation-plan.md` inside `.aidlc/worktrees/bolt-*/` as that intent (FR5.1). The audit, graph and record-plan writes already report. No polling.
- **IPC**: `agents:progress` → `getAgentProgress(projectId, dirName)`. `TokenDetail` asks on open and whenever the intent detail changes (a `refreshKey` prop from `IntentDetail`).
- **View** `AgentProgress.jsx`: a `token-detail-section` with the summary sentence, then one focusable `li` per row stating name, stage, minutes and status in text (NFR4). Empty: one sentence (FR1.4). All text through `t()` under `tokenDetail.progress.*` (NFR1).

## Steps

- [x] Step 1: Project structure: no new config; new files named above. (Runner exists.)
- [x] Step 2: Verify the runner: `npx vitest run tests/main/agentProgress.test.js` runs (record command in unit-test-instructions).
- [x] Step 3: Business logic Red — `tests/main/agentProgress.test.js`: rows for a Unit build, a review, an agent with no Unit (FR1.2, FR1.3); none → [] (FR1.4); `planSteps` (FR2.1); review requested → verdict + severities (FR3.1, FR3.2); finished row kept < 60 s, dropped after (FR5.2). And in `tests/main/units.test.js`: `BOLT_STARTED`/`WORKTREE_CREATED` → running, `BOLT_COMPLETED` → done (FR6.1). Record the failing output.
- [x] Step 4: Business logic Green — `parsers/agentProgress.js`, `parsers/units.js`.
- [x] Step 5: Business logic Refactor, suite green.
- [x] Step 6: Data access Red — `tests/main/agentProgressLoad.test.js` with a temp project: worktree plan counted (FR2.1), record plan with no Unit, last commit subject from a fake `exec` with fixed args (FR2.2, NFR2), review record severities (FR3.2), missing worktree/plan/record named (FR5.3). `tests/main/watcher.test.js`: a worktree plan change reports its intent (FR5.1, NFR3). Record the failing output.
- [x] Step 7: Data access Green — `src/main/agentProgress.js`, `git.js` `lastCommitSubject`, `watcher.js` `worktreesDir`; export `loadAuditEvents` from `projectService.js`.
- [x] Step 8: Data access Refactor, suite green.
- [x] Step 9: API wiring (no own test layer; covered by the loader and view tests): `ipc.js` handler `agents:progress` and `worktreesDir` passed to `watchIntents`; preload `getAgentProgress`.
- [x] Step 10: Frontend Red — `tests/renderer/TokenDetail.test.jsx`: section always shown (FR1.1); empty sentence (FR1.4); rows with name, stage, "12 min" and status text (FR1.3, FR2, FR3, NFR4); summary sentence with the numbers from the rows (FR4.1, FR4.2); an unreadable row names its path (FR5.3). Record the failing output.
- [x] Step 11: Frontend Green — `AgentProgress.jsx`, `TokenDetail.jsx`, `IntentDetail.jsx` `refreshKey`, `theme.css` (reuse token-detail classes), `sv.json`/`en.json` keys.
- [x] Step 12: Frontend Refactor; full suite `npx vitest run tests/` green (i18nKeys covers NFR1).
- [x] Step 13: Documentation: module headers name `US-0507 FR…`; code-summary and traceability.

## Story traceability

US-0507 → all steps. FR1 → 3, 4, 10, 11. FR2 → 3, 6, 7, 10. FR3 → 3, 6, 10. FR4 → 10, 11. FR5 → 3, 6, 7, 10. FR6 → 3, 4. NFR1 → 11, 12. NFR2 → 6, 7. NFR3 → 6, 7. NFR4 → 10, 11. NFR5 → every Red step.

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
