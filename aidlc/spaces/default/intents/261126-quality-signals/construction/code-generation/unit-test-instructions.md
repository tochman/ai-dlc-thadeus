# Unit Test Instructions — US-1305 Quality signals next to cost

## Framework

vitest 5.1.0, existing `vitest.config.mjs` (projects `main`, node, and `renderer`, jsdom with the Swedish locale). Nothing new to install or configure.

## Run this work's tests

```bash
npx vitest run tests/main/quality.test.js tests/main/crossMachineCost.test.js tests/main/projectService.test.js tests/renderer/CostTab.test.jsx tests/renderer/CostPanel.test.jsx tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js
```

The first test-first cycle (Step 2) runs `npx vitest run tests/main/quality.test.js`; it fails until `src/main/parsers/quality.js` exists.

## Expected coverage

- About 24 new tests: 12 in `quality.test.js`, 4 in `crossMachineCost.test.js` (or `projectService.test.js`, whichever covers `loadCrossMachineCost`), 8 across the three renderer files.
- The project floor is 80% line coverage (v8, `src/**`). Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not on this scoped run.

## Mocking

- `quality.js` is pure: pass audit events (`{event, fields: {Stage}}`), `test-results.md` text and review file texts as plain strings.
- Project service: a temp project folder as the existing cross-machine cost tests build it, with the files written into one intent.
- Views: pass `cost` / `intentCost` fixtures with `quality`; stub `window.bridge.getVelocity` for the Releases view.

## Test data

Inline fixtures: two `GATE_REJECTED` in one stage and one in another, a `test-results.md` with two `### Loop-back` entries, a final matrix with one `Unverified` row and an "Efter merge med main" heading, one `SENSOR_FAILED` event, and a review file with three findings (one `Fixed`, one `resolved`, one `New`).
