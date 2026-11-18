# Test Results: US-0030

Run 2026-11-18 on branch `fix/US-0030` (no commits on `origin/main` since the branch was made, so no merge with main was needed).

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Build | `npm run build` | 0 | Bundled and packaged `dist/THADEUS-0.2.9-universal.dmg` |
| This work's tests | `npx vitest run tests/main/agentActivity.test.js tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/renderer/AgentProgress.test.jsx` | 0 | 4 files, 130 passed, 0 failed |
| Locale keys | `npx vitest run tests/main/i18nKeys.test.js` (with the four above) | 0 | 5 files, 134 passed |
| Full suite with coverage | `npx vitest run tests/ --coverage` | 0 | 149 files, 1931 passed, 0 failed, 0 skipped; 214 s |
| ESLint | `npx eslint .` | 0 | 0 errors, 29 warnings (none in the changed files) |
| Prettier | `npx prettier --check .` | 0 | All files formatted |

Coverage (v8, all files): statements 90.2%, branches 83.2%, functions 87.15%, **lines 92.32%** (floor 80%).

Where the checks ran: Node (main) and jsdom (renderer). No real browser engine and no run of the built app; the team's manual `.dmg` check before the release tag covers that.

No failures; no loop-back.
