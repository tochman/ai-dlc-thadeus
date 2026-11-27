# Unit Test Instructions — US-0056 The planning sync never commits a file in the middle of a merge

## Framework

vitest 5.1.0, existing `vitest.config.mjs` (`main` node, `renderer` jsdom with the Swedish locale). Nothing to install.

## Run this work's tests

```bash
npx vitest run tests/main/planningSync.test.js tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js
```

Runnable before the first Red step (the files exist).

## Expected coverage

- 6 new tests: 5 in `planningSync.test.js` (merge, rebase, cherry-pick; markers on `main`; a replayed save with markers; the cycle after the merge), 1 in `FeaturesView.test.jsx`.
- The project floor is 80% line coverage (v8, `src/**`); Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not on this scoped run.

## Mocking

- Sync: a real temp git repo with a bare `origin`, as the US-0053 tests build it. The conflict: origin's main and a story branch change the same line of `docs/FEATURES.md`; `git merge`, `git rebase` or `git cherry-pick` then stops on it.
- View: stub `window.bridge.getPlanningStatus` with a status carrying `error`.

## Test data

Inline: the overview with one line changed two ways; temp `userData` per test.
