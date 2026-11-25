# Build and Test summary

Sources: `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`. Results are in `test-results.md`.

- **Build:** success. ESLint and Prettier are clean.
- **Test types:** unit, component (jsdom), real-git integration, built-app layout (Electron's Chromium).
- **Coverage:** 80% line floor for the whole project.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-coverage | Testing Contract, team.md Coverage floor | at least 80% lines, full suite | 93.52%, exit 0 | test-results.md | build-and-test | Met |
| TC-green | Testing Contract scope floor | existing suite green | 2681 passed, 0 failed; built app 18 passed | test-results.md | build-and-test | Met |
| TC-tdd | Testing Contract methodology | failing test before the code | Red output for every step | code-summary.md (the developer's run) | code-generation | Met |
| NFR2 | requirements.md | no file reads beyond today's | same reads | `projectService.test.js` | build-and-test | Met |
| NFR3-real | requirements.md | one real archive and unarchive | archive and unarchive exit 0 | test-results.md, third run | build-and-test | Met |
| Style | team.md Code Style | ESLint and Prettier green | both exit 0 | test-results.md | build-and-test | Met |
| CI-before-merge | team.md | CI before merge | not run | the plan runs no CI Pipeline; CI still runs on the pull request | none | N/A |

## Readiness

- **Ready:** build, tests and the real run; CI is green on pull request #132.
- **Known:** one test in `TokenDetail.test.jsx` can time out on a loaded machine (proposed for US-0052).
