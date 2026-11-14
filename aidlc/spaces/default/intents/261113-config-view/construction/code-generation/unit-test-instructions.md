# Unit Test Instructions: US-0901 Configuration view

## Framework

Vitest (existing `vitest.config.mjs`), `@testing-library/react` for renderer tests. No new dependency or config.

## Run this work's tests

```bash
npx vitest run tests/main/aidlcConfig.test.js tests/main/watcher.test.js tests/renderer/ConfigView.test.jsx tests/renderer/AppShell.test.jsx tests/main/i18nKeys.test.js
```

Build and Test also runs the full suite (`npm test`) to keep the existing tests green.

## Expected coverage

Minimal strategy: one test per requirement group, a happy path per component (14 tests listed in the plan, Steps 4, 6 and 8). The scope sets no coverage floor.

## Mocking

- Main: inject `exec` into `getAidlcConfig` (the same pattern as `tests/main/configuredModels.test.js`), returning canned JSON from the real `aidlc` output shape (`schemaVersion: 1`), or rejecting with `ENOENT` for a missing CLI. Plans are read from a temporary project folder.
- Renderer: stub `window.bridge.getAidlcConfig`, `detectHarnesses`, `onConfigChanged` and `onProjectChanged` the way the existing renderer tests stub the bridge.

## Test data

Inline fixtures in the test files, trimmed from the 2026-11-14 output of `aidlc config --show --json` and `aidlc config list --json` on this project.
