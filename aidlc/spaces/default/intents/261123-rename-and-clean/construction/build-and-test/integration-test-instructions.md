# Integration test instructions

The boundaries this work crosses, and the tests that cover them (vitest, no extra setup):

| Boundary | Test | Runs in |
|---|---|---|
| Names file ↔ intent list (`intentNames.js` → `loadIntentList` → `mergeIntents`) | `tests/main/projectService.test.js`, `tests/main/intents.test.js` | Node, temp project root |
| Renderer ↔ main (`renameIntent` → `intents:rename` → write → `project:changed`) | `tests/main/ipc.test.js`, `tests/main/preload.test.js` | Node, mocked Electron IPC |
| `.thadeus` watcher → list reload | `tests/main/ipc.test.js` (fake `watchThadeus` driven by hand) | Node |
| Detail rename form → bridge | `tests/renderer/IntentRename.test.jsx` | jsdom (a DOM emulator, not a real browser) |
| Built app, all views (US-0043 changed effects across the app) | `tests/e2e` (Playwright, Electron) | Real Chromium in Electron, run by CI's `verify` job |

Run the full suite with coverage once: `npx vitest run tests/ --coverage`. The end-to-end tests run in CI on every pull request.
