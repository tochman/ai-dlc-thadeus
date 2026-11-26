# Integration Test Instructions — US-1305 Quality signals next to cost

## Boundaries covered

- `projectService.js` → `quality.js`: `loadCrossMachineCost` reads the audit, `test-results.md` and `reviews/review-*.md` from a temp project folder and adds `quality` to each `perIntent` row (`tests/main/crossMachineCost.test.js`, +4). A missing file gives `null` ("no record") and never breaks the row.
- Data → views: `CostTab`, `CostPanel` (scatter + table) and `FeaturesView` (`ReleaseQuality`, with `window.bridge.getVelocity` stubbed) render the `quality` shape (`tests/renderer/*.test.jsx`).

## Where it runs

Node (`main` project) and jsdom (`renderer` project, Swedish locale). This is integration evidence, not real-browser evidence; no target here needs native browser behaviour.

## Run

```bash
npx vitest run tests/main/crossMachineCost.test.js tests/main/projectService.test.js tests/renderer/CostTab.test.jsx tests/renderer/CostPanel.test.jsx tests/renderer/FeaturesView.test.jsx
```

## Coverage

Project floor 80% line coverage (v8, `src/**`), checked on the full suite: `npx vitest run tests/ --coverage`.

## Test data

Temp project folders built in the test, as the existing cross-machine cost tests do; inline fixtures as in `unit-test-instructions.md`.
