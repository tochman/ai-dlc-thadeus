# Code Generation Plan: U10 u10-speckit-agent-status (US5.2 / US-1410)

## Summary

- Builds: the Spec Kit agent progress readout (contract C9) at the top of the Specs view, the `agents:progress` fix for Spec Kit projects, and the popup's "from the agent hooks" note.
- Touches: `src/main/agentProgress.js`, `src/main/ipc.js`, `src/renderer/SpeckitProgress.jsx` (new), `src/renderer/SpeckitShell.jsx`, `src/renderer/AgentDialog.jsx`, `src/shared/locales/{sv,en}.json`, `vitest.config.mjs`, `src/renderer/theme.css`.
- Tests: about 26 tests, test first: 10 main (waiting, progress), 5 IPC, 1 timed, 8 renderer readout, 1 popup note, 1 shell placement.

Sources: `functional-spec.md`, `rules.md` (BR10.1–BR10.8) and `frontend-components.md` in `../functional-design/`; `performance-design.md`, `security-design.md` and `logical-components.md` in `../nfr-design/`; C9 in `contract-summary.md`; U10 in `unit-of-work.md`; FR10, NFR3, NFR5, NFR7 in `requirements.md`. Infrastructure Design was skipped for this Unit (no infrastructure). No new dependency.

Branch: US-1410 gets its own `feat/US-1410` branch and pull request (team rule). The working tree now holds U7's uncommitted US-1404 work on `feat/US-1404`; U10 needs none of it (it depends on U6, already on `main`).

Two readings of the design, kept small:
- `agent` is the harness label (`selectableHarness(ev.harness)?.label ?? ev.harness`): the public event view carries no agent name.
- A permission's `question` is its tool name (`permission.what`), never its command or path (NFR3.3).

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

Data model and repository layers do not apply: U10 adds no stored data, and the hook event store (`agentEvents.js`) and U6's `loadSpeckitFeatures` are reused unchanged.

- [x] **Step 1. Structure** (US-1410). Set US-1410 to 🚧 In progress in `docs/features/epic-14-spec-kit.md` and its `docs/FEATURES.md` row. No new folders.
- [x] **Step 2. Runner** (US-1410). Verify vitest runs the commands in `unit-test-instructions.md`: add `tests/main/agentProgressSpeckitTimed.test.js` to `TIMED` in `vitest.config.mjs` (NFR7.3), so it runs in the retried `scripts` project.
- [x] **Step 3. Business logic, Red** (AC5.2.1, AC5.2.2; BR10.2–BR10.4; NFR3.3, NFR5.1, NFR5.2, NFR7.3). Write `tests/main/agentProgressSpeckit.test.js` and `tests/main/agentProgressSpeckitTimed.test.js`; record the failing run.
  - `waitingFrom`: no events gives null; one question gives its header; no header gives the body's first line; a question and a permission, the first in pager order wins; ended, handed-back and reply events left out; `audit-` rows left out; a permission returns only `{ question: tool name, agent }`, never its command or path; a `<script>` and a 5,000-character body arrive as plain text cut to 200 characters; agent is the harness label.
  - `loadSpeckitProgress`: active feature gives `{ name, done, total }` and `source: tasks`; no active feature gives `feature: null`; the features reader rejecting gives `feature: null`, a `console.warn`, and no throw; a waiting question gives `source: hooks`; neither gives `source: none`.
  - Timed: 30 features and 200 events resolve within 1 s.
- [x] **Step 4. Business logic, Green.** Add `waitingFrom(events)` and `loadSpeckitProgress(root, events, { loadFeatures })` to `src/main/agentProgress.js`, with `Promise.allSettled` over the two parts. No fs import in the new code (NFR3.1).
- [x] **Step 5. Business logic, Refactor** with the suite green.
- [x] **Step 6. API, Red** (AC5.2.3; BR10.1, BR10.8; NFR3.1, NFR3.2). In `tests/main/ipc.test.js`: a Spec Kit project with no AI-DLC space resolves C9; a Spec Kit project with a dir name still gets C9; an AI-DLC project with no dir name gets C9; an AI-DLC project with a dir name returns today's rows and `../x` rejects; the Spec Kit call makes zero fs write, mkdir, rename or unlink calls. Record the failing run.
- [x] **Step 7. API, Green.** Branch `agents:progress` in `src/main/ipc.js` in the order of NFR3.2, passing `agentStore?.list(projectId) ?? []`. Update the preload comment on `getAgentProgress`.
- [x] **Step 8. API, Refactor** with the suite green.
- [x] **Step 9. Frontend, Red** (AC5.2.1–AC5.2.3; BR10.5–BR10.7; NFR1.1, NFR2.1, NFR5.1, NFR7.1, NFR7.2, NFR7.4). Write `tests/renderer/SpeckitProgress.test.jsx`: waiting with agent and "from the agent hooks"; feature with done/total and "from tasks.md"; both; the empty line; the failed state; a refresh on `agent-events:changed` for this project and none for another; a refresh on `speckit:changed`; a burst during a call gives one extra call; listeners removed on unmount; question text shown as text. Add to `tests/renderer/AgentDialog.test.jsx` the hook page's `agent-dialog-source-hooks` note, and to `tests/renderer/SpeckitShell.test.jsx` the readout above the features list. Record the failing run.
- [x] **Step 10. Frontend, Green.** `src/renderer/SpeckitProgress.jsx` (LCARS readout, test ids from `frontend-components.md`, no Markdown, one effect keyed on project id and a refresh counter, one "again" flag); mount it in `SpeckitShell.jsx` above `SpeckitFeatures`; the note in `AgentDialog.jsx` on hook question and permission pages; LCARS styles in `src/renderer/theme.css`; keys `speckit.progress.*` and `agentDialog.sourceHooks` in `sv.json` and `en.json` with ICU placeholders.
- [x] **Step 11. Frontend, Refactor** with the suite green; `tests/main/i18nKeys.test.js` passes.
- [x] **Step 12. Build configuration.** None beyond Step 2; ESLint and Prettier pass on the changed files.
- [x] **Step 13. Documentation and traceability.** Header comments name `US-1410` and the rule or NFR; `code-summary.md`, `source-manifest.json` and `traceability.json` in this folder.
