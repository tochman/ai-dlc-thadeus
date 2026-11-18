# Code Generation Plan — US-0031

## Summary

- Builds: the dialog opens on the page that just arrived, a settled page gives way to a new one, and settled pages no longer hold the dialog open
- Touches: `src/shared/agentOrder.js`, `src/renderer/App.jsx`, `src/renderer/AgentDialog.jsx`, `tests/renderer/AppAlerts.test.jsx`, `tests/renderer/AgentDialog.test.jsx`
- Tests: 5 new renderer tests (vitest + jsdom), TDD; the existing suite stays green

## Approach

- `isSettled(e)` in `src/shared/agentOrder.js`: a hook page in `sent`, `handedBack`, `stale` or `ended`. One definition, used by App and the dialog.
- FR1: `receiveAgentEvents` in `App.jsx` names the first opening page (pager order) as `popupFocus`, but only while the dialog is closed (a ref holds `popupOpen`), so a page being read is never moved (FR3). The dialog's existing `focus` effect does the rest.
- FR2: in `AgentDialog.jsx`, when the page on screen is settled and a page not seen when it showed is in the list, that new page takes over.
- FR4: `hasNewQuestion` in `App.jsx` ignores settled pages.
- No change to `agentEvents.js` or `byPager` (out of scope in `requirements.md`). No new texts, so no i18n keys.

## Steps

- [x] Step 1: Verify the runner: `npx vitest run tests/renderer/AppAlerts.test.jsx tests/renderer/AgentDialog.test.jsx` passes before any change.
- [x] Step 2: Shared rule — Red: test `isSettled` (sent/handedBack/stale/ended settled; shown/timedOut/sending/waiting and audit pages live) in `tests/renderer/AgentDialog.test.jsx`; record the failing output. (FR2, FR4)
- [x] Step 3: Shared rule — Green: add `isSettled` to `src/shared/agentOrder.js`.
- [x] Step 4: Frontend, App — Red: in `tests/renderer/AppAlerts.test.jsx`, (a) dialog closed on an old page still in the list, a handoff page arrives → the handoff page is shown and Previous reaches the old one (US1.1, FR1, FR1.2); (b) two new pages in one push → the first in pager order is shown (FR1.1); (c) only a `sent` page is left → the dialog closes by itself, and with a live page beside it, it stays open (US1.4, FR4). Record the failing output.
- [x] Step 5: Frontend, App — Green: `popupOpenRef`, `setPopupFocus` for the first opening page when closed, `hasNewQuestion` skips settled pages.
- [x] Step 6: Frontend, dialog — Red: in `tests/renderer/AgentDialog.test.jsx`, open on a `sent` page, a new page is pushed → the new page shows (US1.2, FR2); open on a live page, a new page is pushed → same page, "+1 nya" (US1.3, FR3, existing rule). Record the failing output of the first.
- [x] Step 7: Frontend, dialog — Green: the settled-page takeover in `AgentDialog.jsx`, with a `US-0031 FR2` comment.
- [x] Step 8: Refactor with the targeted tests green, then run the existing dialog tests: `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogHandoff.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/AppAlerts.test.jsx tests/renderer/AppShell.test.jsx tests/renderer/LatestMessageStrip.test.jsx`.
- [x] Step 9: Documentation and traceability: header comments name `US-0031 FR…`; write `code-summary.md`. FR5 needs no code: the change is harness-neutral (both tools reach the same events), and the handoff send path is untouched.

## Story traceability

| Story | Requirements | Steps |
|---|---|---|
| US1.1 | FR1, FR1.1, FR1.2, FR1.3 | 4, 5 (FR1.3 kept by the existing notification test) |
| US1.2 | FR2 | 2, 3, 6, 7 |
| US1.3 | FR3 | 6 |
| US1.4 | FR4 | 2, 3, 4, 5 |
| US1.5 | FR5 | 9 |
| — | NFR1, NFR2 | 2–8 |

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

Layers not touched by this fix (data model, repository, API) are left out; the shared rule (Steps 2–3) is the business-logic layer.
