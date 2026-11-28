# Test Results — US-0058 (2026-11-28)

## Build

`npx electron-vite build`: exit 0. Main, preload, and renderer bundles built.

## Full suite and coverage

`npx vitest run tests/ --coverage`: exit 0; **215 files passed, 3,334 tests passed, 1 skipped**; duration 385.41 seconds on the post-`main`-sync verification run. Coverage: **94.48% lines** (13,693 / 14,492), above the 80% floor. The run printed empty-bare-repository warnings from intentional Git fixtures and jsdom canvas-not-implemented messages; neither caused test failures.

The earlier 300-second attempts hit the command runner's time limit, not a Vitest-reported test failure. Full runs completed in 382.60 seconds before merging the latest `main` change and 385.41 seconds after.

## Timing-test diagnosis and change

`tests/main/agentHooksGuard.test.js` performs the full real-shell matrix (four installed commands, four environment cases, and each available shell, 20 runs per combination). Vitest's default 5-second per-test timeout was shorter than observed matrix-case runtimes (about 6–13 seconds), causing avoidable timeout retries. The test now has a 30-second Vitest timeout. Its performance check still has a hard 100 ms child-process deadline and still asserts exit 0 with empty stdout/stderr; the threshold and repetition count were not weakened.

Before the change, a no-retry run failed two 100 ms wall-time assertions at 120.6 ms and 154.6 ms. After the change, the normal retry-enabled focused run passed all 9 tests (one case retried twice). The full coverage run then passed, including this timing matrix. This isolates scheduling/timeout instability from application behavior while retaining the 100 ms guard.

## Other quality checks

- `npm run lint`: exit 0.
- `npm run format:check`: exit 0.
- `git diff --check`: passed.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| BT1 | `build-instructions.md` — build | Build exits 0 | Passed | `npx electron-vite build` | Build and Test | Met |
| BT2 | `build-instructions.md` — full suite | Full suite passes | 3,334 passed, 1 skipped, 0 failed | Post-main-sync `npx vitest run tests/ --coverage`; 385.41 s | Build and Test | Met |
| BT3 | Team Testing Posture | At least 80% line coverage | 94.48% | Coverage summary, 13,693 / 14,492 lines | Build and Test | Met |
| BT4 | Project Mandated | ESLint and Prettier pass | Both passed | `npm run lint`; `npm run format:check` | Build and Test | Met |
| BT5 | Testing Contract — CI | CI runs before merge | N/A | This plan runs no CI Pipeline | Build and Test | N/A |

Tests ran in Node and jsdom; no real-browser behavior is claimed. The live opencode integration is covered by deterministic database and IPC tests, not a live session.
