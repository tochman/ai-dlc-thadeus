# Test Results: v0.2.3

Last run on 2026-11-14 on macOS (Darwin 24.6.0), on the person's machine, after the third Code Generation build (US-0408, the EPIC-00 fixes US-0001–US-0003, Step 23c).

## Build

- **App build:** `npx electron-vite build`: success.
- **macOS installer:** `npm run build:mac`: success. Output: `dist/THADEUS-0.2.3-universal.dmg` (universal, unsigned as configured).

## Unit tests (this work's commands)

| Command | Files | Tests | Result |
|---------|-------|-------|--------|
| `npx vitest run tests/main/settings.test.js tests/main/aidlcWrite.test.js tests/main/modelChoice.test.js tests/main/updater.test.js tests/main/menu.test.js tests/main/i18nKeys.test.js tests/main/features.test.js` | 7 | 51 | 51 passed, exit 0 |
| `npx vitest run tests/renderer/ConfigView.test.jsx tests/renderer/TerminalPanel.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx tests/renderer/UpdateNotice.test.jsx tests/renderer/AboutDialog.test.jsx` | 5 | 41 | 41 passed, exit 0 |

## Full suite

`npx vitest run tests/`: 51 files, 278 tests, **278 passed**, exit 0.

- The `featureDocsStatus` check went green once the built stories were marked ✅ Done for v0.2.3, per the person's new lifecycle rule.
- No coverage floor is set for this project.

## FR2.1: 20 000-event timeline in the real Electron renderer (US-0301)

- **Command:** `npx electron tests/.tmp/timing-v023.cjs`. It uses a private userData folder under `tests/.tmp`, so the person's settings are untouched.
- **Filter change:** 25, 33, 34, 33, 33, 34 ms. The target is under 200 ms.
- **Rows rendered:** 20 of 20 000 (windowed).
- **Scroll frame gaps:** p50 22 ms, p95 47 ms.
- **Renderer console errors:** none.
- **Where it ran:** the real Electron renderer (Chromium).

## Checks on the person's machines

- **FR2.2 / US-0401, macOS:** done by the person on 2026-11-14. The installed `THADEUS-0.2.3-universal.dmg` starts, shows 0.2.3 in "Om T.H.A.D.E.U.S.", and opens a project.
- **FR2.2 / US-0401, Linux:** needs a Linux machine and the `.deb` built by CI.
- **US-0407, a real update:** needs a published release newer than the installed app, so it can only be checked from v0.2.3 to a later release, or on a test tag.
- **NFR5, offline start:** a `gh` failure is covered by unit tests. A real offline start was not run.
