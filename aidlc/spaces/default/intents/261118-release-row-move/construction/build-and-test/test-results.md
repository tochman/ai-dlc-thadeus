# Test Results: US-0029 release row move

Run 2026-11-18 on branch `fix/US-0029`.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | main, preload and renderer built |
| `npx vitest run tests/ --coverage` | 0 | 148 files, 1883 passed, 0 failed; thresholds met |
| `npx prettier --check src tests docs` | 0 | clean |
| `npx eslint .` | 0 | 0 errors, 29 warnings (all `react-hooks/exhaustive-deps` in files this fix does not touch) |

The unit-test command in `unit-test-instructions.md` (`tests/main/releasesPlan.test.js tests/main/releases.test.js`) selects files of the full suite, so the full run covers it.

## Coverage (v8, lines)

All files 92.3% (floor 80%). `src/main/releases.js` 95.08%, `src/main/parsers/releases.js` 100%.

## Failures

None.
