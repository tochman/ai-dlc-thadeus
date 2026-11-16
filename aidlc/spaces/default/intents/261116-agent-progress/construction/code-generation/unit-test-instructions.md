# Unit Test Instructions: US-0507 Agent progress

## Framework

vitest 5.1.0, existing `vitest.config.mjs` with projects `main` (node) and `renderer` (jsdom, Swedish locale). No new configuration.

## Run this work's tests

```bash
npx vitest run tests/main/agentProgress.test.js tests/main/agentProgressLoad.test.js tests/main/units.test.js tests/main/watcher.test.js tests/renderer/TokenDetail.test.jsx tests/main/i18nKeys.test.js
```

This command is runnable before the first Red step (the files that do not exist yet are simply absent until written).

## Tests (Minimal, one per requirement)

| File | Covers |
|---|---|
| `tests/main/agentProgress.test.js` | FR1.2, FR1.3, FR1.4, FR2.1 (`planSteps`), FR3.1, FR3.2, FR5.2 |
| `tests/main/units.test.js` | FR6.1 |
| `tests/main/agentProgressLoad.test.js` | FR2.1 (worktree and record plan), FR2.2, FR3.2 (record), FR5.3, NFR2 |
| `tests/main/watcher.test.js` | FR5.1, NFR3 |
| `tests/renderer/TokenDetail.test.jsx` | FR1.1, FR1.3, FR1.4, FR4.1, FR4.2, FR5.3, NFR4 |
| `tests/main/i18nKeys.test.js` (existing) | NFR1 |

## Expected coverage

The team's 80% line floor is not set up in the repository yet (no coverage tool); Build and Test checks it on the full suite once it exists. No coverage threshold is changed here.

## Mocking and test data

- Audit events are built in the test as the parsed shape (`{event, timeMs, fields, category}`), like `workingAgents` tests.
- The loader test writes a temp project under `tests/.tmp/` with an intent record, a `.aidlc/worktrees/bolt-<id8>_<unit>/…` plan and a review record JSON; git goes through an injected fake `exec` that asserts the fixed arguments.
- Time is passed as `nowMs`; no fake timers.
- Renderer tests mock `window.bridge.getAgentProgress` like `getTokenReadings`.
