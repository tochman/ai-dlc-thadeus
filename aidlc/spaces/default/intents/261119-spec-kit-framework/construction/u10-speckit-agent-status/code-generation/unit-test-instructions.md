# Unit Test Instructions: U10 u10-speckit-agent-status (US-1410)

## Setup

vitest 5.1.0, already set up in `vitest.config.mjs` with the `main`, `scripts` and `renderer` projects. Step 2 of the plan adds `tests/main/agentProgressSpeckitTimed.test.js` to `TIMED`, so it runs in `scripts` (retried twice) and not in `main`. No other setup.

## Run this Unit's tests

Each command is a command of its own, from the project root.

```bash
npx vitest run --project main tests/main/agentProgressSpeckit.test.js tests/main/ipc.test.js tests/main/i18nKeys.test.js
```

```bash
npx vitest run --project scripts tests/main/agentProgressSpeckitTimed.test.js
```

```bash
npx vitest run --project renderer tests/renderer/SpeckitProgress.test.jsx tests/renderer/AgentDialog.test.jsx tests/renderer/SpeckitShell.test.jsx
```

Before Step 3 the first command runs and passes on today's `ipc.test.js`; the new files then fail (Red) until their Green step.

## Expected coverage

- The project floor is 80% line coverage (v8) over `src/**`. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`); these Unit-scoped runs do not judge it, and the threshold is never lowered.
- Every branch of `waitingFrom`, `loadSpeckitProgress` and the `agents:progress` branch order is hit by a test; `SpeckitProgress.jsx` has a test per screen state.

## Mocks and test data

- Main: build events as plain objects in the public view shape (`eventId`, `projectId`, `harness`, `source`, `kind`, `state`, `arrivedAtMs`, `seq`, `questions`, `permission`); pass `loadFeatures` as a stub (resolve, reject) so the logic tests need no files. The timed test builds 30 features and 200 events in memory.
- IPC: follow the existing `ipc.test.js` setup; a Spec Kit fixture folder in a temp dir with `.specify/` and `specs/`; `vi.spyOn` on the fs write, mkdir, rename and unlink calls for the read-only check.
- Renderer: stub `window.bridge.getAgentProgress`, `window.bridge.agentEvents.onChanged` and `window.bridge.onSpeckitChanged`, keep the callbacks to fire pushes, and check the returned unsubscribe is called on unmount. The renderer project runs in the Swedish locale.
