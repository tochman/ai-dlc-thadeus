# Test Results

Branch `feat/US-0606-US-0607`, 0 commits behind `origin/main` (fetched 2026-11-17).

## Build

`npx electron-vite build`: succeeded (main, preload and renderer bundles).

## First run (failed)

`npm run coverage`: 1 failed and 1664 passed out of 1665 (exit 1).

- `tests/main/fileWrite.test.js` › "is imported only by … (SD36)". The guard on which modules may use `writeAtomic` found the new `src/main/planningRecord.js`.
- **Fix (in-stage, attempt 1):** added `planningRecord.js` to the allowed list, with its reason: one file per project in the app's own userData folder, named by a hash of the root, the same kind of target as `credentials.js`.

`npm run format:check`: 10 files were not formatted with Prettier.

- **Fix (attempt 1):** `npx prettier --write` on those files.

## Final run

| Command | Result |
|---------|--------|
| `npm run coverage` | exit 0: 140 files, **1665 passed**, 0 failed |
| Line coverage (full suite) | **92.24%** (statements 90.16%, branches 82.86%) |
| `planningRecord.js` / `planningSync.js` lines | 100% / 92.38% |
| `npm run lint` | exit 0: 0 errors, 29 `react-hooks/exhaustive-deps` warnings (same rule as before this work) |
| `npm run format:check` | exit 0: all files formatted |

Renderer tests ran in jsdom, not in the built app or a real browser.
