# Unit Test Instructions: US-0214

## Framework

vitest 5.1.0 with the existing config, in two projects: `main` (node) and `renderer` (jsdom, Swedish locale). No new runner or dependency.

## Baseline (before the first Red)

```bash
npx vitest run tests/main/agentProgress.test.js tests/main/agentProgressLoad.test.js tests/main/workingAgents.test.js tests/main/agentHooks.test.js tests/main/agentHooksInstaller.test.js tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/main/dialogScript.test.js tests/main/opencodePlugin.test.js tests/main/tokenChart.test.js tests/main/i18nKeys.test.js tests/renderer/TokenDetail.test.jsx tests/renderer/TokenView.test.jsx
```

## This work's tests

```bash
npx vitest run tests/main/agentActivity.test.js tests/main/agentProgress.test.js tests/main/agentProgressLoad.test.js tests/main/workingAgents.test.js tests/main/agentHooks.test.js tests/main/agentHooksInstaller.test.js tests/main/agentAdapters.test.js tests/main/agentEvents.test.js tests/main/dialogScript.test.js tests/main/opencodePlugin.test.js tests/main/tokenChart.test.js tests/main/i18nKeys.test.js tests/renderer/AgentProgress.test.jsx tests/renderer/TokenDetail.test.jsx tests/renderer/TokenView.test.jsx
```

- **New:** `tests/main/agentActivity.test.js` (10–12 tests). `tests/renderer/AgentProgress.test.jsx`, if it does not exist yet (6–8).
- **Extended:** the others listed above, 2–5 tests each. About 40 new tests in all.

## Coverage

The team floor is 80% line coverage on the full suite. Build and Test checks it there; these targeted runs do not.

## Mocking and test data

- **The screenshot case (Step 2):** inline audit and inflight fixtures shaped like the `261117-session-handoff-dialog` record.
- **Activity events:** small JSON payloads per event, inline in the tests. The Claude Code fields are from its hooks reference. The opencode V2 envelope is `{ type, data }`.
- **Timers:** faked for the 2 s push, the 30 s idle and time in state.
- **Hook script:** `dialog.sh` runs in a temporary session folder, as in `dialogScript.test.js`.
- **Renderer:** the renderer tests use the existing fake `window.bridge`. The chart tests use the token readings fixtures already in `tests/`.
