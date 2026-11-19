# Test Results — v0.2.11 release (2026-11-19)

## Local

- `npx vitest run tests/main/releaseVersion.test.js tests/main/featureDocsStatus.test.js` (Code Generation): 15 passed, 1 skipped (the v0.2.9-only note check); both changes were Red first (`../code-generation/code-summary.md`).
- `npx vitest run tests/ --coverage`: **1984 passed, 1 skipped**, 150 files, coverage thresholds met, **92.42% lines** (90.33% statements, 83.3% branches, 87.53% functions).
- `npx eslint .`: exit 0. `npx prettier --check .`: all files clean.
- `npx electron-vite build`: exit 0.

## CI on the release PR (#83, run 44493320868)

| Attempt | verify | build-mac | build-linux | release |
|---|---|---|---|---|
| 1 | **fail** | skipped (needs verify) | skipped | skipped |
| 2 (re-run of failed jobs) | pass | pass | pass | skipped (tags only) |

Attempt 1 failed one test: `tests/renderer/ConfigView.test.jsx` › "lists the agents working now … live counter": expected `4 min` after a 60 s fake-timer advance, got `3 min`. The test passed locally and on the re-run, and this release touches no renderer code, so it is a timing flake in that test (its 15 s `setInterval` in `src/renderer/ConfigView.jsx` versus fake timers under CI load), not a release defect. It should be its own EPIC-00 story if it recurs.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T1-tdd | Testing Contract | failing test before the change | Red outputs recorded | `../code-generation/code-summary.md` | code-generation | Met |
| T2-suite | team.md Testing Posture | full suite green | 1984 passed, 1 skipped | local run, CI verify (attempt 2) | build-and-test | Met |
| T3-coverage | vitest.config.mjs, team.md | ≥ 80% lines | 92.42% | local run, CI verify | build-and-test | Met |
| T4-lint | project.md Mandated | ESLint and Prettier pass | clean | local, CI verify | build-and-test | Met |
| T5-ci | requirements FR1.1 | release PR CI green | verify, build-mac, build-linux pass | PR #83, run 44493320868 attempt 2 | build-and-test | Met |
| T6-ci-pipeline | Testing Contract CI line | tests in CI before merge | — | the plan runs no CI Pipeline | — | N/A |
| T7-hand | requirements FR3, FR4 | hand checks and `.dmg` | — | — | deployment-execution | N/A here |

Tests ran in Node and jsdom; the built app is checked by hand in Deployment Execution.
