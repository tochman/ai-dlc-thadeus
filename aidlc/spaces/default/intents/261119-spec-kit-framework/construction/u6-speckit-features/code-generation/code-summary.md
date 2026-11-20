# Code Summary: U6 u6-speckit-features (US4.1 / US-1402)

Branch `feat/US-1402`, cut from `feat/US-1401`. All 18 plan steps done, test first. Nothing committed yet.

## Files

- **New:** `src/main/parsers/speckitTasks.js` (`parseTasks`), `src/main/speckitFeatures.js` (`loadSpeckitFeatures`), `src/renderer/SpeckitFeatures.jsx`, `src/renderer/SpeckitFeatureDetail.jsx`; tests `tests/main/speckitTasks.test.js`, `tests/main/speckitFeatures.test.js`, `tests/main/fsWriteSpy.js` (shared write spy), `tests/renderer/SpeckitFeatures.test.jsx`.
- **Changed:** `src/main/watcher.js` (`/**` targets, depth cap 3, changed paths passed to `onChange`), `src/main/fileWrite.js` (`readOnly: 'speckit'`, `errors.speckitReadOnly`; constitution stays editable), `src/main/ipc.js` (`speckit:features`, Spec Kit watcher pushing `speckit:changed`, framework passed to `file:read`/`file:write`), `src/preload/index.js`, `src/renderer/SpeckitShell.jsx`, `src/renderer/ArtifactReader.jsx` (`FileView` exported with `editable` and `html` props), `src/renderer/ProjectView.jsx` (passes `projectId`), `src/renderer/theme.css` (LCARS styles for the new views), the sv/en locales; tests `watcher`, `ipc`, `fileWrite`, `SpeckitShell`, `ProjectView`; feature docs (US-1402 ✅ Done, for v0.3.0).

## Key decisions

- The watched paths are fixed (`specs/**`, `.specify/feature.json`, `.specify/init-options.json`), so `speckitWatchPaths()` was left out and a new feature folder is seen without a resync.
- Each task also carries its `text` for the detail view (C5 lists only ID, `[P]`, story and tick).
- The view uses `FileView` directly so the file list is not shown twice; `html="text"` shows a `<script>` line as text.
- The `/speckit-specify` button writes to the agent tab through the terminal context, with a `ponytail:` comment until U5's `speckitCommand` lands.

## Tests

- `npx vitest run --project main` on the plan's files: 4 files, 125 tests passed.
- `npx vitest run --project scripts tests/main/watcher.test.js`: 17 passed (4 new).
- `npx vitest run --project renderer tests/renderer/SpeckitFeatures.test.jsx tests/renderer/SpeckitShell.test.jsx`: 2 files, 14 passed.
- Also green: `i18nKeys`, `preload`, `featureDocsStatus`, `ProjectView`. Prettier clean; ESLint 0 errors (6 old warnings in `ProjectView.jsx`).
- Every test written was run. The 80% coverage floor is checked by Build and Test on the full suite.

## Deviations from the plan

- `tests/main/watcher.test.js` belongs to the timed `scripts` vitest project, so the plan's `--project main` command skips it; it runs with `--project scripts` (the watcher half of the read-only guard is there too). Build and Test should use that command.
- The 500 ms read-budget test sits in the `main` project; by the US-0210 rule wall-clock tests belong in `scripts`. The budget is unchanged; moving it is open for Build and Test.
- Three files outside the plan's list changed: `ProjectView.jsx`, `theme.css`, `ProjectView.test.jsx`.
- All locale keys were added at Step 7 rather than spread over Steps 13 and 16.
