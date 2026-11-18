# Test Results: US-0028 calm pipeline note

Run 2026-11-18 on branch `fix/US-0028`.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | main, preload and renderer built |
| `npx vitest run tests/ --coverage` | 0 | 148 files, 1882 passed, 0 failed; thresholds met |
| `npx prettier --check src tests docs` | 0 | clean |
| `npx eslint .` | 0 | 0 errors, 29 warnings (all `react-hooks/exhaustive-deps` in files this fix does not touch) |

The unit-test command in `unit-test-instructions.md` (`tests/renderer/Pipeline.test.jsx tests/main/i18nKeys.test.js`) selects files of the full suite, so the full run covers it. It is not run a second time.

## Coverage (v8, lines)

All files 92.3% (floor 80%). `src/renderer/Pipeline.jsx` 100%.

## Failures

None.

Renderer tests run in jsdom, not in a real browser engine.
