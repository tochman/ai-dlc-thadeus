# Unit Test Instructions: U4 u4-park-unpark

## Setup
vitest 5.1.0, already set up (`main` in node, `renderer` in jsdom with the Swedish locale). Nothing to install.

## Run this Unit's tests
```
npx vitest run tests/main/intentPark.test.js tests/main/projectService.test.js tests/main/ipc.test.js tests/renderer/IntentList.test.jsx tests/renderer/IntentDetail.test.jsx tests/renderer/ResumeButton.test.jsx tests/renderer/ProjectView.test.jsx tests/main/i18nKeys.test.js tests/renderer/noNativeTitle.test.jsx tests/main/featureDocsStatus.test.js
```
`tests/main/intentPark.test.js` is new (Step 3); before then, run the same command without it. The rest is green on the unchanged code.

## What is tested
- `intentPark.test.js` (new): 9 cases for the audit and status reads, park, unpark with and without the switch, refusals, and name checks (AC4.1.1–AC4.1.6, NFR4).
- `projectService.test.js`: 2 cases for the parked fields in the list (AC4.1.1, AC4.1.6).
- `IntentList.test.jsx`, `IntentDetail.test.jsx`, `ResumeButton.test.jsx`: 6 cases for the mark, Park, Unpark and Resume (AC4.1.1–AC4.1.5).
- `ipc.test.js`, `i18nKeys.test.js`, `noNativeTitle.test.jsx`, `featureDocsStatus.test.js`: stay green.

## Mocking and test data
- AI-DLC is never run: the injected `exec(file, args, options)` records each call and answers or rejects as the case needs. The tests assert the exact argument lists.
- Audit events are inline objects shaped like `loadAuditEvents` output. The projectService cases write small audit shards in a temporary project, as the file already does.
- Renderer: `window.bridge.parkIntent`, `unparkIntent` and the terminal `type` are stubs.

## Coverage
The project's 80% line-coverage floor (v8, `src/**`) is checked by Build and Test on the full suite (`npx vitest run tests/ --coverage`). This command is not run with `--coverage`.
