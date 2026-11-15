# Unit Test Instructions: US-1101

## Setup

Existing vitest 5.1.0 setup (`vitest.config.mjs`): project `main` (node) and `renderer` (jsdom, Swedish locale). No new configuration.

## Commands for this work

Ready before the first Red step (Step 8):

```bash
npx vitest run tests/main/thirdPartyLicenses.test.js tests/renderer/AboutDialog.test.jsx
```

Fixture and test-name changes (Step 5) are checked with the tests that read them:

```bash
npx vitest run tests/main/notify.test.js tests/renderer/AppShell.test.jsx tests/renderer/SettingsView.test.jsx tests/main/features.test.js tests/main/git.test.js tests/main/ledger.test.js tests/main/parsers.test.js tests/main/projectService.test.js tests/main/watcher.test.js tests/renderer/picker.test.jsx tests/renderer/pickerSmoke.test.jsx tests/renderer/AgentDialog.test.jsx
```

## New tests (5)

| File | Test | Requirement |
|---|---|---|
| `tests/main/thirdPartyLicenses.test.js` | non-dev packages listed with licence text | FR6.1 |
| | bundled dev packages in, other dev packages out | FR6.1 |
| | `license` field used when no licence file | FR6.1 |
| `tests/renderer/AboutDialog.test.jsx` | licences button calls `bridge.openLicenses` | FR6.2 |
| | an open error is shown | FR6.2 |

## Mocking and test data

- `collectLicenses(lock, readText)` takes a plain lock object and a `readText(path)` stub: no disk access in the test.
- The renderer test stubs `window.bridge.openLicenses` (resolve, then reject).
- Invented fixture content keeps the same ids, counts and structure the existing assertions use.

## Coverage

The project floor is 80% line coverage (team rule), measured by Build and Test on the full suite (`npx vitest run tests/ --coverage`); these scoped runs do not judge it.
