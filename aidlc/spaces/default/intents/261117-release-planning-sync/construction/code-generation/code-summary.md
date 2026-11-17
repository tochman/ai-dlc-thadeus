# Code Summary: release planning sync (US-0606 + US-0607)

Branch `feat/US-0606-US-0607` (from `main`), nothing committed yet.

## Files

- **New:** `src/main/planningRecord.js`, `src/main/planningSync.js`, `tests/main/planningRecord.test.js`, `tests/main/planningSync.test.js`, `tests/main/releasesPlan.test.js`
- **Changed:** `src/main/git.js` (`currentBranch`, `worktreeAdd --no-track`, `worktreeRemove`, `pushRef`), `src/main/releases.js`, `src/main/parsers/releases.js` (`addPlanRows`, `isValidBranchName`, `PLANNING_BRANCH_DEFAULT`), `src/main/settings.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/FeaturesView.jsx`, `src/renderer/SettingsView.jsx`, `src/renderer/ProjectSettingsView.jsx`, `sv.json`/`en.json`, `vitest.config.mjs`, tests for ipc, settings and three renderer views, `docs/FEATURES.md`, `docs/features/epic-06-feature-docs.md`, `docs/releases/0.2.9.md`

## Key decisions

- The release handlers go through `planAction`, which writes the record first, edits the files in place only when the checkout is on the target, and then starts a cycle.
- The bridge calls are `window.bridge.getPlanningStatus(projectId, opened)` and `window.bridge.pushPlanning(projectId)`, named like the bridge's existing calls.
- The docs branch field is in the project's feature-docs settings and shows only when delivery is set to releases. The interval field is in the app settings.
- `gh pr merge --squash` runs without `--delete-branch`, because that flag can switch the person's own checkout. The docs branch stays on origin.
- The scheduler skips projects whose feature docs are hidden or whose delivery is continuous.

## Shortcuts (`ponytail:` in the code)

- "Agent running" means an AI-DLC file changed in the last 5 minutes, or a question is waiting. The terminal's busy state lives only in the renderer.
- One planning operation runs at a time per project. The branch name `dash/planning` and the trunk `main` are fixed. One record write queue is shared by all projects.
- A checked-out `main` is fast-forwarded only after a push that needed a rebase. Otherwise it keeps its own commit until the person pulls with `--rebase`.
- A commit refused by a hook unstages its files again, so the person's index is as it was.

## Tests

- TDD: each layer's Red run failed before its code (missing module, missing export, `undefined` values, absent test ids).
- Main: 10 files, 184 tests pass. Renderer: 3 files, 53 tests pass. `featureDocsStatus.test.js` passes.
- Line coverage: `planningRecord.js` 100%, `planningSync.js` 92.3%.
- `planningSync.test.js` runs serially (added to `TIMED` in `vitest.config.mjs`) because it uses real git. This is a deviation from Step 14.

## Not run or not checked here

- The full suite, ESLint and Prettier: Build and Test runs them.
- The LCARS look of the new block and fields, not checked by eye. The "`t()` and LCARS" criterion stays unticked in both stories until it is.
