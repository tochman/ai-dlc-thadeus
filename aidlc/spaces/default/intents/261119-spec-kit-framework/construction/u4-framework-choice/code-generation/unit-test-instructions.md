# Unit Test Instructions: U4 u4-framework-choice (US-1406)

## Setup

vitest 5.1.0, already configured in `vitest.config.mjs` with the `main` (node), `scripts` (timed, retried twice) and `renderer` (jsdom, Swedish locale) projects. No install.

## Run this unit's tests

Main-process tests (detection, tool lookup, scan, choose, IPC):

```bash
npx vitest run --project main tests/main/projectService.test.js tests/main/tools.test.js tests/main/frameworkChoice.test.js tests/main/ipc.test.js
```

Timed scan:

```bash
npx vitest run --project scripts tests/main/frameworkChoiceTimed.test.js
```

Renderer tests (the choice screen and its mount):

```bash
npx vitest run --project renderer tests/renderer/FrameworkChoice.test.jsx tests/renderer/ProjectView.test.jsx
```

All three run before the first Red step (Step 2); a new file reports "no test files" or fails until written.

## Expected coverage

- About 40 tests: detection 6, tool lookup 6, scan 7, choose 8, IPC 5, renderer 10, timed scan 1.
- The project's 80% line-coverage floor over `src/**` is checked by Build and Test on the full suite, not by these scoped runs. Never lower the threshold in `vitest.config.mjs`.

## Mocking and stubbing

- Detection, scan and choose tests use real temp folders (`fs.mkdtemp`) with `aidlc/spaces/<space>/`, `.specify/` and `.thadeus/project.json` as needed, and `vi.spyOn` on the `fs` write calls for the no-write checks.
- Tool lookup tests use real temp files with and without the executable bit, a stubbed `searchPath`, `setToolPaths` for saved paths, and an injected `exec` that fails the test if called.
- IPC tests follow the existing `ipc.test.js` pattern; the watchers are the existing fakes, so the test can check which one starts.
- Renderer tests stub `window.bridge.frameworkScan`, `chooseFramework` and the setup panels' bridge calls.

## Test data

Fixtures are built in each test from small helpers (a space folder, a `.specify/` folder, a project file). No fixture files are committed.
