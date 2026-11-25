# Test results (2026-11-25)

| Check | Where | Result |
|---|---|---|
| `npx electron-vite build` | here | success |
| `npx vitest run tests/ --coverage` | here | exit 0: 189 files, 2682 passed, 1 skipped, 0 failed; 93.52% lines |
| The two files, 50 times in a row | here | 50 passed |
| The two files under 24 busy loops, 3 times | here | passed; at most 2.5 s of 5 s |
| ESLint, Prettier | here | clean |

Both tests ran in jsdom. The built-app tests run in CI; no source file changed. The skipped test was not looked into.
