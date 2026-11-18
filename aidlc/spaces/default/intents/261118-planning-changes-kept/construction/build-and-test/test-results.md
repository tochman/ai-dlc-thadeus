# Test Results: US-0608

Run on 2026-11-18, macOS, branch `feat/US-0608`, working tree with this work uncommitted.

## Build

`npx electron-vite build`: exit 0, built in 3.54 s.

## Full suite with coverage

`npx vitest run tests/ --coverage`

- First run: exit 1, 150 files, 1955 tests, 2 failed:
  - `tests/main/appName.test.js` "keeps userData in aidlc-dash (FR4.1)": the source-text check still expected the old `app.setPath` line. Step 18 changed that line to `process.env.THADEUS_E2E_USER_DATA || join(...)`; the folder is unchanged.
  - `tests/main/planningSync.test.js` "FR4.1: after a discard, a stash, a restart and a branch switch...": timed out at the runner's 5 s default (9.3 s alone with a longer limit). The US-0606 story-branch test in the same file hit 5.8 s too. Each cycle runs real git several times; no requirement sets a cycle latency.
- In-stage fixes (attempt 1):
  - `appName.test.js` now expects the new line (FR4.1 still checked: the default folder stays `aidlc-dash`).
  - `planningSync.test.js` sets `vi.setConfig({ testTimeout: 20_000 })` for its real-git tests, with the reason in a comment. No assertion changed.
- Second run: **exit 0, 150 files, 1955 tests passed, 0 failed, 0 skipped.**

Coverage (all files): statements 90.27%, branches 83.25%, functions 87.42%, **lines 92.38%** (floor 80%, per-file floors also held; exit 0).

## Lint and format

- `npx eslint .`: exit 0, 0 errors, 29 warnings (dependency-array warnings).
- `npx prettier --check .`: exit 0, all files formatted.

## End-to-end (real Electron, Chromium renderer)

`npx playwright test` against the built `out/main/index.js`, exit 0, 2 passed (17.2 s):

- FR9.1 on `main`: create, assign, move, remove, waiting list, Push now, commit on `origin/main` (8.1 s).
- FR9.2 on a story branch: branch, index and tree unchanged (8.2 s).

## Not run here

- The CI jobs (`verify` on `ubuntu-latest` with `xvfb-run`, `build-mac` Playwright step): they run on the pull request.

## Loop-Back Log

None.
