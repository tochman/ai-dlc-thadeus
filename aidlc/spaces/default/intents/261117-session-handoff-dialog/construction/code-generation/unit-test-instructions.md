# Unit Test Instructions: US-0213 + US-0026

## Framework

vitest 5.1.0, existing config (`vitest.config.*`), two projects: `main` (node) and `renderer` (jsdom, Swedish locale, `tests/renderer/setup-i18n.js`). No new runner or dependency.

## Baseline (before the first Red)

```bash
npx vitest run tests/main/agentHooks.test.js tests/main/agentHooksInstaller.test.js tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/main/dialogScript.test.js tests/main/opencodePlugin.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/i18nKeys.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/terminalControl.test.jsx tests/renderer/ProjectSettingsView.test.jsx
```

## This work's tests

```bash
npx vitest run tests/main/contextSize.test.js tests/main/sessionHandoff.test.js tests/main/agentHooks.test.js tests/main/agentHooksInstaller.test.js tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/main/dialogScript.test.js tests/main/opencodePlugin.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/i18nKeys.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogHandoff.test.jsx tests/renderer/terminalControl.test.jsx tests/renderer/ProjectSettingsView.test.jsx
```

New files: `tests/main/contextSize.test.js` (5–6), `tests/main/sessionHandoff.test.js` (8–10), `tests/renderer/AgentDialogHandoff.test.jsx` (6–8). Extended: the others listed above (2–5 each), about 45 new tests in all.

## Coverage

The team floor is 80% line coverage on the full suite. Coverage is not measured in the repository yet, and Build and Test judges it on the full suite; this file's runs do not.

## Mocking and test data

- `dialog.sh` runs in a temporary session folder, as `dialogScript.test.js` already does. A fake `alive` file, no real agent.
- Transcripts are small JSONL fixtures written into a temporary directory in the test, including a half-written last line.
- The renderer tests use the existing fake `window.bridge` and the terminal write spy from `terminalControl.test.jsx`. Timers are faked for the 5 s typing rule and the "ready" wait.
- The price table comes from `modelRates.js` fixtures. One model has no rate.
- The state and audit fixtures for the gate moment are inline strings: `[?]` in the state, then `STAGE_AWAITING_APPROVAL` as the latest gate event.
