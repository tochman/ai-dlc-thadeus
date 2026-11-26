# Test Results — US-1304

Run 2026-11-26 on `feat/US-1304` (main is ahead only by two `.thadeus` token-log syncs, no code, so no merge was needed).

| Command | Exit | Result |
|---|---|---|
| `npx vitest run tests/main/delivery.test.js tests/main/platforms.test.js tests/main/ipc.test.js tests/renderer/VelocityView.test.jsx tests/main/velocity.test.js tests/main/i18nKeys.test.js` | 0 | 6 files, 188 passed |
| `npx vitest run tests/ --coverage` | 0 | 207 files, 3,164 passed, 1 skipped, 0 failed |
| `npx eslint .` | 0 | no problems |
| `npx prettier --check .` | 0 | all files formatted |

## Coverage (v8, full suite)

- All files: lines 94.05%, statements 92.22%, branches 85.79%, functions 90%. The 80% line floor holds.
- `src/main/parsers/delivery.js`: lines 100%, branches 95.77%.

## Failures

None.
