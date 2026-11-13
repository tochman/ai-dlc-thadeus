# Unit Test Instructions: US-0801 Choose the harness per project

## Framework

- Vitest 5 with two projects in `vitest.config.mjs`: `main` (Node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, i18n set up in Swedish by `tests/renderer/setup-i18n.js`).

## Run this work's tests

```bash
npx vitest run tests/main/harness.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/menu.test.js tests/renderer/TerminalPanel.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx tests/renderer/ResumeButton.test.jsx
```

Step 2 checks that this command runs against the existing files. `harness.test.js` is added in Step 4.

## Tests (Minimal strategy, about 10 new)

| File | Tests | Requirements |
|------|-------|--------------|
| `tests/main/harness.test.js` (new) | folder markers including `.github/` holding AI-DLC files; a failing probe counts as not found; `resolveHarness` defaults; only claude and opencode are selectable | FR1.1, FR1.3, FR2.1, FR2.2 |
| `tests/main/settings.test.js` (extend) | `harness` kept or dropped, per project | FR2.3, FR2.4 |
| `tests/main/pty.test.js` (extend) | agent kind starts claude or opencode from the table; unknown id refused | FR3.2, FR3.3, NFR4 |
| `tests/main/menu.test.js` (extend) | agent menu action | FR3.1 |
| `tests/renderer/TerminalPanel.test.jsx` (update and extend) | `agent` test ids; opencode label; quick commands; confirm before switching a busy tab | FR3.1, FR3.2, FR4.1, FR6.1 |
| `tests/renderer/ProjectSettingsDialog.test.jsx` (extend) | choosing opencode saves; unsupported harness disabled | FR2.1, FR2.3 |
| `tests/renderer/ResumeButton.test.jsx` (extend) | disabled with a reason when the harness lacks the command | FR4.2 |

## Coverage

- No coverage floor applies (express, Minimal). Each testable requirement gets a test, and the existing suite must stay green.

## Mocking

- **Main-process tests:** mock `electron` and the exec helper the way the existing `pty.test.js` and `setup.test.js` do. Use temporary folders for the marker checks.
- **Renderer tests:** stub `window.bridge` (`detectHarnesses`, `getProjectSettings`, `setProjectSettings`, `ptySpawn`).
- **No real CLI** is started in a unit test. The opencode readiness check is a one-off build step, recorded in code-summary.md.
