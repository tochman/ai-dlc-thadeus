# Test Results: US-0033

Branch `fix/US-0033`, up to date with `origin/main` (0 commits behind), run 2026-11-19.

## Build

`npx electron-vite build`: exit 0, `✓ built in 2.71s`.

## Tests

- This work's tests (`npx vitest run tests/main/planningSplit.test.js tests/main/planningSync.test.js tests/main/features.test.js`): 3 files, 42 tests passed (run in Code Generation).
- Full suite with coverage (`npm run coverage`, i.e. `vitest run tests/ --coverage`): exit 0. 150 files passed; 1983 tests passed, 1 skipped, 0 failed.
- Where it ran: `tests/main` in Node. This work has no browser behaviour.

## Coverage

`@vitest/coverage-v8`, configured in `vitest.config.mjs` (lines threshold 80). All files: 92.42% lines, 90.31% statements, 83.28% branches, 87.48% functions. Threshold met; the run exits 0.

## Lint and format

- `npx eslint .`: exit 0, 0 errors, 29 warnings, none in the four files this work changed (`npx eslint` on them prints nothing).
- `npx prettier --check .`: exit 0, "All matched files use Prettier code style!"
