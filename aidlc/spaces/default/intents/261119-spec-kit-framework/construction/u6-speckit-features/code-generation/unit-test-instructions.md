# Unit Test Instructions: U6 u6-speckit-features (US-1402)

## Setup

vitest 5.1.0, already configured in `vitest.config.mjs` with the `main` (node) and `renderer` (jsdom, Swedish locale) projects. Nothing to install.

## Run this unit's tests

Main-process tests (parser, reader, read-only guard, watcher, IPC, editor guard):

```bash
npx vitest run --project main tests/main/speckitTasks.test.js tests/main/speckitFeatures.test.js tests/main/watcher.test.js tests/main/ipc.test.js tests/main/fileWrite.test.js
```

Renderer tests (features view, detail, shell):

```bash
npx vitest run --project renderer tests/renderer/SpeckitFeatures.test.jsx tests/renderer/SpeckitShell.test.jsx
```

Both run before the first Red step (Step 2); new files simply report "no test files" or fail until written.

## Expected coverage

- About 45 tests: parser 8, reader 14, read-only guard 3, watcher 3, editor guard 4, IPC 3, renderer 10.
- The project's 80% line-coverage floor over `src/**` is checked by Build and Test on the full suite, not by these scoped runs. Never lower the threshold in `vitest.config.mjs`.

## Mocking and stubbing

- Reader, guard and watcher tests use real temp folders (`fs.mkdtemp`), real symbolic links, and `vi.spyOn` on the `fs` write calls for the read-only check.
- The watcher tests use short debounce values and wait on `ready`, as the existing `watcher.test.js` does.
- IPC tests follow the existing `ipc.test.js` pattern for handlers and `sender.send`.
- Renderer tests stub `window.bridge.speckitFeatures`, `onSpeckitChanged` and `readFile`, and the terminal context's `run`.

## Test data

Fixtures are built in each test from small helpers (a `specs/` tree, `feature.json`, `init-options.json`, `tasks.md` text). The performance test generates 50 features with a 500-line `tasks.md` each. No fixture files are committed.
