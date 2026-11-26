# Test Results — US-0412 LCARS pipeline cards

Run on 2026-11-26 on `feat/US-0412` after merging `origin/main` (3 new commits, all `chore: sync .thadeus`), as the project rule asks when `main` has moved.

## Before the run: merge with main

- `main` had 3 token-log sync commits. The merge conflicted only in `.thadeus/tokens/261126-lcars-pipeline-cards.json` (the app's one-line token log, changed on both sides).
- Resolved by keeping every entry from both sides and the working copy, one per `at` timestamp, sorted (49 entries). No source file was involved. Merge commit `1f50d7d`.

## Commands

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | built in 3.6 s |
| `npx vitest run tests/renderer/Pipeline.test.jsx tests/renderer/IntentDetail.test.jsx tests/main/theme.test.js` (this work's scoped command) | 0 | 3 files, 74 passed |
| `npx vitest run tests/ --coverage` (full suite, project coverage floor) | 0 | 201 files; 3,003 passed, 1 skipped, 0 failed |
| `npm run lint` | 0 | no warnings |
| `npm run format:check` | 0 | all files use Prettier style |

## Coverage (v8, full suite)

| Scope | Lines |
|---|---|
| All measured source | 93.96% (11,750 / 12,504); floor 80% |
| `src/renderer/Pipeline.jsx` | 100% |
| `src/renderer/IntentDetail.jsx` | 89.58% |

Statements 92.01%, branches 85.8%, functions 89.6%.

## Where the checks ran

The unit tests ran in Node (`main` project) or jsdom (`renderer` project). After the gate, `npx playwright test` ran the built app through Electron's Chromium: 28 of 28 passed in 3.1 min, among them `tests/e2e/intentLayout.spec.js` "AC1 at 1280/1920: no horizontal overflow", which opens the pipeline tab. The motion and the look of the elbow were not looked at by eye.

## Failures

None.
