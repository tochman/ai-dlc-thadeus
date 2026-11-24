# Unit Test Instructions: U5 u5-speckit-commands (US-1403)

## Setup

vitest 5.1.0, already configured in `vitest.config.mjs` with the `main` (node) and `renderer` (jsdom, Swedish locale) projects. No install, no new dependency.

## Run this unit's tests

Pure functions (command form, next command, description):

```bash
npx vitest run --project main tests/main/speckitCommands.test.js
```

Renderer tests (the button, the quick bar, the feature detail and the two changed views):

```bash
npx vitest run --project renderer tests/renderer/SpeckitCommandButton.test.jsx tests/renderer/SpeckitQuickCommands.test.jsx tests/renderer/SpeckitFeatures.test.jsx tests/renderer/SpeckitRules.test.jsx
```

Both run before the first Red step (Step 2); a new file reports "no test files" or fails until written.

## Expected coverage

- About 40 tests: `speckitCommands` 18, button 9, quick bar 7, feature detail and views 6.
- The project's 80% line-coverage floor over `src/**` is checked by Build and Test on the full suite, not by these scoped runs. Never lower the threshold in `vitest.config.mjs`.

## Mocking and stubbing

- `speckitCommands.test.js` calls the pure functions with plain values; no mocks.
- Renderer tests stub `useTerminal()` (`lastAgent`, `harnessOf`, `harness`, `state`, `asking`, `type`, `show`) and `window.bridge` for `speckit:rules` and the `speckit:changed` push, following the existing `SpeckitRules.test.jsx` and `SpeckitFeatures.test.jsx`.
- The double-click test holds `type` pending with a deferred promise.
- The write-spy test is the existing one in the Spec Kit view tests, extended to click every new button.

## Test data

Feature objects are built in each test in U6's shape (`flow`, `tasks.phases` with `round`, `active`). No fixture files are committed.
