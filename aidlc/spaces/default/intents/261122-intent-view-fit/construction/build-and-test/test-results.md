# Test Results: US-0044

Run on 2026-11-23 in `.claude/worktrees/fix-0044`, at `38757b3`, after merging `origin/main` (`a18055f`) into `fix/US-0044`.

## Merge with main

The merge conflicted on `docs/FEATURES.md` and `docs/features/epic-00-fixes.md`: the app had committed the v0.2.15 plan and US-0045 to `main`. I resolved it by keeping `main`'s text and setting US-0044 to 🚧 In progress, for v0.2.15 (`91eb27d`). `featureDocsStatus` passes, 9/9.

## Build

`npx electron-vite build`: success.

## Tests

| Command | Result |
|---|---|
| `npx playwright test tests/e2e/intentLayout.spec.js` | 8/8 passed (AC1 to AC4 at 1280 and 1920 px, in Chromium through Electron) |
| `npx playwright test` (all built-app tests) | 10/10 passed |
| `npx vitest run tests/main/theme.test.js tests/renderer/IntentDetail.test.jsx tests/renderer/TokenView.test.jsx tests/renderer/Lcars.test.jsx` | passed (`BoltDag.test.jsx` does not exist, so it is left out) |
| `npx vitest run tests/ --coverage` | exit 0: 157 files, 2190 passed, 1 skipped. Lines 92.74%, statements 90.57%, branches 83.77%, functions 88.01% |
| `npx eslint .` | exit 0: 0 errors, 30 warnings, none in the files this story changed (the warnings are US-0043's) |
| `npx prettier --check .` | all files formatted |

## Failures found and fixed in this stage

The first full-suite run after the merge had 3 failures:
- **`CostPanel`, US-0414 FR2.2:** the new frame title used a native `title` attribute, which the app forbids. It now uses the app's `Tooltip` (`52a5d91`).
- **`TokenDetail`, two tooltip tests:** the Activity view focuses its title when it opens, so the title tooltip popped up by itself. The title tooltip is now hover only: `focusText=""`, and `Tooltip` no longer enters focus mode without focus text (`38757b3`). There is a new test in `tests/renderer/Lcars.test.jsx`.
- **`dialogScript`, NFR5.11 (timing):** failed under full-suite load and passes alone. This branch does not touch `dialog.sh`. It passed in the final full run.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-COV | team.md Testing Posture | line coverage ≥ 80% | 92.74% | full-suite coverage run above | build-and-test | Met |
| T-SUITE | Testing Contract scope floor | existing suite green | 2190 passed | full-suite run | build-and-test | Met |
| T-LINT | project.md Mandated | ESLint and Prettier pass | 0 errors; formatted | eslint, prettier runs | build-and-test | Met |
| T-E2E | US-0044 AC5 | built-app tests stay green | 10/10 | `npx playwright test` (Chromium in Electron) | build-and-test | Met |
| T-AC1..4 | US-0044 AC1–AC4 | each layout check passes | 8/8 | `intentLayout.spec.js` | build-and-test | Met |
| T-CI | Testing Contract (CI before merge) | n/a | n/a | the plan runs no CI Pipeline | build-and-test | N/A |
