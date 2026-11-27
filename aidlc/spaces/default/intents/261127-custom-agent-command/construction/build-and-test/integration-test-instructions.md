# Integration Test Instructions: US-0806

## Key boundaries

| Boundary | Test file | What it checks |
|---|---|---|
| Renderer → `projectSettings:set` → settings file | `tests/main/ipc.test.js`, `tests/main/settings.test.js` | An invalid command is refused with `errors.agentCommand.<reason>` and nothing is saved (FR3, NFR1) |
| `pty:spawn` → saved command → node-pty | `tests/main/ipc.test.js`, `tests/main/pty.test.js` | The command is read in main, never from the tab; checked again before node-pty loads (FR2, NFR1) |
| `pty:spawn` → `command -v` | `tests/main/ipc.test.js` | One login-shell run per tab start; a missing word returns `{ notFound }` and starts nothing (FR4, NFR3) |
| Settings view ↔ terminal panel | `tests/renderer/ProjectView.test.jsx`, `tests/renderer/TerminalPanel.test.jsx` | A saved command unblocks a tab; the not-found sentence opens Configuration › Agent (FR4.2) |

## Run

```bash
npx vitest run tests/main/ipc.test.js tests/main/pty.test.js tests/main/settings.test.js tests/renderer/ProjectView.test.jsx tests/renderer/TerminalPanel.test.jsx
```

Main tests run in Node, renderer tests in jsdom. `node-pty` and `exec` are mocked; no real CLI starts.

## Built app

`npx electron-vite build && npx playwright test` drives the built app in Electron. No new end-to-end test was added for this story.

## Coverage

80% line coverage over `src/**`, measured on the full suite.
