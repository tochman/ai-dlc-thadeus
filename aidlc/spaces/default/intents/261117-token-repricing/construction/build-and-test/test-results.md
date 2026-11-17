# Test Results: US-0211 Reprice recorded tokens

Run on 2026-11-17 on `main` after the squash-merge of PR #68 (`bf73f63`), in the working tree of `feat/US-0213` (main plus feature-doc edits only).

## Build

- `npx electron-vite build`: exit 0, `out/` written (built in 3.86s).

## Tests

- This work's tests (`unit-test-instructions.md`): 15 files, 135 tests passed, 0 failed (Code Generation, same day).
- Full suite with coverage, `npx vitest run tests/ --coverage`: exit 0. 142 files, 1705 tests passed, 0 failed, 0 skipped.

## Coverage (v8, whole project)

| | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| All files | 90.32% | 83.13% | 87.55% | 92.35% |

New and changed files, lines: `modelRates.js` 100%, `reprice.js` 100%, `auditCost.js` 100%, `ledger.js` 95.95%, `format.js` 97.56%, `CostPanel.jsx` 100%, `CostTab.jsx` 97.72%.

## Lint and format

- `npx eslint .`: 0 errors (29 warnings, none new to this story's checks failing).
- `npx prettier --check .`: all files formatted.

## CI

- PR #68, first run: `verify` failed on Prettier (5 files: `src/main/reprice.js`, `tests/main/reprice.test.js`, `tests/renderer/CostTab.test.jsx`, `tests/renderer/ProjectSettingsView.test.jsx`, `tests/renderer/TokenDetail.test.jsx`). Fixed with `npx prettier --write` in commit `style(US-0211): prettier formatting`.
- PR #68, second run: `verify` passed (tests with the 80% floor, ESLint, Prettier), `build-mac` and `build-linux` passed.

## Where the UI checks ran

All view tests ran in jsdom, not in a real browser engine or the built app. The built `.dmg` is checked by hand before the release tag (team rule).
