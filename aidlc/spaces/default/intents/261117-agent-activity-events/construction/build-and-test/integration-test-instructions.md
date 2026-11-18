# Integration Test Instructions: US-0214

Key boundaries, all in the existing vitest suite (Node and jsdom; no real browser, no live agent):

| Boundary | Tests |
|---|---|
| `dialog.sh` → event file (real `sh` process, temp session folder) | `tests/main/dialogScript.test.js`, `dialogScriptReply.test.js` |
| opencode plugin → event file | `tests/main/opencodePlugin.test.js`, `opencodePluginReply.test.js` |
| event file → adapter → store → `agent:activity` push | `tests/main/agentAdapters.test.js`, `agentEvents.test.js` |
| store + audit fallback → Agent progress rows | `tests/main/agentProgress.test.js`, `tests/renderer/AgentProgress.test.jsx` |
| installer preview of the hook entries | `tests/main/agentHooks.test.js`, `agentHooksInstaller.test.js` |

Run: `npx vitest run tests/` (part of the full suite). Coverage target: 80% lines, full suite (`npx vitest run tests/ --coverage`).
Not covered here: live Claude Code / opencode sessions and the built app; checked by hand before the release.
