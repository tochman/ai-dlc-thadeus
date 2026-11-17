# Integration Test Instructions: US-0211

## Setup

The existing vitest 5.1.0 setup (`vitest.config.mjs`): project `main` (node) and `renderer` (jsdom, Swedish locale). No extra services.

## Key boundaries and their tests

| Boundary | Test |
|---|---|
| Rate files on disk → `loadRates` (override, app table, AI-DLC table, mtime cache) | `tests/main/modelRates.test.js` (temp project folders) |
| Ledger and audit records → `summarizeLedger` / `mergeIntentCosts` with `currentUsd` | `tests/main/reprice.test.js`, `tests/main/crossMachineCost.test.js` |
| `project:cost` IPC call → `rates.sources` / `rates.notes` | `tests/main/crossMachineCost.test.js`, `tests/main/ipc.test.js` |
| Project settings `ratesPath` validation | `tests/main/settings.test.js` |
| Cost data → views (pair, tooltip, source column, notes) | `tests/renderer/CostTab.test.jsx`, `CostPanel.test.jsx`, `IntentList.test.jsx`, `TokenDetail.test.jsx`, `ProjectSettingsView.test.jsx`, `format.test.jsx` |
| Read only: nothing written under `aidlc/` or `.claude/` | `tests/main/crossMachineCost.test.js` (file list and mtimes before and after) |

## Run

```bash
npx vitest run tests/ --coverage
```

## Coverage target

80% line coverage (team rule, NFR3), enforced by the threshold in `vitest.config.mjs` and in CI (`.github/workflows/release.yml`, `verify` job).

## Test data

Rate files and `.claude/settings*.json` are written to a temp folder per test; ledger and audit fixtures come from `tests/fixtures/ledger/` and `tests/fixtures/cost/`. No network.
