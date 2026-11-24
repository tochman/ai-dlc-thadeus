# Unit Test Instructions: U8 u8-framework-switch (US-1407)

## Setup

vitest 5.1.0 is already set up in `vitest.config.mjs`, with the `main`, `scripts` and `renderer` projects. Step 2 of the plan adds `tests/main/frameworkSwitchTimed.test.js` to `TIMED`, so it runs in `scripts` (retried twice) and not in `main`. No other setup.

## Run this Unit's tests

Run each command on its own, from the project root.

```bash
npx vitest run --project main tests/main/frameworkSwitch.test.js tests/main/ipc.test.js tests/main/i18nKeys.test.js
```

```bash
npx vitest run --project scripts tests/main/frameworkSwitchTimed.test.js
```

```bash
npx vitest run --project renderer tests/renderer/FrameworkSection.test.jsx tests/renderer/ProjectView.test.jsx
```

Before Step 3, the first command runs and passes on today's `ipc.test.js`. The new files then fail (Red) until their Green step.

## Expected coverage

- The project floor is 80% line coverage (v8) over `src/**`. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`). These Unit-scoped runs do not judge it, and the threshold is never lowered.
- A test hits every branch of `switchTarget`, `switchPreview`, `switchFramework`, the direction of `applyDetection` and the `p.switching` chain. `FrameworkSection.jsx` has a test for each state.

## Mocks and test data

- Main: temp fixture folders. Use one with `aidlc/spaces/default/intents/` and two intents, one open and one completed, plus a second space. Use another with `.specify/` and `specs/001-x/tasks.md` (some tasks open), and one with both. Use `vi.spyOn` on the fs write, rename, rm and unlink calls for the read-only checks. Make the features reader throw by passing a stub. The timed test builds 20 intents and 20 features.
- IPC: follow the existing `ipc.test.js` setup. It stubs `watchIntents`, `watchFiles` and `watchForAidlc` so the test can count the watchers that open and close, keeps the sender's `send` calls in order beside the handler's reply, and injects a runner that fails when called.
- Renderer: stub `window.bridge.switchPreview`, `window.bridge.switchFramework`, `window.bridge.speckitSetup` and `window.bridge.runSetup`. Use deferred promises to test the disabled buttons and the double click. The renderer project runs in the Swedish locale.
