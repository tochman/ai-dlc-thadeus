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

## After the pull request's CI run

CI on pull request #153 (Linux, 2026-11-25) failed after this stage was approved: 2892 tests passed, but vitest stopped on one uncaught `write EPIPE` from `src/main/exec.js` during `signIn.test.js`.

- **Cause:** `defaultExec` closes stdin with the input and had no error listener on it. A command that exits before that write breaks the pipe. In the app this would have been an uncaught error in the main process. The macOS runs here never hit the timing.
- **Fix:** a listener on the child's stdin; the exit code stays the answer. Test first: a 4 MB input to a command that reads none of it gave two uncaught errors before the fix and none after (`exec.test.js`). Commit: `fix(US-0804): a command that exits before its input is read is no uncaught error`.
- **Results after the fix:** `exec`, `signIn` and `updater` tests 55 passed; ESLint and Prettier clean on the changed files. The full suite runs again in CI.
- **Lesson:** a child process given input needs an error listener on stdin, and a test that forces the broken pipe.

The next CI run passed the whole unit suite, then failed one built-app test of US-0509 (`intentLayout.spec.js`, "Change plan" at 1280): the dialog was 10 px wider than its frame.

- **Cause:** the test measured while the dialog slid in. Measured frame by frame here, the overflow goes 64, 47, 32, 19, 10, 3, 0 px in the first 137 ms. US-0804 changes none of the dialog's styles.
- **Fix:** the test waits until the dialog's entrance has finished; what it checks is unchanged. Commit: `test(US-0804): the Change plan layout test waits for the dialog's entrance`.
- **Lesson:** a layout test waits for the entrance to finish before it measures.
