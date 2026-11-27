# Code Summary — US-0056 The planning sync never commits a file in the middle of a merge

## Change

- `src/main/planningSync.js`: new `inMerge(cwd, ctx)` asks `git rev-parse --git-path` for `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `rebase-merge` and `rebase-apply`, and checks whether any of them exists. `recordStep` and `replayStep` return `{error: {kind: 'merge'}}` at once while one does. New `hasMarkers(text)` finds a line that starts with `<<<<<<<` or `>>>>>>>`, or that is exactly `=======` (a `ponytail:` comment notes the setext case). `recordStep` skips such a file and names it (`{kind: 'markers', files}`). `commitIn` commits nothing when one of its files has markers. `runCycle` passes on the replay's error, or else the record step's, and skips the push.
- `src/renderer/FeaturesView.jsx`: `planningErrorText` knows `merge` and `markers`.
- `src/shared/locales/sv.json`, `en.json`: `features.planning.error.merge` and `.markers`.

## Tests (test first)

| Test | Red |
|---|---|
| `planningSync.test.js` US-0056 AC1 merge, cherry-pick | `{reapplied: 0, pushed: true, …}`, expected `{error: {kind: 'merge'}}` (the conflicted file was pushed) |
| `planningSync.test.js` US-0056 AC1 rebase | `{reapplied: 0, pending: 0, …}` without an error |
| `planningSync.test.js` US-0056 AC2 markers on `main` | `{pushed: true, …}`, expected `{error: {kind: 'markers', files}}` |
| `planningSync.test.js` US-0056 AC2 replayed editor save | `{reapplied: 1, pushed: true, …}`, expected the markers error |
| `planningSync.test.js` US-0056 AC3 after the merge | passed in Red as well; it guards the cycle after a finished merge |
| `FeaturesView.test.jsx` US-0056 AC1, AC2 | `'Planeringssynken misslyckades: '`, expected the merge sentence |

## Result

The scoped run (3 files) passed 102 of 102 (95 before). ESLint and Prettier are clean on the changed files.
