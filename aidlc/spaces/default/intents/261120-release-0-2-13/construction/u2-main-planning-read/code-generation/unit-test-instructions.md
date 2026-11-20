# Unit Test Instructions: U2 u2-main-planning-read

## Setup
vitest 5.1.0, already set up (`main` project in node, `renderer` in jsdom with the Swedish locale). Nothing to install. The data-access tests need `git` on PATH, as `planningSync.test.js` already does.

## Run this Unit's tests
```
npx vitest run tests/main/planningSplit.test.js tests/main/features.test.js tests/main/planningSync.test.js tests/main/planningRecord.test.js tests/main/ipc.test.js tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js tests/main/featureDocsStatus.test.js
```
Runnable before the first Red step; it is green on the unchanged code.

## What is tested
- `planningSplit.test.js`: 4 cases for `overlayOwn` (AC2.1.1).
- `planningSync.test.js`: 7 cases for `planningSource`, the stale drop and `moved` (AC2.1.1–AC2.1.5).
- `features.test.js`: 3 cases for `loadPlanningFeatures` (AC2.1.1, AC2.1.3, AC2.1.5).
- `FeaturesView.test.jsx`: 2 cases for the source line (AC2.1.5).
- `ipc.test.js`, `planningRecord.test.js`, `i18nKeys.test.js`, `featureDocsStatus.test.js`: stay green (NFR1, NFR3).

## Mocking and test data
- Git: real temporary repositories with a bare `origin`, made and removed in each test, the way `planningSync.test.js` builds them. A story branch is a branch named `fix/US-9001`; another clone pushes to `origin/main` to stand for a release added elsewhere.
- `overlayOwn` is pure: inline epic texts.
- Renderer: `window.bridge.loadFeatures` is stubbed to return `source` with and without `remote`.

## Coverage
The project's 80% line-coverage floor (v8, `src/**`) is checked by Build and Test on the full suite (`npx vitest run tests/ --coverage`). This command is not run with `--coverage`.
