# Code Summary: US-0211 Reprice recorded tokens

## What was built

- `src/main/data/model-rates.json`: the app's rate table (FR1.3, FR1.4).
- `src/main/modelRates.js`: `loadRates`, order project override → app → AI-DLC, notes for a skipped override, cached by mtime (FR1.1–FR1.6, NFR2).
- `src/main/reprice.js`: `normalizeModel`, `priceTokens`, `isValidRatesPath`; no Node imports, so the renderer can use it (FR2.1–FR2.3).
- `ledger.js`, `auditCost.js`, `projectService.js`: `currentUsd` / `currentMissing` on every cost row, per machine, `auditFiveMinute` (FR2).
- `settings.js` `ratesPath`; `ipc.js` `project:cost` loads the rates once per call and returns `rates.sources` / `rates.notes`.
- `format.js` `formatCostPair`, `currentTip`; the pair in CostTab, CostPanel, IntentDetail, TokenDetail; tooltip in IntentList rows and chart points; source column and `CostNotes` in the cost tab and panel; rates path field in ProjectSettingsView; keys `cost.reprice.*` and `settings.project.ratesPath*` in `sv.json` and `en.json` (FR3).

## Red runs

The failing output of the Red steps (3, 6, 9, 12) was not saved before the build was interrupted. It cannot be produced again without undoing the Green code, so it is not shown here. When the build resumed at Step 13, the Step 12 tests already passed (9 files, 63 tests): the view code from Step 13 had been written before the interruption.

## Green runs (2026-11-17)

- Unit-scoped command (`unit-test-instructions.md`): 15 files, 135 tests passed.
- Full suite `npx vitest run tests/`: 142 files, 1705 tests passed.

## Deviations

- `IntentDetail.test.jsx` and `CostTabMachines.test.jsx` were not extended. The intent detail pair is tested in `TokenDetail.test.jsx` ("intent detail shows the pair in its cost readout"), and the per-machine pair in `CostTab.test.jsx`.
- Refactor (Step 14): only a duplicate import in `CostTab.test.jsx` was merged.
