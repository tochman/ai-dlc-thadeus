# Test Results: US-0214

## Run 2 (after loop-back 1), 2026-11-18

| Check | Command | Exit | Result |
|---|---|---|---|
| Bundle | `npx electron-vite build` | 0 | Built |
| Full suite + coverage | `npx vitest run tests/ --coverage` | 0 | 147/147 files, 1874/1874 tests pass. Lines 92.3%, statements 90.18%, branches 83.11%, functions 87% (v8, full suite) |
| ESLint | `npx eslint .` | 0 | 0 errors, 29 warnings (same `react-hooks/exhaustive-deps` warnings, untouched files) |
| Prettier | `npx prettier --check .` | 1, then 0 | The two repaired test files needed formatting; fixed in this stage with `npx prettier --write` on those two files, then clean. Their 27 tests pass after formatting. |

Every failure from run 1 is fixed. The tests run in Node and jsdom, not in a real browser or a live agent session.

## Run 1, 2026-11-18T06:33:52Z

Branch `feat/US-0214`; `origin/main` has no commits beyond this branch's base, so no merge was needed.

| Check | Command | Exit | Result |
|---|---|---|---|
| Bundle | `npx electron-vite build` | 0 | Built |
| Full suite + coverage | `npx vitest run tests/ --coverage` | 1 | 147 files (2 failed); 1874 tests: 1866 passed, 8 failed. No coverage report written. |
| Targeted (`unit-test-instructions.md`) | covered by the full run | – | All 15 files pass |
| ESLint | `npx eslint .` | 0 | 0 errors, 29 warnings (all `react-hooks/exhaustive-deps`, in files this work does not touch) |
| Prettier | `npx prettier --check .` | 0 | Clean |

## Failures

Both are older test files outside the targeted set, still asserting the behaviour from before Steps 4 and 5.

- **`tests/main/opencodePluginReply.test.js`, 7 tests** (idle handler, BR6.2/RD15): every `session.status` now also writes an `activity` event (FR1.2). The tests expect no event file, or only the `reply`/`status` one, and one log line when a write fails (now two: `activity write failed` and `event write failed`).
- **`tests/main/dialogScriptReply.test.js` test 8** (NFR5.24/SCD10): it looks for the literal `case $1 in reply | session | notify | precompact | postcompact)`. The script now reads `case $kind in reply | session | notify | precompact | postcompact | activity)`, after the Step 4 refactor renamed the variable and the branch gained `activity`.

**Diagnosis:** the cause is in the tests that Code Generation wrote, not in the build setup. The new behaviour is what the plan asks for; these two files were not updated with it.

**Candidate fix:** in the 7 opencode tests, ignore `activity` events and their log line, as was done for SCD7. In test 8, match the new `case $kind in … | activity)` line and the new `waits=0` lines, keeping every check on the branch.

## Coverage

Not measured: the coverage report is not written while tests fail.

## Loop-Back Log

### Loop-back 1 — 2026-11-18T06:33:52Z

- **Diagnosis:** 8 tests in `opencodePluginReply.test.js` (7) and `dialogScriptReply.test.js` (test 8) still assert the behaviour from before Steps 4 and 5.
- **Root-cause stage:** code-generation (Steps 4 and 5 did not update these two older test files).
- **Planned fix:** make the 7 opencode tests ignore `activity` events and their log line; make test 8 match `case $kind in … | activity)` and the new `waits=0` lines. Every existing check is kept.
- **Estimated impact:** about 15 minutes, test files only; no financial cost; low risk. Chosen by the person ("Retry with fix").
