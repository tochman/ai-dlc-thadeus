# Test Results — US-1305 Quality signals next to cost

Run 2026-11-26 on `feat/US-1305`.

## Build

`npx electron-vite build` — exit 0, built in 3.06 s (main, preload, renderer).

## Tests

| Command | Result | Exit |
|---|---|---|
| Scoped run from `unit-test-instructions.md` (7 files) | 142 passed | 0 |
| `npx vitest run tests/ --coverage`, run 1 | 3,187 passed, 1 failed, 1 skipped (208 files) | 1 |
| `npx vitest run tests/renderer/SpeckitFeatures.test.jsx` | 28 passed | 0 |
| `npx vitest run --project renderer` | 1,032 passed (73 files) | 0 |
| `npx vitest run tests/ --coverage`, run 2 | 3,188 passed, 1 skipped (208 files) | 0 |
| `npm run lint` | clean | 0 |
| `npx prettier --check .` | clean | 0 |

### The failure in run 1

`tests/renderer/SpeckitFeatures.test.jsx` > "archived features (US-1411) > leaves them out of the list and the count…". This branch does not change that file or its component. It passed alone, in the whole renderer project and in full run 2, so it is a load-dependent flake, not a defect of this story. In-stage fix attempt 1: rerun. Worth its own EPIC-00 story if it recurs.

## Coverage (full run 2)

Lines 94.09% (12,500 / 13,285), statements 92.28%, branches 85.84%, functions 90.07%.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-COV | team.md Testing Posture; NFR4 | ≥ 80% line coverage, full suite | 94.09% | full run 2, exit 0 | build-and-test | Met |
| T-GREEN | Testing Contract scope floor | existing suite green | 3,188 passed, 0 failed | full run 2, exit 0 | build-and-test | Met |
| T-LINT | NFR4; team.md Code Style | ESLint and Prettier pass | clean | `npm run lint`, `prettier --check .` | build-and-test | Met |
| T-UNIT | unit-test-instructions.md | story tests pass | 142 passed | scoped run, exit 0 | build-and-test | Met |
| T-BUILD | build-instructions.md | bundle builds | built | `electron-vite build`, exit 0 | build-and-test | Met |
| T-CI | Testing Contract "Run the selected tests in CI before merge" | — | — | — | — | N/A: the plan runs no CI Pipeline (CI `verify` still runs on the PR) |
