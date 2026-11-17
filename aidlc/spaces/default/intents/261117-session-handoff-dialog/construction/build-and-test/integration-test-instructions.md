# Integration Test Instructions: US-0213 + US-0026

## Automated (Node and jsdom, part of the suite)

`npm run coverage` runs them with everything else. The key boundaries:

- **Hook script and channel:** `tests/main/dialogScript*.test.js` run the real `dialog.sh` under `sh` in a temporary session folder: new kinds, the 2-second limit, and exit 0 on every failure.
- **Installer:** `tests/main/agentHooks*.test.js` cover the preview, the update from v0.2.8, and AI-DLC's entries staying untouched.
- **opencode plugin:** `tests/main/opencodePlugin*.test.js`, against a fake `ctx`.
- **Events and signals:** `tests/main/agentEvents*.test.js` and `tests/main/agentAdapters*.test.js`.
- **Logic:** `tests/main/sessionHandoff.test.js` and `tests/main/contextSize.test.js`, against real transcript fixtures on disk.
- **Renderer (jsdom):** `tests/renderer/AgentDialogHandoff.test.jsx`, `tests/renderer/terminalControl.test.jsx` and `tests/renderer/ProjectSettingsView.test.jsx`.

## Manual, in the running app (`npm run dev` or the built `.dmg`)

1. **Update the hooks:** apply the hooks preview's Update, restart Claude Code in the agent tab, and check `.claude/settings.json`. The app's eight entries should be there, the report-only ones with `"async": true`, and AI-DLC's entries unchanged.
2. **US-0026:** start a new session (`/clear`) while the agent dialog is open. No empty page should show.
3. **Gate, then Fresh session (OQ1):** at an AI-DLC gate, the dialog opens. Choose Fresh session. The app should type `/clear`, wait for the new session, then type `/aidlc --resume`. Check that the gate is shown again and accepts your approval.
4. **Compact:** choose Compact. `/compact` is sent with the instruction. Check that the summary keeps the intent, stage and open decisions, and that the console logs the context size before and after.
5. **Idle rule:** while a tool runs, or while you type, the choice waits. It is sent once the agent is idle.
6. **Threshold:** set a low threshold in Configuration. The dialog opens when it is passed. Not now asks again only after another 50 000 tokens.
7. **opencode:** repeat steps 3–5 in an opencode tab (`/new` or `/clear`, `/compact`).
8. **LCARS and keyboard:** check the page and the settings section by eye in both themes, and use every choice by keyboard.
