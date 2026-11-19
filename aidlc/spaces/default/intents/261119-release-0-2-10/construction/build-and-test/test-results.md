# Test Results — v0.2.10 release (2026-11-19)

## Local

- `npx vitest run tests/main/releaseVersion.test.js tests/main/featureDocsStatus.test.js` (Code Generation): 14 passed, 1 skipped (the v0.2.9-only note check); the two new tests were Red first (`code-summary.md`).
- `npx vitest run tests/ --coverage`, load average about 4.8: **1971 passed, 1 skipped**, 150 files, coverage thresholds met, **92.41% lines**.
- ESLint on `tests/main/releaseVersion.test.js`: clean. Prettier on every changed file: clean.

## CI on the release PR (#80, run 44469193059)

| Job | Result |
|---|---|
| verify (suite, coverage, ESLint, Prettier) | pass, 3m11s |
| build-mac | pass, 3m28s |
| build-linux | pass, 1m45s |
| release | skipped (runs on tags only) |

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T1-tdd | Testing Contract | failing test before the markers | Red outputs recorded | `../code-generation/code-summary.md` | code-generation | Met |
| T2-suite | team.md Testing Posture | full suite green | 1971 passed, 1 skipped | local run, CI verify | build-and-test | Met |
| T3-coverage | vitest.config.mjs, team.md | ≥ 80% lines | 92.41% | local run, CI verify | build-and-test | Met |
| T4-lint | project.md Mandated | ESLint and Prettier pass | clean | local, CI verify | build-and-test | Met |
| T5-ci | requirements FR1.1 | release PR CI green | verify, build-mac, build-linux pass | PR #80 | build-and-test | Met |
| T6-hand | requirements FR3, FR4 | hand checks and `.dmg` | — | — | deployment-execution | N/A here |

Tests ran in Node and jsdom; the built app is checked by hand in Deployment Execution.
