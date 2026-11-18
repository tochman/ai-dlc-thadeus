# Test Results: v0.2.9 release

| Run | Command | Result |
|---|---|---|
| Full suite + coverage | `npx vitest run tests/ --coverage` | 148 files, 1879/1879 pass; lines 92.29% (floor 80%) |
| Lint | `npx eslint .` | 0 errors, 29 warnings (the same kind as before; none in the new test) |
| Format | `npx prettier --check .` | clean |
| Build | `npm run build` | `dist/THADEUS-0.2.9-universal.dmg` built |
| New tests | `npx vitest run tests/main/releaseVersion.test.js` | 5/5 pass |

No loop-back was needed.
