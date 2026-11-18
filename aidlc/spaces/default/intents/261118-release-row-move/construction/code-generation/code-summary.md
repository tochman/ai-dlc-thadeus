# Code Summary: US-0029 release row move

Story US-0029 (EPIC-00, for v0.2.10), branch `fix/US-0029`. Method: TDD. All 7 plan steps are done.

## Files changed

- `src/main/parsers/releases.js`: new pure `removePlanRows(planText, ids)`, placed after `addPlanRows`. It drops the slice-table rows whose first cell is one of `ids`. When no rows are left, it also drops the header, the separator and the blank line before the table, so a file with a heading and a table comes back as `planHeading(version)`. Text without a matching row comes back unchanged.
- `src/main/releases.js`: `setStoryRelease` reads `planned` (the old version) from `releaseOf` before the marker write. After `writePlanRow`, when `planned` is set and differs from the new version, it calls the new `dropPlanRow`. `dropPlanRow` reads the old plan file, does nothing when the file is missing, and writes through `writeFileSafe` with the hash of the text it read. The module header and the comment above the plan write now name US-0029.
- `tests/main/releasesPlan.test.js`: 4 new tests: 2 in `describe('removePlanRows (US-0029)')` and 2 in the `setStoryRelease and the plan file` describe.
- Docs (Step 1): US-0029 is set to 🚧 In progress, for v0.2.10 in `docs/features/epic-00-fixes.md` (the story marker and the `**Status (2026-11-18):**` line), in `docs/FEATURES.md` (the EPIC-00 row, where US-0028 stays 📋) and in `docs/releases/0.2.10.md` (its slice row). `npx vitest run tests/main/featureDocsStatus.test.js` passes.

## Red / Green

Command: `npx vitest run tests/main/releasesPlan.test.js tests/main/releases.test.js`

| Step | Result |
|------|--------|
| 2 Baseline | 2 files, 30 tests passed (with featureDocsStatus: 3 files, 36 tests) |
| 3 Business logic, Red | 2 failed: `TypeError: removePlanRows is not a function` |
| 4 Business logic, Green | 30 passed |
| 5 Repository, Red | 2 failed: `1.0.0.md` still held the US-0101 row (expected `'# Release plan v1.0.0\n'`; in the second test, the US-0101 row was still there next to US-0607) |
| 6 Repository, Green | 32 passed |
| 7 Refactor | No change needed. `eslint` is clean and `prettier --check` passes on the 3 changed source and test files |

## FR3 note

FR3 has no new test. `dropPlanRow` writes with `writeFileSafe(root, rel, next, { expectHash: sha256(text) })` at `src/main/releases.js:109`. This is the same call as `writePlanRow` at line 92, and `tests/main/fileWrite.test.js` already tests that it refuses a changed file. As in `writePlanRow`, a refusal there is not passed back to `setStoryRelease`'s caller. This behaviour already existed and is not changed.

## Left out

- The full suite. Build and Test runs it.
- Setting US-0029 to ✅ and ticking its acceptance criteria. That happens after Build and Test is approved.
- Removing a story from its release (`version` null) still leaves the plan file alone, as the plan says. The build-order table (`| # | Story | Why |`) is not touched.
