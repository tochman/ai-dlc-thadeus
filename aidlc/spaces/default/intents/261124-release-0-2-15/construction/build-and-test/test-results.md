# Test results

Run on the release commit 428fee1 (`release: v0.2.15`, #117) in a temporary checkout, on 2026-11-24.

| Command | Exit | Result |
|---|---|---|
| Release checks (`featureDocsStatus`, `releaseVersion`, `releasesPlan`, `releases`) | 0 | 47 passed, 1 skipped |
| `npx vitest run tests/ --coverage` | 0 | 160 files, 2230 passed, 1 skipped, 0 failed |
| `npx eslint . --max-warnings 0` | 0 | 0 problems |
| `npx prettier --check .` | 0 | all files formatted |

## Coverage (full suite, v8)

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 90.52% | 83.74% | 87.88% | 92.67% |

## CI on #117 (run 45340774443)

| Job | Result |
|---|---|
| `verify` (gitleaks, coverage tests, ESLint, Prettier, built-app end-to-end) | pass |
| `build-linux` (`.deb`, glibc check) | pass |
| `build-mac` (`.dmg`) | still running when this was written |

The temporary checkout was used because the running app resets `docs/releases/0.2.15.md` in the main working tree.
