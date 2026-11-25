# Code Summary: archive and unarchive an intent (US-0513)

All 18 steps are built, test first. Nothing is committed yet; the work is on `feat/US-0513`.

## Files

- **New source:** `src/shared/intentArchive.js` (the one status and block rule), `src/main/intentArchive.js` (the commands and the run), `src/main/archiveCommit.js` (the commit), `src/renderer/ArchiveControls.jsx`, `src/renderer/ArchiveDialog.jsx`
- **Changed, main:** `intentPark.js`, `ipc.js`, `projectService.js`, `planningSync.js`, `pty.js`, `tokenHistory.js`, `parsers/state.js`, `parsers/pipeline.js`, `parsers/velocity.js`, `src/preload/index.js`
- **Changed, renderer:** `IntentDetail.jsx`, `IntentList.jsx`, `LcarsDialog.jsx`, `Pipeline.jsx`, `ProjectView.jsx`, `ResumeButton.jsx`, `useProject.js`, `workflowBusy.js`, `theme.css`; both locale files
- **Tests:** five new files (`intentArchiveRules`, `intentArchive`, `archiveCommit`, `ArchiveDialog`, `ArchiveControls`), 15 changed ones, and `vitest.config.mjs` (`archiveCommit` is timed)

## Decisions made while building

- An archived row also gets `parked: false`; the audit brings parking back after unarchive (AC2.1.3).
- A single refused intent is an error in the form, so the typed reason is kept. Several refused ones are named in the result.
- An intent that fails mid-run (an unreadable file) counts as refused and the rest go on.
- The branch is checked again inside the commit queue, so a switch during the run gives no commit.
- The status filter goes back to all statuses when any chosen status empties, not only Archived.
- With every intent archived when the project opens, none is selected.

## Deviations from the plan

- `errors.timeoutAfter` gives the real 20 s limit. Park and Unpark said "10 s" before and changed too.
- `tokens:readings`: an archived intent that was not complete keeps only its recorded readings, as before it was archived (AC6.1.1).
- `Pipeline.jsx`: a begun stage of an archived intent no longer pulses (FR1.6); `mergePipeline` alone did not cover it.
- `projectMetrics.running` leaves out archived unfinished intents. AC6.1.1 ("velocity the same") and AC6.1.3 ("not in progress") conflict on this one number; AC6.1.3 was followed.
- `featureDocsStatus.test.js`: its helper takes `status` instead of `complete` (four fixture lines), and a state that alone says Completed counts as delivered.
- About 119 new tests instead of about 75.
- Added after the build: a dialog closed during a single archive now shows its progress and result beside the button (FR1.5; `ArchiveControls`, one failing test first).

## Test results

- Existing files of the unit: 19 files, 405 passed. New files: 5 files, 65 passed. Neighbouring tests: 7 files, 81 passed.
- Line coverage of the new files, from the unit's own run: 95.45% in `src/main/intentArchive.js`, 100% in the other four.
- ESLint and Prettier clean on `src`, `tests/main`, `tests/renderer` and `vitest.config.mjs`.
- Some Step 4 tests were green from the start (unchanged cost, same file reads); they only pin behaviour.

## Repair after Build and Test (loop-back 1)

Done in the conversation, not by the developer agent: a few lines.

- **Step 19:** the head actions wrap, with Park and Resume as one piece (`theme.css`, `IntentDetail.jsx`). Red: `intentLayout.spec.js` AC1 and AC2 at 1280, 765 px in 718. Green: both pass.
- **Step 20 (asked for by the person):** the step row starts in line with the chips, clear of the frame's thin line. Red: the new built-app test at 1920. Green: 1280 and 1920.
- **Found in pictures of the built app:** "Nothing is deleted" in the dialog was right-aligned; the button's style no longer reaches into the dialog. No test: alignment only.
- **Result:** built app 18 passed; the full suite with coverage exit 0, 93.52% lines; ESLint and Prettier clean. Select mode and the dialog were looked at in the built app.

## Not run

- AI-DLC's real archive and unarchive (NFR3): its checks stop an agent, so the person runs it.

## Open

- The time an unfinished intent spends archived counts as active time in velocity once work goes on after unarchive. The requirements do not say.
- A timed-out archive that did change files gets no commit (AC5.1.6); the next archive then reports a dirty `intents.json`.
