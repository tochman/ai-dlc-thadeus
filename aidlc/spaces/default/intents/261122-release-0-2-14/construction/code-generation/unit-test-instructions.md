# Unit Test Instructions: Release v0.2.14

## Framework

vitest 5.1.0, already set up in `vitest.config.mjs` with the `main` (node) and `renderer` (jsdom, Swedish locale) projects. Nothing to install.

## Commands (scoped to this work)

Each story's tests, run on its own branch:

```bash
# US-0038
npx vitest run tests/main/planningSync.test.js tests/main/planningRecord.test.js tests/renderer/FeaturesView.test.jsx
# US-0039
npx vitest run tests/main/sessionHandoff.test.js tests/renderer/terminalControl.test.jsx tests/renderer/AgentDialogHandoff.test.jsx
# US-0037
npx vitest run tests/renderer/IntentDetail.test.jsx tests/renderer/ResumeButton.test.jsx
# US-0040
npx vitest run tests/main/parsers.test.js tests/renderer/IntentList.test.jsx
# Locale keys (every story with new texts)
npx vitest run tests/main/i18nKeys.test.js
```

Runnable before the first Red: `npx vitest run tests/main/sessionHandoff.test.js`.

## Coverage

The project floor is 80% line coverage over `src/**`. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`); these scoped runs do not judge it.

## Mocking

- Main: the existing `exec`/git helpers in `planningSync.test.js` (real temporary git repos) and the fake store in `sessionHandoff.test.js`.
- Renderer: the existing `window.bridge` stubs and fake terminal sessions; no new mocks.

## Test data

UUID v7 strings with known time prefixes for FR4.2; temporary git repos with a tagged release for FR1.2.
