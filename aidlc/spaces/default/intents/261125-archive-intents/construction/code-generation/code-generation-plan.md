# Code Generation Plan: archive and unarchive an intent (US-0513)

## Summary

- Builds: archive one or several intents and unarchive one, from the detail and the list, through AI-DLC's own command, with the changed files committed on `main`
- Touches: new `src/shared/intentArchive.js`, `src/main/intentArchive.js`, `src/main/archiveCommit.js`, `src/renderer/ArchiveControls.jsx` and `ArchiveDialog.jsx`; changes in `projectService.js`, `ipc.js`, `IntentList.jsx`, `IntentDetail.jsx`, both locale files and the readers named below
- Tests: about 75 (unit, component and real-git tests), each written before its code; repair: the two failing layout tests of the built app and one added to the same spec; second repair: the command's form (Step 21), in two existing test files

## Design

**One status rule.** `src/shared/intentArchive.js` (pure, used by main, renderer and tests): `isArchived` (index status `archived` or state `Archived`, as AI-DLC itself tests), `isFinished` (complete, or archived with `Archived From: Completed`), `checkReason`, `workBlock` and the two audit event names. `loadIntentList` applies it once: an archived intent gets `status: 'archived'`, `archivedFrom` and `active: false`. Most readers (Resume, Park, workflow busy, "working now", questions, plans, profiles, framework switch) then follow with no change of their own. No file is read beyond those read today (NFR2).

**Readers that need their own change** (a failing test for each first, NFR3): `stateFinished` (velocity), `loadHandoffInputs` (reads the cursor itself), `inFlightIntent`, `mergePipeline` (no stage is current when archived), `IntentVelocity`'s `finished`, `useProject`'s first selection, the intent count in the left arm, and `featureDocsStatus.test.js` (an archived intent that was not complete is neither built nor delivered). `intentMetrics` and `stageWindows` skip the archive and unarchive events, or the last event would stretch an intent's time (AC6.1.1).

**The block (FR1.4).** Resume's rule becomes `workBlock({busy, asking, running, activeIntent, now})` with the answer `busy`, `asking`, `running`, `elsewhere` or null. Resume and Archive both use it, each with its own texts. Archive asks it only for the active in-flight intent. Main asks it again from its own agent tabs, waiting questions, hook activity and a fresh read of the intent's audit time.

**The run.** `archiveIntents(root, dirNames, reason, …)` takes one name or several, checks every name against the space's list, runs one command at a time, reports progress and never stops on a refusal. More than one name requires all of them complete. One lock per project covers archive, several and unarchive. The app checks that AI-DLC's active space is the one shown: main from `aidlc/active-space`, the renderer from the project's detection (known when it was opened; main is the one that decides).

**The commit (FR5).** Before the first command: branch, repository, and whether `intents.json` is dirty. Around each command: size and time of the intent's state and audit files, so exactly the changed files are known, also after a timeout. Then one commit of those files on `main`, in the planning sync's per-project queue, with its add/commit/unstage step shared (`commitFiles`). Its push takes the commit to origin, within its interval. The answer says where the commit stands: waits for the sync, or stays local (protected `main`, no remote, offline, or planning sync off in this project).

**Interface.** `ArchiveControls` (detail): Archive or Unarchive, and Unarchive's result. `ArchiveDialog` on `LcarsDialog`: names, "nothing is deleted", warnings, reason, progress, result. Both single and several use it, and the result stays until closed. `LcarsDialog` gets an optional `fallbackFocus`, for when the control that opened it is gone (FR7.2). Select mode lives in `IntentList`, with the run's progress and result in a status line when the dialog is closed.

## Steps

Data model
- [ ] **Step 1** Run the unit's existing tests as `unit-test-instructions.md` says, to see the runner green before the first test. Add `tests/main/archiveCommit.test.js` to `TIMED` in `vitest.config.mjs` (real git repositories).
- [ ] **Step 2 Red** `tests/main/intentArchiveRules.test.js`, `parsers.test.js` (`archivedFrom`, `mergePipeline`): `isArchived`, `isFinished`, `checkReason` (spaces only, line breaks, 200/201, leading `-`), `workBlock` in all five answers. AC1.1.4, AC1.2.1, AC1.2.2, AC6.1.2, AC6.1.3
- [ ] **Step 3 Green, refactor** `src/shared/intentArchive.js`; `archivedFrom` in `parsers/state.js`; `parsers/pipeline.js`.

Reading the files
- [ ] **Step 4 Red** `projectService.test.js`, `velocity.test.js`, `velocityLoad.test.js`, `tokenHistory.test.js`: archived status from index or state, never active, no question, no handoff, also when `active-intent` still names it; same cost, velocity and token history before and after; same number of file reads. AC1.2.4, AC1.2.5, AC3.1.4, AC3.1.6, AC6.1.1–3
- [ ] **Step 5 Green, refactor** `projectService.js` (`summarizeIntent`, `loadIntentList`, `inProgress`, `stateFinished`, `loadHandoffInputs`; an active-space read split out of `detectProject`), `parsers/velocity.js`, `tokenHistory.js`.
- [ ] **Step 6 Red, green** `featureDocsStatus.test.js`: delivered, and neither, by `isFinished`. AC6.1.2, AC6.1.3

