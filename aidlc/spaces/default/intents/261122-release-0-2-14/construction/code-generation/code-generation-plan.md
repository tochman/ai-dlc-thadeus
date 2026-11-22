# Code Generation Plan: Release v0.2.14

## Summary

- Builds: four EPIC-00 fixes (planning sync unblocked, Fresh session and Compact that act, intent head controls, intent list order)
- Touches: `src/main/planningSync.js`, `planningRecord.js`, `sessionHandoff.js`, `parsers/intents.js`; `src/renderer/terminalControl.js`, `AgentDialog.jsx`, `IntentDetail.jsx`, `ResumeButton.jsx`, `IntentList.jsx`, `FeaturesView.jsx`, `theme.css`; locales
- Tests: about 26 new unit and component tests in 10 existing vitest files, written first (TDD)

Zero-Unit work: one plan, built story by story in the release order. Each story is its own branch from `main` (`fix/US-0038`, `fix/US-0039`, `fix/US-0037`, `fix/US-0040`) and its own pull request; a later branch merges `main` after an earlier story merges (project rule). Commits only when the person says yes. Each story sets its marker to 🚧 when it starts. IDs are from `requirements.md`.

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

Layers that apply: business logic (main-process modules) and frontend behavior (React components). No data model, repository, API or build-config changes; those layers are left out.

## Steps

- [x] **Step 1** Project structure: no new files or config; everything changes in place. Verify the runner: `npx vitest run --project main tests/main/sessionHandoff.test.js` passes on `main`. (all)

### US-0038 on `fix/US-0038` (FR1)
- [x] **Step 2** Business logic, Red, `tests/main/planningSync.test.js`, `tests/main/planningRecord.test.js`: a `dash/planning` commit that conflicts on a file the target changed later leaves the other changes pushed and offers Keep theirs for that file (FR1.1); a waiting entry for a tagged release's plan is dropped with a log line (FR1.2); `addContent` keeps only the newest change's story ids (FR1.3); a blocked push reports the blocking commit or entry (FR1.4). Record the failing output.
- [x] **Step 3** Green: in `pushFrom`/`pushAll`, on a rebase conflict, skip (`rebase --skip`) the app commit whose files the target changed after it, keep it as a conflict entry, and go on; drop tagged-release plan entries in `replayStep`; `addContent` sets story ids from the new entry only; return the blocker for the row.
- [x] **Step 4** Frontend, Red then Green, in the Planning sync row (`src/renderer/FeaturesView.jsx`, its existing test): the row names the blocker and the choice (FR1.4). New texts in `sv.json` and `en.json` (NFR1).
- [x] **Step 5** Refactor while green.

### US-0039 on `fix/US-0039` (FR2)
- [x] **Step 6** Business logic, Red, `tests/main/sessionHandoff.test.js`: `commandsFor` returns a `mode` (`now` at a gate even with a question open, `park` while busy, `now` when idle); park mode gives the park-request line first, then `/clear` + `/aidlc --resume` or `/compact <instruction>` + `/aidlc --resume` (FR2.1–FR2.4); fixed text per harness (NFR4).
- [x] **Step 7** Green in `src/main/sessionHandoff.js` (`handoffCommands`, `commandsFor`, a `parkRequest` line per harness) and the `handoff:*` handlers in `src/main/ipc.js` (a `closeQuestion` call for the gate case through the existing close path).
- [x] **Step 8** Frontend, Red, `tests/renderer/terminalControl.test.jsx`, `tests/renderer/AgentDialogHandoff.test.jsx`: at a gate the lines go out at once after the question is handed back; while busy the park line goes at once, the page says the request was sent, and the rest follows on idle; timeout keeps `notIdle` (FR2.5).
- [x] **Step 9** Green in `src/renderer/terminalControl.js` (`sendHandoff`) and `src/renderer/AgentDialog.jsx` (`HandoffPage` status text); new texts in both locales. Then refactor while green.

### US-0037 on `fix/US-0037` (FR3)
- [x] **Step 10** Frontend, Red, `tests/renderer/IntentDetail.test.jsx`, `tests/renderer/ResumeButton.test.jsx`: no Unpark button on a parked intent and one "Unpark and resume at <stage>" button (FR3.2); progress row says parked (FR3.3); resume button has no step text and the sidebar count is labelled done (FR3.4); Park and Resume share one aligned container (FR3.1).
- [x] **Step 11** Green in `IntentDetail.jsx` (`ParkControls` holds only Park; the parked mark joins the head as an LCARS element; progress row text), `ResumeButton.jsx` (label), `theme.css` (`.intent-head` alignment, same block height, wrap rule, sidebar cost size) (FR3.1, FR3.5, FR3.6, NFR2); locales. Refactor while green.

