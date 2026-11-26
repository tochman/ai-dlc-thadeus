# Test Results — US-1303 (2026-11-26)

| Command | Exit | Result |
|---------|------|--------|
| `npx vitest run tests/main/storyLinks.test.js tests/main/storyCost.test.js tests/main/rework.test.js tests/main/i18nKeys.test.js tests/main/ipc.test.js tests/main/fileWrite.test.js` | 0 | 6 files, 196 passed |
| `npx vitest run tests/renderer/StoryCost.test.jsx tests/renderer/FeaturesView.test.jsx tests/renderer/CostPanel.test.jsx tests/renderer/useFeatures.test.jsx tests/renderer/ProjectView.test.jsx` | 0 | 5 files, 107 passed |
| `npx vitest run tests/ --coverage` (full suite, v8) | 0 | 206 files, 3,140 passed, 1 skipped, 0 failed; lines 94.00%, statements 92.15%, branches 85.75%, functions 89.82% |
| `npx eslint .` | 0 | clean |
| `npx prettier --check .` | 0 | all files formatted |
| `npx electron-vite build` | 0 | built in 3.55 s |

New files' line coverage: `storyLinks.js` 100%, `storyCost.js` 100%, `StoryCost.jsx` 100%; `CostPanel.jsx` 100%, `FeaturesView.jsx` 97.64%.

Where the checks ran: Node (main) and jsdom (renderer). No real-browser (Playwright) run of the new views in this stage; the built-app end-to-end tests run in CI.

Base: `origin/main` is 5 commits ahead, all `chore: sync .thadeus` touching only `.thadeus/tokens/261126-cost-rollup.json`; no code to merge, so these results hold against main's code.

Failures: none. No coverage threshold changed.
