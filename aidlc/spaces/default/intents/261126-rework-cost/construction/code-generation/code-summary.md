# Code Summary: US-1301 Rework cost

## Files

- New: `src/main/rework.js` (`stageAttempts`, `thrownAway`, `costOfWindow`, `reworkOf`, `loadRework`, `overviewRework`), `tests/main/rework.test.js`.
- Changed: `src/main/ipc.js` (`intent:rework`), `src/preload/index.js` (`getRework`), `src/main/projectService.js` (`addRework` in `loadCrossMachineCost`: `perIntent[dir].rework`, `project.rework`, `timeline[].reworkUsd`), `src/renderer/CostTab.jsx` (`ReworkSection`), `src/renderer/IntentDetail.jsx` (asks for the rework while the cost tab shows), `src/renderer/CostPanel.jsx` (share line, rework part of each bar), `src/renderer/theme.css`, `src/shared/locales/sv.json`, `src/shared/locales/en.json`, `tests/renderer/CostTab.test.jsx`, `tests/renderer/CostPanel.test.jsx`.
- Docs: `docs/features/epic-13-insights.md`, `docs/FEATURES.md`, `docs/releases/0.3.2.md`.

## Decisions

- `STAGE_REVISING` also opens an attempt. The real audit has no `STAGE_STARTED` after `GATE_REJECTED`, so without it the revision would have no window (FR2.1).
- A start closes only an open attempt of the same unit. Parallel units overlap, and their shared windows are split evenly and marked an estimate (`ponytail:`).
- A backward jump marks every attempt of the stages from Target to Source that closed before the jump and was not already thrown away. Stage order is the order stages first start in the audit.
- Readings rebuilt from transcripts have no usd. Their attempts are priced by their tokens' share of the ledger total, marked an estimate.
- `intent:rework` takes the intent's total from `loadCrossMachineCost`, so it matches the tab's own total. This reads the audit twice (`ponytail:`).
- In the overview, an intent with no stored readings uses the ledger fallback (`ponytail:`).

## Red runs (failing output before Green)

- Step 2: `npx vitest run tests/main/rework.test.js` gave `Error: Cannot find module '../../src/main/rework.js'`, Test Files 1 failed, no tests.
- Step 4: `Tests 9 failed | 8 passed (17)`, all failing on `costOfWindow`/`reworkOf` not being functions.
- Step 6: `Tests 5 failed | 17 passed (22)`: `TypeError: loadRework is not a function`, `TypeError: overviewRework is not a function`.
- Step 8: `Tests 6 failed | 14 passed (20)`: `Unable to find an element by: [data-testid="cost-rework-total"]` (also `-estimate`, `-none`, `-rows`, `-share`), and the chart part count was `expected +0 to be 1`.

## Tests

- The plan's command passes: `tests/main/rework.test.js` 22, `CostTab.test.jsx` 11 (4 new), `CostPanel.test.jsx` 9 (2 new), and `i18nKeys.test.js`.
- `ipc.test.js`, `projectService.test.js`, `crossMachineCost.test.js` and `IntentDetail.test.jsx` also pass with the changes: 233 tests in 8 files.
- `src/main/rework.js` has 100% line coverage (branches 82%). Build and Test checks the project's 80% floor on the full suite.
- The full suite and the Playwright end-to-end tests were not run in this stage, as the brief says. They run in Build and Test and in CI.

## Deviations

- The `intent:rework` test calls the handler's body, `loadRework` in `rework.js`, with an injected history loader. The handler in `ipc.js` is thin glue and gets no test of its own in `ipc.test.js`.
- The English reason for FR2.5 reads "Archived unfinished", as the acceptance criterion says. The Swedish one reads "Arkiverad innan den blev klar".
