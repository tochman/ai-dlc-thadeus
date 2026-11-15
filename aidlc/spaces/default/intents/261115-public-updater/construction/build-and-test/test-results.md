# Test Results: US-0413

Run 2026-11-15 on branch `feat/US-0413`, all in Node (vitest `main` project) or jsdom (`renderer` project).

| Check | Command | Exit | Result |
|---|---|---|---|
| Unit tests (this work) | `npx vitest run tests/main/updater.test.js tests/main/i18nKeys.test.js` | 0 | 23 / 23 passed (updater 19, i18n keys 4) |
| Full suite + coverage | `npx vitest run tests/ --coverage` | 0 | 1350 / 1350 passed, 104 files; lines 90.34 %, statements 88.14 %, branches 81.49 %, functions 83.88 %; `updater.js` lines 91 % |
| ESLint | `npx eslint .` | 0 | 0 errors, 24 warnings (unchanged) |
| Prettier | `npx prettier --check .` | 0 | clean |
| Build | `npx electron-vite build` | 0 | built |

- **Failures:** none in these runs. During Code Generation one full run failed `tests/main/watcher.test.js` ("reports a ledger created after watching started…"). That test waits on real file-system events, does not touch the updater, and passed in every later run: flaky, outside this work.
- **TDD evidence:** the Red run (8 new tests failing, 11 existing passing) is in `../code-generation/code-summary.md`.
- **Not run here:** a live call to `api.github.com` and a real download and install. They are part of the manual `.dmg` check and the smoke test at release (team.md Deployment).
