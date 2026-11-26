# Test Results: US-0050

Branch `fix/US-0050`; `origin/main` is ahead only by app `.thadeus` token syncs (no code), so no merge was needed before testing.

| Command | Exit | Result |
|---|---|---|
| `npm run build` | 0 | success (Code Generation, before the e2e runs) |
| `npx vitest run tests/ --coverage` | 0 | 201 files, 3,040 passed, 1 skipped |
| `npx eslint .` | 0 | clean |
| `npx prettier --check .` | 0 | clean |
| `npx playwright test tests/e2e/motion.spec.js` | 0 | 2 passed, real Chromium in Electron: tab content runs `lcars-tab-in` under Full, nothing under Reduced; p95 17.7 ms, max 21.5 ms (25 intents, 2,000 events) |
| `npx playwright test tests/e2e/intentLayout.spec.js tests/e2e/speckitLayout.spec.js` | 0 | 20 passed |

Coverage (v8, full suite): **lines 94.03%** (floor 80%).

Red before green: see `code-summary.md` (theme 5, hook 2, tabs 5, entrance 7, folds 7, live change 4, e2e 1).

No failures, so no Loop-Back Log.
