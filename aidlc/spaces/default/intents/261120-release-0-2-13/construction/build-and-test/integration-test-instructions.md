# Integration Test Instructions: release v0.2.13

## Boundaries tested
- Git boundary: `tests/main/planningSync.test.js` and `tests/main/thadeusSync.test.js` use real temporary repositories with a bare `origin` and a second clone (U2, U3).
- Shared files across stories: `src/main/ipc.js`, `src/renderer/FeaturesView.jsx`, `src/renderer/ProjectView.jsx` and the locales are changed by several stories; the merged worktree runs them together.
- The renderer views run in jsdom (integration evidence, not a real browser). The built-app Playwright tests (`tests/e2e`) run in CI on the pull request.

## How to run
In the merged worktree (see `build-instructions.md`): `npx vitest run tests/ --coverage`. To look at one boundary: `npx vitest run tests/main/thadeusSync.test.js tests/main/planningSync.test.js tests/main/ipc.test.js`.

## Test data
Each test makes and removes its own repositories; `gh` is a stub, the clock is injected.

## Coverage target
80% line coverage over `src/**` and `.opencode/plugins/*.js`, with the per-file floors in `vitest.config.mjs`.
