# Test Results: US-0032

Branch `fix/US-0032`, up to date with `origin/main` (no commits on `main` since the branch base), run 2026-11-19.

## Build

`npx electron-vite build`: exit 0, `✓ built in 2.97s`.

## Tests

- This work's tests (`npx vitest run tests/main/costRules.test.js tests/renderer/CostRulesSection.test.jsx tests/main/i18nKeys.test.js`): 3 files, 31 tests passed (run in Code Generation).
- Full suite with coverage (`npm run coverage`, i.e. `vitest run tests/ --coverage`): exit 0. 150 files passed; 1976 tests passed, 1 skipped, 0 failed.
- Where it ran: `tests/main` in Node, `tests/renderer` in jsdom (a DOM emulator, not a real browser).

## Coverage

`@vitest/coverage-v8`, configured in `vitest.config.mjs` (lines threshold 80). All files: 92.42% lines, 90.29% statements, 83.26% branches, 87.48% functions. Threshold met; the run exits 0.

## Lint and format

- `npx eslint .`: exit 0. One warning in `src/renderer/CostRulesSection.jsx` (`react-hooks/exhaustive-deps` on the `useEffect` that loads the status); the same `useEffect` is on `main`, so it predates this work.
- `npx prettier --check .`: exit 0, "All matched files use Prettier code style!"

## Not run

- AC3 ("exactly one commit" of the feature docs): needs an agent session on `main`; checked by hand.