### US-0040 on `fix/US-0040` (FR4)
- [x] **Step 12** Business logic, Red, `tests/main/parsers.test.js`: same-day intents order by the `uuid`'s time (FR4.2); no `uuid` sorts by folder date after that day's indexed ones (FR4.3).
- [x] **Step 13** Green in `src/main/parsers/intents.js` (a `createdMs` from the UUID v7 prefix, sort by it).
- [x] **Step 14** Frontend, Red then Green, `tests/renderer/IntentList.test.jsx`: date sort puts in-flight and parked first, the active one on top (FR4.1); cost and name unchanged (FR4.4); in `sortIntents`. Refactor while green.

### Close
- [x] **Step 15** Documentation and traceability: story header comments name story and FR; `code-summary.md`, `traceability.json`; full suite, ESLint and Prettier per branch (NFR3).

### Added 2026-11-22 at the person's request: US-0041, US-0905, US-0417 (mockup) in parallel
The person added these stories to v0.2.14 after the first approval and asked for them to be built in parallel by agents. Their acceptance criteria are in the epic files and act as their requirements here. US-0416 (Tools redesign) follows after the US-0417 mockup is approved, in its own plan addition.

### US-0041 on `fix/US-0041`
- [x] **Step 16** Business logic and frontend, Red, `tests/renderer/workflowBusy.test.js` (new or existing), `tests/renderer/AidlcUpdate.test.jsx`, `tests/renderer/RefreshPanel.test.jsx`: a complete or parked active intent never counts as working; audit-only changes (`HUMAN_TURN` and the like) and engine runtime files do not restart the window; the notice names the intent and stage.
- [x] **Step 17** Green in `src/renderer/workflowBusy.js`, `src/renderer/useProject.js` (what sets `lastIntentChangeAt`), and if needed `src/main/watcher.js` (report which kind of file changed); `AidlcUpdate.jsx`, `RefreshPanel.jsx`; locales. Refactor while green.

### US-0905 on `feat/US-0905`
- [x] **Step 18** Frontend, Red, `tests/renderer/AppShell.test.jsx` or the arm's existing test: no Plans block in the left arm; Plans is a Configuration sub-block next to AI-DLC; a saved `view: 'plans'` or a menu link opens it there; Plans still hidden where it is today.
- [x] **Step 19** Green in `src/renderer/App.jsx` (arm blocks, `pick` of saved views) and `src/renderer/ProjectView.jsx` (`config` with a `plans` section rendering `PlansView`); locales. Refactor while green.

### US-0417 mockup (no app code)
- [x] **Step 20** A static HTML mockup at `aidlc/spaces/default/intents/261122-release-0-2-14/construction/lcars-mockup/index.html` of four views (Intents with the intent head, Settings › Tools, Configuration, Cost in the diagonal frame) using the app's palette and fonts from `src/renderer/theme.css`, following US-0417's criteria; shown to the person for approval before any US-0417 or US-0416 code.

### Added 2026-11-22: US-0417, US-0416, US-1203 (mockup approved; one plan, no extra approval round, as the person decided)
The approved mockup (`construction/lcars-mockup/index.html`, its rules panel) and US-0417's acceptance criteria are the requirements. Navigation stays as it is. Foundation first, then the rest in parallel, each in its own worktree branched from `feat/US-0417`.

- [x] **Step 21** US-0417 foundation on `feat/US-0417`, test-first for behaviour: theme tokens (palette roles, gaps 6/12/18, bar thicknesses, elbow ratios, title sizes, motion tokens) and the written rules in `theme.css`; shared pieces in `Lcars.jsx` (round elbow with circular arcs, curved diagonal frame, segmented bar with title and sub-label, hairlines, block with state strip and figure cell, readout table, flat meters and segmented meter without knobs, section-heading row, list drawer with toggle in the heading row and folded stack, entrance sequence); the app shell in `App.jsx`/`TerminalPanel.jsx` (brand corner in slate with amber mark, header title rule and full-screen inset, arm blocks with figures, foot bar with Hide/Show terminal, Settings Back pill and Esc); amber removed elsewhere.
- [x] **Step 22** US-0417 views on top of Step 21 (parallel): Intents and intent head in the diagonal frame; Features › Epics and Releases with the drawer; Configuration with the AI-DLC Settings | Plans switch styled; Cost and Activity (rename from Tokens, `TokenDetail.jsx`) in the diagonal frame; About and Update dialogs.
- [x] **Step 23** US-0416 on `feat/US-0416` from Step 21: Settings › Tools grouped (AI-DLC once, Coding agents, Git hosts, System), one row per tool with state chip and pill actions, folded file list, Bitbucket sign-in row, Check for updates opening the Update dialog.
- [x] **Step 24** US-1203 on `feat/US-1203` from Step 21: the Comments tab as "Review" (Needs you, Pull request threads, no repeated approvals, a clear empty state).
- [x] **Step 25** Each branch: its tests Red then Green, full suite, ESLint and Prettier; locales in both languages.
