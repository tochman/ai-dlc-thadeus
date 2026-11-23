# Code Generation Plan: US-0045, the agent dialog clears its stale pages and shows the newest message

## Summary

- Builds: the agent dialog drops its compact, fresh-session and new-session pages once they no longer apply, and opens on, or moves to, the newest message when one arrives (US-0045)
- Touches: `src/main/agentEvents.js` (the handoff pages of a session), `src/renderer/App.jsx` (which page a new arrival shows)
- Tests: new cases in `tests/main/agentEvents.test.js` and `tests/renderer/AppAlerts.test.jsx`, plus the existing suite

## Context

Story: US-0045 in `docs/features/epic-00-fixes.md`, for v0.2.15. Work on branch `fix/US-0045` from `origin/main`, in the worktree `.claude/worktrees/fix-0045`. Spec Kit's files are left alone.

Causes found in the code:
- **Stale handoff pages (AC1).** The store keeps one handoff page per session. It ends that page only when a newer offer for the same session arrives, when a choice is sent, on Not now, or when the session ends (`agentEvents.js` `addHandoff`, `endSession`). In a tab, a `/clear`, a compaction or a resume keeps the same session. So a compact or fresh-session offer made before the new context stays `shown`, and so does the new-session offer, which only a startup or resume brings (`sessionHandoff.js` `onSignal`).
- **The last queued message shows (AC2).** A closed dialog opens on the first new page in pager order (`App.jsx` `receiveAgentEvents`, `byPager`: questions, then replies, then handoff pages, then the oldest arrival). An open dialog is never moved to a new page (US-0031 BR2.1). So a new message lands behind what is already queued.

Assumption: "no-intent" in the report is read as the new-session page ("/clear" or "/clear + /aidlc --resume"), the page shown at the start of a session. It is cleared by the same rule.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "quick-fix",
  "test_strategy": "minimal",
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
  "input_sha256": "sha256:88a731b4ee7244a446aff4ca6ed5dc5172b18032c5eb29d520ce15f5f12b868b",
  "contract_sha256": "sha256:0753d09afb0bc3b53aaf639e33074da4c539985c42e493c67138981db2bcb87b"
}
```

Only the frontend and the main-process store apply; no data model, repository or API change.

## Steps

- [x] **Step 1: Branch and story.** The worktree `.claude/worktrees/fix-0045` on the new branch `fix/US-0045` from `origin/main` exists. Run `npm ci` there if `node_modules` is missing. US-0045 is already 🚧 In progress on `main` (`f3c8c5f`).
- [x] **Step 2: Runner.** Verify that `npx vitest run tests/main/agentEvents.test.js tests/renderer/AppAlerts.test.jsx` runs in the worktree, and record the command in `unit-test-instructions.md`.
- [x] **Step 3: Red.**
  - `agentEvents.test.js` (AC1): a handoff page still `shown` ends (`endedBy: 'movedOn'`) when its session reports a new session start (`clear`, `compact`, `startup`, `resume`) or a compaction. A page whose choice is under way (`waiting`, `sending`) stays until it is sent. Another session's page stays.
  - `AppAlerts.test.jsx` (AC2): with an old question open, a newer reply arrives and the dialog moves to the new reply; Previous reaches the old question. Closed with pages queued, a new handoff page opens the dialog on itself even when an older new page arrived in the same push.
  - Run them and record the failing output.
- [x] **Step 4: Green.**
  - `agentEvents.js` `recordSignal`: on a `session` signal or a `postcompact`, end the session's handoff pages in state `shown` that arrived before that signal.
  - `App.jsx` `receiveAgentEvents`: a new opening page sets the dialog's focus to the newest arrival (`arrivedAtMs`, ties by `byPager`), whether the dialog is open or closed. The page guard (`GUARD_MS`) still keeps a keystroke from answering the page that just moved in.
  - Comments name `US-0045` and the AC.
- [x] **Step 5: Refactor.** Remove anything the change made unused (`firstNewRef` if no longer needed). Update the US-0031 comment that an open dialog is never moved. Run `tests/renderer/AgentDialog.test.jsx`, `tests/main/sessionHandoff.test.js` and the two files above.
- [x] **Step 6: Documentation and traceability.** Write `code-summary.md` and `traceability.json`. Tick met acceptance criteria in US-0045 only after Build and Test.
