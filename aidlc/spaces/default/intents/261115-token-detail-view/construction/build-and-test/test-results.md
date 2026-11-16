# Test Results: US-0208

Run 2026-11-16 on branch `feat/US-0208`, in Node (vitest `main`) and jsdom (vitest `renderer`).

| Check | Command | Exit | Result |
|---|---|---|---|
| Unit and view tests (this work) | `npx vitest run tests/main/tokenReadings.test.js tests/main/tokenChart.test.js tests/renderer/TokenDetail.test.jsx tests/renderer/TokenView.test.jsx tests/main/ledger.test.js tests/main/i18nKeys.test.js tests/main/theme.test.js tests/main/fileWrite.test.js` | 0 | 62 / 62 passed (22 new: 6 readings, 5 chart helpers, 9 view, 2 motion rules) |
| Full suite + coverage | `npx vitest run tests/ --coverage` | 0 | 1384 / 1384 passed, 107 files; lines 90.8 %, statements 88.64 %, branches 82.39 %, functions 84.83 %; `tokenReadings.js` and `tokenChart.js` lines 100 %, `TokenDetail.jsx` 93.75 % |
| ESLint | `npx eslint .` | 0 | 0 errors, 24 warnings (none in new code) |
| Prettier | `npx prettier --check .` | 0 | clean |
| Build | `npx electron-vite build` | 0 | built |

- **Failures:** none.
- **TDD evidence:** the Red runs (three new suites failed to load before their modules existed; 2 of 15 theme tests failed before the motion rules) are in `../code-generation/code-summary.md`.
- **Not run here:** the view in the running app (look against the canvas, the animations, live readings growing). That is the manual `.dmg` check before the release. The view is reachable only where the right column shows (window width ≥ 1280 px), a known gap to fix next.
