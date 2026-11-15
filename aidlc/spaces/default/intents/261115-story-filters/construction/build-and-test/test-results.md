# Test Results: US-0604

Run 2026-11-16 on branch `feat/US-0604`, in Node (vitest `main`) and jsdom (vitest `renderer`).

| Check | Command | Exit | Result |
|---|---|---|---|
| Unit and view tests (this work) | `npx vitest run tests/main/storyFilter.test.js tests/renderer/FeaturesView.test.jsx tests/main/i18nKeys.test.js` | 0 | 30 / 30 passed (13 new: 7 unit, 6 view) |
| Full suite + coverage | `npx vitest run tests/ --coverage` | 0 | 1375 / 1375 passed, 105 files; lines 90.4 %, statements 88.3 %, branches 81.64 %, functions 84.26 %; `storyFilter.js` lines 100 %, `FeaturesView.jsx` 97.4 % |
| ESLint | `npx eslint .` | 0 | 0 errors, 24 warnings (unchanged) |
| Prettier | `npx prettier --check .` | 0 | clean |
| Build | `npx electron-vite build` | 0 | built |
| Filter speed (one-off, NFR3) | a temporary vitest run of `storyRows` + `matches` over 10 epics × 100 stories (2 kB text each), text + priority set | 0 | 3.04 ms per pass, 110 matches; the check was removed afterwards |

- **Failures:** none.
- **TDD evidence:** the Red runs (unit suite failed to load on `storyRows`; 6 of 19 view tests failed) are in `../code-generation/code-summary.md`.
- **Not run here:** the filters in the running app; the manual `.dmg` check covers that before the release.
