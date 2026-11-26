# Test Results: health check (US-0805)

Run 2026-11-26 on `feat/US-0805`, macOS. `origin/main` is ahead by only five `.thadeus` sync commits, so no other story was merged in meanwhile.

| Command | Exit | Result |
|---|---|---|
| `npx vitest run tests/ --coverage` | 0 | 201 files; 2,983 passed, 1 skipped, 0 failed. Lines 93.95% (11,721 of 12,475) |
| `npx eslint . --max-warnings 0` | 0 | clean |
| `npx prettier --check .` | 0 | clean |
| `npx electron-vite build` | 0 | built |
| `npx playwright test` | 0 | 28 passed in 3.1 min, 4 of them in `healthCheck.spec.js` |

The full-suite run includes the stage-level unit command and `tests/main/toolsNoAnswer.test.js`, which the developer added outside that command.

Coverage of the new and changed files (lines): `HealthCheck.jsx` 100%, `health.js` 100%, `tools.js` 98.03%, `SignIn.jsx` 100%. `src/shared` as a whole is 100%.

Where it ran: the views and the scan were tested in jsdom (integration), and the behaviour in the window in Electron's Chromium through Playwright, at 1280 px.

No failure, no loop-back.

Not checked here: the macOS `.dmg` by hand, before the release tag (team practice). The Linux command box was measured on macOS, with the Linux text placed in it, not on Linux.