Business logic
- [ ] **Step 7 Red** `tests/main/intentArchive.test.js`: exact arguments with and without a reason, unknown and `-` names run nothing, refusal and timeout words, other space, several in order with progress, a refused one in the middle, an unfinished one among several refused, changed files found. AC1.1.3–6, AC2.1.2, AC2.1.4, AC4.1.3, AC4.1.4
- [ ] **Step 8 Green, refactor** `src/main/intentArchive.js`; `aidlc` and the name check exported from `intentPark.js` and reused.
- [ ] **Step 9 Red** `tests/main/archiveCommit.test.js` (real git): exact files and subject for one, N and unarchive; staged work stays staged; other branch, detached, no git; dirty `intents.json`; earlier lines in state and audit go along; a refusing hook; nothing archived; protected, no remote, offline, sync off. AC5.1.1–6
- [ ] **Step 10 Green, refactor** `src/main/archiveCommit.js`; `commitFiles` split out of `commitIn` and `MAIN` exported in `planningSync.js`.

App handlers
- [ ] **Step 11 Red** `ipc.test.js`, `pty.test.js`, `preload.test.js`: `intents:archive`, `intents:unarchive`, `intents:archiveProgress`; main's own check refuses and runs nothing; a second start is refused; the lock is freed after a failure; a list reload after. AC1.2.3, AC4.1.5
- [ ] **Step 12 Green, refactor** `ipc.js`, `pty.js` (`hasAgentSession`), `preload/index.js`.

Interface
- [ ] **Step 13 Red, green** `ResumeButton.test.jsx`, `useProject.test.jsx`, `ProjectView.test.jsx`, `workflowBusy` (in `RefreshPanel.test.jsx`): Resume on `workBlock` with unchanged behaviour, first selection, count, not in flight. AC1.2.2, AC1.2.4, AC3.1.1
- [ ] **Step 14 Red, green** `tests/renderer/ArchiveDialog.test.jsx`, `Lcars.test.jsx` (`fallbackFocus`): texts and warnings, Cancel and Escape run nothing, kept reason after a refusal, progress, result with the commit's outcome, focus back. AC1.1.2, AC1.1.4, AC1.1.5, AC4.1.2, FR7.2
- [ ] **Step 15 Red, green** `tests/renderer/ArchiveControls.test.jsx`, `IntentDetail.test.jsx`: offered or not, unavailable with its reason, other space, Unarchive without a question and its refusal, the Archived mark, no Resume, Park or Unpark, all tabs open, parked again after unarchive. AC1.1.1, AC1.1.6, AC1.2.1, AC2.1.1–4
- [ ] **Step 16 Red, green** `IntentList.test.jsx`: count, "Archived (N)", search, plan and sort inside it, back to all after the last one, all archived, checkboxes, Select all, a choice that outlives a filter, "Archive N", progress and result with the dialog closed, Select mode ends. AC3.1.1–5, AC4.1.1–5
- [ ] **Step 17** Texts in `sv.json` and `en.json` (`i18nKeys.test.js` green), LCARS styles in `theme.css` for the select mode and the mark.

Close
- [ ] **Step 18** The unit's command green, ESLint and Prettier clean on the changed files; module headers name US-0513 and their requirement; `ponytail:` comments on the two ceilings (the renderer's active space is from opening; files are compared by size and time).

Repair after Build and Test (loop-back 1)
- [ ] **Step 19 Red, green** The built-app tests `intentLayout.spec.js` AC1 and AC2 at 1280 fail (765 px wide in 718). Let the head actions wrap in `theme.css`, and keep Park and Resume together as one piece with a small wrapper in `IntentDetail.jsx` (US-0037 FR3.1). AC1.1.1
- [ ] **Step 20 Red, green** Asked for directly by the person: the "Step n of m" text lay over the frame's thin line. A built-app test at 1920 failed first; the step row starts in line with the chips (`theme.css`).

Repair after Build and Test (loop-back 2)
- [x] **Step 21 Red, green** AI-DLC 2.11.3 has no `aidlc intent`; the form is `aidlc engine intent archive|unarchive|switch`. Change the expected arguments in `intentArchive.test.js` and `intentPark.test.js` first, then `intentArchive.js` and `intentPark.js` (Unpark's switch, US-0510, has the same fault). This replaces the form in FR1.3 and FR2.2. AC1.1.3, AC2.1.2

**Left to Build and Test:** the full suite with coverage, the existing Playwright specs, the real archive and unarchive in a throwaway project (NFR3), and the story's markers and criteria in the feature docs.

## Story to step

| Story | Steps |
|---|---|
| US1.1 | 2, 3, 7, 8, 11, 12, 14, 15 |
| US1.2 | 2–5, 11–13, 15 |
| US2.1 | 3, 7, 8, 12, 15 |
| US3.1 | 4, 5, 13, 16 |
| US4.1 | 7, 8, 11, 12, 14, 16 |
| US5.1 | 9, 10, 12, 14 |
| US6.1 | 2–6 |

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
