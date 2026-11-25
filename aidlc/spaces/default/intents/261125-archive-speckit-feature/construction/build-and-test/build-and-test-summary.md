# Build and Test summary

Sources: `code-generation-plan.md`, `unit-test-instructions.md`, `code-summary.md` and `requirements.md`. Results are in `test-results.md`.

- **Build:** success. ESLint and Prettier are clean.
- **Test types:** unit, component (jsdom), handlers, built-app round trip and layout (Electron's Chromium).
- **Coverage:** 80% line floor for the whole project.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-coverage | Testing Contract, team.md Coverage floor | at least 80% lines, full suite | 93.56%, exit 0 | test-results.md, run 2 | build-and-test | Met |
| TC-green | Testing Contract scope floor | existing suite green | 2730 passed, 0 failed, 1 skipped; built app 19 passed in its last run, three others failed under load in earlier runs | test-results.md, run 2 | build-and-test | Met |
| TC-tdd | Testing Contract methodology | failing test before the code | red seen for each step | code-summary.md (the developer's run) | code-generation | Met |
| NFR1 | requirements.md | unlisted names, links and non-regular marks refused; atomic write | all refused | `speckitArchive.test.js`, `ipc.test.js` (Node) | build-and-test | Met |
| NFR2 | requirements.md | one folder listing, no read per feature | one listing | `speckitFeatures.test.js` (Node) | build-and-test | Met |
| NFR3 | requirements.md | the no-write test stays green | green | `speckitFeatures.test.js` (Node) | build-and-test | Met |
| FR6.2 | requirements.md | keyboard and focus | archive, cancel and unarchive from the keyboard; focus as required | `speckitLayout.spec.js`, test US-1411 (Electron's Chromium) | build-and-test | Met |
| Style | team.md Code Style | ESLint and Prettier green | both exit 0 | test-results.md | build-and-test | Met |
| CI-before-merge | team.md | CI before merge | not run | the plan runs no CI Pipeline; CI still runs on the pull request | none | N/A |

## Readiness

- **Ready:** build, suite and built-app tests. SD36's list was repaired in loop-back 1.
- **Known:** three existing built-app tests (L2, L5, US-0513 at 1280) each failed once on a loaded machine and passed 5 of 5 after; the cause is not proven.
- **Limits:** contrast was not measured; the known limits in `code-summary.md` stand.
