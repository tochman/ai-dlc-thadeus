# Test results: archive and unarchive a Spec Kit feature (US-1411)

## Run 1 (2026-11-25, branch `feat/US-1411`; `main` has only `.thadeus` syncs ahead of it)

| Check | Result |
|---|---|
| `npx electron-vite build` | success |
| `npx eslint . --max-warnings 0` | exit 0 |
| `npx prettier --check .` | exit 0 |
| `npx vitest run tests/ --coverage` | **failed**: 191 files, 190 passed, 1 failed; 2731 tests, 2729 passed, 1 failed, 1 skipped |
| `npx playwright test` (built app, Electron's Chromium) | 19 passed, one of them new for US-1411 |

Both unit commands are part of the suite run, and every file they name passed. The suite ran twice (the second time with `--coverage.reportOnFailure`) with the same single failure.

### Failure

`tests/main/fileWrite.test.js` > writeAtomic (US-0506 u4 RD33) > "is imported only by fileWrite.js, … and speckitTokens.js (SD36)", `fileWrite.test.js:228`: `expect(users).toEqual([...])` got `main/speckitArchive.js` as well.

Cause: `speckitArchive.js` writes its marks with `writeAtomic`, as the approved plan says, but is not on SD36's list of the modules that may. The unit's own command does not run `fileWrite.test.js`. The same happened with US-0609 in v0.2.13.

### Coverage

Lines 93.56%, from the second run. The floor is 80%. The run itself failed on the test above, so the number is confirmed only by a green run.

### Failure handling

Autonomy is not set, so the person decides. Candidate fix: add `main/speckitArchive.js` to SD36's list in `fileWrite.test.js` with its reason line, and `fileWrite.test.js` to the unit's test command. About 10 minutes, no cost, low risk. Loop-backs used: 0/3.

## Run 2 (2026-11-25, after loop-back 1)

| Check | Result |
|---|---|
| `npx vitest run tests/ --coverage` | exit 0: 191 files passed; 2731 tests, 2730 passed, 0 failed, 1 skipped |
| Coverage (v8) | lines 93.56%, statements 91.53%, branches 85.26%, functions 89.05%; every floor holds. `speckitArchive.js` 97.22%, `SpeckitArchive.jsx` 100%, `speckitFeatures.js` 94.23%, `ipc.js` 89.55% (per file from run 1, no source change since) |
| `npx eslint . --max-warnings 0`, `npx prettier --check .` | exit 0, clean |
| `npx electron-vite build` | success |
| `npx playwright test` (built app, Electron's Chromium) | last run exit 0, 19 passed; see below |

### Built-app tests that failed under load

Four full runs, the same source under `src/` in all of them:

| Run | Load at the end | Result |
|---|---|---|
| 1 (before the loop-back) | not read | 19 passed, 1.9 min |
| 2 | 20 | 17 passed; L2 (the app closed during a click) and L5 (the choice was not shown within 5 s) failed; 12.4 min |
| 3 | 11 | 18 passed; "US-0513 at 1280" in `intentLayout.spec.js` failed |
| 4 | 6 | 19 passed, 1.8 min |

L2, L5 and US-1411 then passed 5 of 5 each, and "US-0513 at 1280" 5 of 5. Spotlight's indexing (`mds_stores`) used about four cores after run 2. None of the three tests touches the archive code, so load is the likely cause, but it is not proven. The app that closed in L2 was not explained.

## Loop-Back Log

### Loop-back 1 — 2026-11-25T12:37:45Z

- Diagnosis: `fileWrite.test.js` SD36 fails; `src/main/speckitArchive.js` uses `writeAtomic` and is not on the list.
- Root-cause stage: code-generation (zero-Unit work).
- Planned fix: add `main/speckitArchive.js` to SD36's expected list and test name in `tests/main/fileWrite.test.js`, with a `// US-1411 …` reason line like the others; add `fileWrite.test.js` to the unit's test command.
- Estimated impact: effort about 10 minutes plus the suite run; financial cost none; risk low. Chosen by the person ("Retry with fix").
