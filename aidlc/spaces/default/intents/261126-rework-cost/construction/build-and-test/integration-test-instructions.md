# Integration Test Instructions: US-1301

The IPC boundary is tested through `loadRework` in `tests/main/rework.test.js` (the readings come from `loadTokenHistory`), and the overview's rework per intent is tested with the ledger fallback in the same file. Run `npx vitest run tests/main/rework.test.js`. The built-app tests (`tests/e2e`) run in CI on the pull request.
