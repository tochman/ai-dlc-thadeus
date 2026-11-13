# Unit Test Instructions: US-0802 Set up AI-DLC for another harness

## Framework

Vitest 5: `main` tests run in Node and `renderer` tests in jsdom, with Swedish i18n set up in `tests/renderer/setup-i18n.js`.

## Run this work's tests

```bash
npx vitest run tests/main/setup.test.js tests/main/harness.test.js tests/renderer/SetupAidlc.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx
```

All four files exist already, so this runs before the first test step.

## Tests (Minimal strategy, about 8 new)

| File | Tests | Requirements |
|------|-------|--------------|
| `tests/main/setup.test.js` (extend and update) | preview uses the chosen harness; unknown harness refused; steps run in order with fixed arguments and stop at the first failure; concurrent run refused; add mode refuses removals or conflicts | FR1.4, FR2.1–FR2.3, FR3.2, NFR3 |
| `tests/main/harness.test.js` (extend) | `setupHarness` accepts the six ids and refuses others | FR1.1, FR1.4 |
| `tests/renderer/SetupAidlc.test.jsx` (update and extend) | harness change re-runs the preview; Apply calls `runSetup` and shows a failure; switch offer after success; note for harnesses the tab can't run | FR1.1–FR1.3, FR2.2, FR4.2 |
| `tests/renderer/ProjectSettingsDialog.test.jsx` (extend) | "Add harness…" shows installed harnesses as installed | FR3.1 |

## Coverage

There is no floor (Minimal strategy). Each testable requirement gets a test, and the existing suite must stay green.

## Mocking

- **Main tests:** inject `exec` as the existing `setup.test.js` does. No real `aidlc` or `git` runs in a unit test.
- **Renderer tests:** stub `window.bridge` (`getSetupInfo`, `runSetup`, `detectHarnesses`, `setProjectSettings`).
- **The one-off CLI check** in Step 1 uses `--dry-run` only, in a temporary folder, and is recorded in code-summary.md.
