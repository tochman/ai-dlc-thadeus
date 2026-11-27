# Unit Test Instructions: US-0806

## Framework

vitest 5.1.0, already set up in `vitest.config.mjs` (projects `main`, node, and `renderer`, jsdom with the Swedish locale). No new configuration or dependency.

## Run this work's tests

```bash
npx vitest run tests/main/harness.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/ipc.test.js tests/main/i18nKeys.test.js tests/renderer/ProjectSettingsView.test.jsx tests/renderer/TerminalPanel.test.jsx tests/renderer/terminalControl.test.jsx
```

This command is runnable before the first Red step (all eight files exist). Style on the changed files:

```bash
npx eslint src/shared/harnesses.js src/main/settings.js src/main/pty.js src/main/ipc.js src/renderer/ProjectSettingsView.jsx src/renderer/TerminalPanel.jsx src/renderer/App.jsx
```

```bash
npx prettier --check src/shared/harnesses.js src/main/settings.js src/main/pty.js src/main/ipc.js src/renderer/ProjectSettingsView.jsx src/renderer/TerminalPanel.jsx src/renderer/App.jsx src/shared/locales/sv.json src/shared/locales/en.json
```

## Expected coverage

About 30 new tests: shared rule 8, settings 5, pty 3, `pty:spawn` 4, Agent section 5, terminal panel 4, Resume gating 1. The project floor (80% line coverage, v8, over `src/**`) is measured by Build and Test on the full suite; the scoped run above does not judge it.

## Mocking

- `node-pty` is mocked as in the existing `pty.test.js`; assert the shell arguments, never start a real CLI.
- The `command -v` check goes through an injected `exec`, as `runFixed` already allows; tests answer found (exit 0) or not found (a rejection).
- Settings use the existing temp settings file of `settings.test.js`.
- Renderer tests stub `window.bridge.setProjectSettings` and `window.bridge.ptySpawn`.

## Test data

Commands: `codex --full-auto`, `~/bin/my-cli -p x=1`, `claude --model sonnet`; refused: `claude; rm -rf ~`, `a|b`, `$(x)`, `` `x` ``, `"a"`, `a\nb`, `   `, and a 501-character string.
