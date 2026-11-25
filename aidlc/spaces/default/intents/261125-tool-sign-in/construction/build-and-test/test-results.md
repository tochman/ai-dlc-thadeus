# Test results

Run 2026-11-25 on `feat/US-0804` (macOS), on the uncommitted final code. `origin/main` had no source or test change that the branch lacks.

| Run | Command | Exit | Result |
|---|---|---|---|
| 1 | `npx vitest run tests/ --coverage` | 0 | lines 93.84% (11567 of 12326), statements 91.84%, functions 89.41%, branches 85.6%; every threshold held |
| 2 | `npx vitest run tests/` | 0 | 197 files; 2892 passed, 0 failed, 1 skipped. Run for the counts, which were cut from run 1's output |
| 3 | The unit's commands together (`unit-test-instructions.md`) | 0 | 18 files, 396 passed |
| 4 | `npx eslint . --max-warnings 0` | 0 | clean |
| 5 | `npx prettier --check .` | 0 | clean |
| 6 | `npx electron-vite build` | 0 | built in 2.65 s |
| 7 | `npx playwright test` (built app, Electron's Chromium) | 0 | 24 passed, 0 failed (3 of them `signIn.spec.js`) |

- **Failures:** none. Nothing was fixed or changed in this stage.
- **Coverage of the new files (lines, run 1):** `src/main/signIn.js`, `src/main/parsers/signIn.js`, `src/renderer/SignIn.jsx` and `src/shared/signIn.js` 100% each.
- **Integration:** the commands of `integration-test-instructions.md` are part of runs 1, 2 and 7.
- **Not run:** the real `gh`, `claude` and `opencode` through the app. That is owed by hand, once.

The finished target matrix is in `build-and-test-summary.md`.
