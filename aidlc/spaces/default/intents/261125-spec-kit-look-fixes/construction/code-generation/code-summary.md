# Code Summary: US-0048

Built on branch `fix/US-0048`, not committed.

## Files changed

- `src/renderer/SpeckitFeatures.jsx`: reports `featureCount` through `onMeta` on every read; a failed read keeps the last count (L1).
- `src/renderer/SpeckitShell.jsx`, `ProjectView.jsx`: pass `onMeta` down.
- `src/renderer/theme.css`: L2–L6.
- `tests/renderer/SpeckitFeatures.test.jsx` (1 new test), `AppShell.test.jsx` (the US-1401 test now expects 2 features).
- `tests/e2e/speckitLayout.spec.js`: new, 6 tests in the built app.
- `docs/features/epic-00-fixes.md`, `docs/FEATURES.md`: US-0048 in progress, for v0.3.0.

## Key decisions

- The Spec Kit view stays mounted, hidden, while another view is open, so the count survives a view change. The built-app test adds and removes a feature with Configuration open, and the arm follows.
- L5's cause was the one the plan guessed; `width: 100%` alone fixes it.
- L4's column is `minmax(0, 1fr)`, so long content cannot overflow.
- `AppShell.test.jsx` renders the real `SpeckitFeatures` for a Spec Kit project; a stub that reported a number would have passed without the fix.

## Results

| Fault | Red, on unchanged code | Green |
|---|---|---|
| L1 (jsdom) | 2 failed, 46 passed: "0 features" instead of "2 features" | 74 of 74, with SpeckitShell and ProjectView |
| L1 (built app) | "0 features" | pass |
| L2 | 1 look instead of 3 | pass |
| L3 | number on 3 lines, tag on 2 | pass |
| L4 | both gaps 0 | pass |
| L5 | second option about 99 px lower, at 1280 and 1920 | pass |
| L6 | `rgb(154,162,187)`, expected `rgb(26,31,45)` | pass |

Final runs: `speckitLayout` 6 of 6, `intentLayout` 8 of 8, related vitest files 165 of 165. ESLint and Prettier pass on the changed files.

Tests written but not executed: none. The full suite and coverage are left to Build and Test.

## Deviations

- The built-app tests (Step 5) were written and run before the L1 Green (Step 4); otherwise the built-app L1 test would never have failed.
- The L5 test waits 500 ms instead of checking the exact window width, since CI's virtual display may limit 1920. If it does, 1920 is tested at a smaller width, as in `intentLayout`.
- L6 also compares the text colour.
- The traceability tool wrote no file, since there are no requirement IDs. `traceability.json` was written by hand with the story's criteria, as in earlier quick-fix work.

## Open finding, not changed

The Edit button in Configuration › Spec Kit touches the constitution panel below it. It is outside L1–L6.
