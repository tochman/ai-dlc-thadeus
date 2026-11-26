# Unit Test Instructions — US-1302 Savings hints

## Framework

vitest 5.1.0 as set up in `vitest.config.mjs`: the `main` project (node) for `tests/main/**`, the `renderer` project (jsdom, Swedish locale) for `tests/renderer/**`. No new configuration.

## Run this story's tests

```bash
npx vitest run tests/main/savings.test.js tests/renderer/CostPanel.test.jsx tests/renderer/CostTab.test.jsx tests/main/i18nKeys.test.js
```

Before Step 2 `tests/main/savings.test.js` does not exist; Step 1 runs the command without it.

## Expected coverage

- `src/main/savings.js`: every hint rule, threshold edge (at and just past), missing rate, archived intent and dismissal path is tested; aim for 90% or more of its lines.
- The project's 80% line floor is checked by Build and Test on the full suite (`npx vitest run tests/ --coverage`), not by this command. Never lower the threshold.

## Mocking and test data

- Module tests use plain fixtures: a small ledger summary (`perIntent` with `byStage[].byModel`), audit events with `timeMs`, a rate table with opus, sonnet and haiku rows, and transcript call lists with `at` times. No file system except the dismissal tests, which use a temporary project folder created and removed by the test.
- Handler tests stub `loadTokenHistory` and the rate loader the way the `intent:rework` tests do.
- Renderer tests stub `window.api.getSavings` and `window.api.dismissSaving` and pass `onView` and `onOpenProjectSettings` as spies.
