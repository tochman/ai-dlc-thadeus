# Code Summary: archive and unarchive a Spec Kit feature (US-1411)

All 12 steps are built, test first, by the developer agent. Nothing is committed yet; the work is on `feat/US-1411`.

## Files

- **New source:** `src/main/speckitArchive.js` (the marks), `src/renderer/SpeckitArchive.jsx` (Archive, Unarchive and the confirmation)
- **Changed, main:** `speckitFeatures.js`, `frameworkSwitch.js`, `ipc.js`, `src/preload/index.js`
- **Changed, renderer:** `SpeckitFeatures.jsx`, `SpeckitFeatureDetail.jsx`, `theme.css`; both locale files
- **Tests:** two new files (`speckitArchive`, `SpeckitArchive`), five changed ones

## Decisions made while building

- A mark's file name is in NFC; the folders are made one at a time, so nothing is made behind a linked `.thadeus`.
- Archive, Unarchive, Archived and "Archived (N)" use the existing `intents.archive.*` texts; refused links and failed writes the existing `projectFile.*` ones.
- The "Archived" mark has US-0510's outlined look, not the steel of the active tag.
- The dialog closes after the features are read again, so focus goes to the list. After Unarchive, focus goes there only when the person has not moved it.
- A dialog closed while the call is on its way shows a refusal beside the pill.

## Repair after Build and Test (loop-back 1)

- Step 13: `main/speckitArchive.js` is in SD36's list in `tests/main/fileWrite.test.js`, with its reason line. Red was Build and Test's first run; now green. No source change. Made in the session, not by the developer agent.
- Build and Test also added the built-app test `US-1411` in `tests/e2e/speckitLayout.spec.js`, green from the start: it checks what was already built.
- The story's second test command: 3 files, 42 passed. ESLint and Prettier clean on the changed file.

## Deviations from the plan

None in what is built. 48 new tests instead of about 40. The plan's boxes were ticked together at the end.

## Test results

- The unit's run: 9 files, 232 passed (184 before the build). Run again for this summary: the two new files, 25 passed; neighbouring tests (`agentProgressSpeckit`, `speckitTokens`, `watcher`, `ProjectView`, `SpeckitShell`), 75 passed.
- Line coverage of the new files, from their own run: 97.22% in `speckitArchive.js`, 100% in `SpeckitArchive.jsx`.
- ESLint and Prettier clean on the changed files.
- Red was seen for each step. One test was green from the start (no mark is removed in a project without Spec Kit); it only pins behaviour. In Steps 2 and 9 the whole file failed on the missing module, and in Step 10 all seven failed on the missing list before their own assertions.

## Not run here

- The full suite with coverage and the Playwright specs: Build and Test. Layout and contrast were not looked at in the built app.

## Known limits

- When a change from elsewhere removes a pill that has focus, focus goes to the page. Only the person's own action is handled.
- `addMark` checks for links up to the rename, not inside it (`ponytail:` comment, as `projectFile.js`).
