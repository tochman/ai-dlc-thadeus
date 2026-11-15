# Test Results — US-0603 (2026-11-15)

## Build

`npx electron-vite build`: success (`✓ built in 3.31s`).

## Tests

| Command | Result |
|---|---|
| Story tests (`unit-test-instructions.md`, 13 files) | 13 files, 156 tests passed, after the Prettier fix too |
| `npx vitest run tests/ --coverage` (CI's command) | 102 files, 1307 tests passed, exit 0 |
| `npx eslint .` | 0 errors, 23 `react-hooks/exhaustive-deps` warnings (warnings do not block) |
| `npx prettier --check .` | first run: 5 files of this story unformatted; after `npx prettier --write` on those 5: all formatted |

## Coverage (full suite, `vitest.config.mjs` floor)

All files: statements 87.36%, branches 80.44%, functions 82.57%, lines 89.62%. Floor is 80% lines: met.

## Flaky tests seen

Two earlier full runs (in Code Generation and at the start of this stage) each had one failure, in a different shell-timing test each time: `tests/main/dialogScript.test.js` "hands back 2.0 to 2.5 s after alive stops changing", and `tests/main/agentChannelScript.test.js` "closeSession makes a waiting hook exit at its next poll (RD5)". Both time real shell scripts under load, this story does not touch them, each passes alone, and the full run above passed. Their timing limits are unchanged.

## In-stage fix

1. Prettier: formatted `src/main/parsers/releases.js`, `src/renderer/FeaturesView.jsx`, `tests/main/featureDocsStatus.test.js`, `tests/main/releases.test.js`, `tests/renderer/FeaturesView.test.jsx`. Formatting only; story tests rerun green.
