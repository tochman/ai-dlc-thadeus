# Unit Test Instructions: U3 u3-thadeus-sync

## Setup
vitest 5.1.0, already set up (`main` in node, `renderer` in jsdom with the Swedish locale). Nothing to install. The data-access tests need `git` on PATH, as `planningSync.test.js` already does.

## Run this Unit's tests
```
npx vitest run tests/main/thadeusSync.test.js tests/main/planningRecord.test.js tests/main/planningSync.test.js tests/main/agentHooksInstaller.test.js tests/main/setup.test.js tests/main/costRules.test.js tests/main/ipc.test.js tests/renderer/FeaturesView.test.jsx tests/renderer/SetupAidlc.test.jsx tests/main/i18nKeys.test.js tests/renderer/noNativeTitle.test.jsx tests/main/featureDocsStatus.test.js tests/main/fileWrite.test.js
```
`fileWrite.test.js` was added after Build and Test's first run: its SD36 test lists every module that may import `writeAtomic`, and `thadeusSync.js` is one.
`tests/main/thadeusSync.test.js` is new (Step 6); before then, run the same command without it. The rest is green on the unchanged code.

## What is tested
- `thadeusSync.test.js` (new): 9 cases for paths, the worktree commit, batching, the token-log merge, conflicts, the harness rows and the docs branch (AC3.1.1, AC3.1.2, AC3.1.4–AC3.1.6).
- `planningRecord.test.js`: 2 cases for the `thadeus` kind.
- `agentHooksInstaller.test.js`, `setup.test.js`, `costRules.test.js`: 1 each (AC3.1.3, AC3.1.7).
- `FeaturesView.test.jsx`, `SetupAidlc.test.jsx`: 1 each (AC3.1.8, AC3.1.7).
- `planningSync.test.js`, `ipc.test.js`, `i18nKeys.test.js`, `noNativeTitle.test.jsx`, `featureDocsStatus.test.js`: stay green.

## Mocking and test data
- Git: real temporary repositories with a bare `origin` and a second clone standing for another machine, made and removed in each test, as `planningSync.test.js` builds them. The story branch is `feat/US-9001`.
- Token logs are small JSON files shaped like `tokenReadings.js` writes them. The clock is injected.
- `gh` is a stub; `net.isOnline` is true.

## Coverage
The project's 80% line-coverage floor (v8, `src/**`) is checked by Build and Test on the full suite (`npx vitest run tests/ --coverage`). This command is not run with `--coverage`.
