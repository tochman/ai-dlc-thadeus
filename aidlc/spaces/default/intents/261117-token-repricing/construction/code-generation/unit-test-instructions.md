# Unit Test Instructions: US-0211 Reprice recorded tokens

## Setup

The existing vitest 5.1.0 setup in `vitest.config.*` with its two projects: `main` (node) and `renderer` (jsdom, Swedish locale). Nothing new to install or configure.

## Run this work's tests

Runner check before the first Red step (must pass on the unchanged tree):

```bash
npx vitest run tests/main/ledger.test.js
```

This work's tests:

```bash
npx vitest run tests/main/modelRates.test.js tests/main/reprice.test.js tests/main/crossMachineCost.test.js tests/main/settings.test.js tests/main/ledger.test.js tests/main/auditCost.test.js tests/main/i18nKeys.test.js tests/renderer/format.test.jsx tests/renderer/CostTab.test.jsx tests/renderer/CostTabMachines.test.jsx tests/renderer/CostPanel.test.jsx tests/renderer/IntentDetail.test.jsx tests/renderer/IntentList.test.jsx tests/renderer/TokenDetail.test.jsx tests/renderer/ProjectSettingsView.test.jsx
```

## Tests (Standard: 5–8 per component)

- `modelRates.test.js` (new, ~8): order project → app → AI-DLC per model; settings.local before settings.json; project `ratesPath` wins; missing file and invalid JSON skipped with a note; app table values; `normalizeModel` forms; re-read only when an mtime changes.
- `reprice.test.js` (new, ~8): ledger node from five counts; audit row writes at 5m; no rate gives null with no borrowing; totals sum their models; missing models counted; agent rows have no current figure; $0.01 threshold input.
- Extended main files (~8): per-machine `currentUsd`, nothing written under `aidlc/` or `.claude/`, `ratesPath` setting, `project:cost` returns sources and notes.
- Extended renderer files (~16): pair inline in detail views, tooltip in list rows and chart points, source column, the three notes, rates path field, both locales.

## Coverage

The 80% line floor on new code (NFR3, team rule) is measured by Build and Test on the full suite; the unit-scoped run above does not judge it.

## Mocks and test data

- Rate files and `.claude/settings*.json` are written to a temp project folder per test (as `settings.test.js` does); no network.
- Ledger and audit data from `tests/fixtures/ledger/usage-ledger.json` and `tests/fixtures/cost/`.
- The NFR1 check snapshots the file list and mtimes under the fixture's `aidlc/` and `.claude/` before and after a cost load.
