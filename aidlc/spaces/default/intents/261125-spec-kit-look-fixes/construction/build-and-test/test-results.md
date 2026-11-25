# Test results

Run on `fix/US-0048` (uncommitted, on `main` at 597767b) on 2026-11-25, macOS. The branch does not have #128 (the watcher tests).

| Command | Exit | Result |
|---|---|---|
| `npx vitest run --project renderer tests/renderer/SpeckitFeatures.test.jsx tests/renderer/AppShell.test.jsx` | 0 | 48 passed |
| `npx vitest run tests/ --coverage` | 0 | 184 files, 2559 passed, 1 skipped, 0 failed |
| `npx eslint . --max-warnings 0` | 0 | 0 problems |
| `npx prettier --check .` | 0 | all files formatted |
| `npx electron-vite build` | 0 | built |
| `npx playwright test` (built app, Electron's Chromium) | 0 | 16 passed, 6 of them `speckitLayout.spec.js` |
| `gitleaks` on `src`, `tests/e2e` and the diff | 0 | no leaks |

## Coverage (full suite, v8)

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 91.07% | 84.54% | 88.57% | 93.16% |

The single-file floors in `vitest.config.mjs` held in the same run.

## Failures

None. No loop-back was needed.

## Open finding

The Edit button in Configuration › Spec Kit touches the constitution panel below it. It is outside L1–L6.
