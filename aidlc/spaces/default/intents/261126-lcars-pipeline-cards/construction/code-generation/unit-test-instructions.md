# Unit Test Instructions — US-0412 LCARS pipeline cards

## Framework

vitest 5.1.0, already set up in `vitest.config.mjs`: the `renderer` project (jsdom, Swedish locale, `tests/renderer/**`) and the `main` project (node, `tests/main/**`). No new setup or dependency.

## Run this work's tests

```bash
npx vitest run tests/renderer/Pipeline.test.jsx tests/renderer/IntentDetail.test.jsx tests/main/theme.test.js
```

Run it on the unchanged tree before the first Red step (it must be green), after each Red step (it must fail on the new tests), and after each Green and Refactor step (it must be green).

## Expected coverage

The project floor is 80% line coverage over `src/**`, checked by Build and Test on the full suite (`npx vitest run tests/ --coverage`), not by this scoped command. The new `stageChanges` function and the effect code in `Pipeline.jsx` are covered by the tests above.

## Mocking and test data

- Pipelines are built with the existing `stageOf()` helper in `Pipeline.test.jsx`; a change is a `rerender` with a new pipeline object.
- The 900 ms clear uses `vi.useFakeTimers()` where a test checks that the effect class goes away.
- CSS tests read `src/renderer/theme.css` as text, as the existing `theme.test.js` blocks do; no browser is needed.
- jsdom runs no CSS animation, so the tests check classes, markup and stylesheet rules, not motion on screen. The look at 1280 px is checked by eye.
