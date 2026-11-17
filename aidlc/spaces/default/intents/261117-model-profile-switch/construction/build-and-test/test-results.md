# Test Results: US-0210 model profile switch

Run 2026-11-17 on macOS (Node 22.14). The installed THADEUS app used about 2.5 cores throughout; load average 4–42.

## Build

`npx electron-vite build`: success, built in 4.7 s.

## This work's tests

The scoped command from `unit-test-instructions.md`: 7 files, 133 tests passed, and they passed again in every full run below. Renderer tests run in jsdom, not in the built app.

## Full suite, first runs (failed)

| Run | Command | Result |
|---|---|---|
| 1 | `npm run coverage` | exit 1, 1601 passed, 16 failed (renderer waits) |
| 2 | `npx vitest run tests/` | exit 1, 4 files failed (`dialogScript`, ConfigView, SettingsView, TokenDetail) |
| 3 | `… --coverage --maxWorkers=4` | exit 1, 23 failed (`agentHooksGuard` "within 100 ms") |
| 4 | `… --coverage --coverage.reportOnFailure --maxWorkers=2` | exit 1, 8 failed; lines 91.46% |
| 5 | `npx vitest run tests/ --maxWorkers=2` | exit 1, 2 failed (`dialogScript`) |

The failing set changed every run, and every failure was a wall-clock limit or a wait that landed just over the line. No failure was in this work's files. CI was green on the last 8 runs.

## Fixes (the person chose to fix them in this story)

1. **`.thadeus/hooks/dialog.sh`**: one real overshoot. Run alone, "hands back 2.0 to 2.5 s after the last update" under macOS `sh` took 2557–2620 ms every time. Each of the 20 liveness polls forked both `date` and `sleep`, and on a loaded bash 3.2 that added about 20–25 ms per poll. Now `date` runs every 10th poll only. The deadline is whole seconds, so it gives up just as precisely. Limits are unchanged.
2. **`src/main/agentHooks.js`**: the v0.2.8 script digest is added to `RELEASES` (D2), so installed hooks show as out of date and get updated.
3. **`vitest.config.mjs`**: the timed group now holds every main test with a wall-clock limit, or that waits on real shells, git or file watching (11 files, up from 3), and runs them one file at a time after the parallel projects. Limits and retries are unchanged.
4. ESLint: `_drop` unused in `ModelProfilesSection.jsx` fixed. Prettier: 6 of this work's files plus `agentHooks.js` formatted.

## Full suite after the fixes

| Run | Command | Exit | Tests | Lines |
|---|---|---|---|---|
| 6 | `npm run coverage` | 0 | 1626/1626 passed, 137 files | 92.06% |
| 7 | `npm run coverage` | 0 | 1626/1626 passed, 137 files | 92.05% |

Hook script and installer tests run alone after the fix: 6 files, 196/196 passed. `agentHooks` + installer after formatting: 111/111.

## Lint and format

ESLint: 0 errors (29 older warnings). Prettier: all files clean.

## Manual

NFR3 (question within 2 s): not checked; to be checked by hand in `npm run dev`.
