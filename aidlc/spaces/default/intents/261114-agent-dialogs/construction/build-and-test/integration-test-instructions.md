# Integration Test Instructions: US-0506 agent dialogs

## Sources

- Boundary tests named in each unit's `construction/<unit>/code-generation/unit-test-instructions.md` and `code-generation-plan.md`; built files in each `code-summary.md`.

## Framework

vitest 5.1.0, projects `main` (node), `scripts` (node, the real-time hook script tests, run after the others) and `renderer` (jsdom, Swedish locale). All checks below run in Node or jsdom, never in a real browser or the built app.

## Cross-unit boundaries

| Boundary | Units | Command |
|---|---|---|
| Hook script → channel → event store (real channel, real `sh`) | u1, u2, u3 | `npx vitest run tests/main/agentChannelScript.test.js tests/main/agentRepliesFlow.test.js` |
| Script under `sh` and `dash`, Stop and permission branches | u1, u2, u3 | `npx vitest run --project scripts` |
| opencode plugin with a stubbed V2 `ctx` | u1, u2, u3 | `npx vitest run tests/main/opencodePlugin.test.js tests/main/opencodePluginReply.test.js` |
| Install → source choice | u4 → u1 | `npx vitest run tests/main/agentHooksFlow.test.js tests/main/agentHooksGuard.test.js` |
| Event → notification → focus | u5 → u1–u3 | `npx vitest run tests/main/agentAlertsFlow.test.js tests/renderer/AppAlerts.test.jsx` |
| IPC and preload wiring | all | `npx vitest run tests/main/ipc.test.js tests/main/preload.test.js tests/main/agentIpc.test.js` |

The full suite (`npm run coverage`) runs all of these once.

## Coverage expectation

80% lines over `src/**/*.{js,jsx}` and the plugin, plus the per-file 80% thresholds for the agent files (`vitest.config.mjs`).

## What these do not cover

The real harnesses. Latency in the real app, the five-scenario and six-choice runs, the install against real Claude Code and opencode (RD44) and the Ubuntu notification check are manual runs on the release Mac and Ubuntu before the release pull request; see `build-and-test-summary.md`.
