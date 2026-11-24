# Test results

Run on `main` at a167353, with US-0508 (#115) and US-0043 (#116) both merged, on 2026-11-24.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | main, preload and renderer bundled |
| `npx eslint . --max-warnings 0` | 0 | 0 problems (was 30 warnings) |
| `npx prettier --check .` | 0 | all files formatted |
| `npx vitest run tests/ --coverage` | 0 | 160 files, 2230 passed, 1 skipped, 0 failed |
| US-0508 scoped command (6 files) | 0 | 113 passed |
| US-0043 scoped command (13 renderer files) | 0 | 164 passed |

## Coverage (full suite, v8)

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 90.54% | 83.76% | 87.88% | 92.68% |

The 80% line floor is met.

## End-to-end

The built-app Playwright tests (`tests/e2e`, Electron's Chromium) ran in CI's `verify` job on both pull requests and passed: #115 run 45334436876, and #116 run 45336501822, whose branch already held US-0508. They were not run locally.

## Notes

- `tests/renderer/AppShell.test.jsx` (a real-time 5 s timer test) failed twice during Code Generation while the machine was stalled. It passes on every run since, including this full suite.
- The first CI run of #115 failed on `tests/main/fileWrite.test.js`, the list of modules allowed to use `writeAtomic`. `intentNames.js` was added to it in the commit `test(US-0508): allow intentNames.js to write through writeAtomic`, and CI passed after that.
