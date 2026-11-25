# Code Summary: US-0047

## Files changed

- `src/main/planningRecord.js`: `JUNK` also matches `.<name>.<uuid>.tmp`, the name `writeAtomic` gives its temporary file. Any other `.tmp` file is still synced.
- `src/main/thadeusSync.js`: `copyIn` returns `{ gone: true }` for a file that is neither on disk nor at the target; `commitAndPush` leaves those out of `git add` and skips it when none are left.
- `tests/main/thadeusSync.test.js`: 4 new tests.
- `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`: US-0047 in progress, for v0.3.0.

## Key decisions

- The pattern sits in `JUNK`, so the watcher, `addThadeus` and `readRecord` all use it. An old temporary entry is dropped when the record is read, and leaves the record file at the next write.
- A cleared entry leaves through the cycle's own `removeActions`; a cycle with nothing to push still carries `left`.
- A harness file on neither side takes the same branch, and the AC2 test covers it.

## Results

Command: `npx vitest run tests/main/thadeusSync.test.js` (it runs in the `main` project).

- Before: 9 passed.
- Red: the 4 planned tests failed, the 9 existing passed. AC1: `expected true to be false`. AC2 and AC2 alone: `fatal: pathspec '.thadeus/gone.txt' did not match any files`. AC3: the record still held the temporary entry. A fifth, temporary test failed too (see Open finding).
- Green: 13 passed. ESLint and Prettier pass on the three changed source and test files.

Tests written but not executed: None. The full suite and coverage are left to Build and Test.

## Deviations

- The AC3 test also checks the record as read and the record file after the cycle; without that it would pass on the AC2 change alone.
- The traceability tool wrote no file, since there are no requirement IDs. `traceability.json` was written by hand with the story's four criteria, as in earlier quick-fix work.

## Open finding, not changed

A `.thadeus` file removed from disk but still at origin fails in the same way: `git rm` takes it out of the worktree, then `git add` finds no match (`fatal: pathspec '.thadeus/notes.txt' did not match any files`), and the whole cycle stops. It was shown by a temporary test and existed before this work.

Making `git add` skip it is one line, and was tried and taken back: the watcher also records a file that a branch checkout removes, so the sync would then delete a token log from `main` when a branch without it is checked out. What a removal should mean needs the person's decision.
