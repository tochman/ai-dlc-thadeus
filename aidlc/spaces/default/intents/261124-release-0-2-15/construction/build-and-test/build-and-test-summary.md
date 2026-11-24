# Build and Test summary

- **Build:** the release commit builds and passes lint and Prettier. Packaging was proven by CI on #117: `build-linux` passed, `build-mac` was still running.
- **Tests:** the full suite (unit and integration in Node and jsdom), the release checks, and the built-app end-to-end tests in CI (Electron's Chromium).

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-coverage | team.md Coverage floor | ≥ 80% line, full suite | 92.67% | `npx vitest run tests/ --coverage` on 428fee1, exit 0 | build-and-test | Met |
| TC-green | Testing Contract scope floor | existing suite green | 2230 passed, 0 failed | same run | build-and-test | Met |
| NFR1 | requirements.md NFR1 | release checks pass; no "for v0.2.15" left | 47 passed | release checks on 428fee1 | build-and-test | Met |
| Style | team.md Code Style | ESLint and Prettier green | both green | test-results.md | build-and-test | Met |
| E2E | team.md End-to-end | built-app tests pass | passed | CI `verify`, run 45340774443 | build-and-test | Met |
| DMG | team.md Manual check (FR2) | `.dmg` checked by hand before the tag | — | done by the person in Deployment Execution | deployment-execution | N/A |
| CI-before-merge | Testing Contract CI line | CI before merge | — | the plan runs no CI Pipeline stage; the person chose not to wait (Q3), and verify already passed anyway | — | N/A |

## Readiness

- **Ready:** build, tests and the merge.
- **Not ready yet:** the tag waits for the `.dmg` hand check.

## Outstanding

`build-mac` on #117 was still running when this was written. The local `.dmg` for the hand check is built in Deployment Execution.
