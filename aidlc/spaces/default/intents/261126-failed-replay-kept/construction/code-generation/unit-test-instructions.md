# Unit Test Instructions — US-0055 A failed replay is kept after a real planning commit

## Framework

vitest 5.1.0, existing `vitest.config.mjs` (`main` node, `renderer` jsdom with the Swedish locale). Nothing to install.

## Run this work's tests

```bash
npx vitest run tests/main/planningRecord.test.js tests/main/planningSync.test.js tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js
```

Runnable before the first Red step (the files exist).

## Expected coverage

- 5 new tests: 1 in `planningRecord.test.js`, 3 in `planningSync.test.js` (one per acceptance criterion), 1 in `FeaturesView.test.jsx`.
- The project floor is 80% line coverage (v8, `src/**`); Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not on this scoped run.

## Mocking

- Sync: a real temp git repo with a bare `origin`, as the US-0053 tests build it. A failing action: one `applyAction` cannot carry out (for example a release action whose plan file is missing); a clashing one: an action whose target moved on.
- View: stub `window.bridge.getPlanningStatus` with one entry carrying `reason`.

## Test data

Inline: two actions in one cycle (one that replays, one that fails or clashes); temp `userData` per test.
