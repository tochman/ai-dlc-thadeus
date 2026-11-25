# Build and Test summary

Sources: `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`. Results are in `test-results.md`.

- **Build:** success. ESLint and Prettier are clean.
- **Test types:** unit, component (jsdom), real-git integration, built-app layout (Electron's Chromium).
- **Coverage:** 80% line floor for the whole project.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-coverage | Testing Contract, team.md Coverage floor | at least 80% lines, full suite | 93.52%, exit code not recorded | test-results.md | build-and-test | Unverified |
| TC-green | Testing Contract scope floor | existing suite green | built app: 2 failed of 16 | test-results.md | build-and-test | Not Met |
| TC-tdd | Testing Contract methodology | failing test before the code | Red output for every step | code-summary.md (the developer's run) | code-generation | Met |
| NFR2 | requirements.md | no file reads beyond today's | same reads | `projectService.test.js` | build-and-test | Met |
| NFR3-real | requirements.md | one real archive and unarchive | not run | the person runs it | build-and-test | Unverified |
| Style | team.md Code Style | ESLint and Prettier green | both exit 0 | test-results.md | build-and-test | Met |
| CI-before-merge | team.md | CI before merge | not run | the plan runs no CI Pipeline; CI still runs on the pull request | none | N/A |

## Readiness

Not ready: the detail overflows at 1280 px, and NFR3 has not been run.
