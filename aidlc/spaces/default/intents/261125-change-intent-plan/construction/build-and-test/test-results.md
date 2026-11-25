# Test results: change the plan of an intent that has started (US-0509)

## Run 1 (2026-11-25, branch `feat/US-0509`; `main` has only `.thadeus` syncs ahead of it)

| Check | Result |
|---|---|
| `npx electron-vite build` | success |
| `npx eslint . --max-warnings 0` | exit 0, again after the added test |
| `npx prettier --check .` | exit 0; the one file changed after it was checked again |
| `npx vitest run tests/ --coverage` | 193 files passed; 2805 tests, 2804 passed, 0 failed, 1 skipped; no threshold error |
| `npx playwright test` (built app, Electron's Chromium) | exit 0, 20 passed, 1.9 min |
| `npx playwright test tests/e2e/intentLayout.spec.js`, with the added test | 12 passed, 1.2 min; the added test alone 5 of 5 |

The suite's output went through a filter, so its own exit code was not read; the results above are its printed totals.

The unit's own commands also passed before the gate of Code Generation: 13 files, 221 tests, and `intentLayout.spec.js` 11 tests. Every file they name is part of the runs above.

### Added in this stage

`tests/e2e/intentLayout.spec.js` > "US-0509: the chosen plan is typed unsent into the agent tab, which then has the focus". A stand-in CLI in a real terminal records every byte it is typed. It got exactly `/aidlc --scope everything-and-more`, no Enter, and the agent's terminal had the focus. Only this test file changed; nothing under `src/`.

### Coverage (v8)

Lines 93.62%, statements 91.60%, branches 85.40%, functions 89.19%. The floor is 80% lines, and every per-file floor holds. Lines per file: `planChange.js` 100%, `PlanChange.jsx` 98.98%, `state.js` 100%, `pipeline.js` 96%, `Pipeline.jsx` 100%, `ResumeButton.jsx` 97.5%, `IntentDetail.jsx` 89.58%. `PlansView.jsx` is at 60.74%; this story only moved one function out of it, and it has no floor of its own.

### Failures

None. No loop-back.

### Not run

- No real agent received a line. AI-DLC's side was read in its source (2.11.3), not tried.
- Contrast was not measured.
