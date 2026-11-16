# Test Results: US-0024 Token chart fix

Run 2026-11-16 on branch `fix/US-0024`.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | built in 2.40 s |
| `npx vitest run tests/ --coverage` (1st) | 1 | 1 failed, 1433 passed: one test failed once under coverage load; not reproduced |
| `npx vitest run tests/` | 0 | 114 files, 1434 passed |
| `npx vitest run tests/ --coverage` (2nd) | 0 | 114 files, 1434 passed; thresholds met |
| `npx prettier --check src tests docs` | 0 | clean |
| `npx eslint .` | 0 | no errors |

The unit-test command in `unit-test-instructions.md` selects files of the full suite and is covered by it.

## Coverage (v8, lines)

All files 90.88% (floor 80%). `src/renderer/TokenDetail.jsx` 94.54%.

## Failures

The first coverage run had one failing test that did not repeat in a plain run or a second coverage run; its name was not captured. Treated as a timing flake under coverage load, not caused by this change (it touches one prop in `TokenDetail.jsx` and adds one test file). Watch for it in CI.

Renderer tests run in jsdom, not a real browser engine.
