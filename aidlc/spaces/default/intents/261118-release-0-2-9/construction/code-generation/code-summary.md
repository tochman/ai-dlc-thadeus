# Code Summary: v0.2.9 release

## Files

- `package.json` and `package-lock.json`: the version goes from 0.2.8 to 0.2.9, set with `npm version 0.2.9 --no-git-tag-version` (FR1).
- `docs/releases/0.2.9.md`: new section `## For users on v0.2.8 or earlier`, placed before the slice table. It explains the rename to `tochman/ai-dlc-thadeus` (US-0027) and that those copies download v0.2.9 by hand once (FR5).
- `tests/main/releaseVersion.test.js` (new): 5 tests (FR1, FR5, FR6).
  - The release plan for the `package.json` version exists, and its title matches.
  - Every row in its slice table is ✅. A small `sliceStatuses()` helper reads that table and finds the Status column by its header.
  - For 0.2.9 only (`it.runIf`), the rename note is present.
  - The lock file's version matches `package.json`.

## Tests

- **Red:** on 0.2.8, no test failed, because v0.2.8's plan was already finished and test 4 only runs on 0.2.9. After the bump, test 4 failed because the note was missing.
- **Green:** after the note was added, 19 tests pass across `releaseVersion`, `featureDocsStatus` and `releasesPlan`. ESLint is clean, and Prettier is clean on the changed files.
- **Not run in this stage:** the full suite with coverage, and CI on the release pull request. Build and Test runs those.

## Deviations

- The Red run on 0.2.8 did not fail as the plan expected. The real Red was test 4 after the bump.
- The test does not reuse `src/main/parsers/releases.js`, whose cell helper is private and lowercases the cells. It has its own 10-line helper instead.
