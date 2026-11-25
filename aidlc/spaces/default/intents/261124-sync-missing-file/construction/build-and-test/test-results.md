# Test results

Run on `fix/US-0047` (working tree, not committed; `main` at 994d04d under it) on 2026-11-25.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` (to a scratch folder in `node_modules/.cache`) | 0 | main, preload and renderer bundled |
| `npm run lint` | 0 | 0 problems |
| `npx prettier --check .` | 0 | all files formatted |
| `npx vitest run tests/main/thadeusSync.test.js` | 0 | 13 passed, 0 failed |
| `npx vitest run tests/ --coverage` | 0 | 184 files, 2558 passed, 1 skipped, 0 failed |

## Coverage (full suite, v8)

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 91.06% | 84.53% | 88.57% | 93.16% |

The 80% line floor for the whole project is met. `thadeusSync.js` alone measures 75.19% of lines. No floor is set for that file. The report's uncovered lines include 164-165 (no base at origin) and 210-234 (the file watcher), which this work did not change.

## Failures

None.

## Not run here

- The built-app Playwright tests (`tests/e2e`); CI runs them on the pull request.
- The manual `.dmg` check, which belongs to the release.

## Open finding, existed before

A `.thadeus` file removed from disk but still at origin makes `git add` fail and stops the cycle. Code Generation's temporary test showed it. It is outside US-0047 and waits for the person's decision (`code-summary.md`).
