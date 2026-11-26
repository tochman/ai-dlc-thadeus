# Test Results — US-1302 Savings hints

## Build

`npx electron-vite build` — exit 0, built in 8.4 s.

## Lint and format

- `npx eslint . --max-warnings 0` — exit 0.
- `npx prettier --check .` — exit 0, all files formatted.

## Full suite with coverage

`npx vitest run tests/ --coverage`, run twice (Node for `main` and `scripts`, jsdom for `renderer`):

1. **First run — failed.** 203 files, 3,101 tests: 3,099 passed, 1 failed, 1 skipped. The failure: `tests/main/fileWrite.test.js` › "is imported only by …" (SD36). It lists every module that may import `writeAtomic`, and the new `src/main/savings.js` was not on it.
   - Cause: Code Generation added a justified writer without updating the guard list.
   - Fix (in-stage, attempt 1): added `main/savings.js` to the list with its reason (one fixed file, `.thadeus/savings-dismissed.json`, its folder resolved in the root, the same pattern as `intentNames.js`). The guard itself was not loosened. `tests/main/fileWrite.test.js` alone: 17 passed.
2. **Second run — passed.** Exit 0, so every test passed and the coverage thresholds held.

## Coverage (v8, lines)

| Scope | Lines |
|---|---|
| All measured source (floor 80%) | 93.93% |
| `src/main/savings.js` (aim 90%) | 100% |
| `src/renderer/CostPanel.jsx` | 100% |
| `src/renderer/CostTab.jsx` | 96.11% |

From `coverage/coverage-summary.json` of the second run.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-SUITE | Testing Contract scope floor | existing suite green | all passed, exit 0 | second full run above | build-and-test | Met |
| TC-COV80 | team.md Testing Posture, `vitest.config.mjs` | ≥ 80% lines, all measured source | 93.93% | second full run, coverage summary | build-and-test | Met |
| UTI-SAVINGS90 | unit-test-instructions.md, Expected coverage | ≥ 90% lines of `savings.js` | 100% | coverage summary | build-and-test | Met |
| TC-LINT | project.md Mandated | ESLint and Prettier pass | both exit 0 | lint and format above | build-and-test | Met |
| TC-CI | Testing Contract, CI before merge | tests in CI before merge | — | the plan runs no CI Pipeline | — | N/A |
| TC-BUILD | build-instructions.md | build succeeds | exit 0 | build above | build-and-test | Met |
| TC-TRACE | Step 10 coverage gate | every FR/NFR built | 16 of 16 | cross-unit-traceability.md | build-and-test | Met |

The renderer behaviour was checked in jsdom, not a real browser engine.
