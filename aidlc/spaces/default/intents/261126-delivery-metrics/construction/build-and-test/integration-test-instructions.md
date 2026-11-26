# Integration Test Instructions — US-1304

Key boundaries, all run in Node or jsdom (not a real browser):

- Platform client ↔ `gh`/`glab`/Bitbucket REST: `tests/main/platforms.test.js` injects `exec`/`fetch` and checks `listMergedPulls` and `listReleases` in the common shape, and `unknown-platform` for releases outside GitHub.
- IPC `project:velocity` ↔ delivery calculations: `tests/main/ipc.test.js` checks `delivery` with the platform parts present, and a failing or missing platform as named missing sources.
- View ↔ IPC result: `tests/renderer/VelocityView.test.jsx` (jsdom, Swedish locale) renders the Delivery section from a fixture.

Run: `npx vitest run tests/main/platforms.test.js tests/main/ipc.test.js tests/renderer/VelocityView.test.jsx`

No live call to GitHub is made in the tests. A real read against this repository is a manual check in the running app (Velocity › Delivery).
