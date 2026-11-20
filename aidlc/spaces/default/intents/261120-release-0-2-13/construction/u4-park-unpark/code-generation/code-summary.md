# Code Summary: U4 u4-park-unpark (US-0510)

Branch `feat/US-0510` from `main`, nothing committed. All 12 plan steps done, test first. No AI-DLC command was run against the project; every test uses an injected `exec`.

## Files
- New `src/main/intentPark.js`: `parkedFromAudit`, `parkedFromStatus`, `readParkStatus`, `withParkStatus`, `park`, `unpark` (fixed arguments through `runFixed`; names checked against the list, `assertName`, and no leading `-`).
- `src/main/projectService.js`: `summarizeIntent` adds `parked`, `parkedStage`, `parkedAt` from the audit.
- `src/main/ipc.js`, `src/preload/index.js`: `intents:park`, `intents:unpark` (`parkIntent`, `unparkIntent`); status read on open and after Park/Unpark.
- `src/renderer/IntentList.jsx` (`ParkedMark`), `IntentDetail.jsx` (`ParkControls`), `ResumeButton.jsx`, `theme.css`; locales `intents.parked|park|unpark|nowActive`.
- Tests: new `intentPark.test.js` (11), `projectService` +2, `IntentList`, `IntentDetail`, `ResumeButton` (6 in all).
- Docs: US-0510 set to 🚧 in `epic-05-workflow-control.md` and `FEATURES.md`.

## Results
- Red runs failed as planned. Final: 9 files, 137 tests pass; ESLint and Prettier clean.
- Not run here: the full suite with coverage (Build and Test).

## Deviations
1. 19 new tests, not 17: two cover `readParkStatus` and `withParkStatus`.
2. The status read can only add the parked mark, never clear it: a parked intent's state shows `Status: Running`, so "not parked" from the status proves nothing (`ponytail:` in `withParkStatus`). The audit decides both ways.
3. Resume types `/aidlc` without Enter after a successful unpark, as Resume already does; the unpark has made the intent active, so no `intent` switch is typed.
4. The intents list's Resume first could not unpark (no `projectId` from `ProjectView.jsx`). Fixed in Step 13, added at the person's request: `projectId={projectId}` on `<IntentList …>` in `src/renderer/ProjectView.jsx` (its only change; the file is also the Spec Kit work's), the waiting `ponytail:` note removed from `ResumeButton.jsx`, and a new `ProjectView.test.jsx` case (Red: Resume stayed `aria-disabled`). 3 files, 36 tests pass; Prettier clean; ESLint 0 errors (6 older warnings in `ProjectView.jsx`, none on the changed line).
5. Resume no longer waits "running elsewhere" while the active intent is parked.

## Notes
- `ipc.test.js`'s `tools.js` mock has no `toolPath`; the status read there fails inside its try/catch and gives null.
- `intentPark.js` and `projectService.js` import each other (hoisted functions only).
