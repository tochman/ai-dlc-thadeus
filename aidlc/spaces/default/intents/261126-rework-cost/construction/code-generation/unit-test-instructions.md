# Unit Test Instructions: US-1301 Rework cost

## Setup

Existing runners, no new configuration: vitest 5.1 (`vitest.config.mjs`, projects `main` and `renderer`).

## Run this work's tests

```bash
npx vitest run tests/main/rework.test.js tests/renderer/CostTab.test.jsx tests/renderer/CostPanel.test.jsx tests/main/i18nKeys.test.js
```

## Expected tests

- `tests/main/rework.test.js`: about 14 tests (attempts, the four reasons, archived, window pricing, estimates, the split, the cap, the IPC handler, the overview fallback).
- `tests/renderer/CostTab.test.jsx`: 4 new tests; `tests/renderer/CostPanel.test.jsx`: 2 new tests.

## Expected coverage

`src/main/rework.js` at or above 80% lines; the project floor of 80% stays.
