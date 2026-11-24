# Unit Test Instructions: U7 u7-constitution (US-1404)

## Setup

vitest 5.1.0, already configured in `vitest.config.mjs` with the `main` (node) and `renderer` (jsdom, Swedish locale) projects. The only install is `yaml` (Step 2 of the plan).

## Run this unit's tests

Main-process tests (hooks, reader, read-only guard, watch paths, watcher, IPC, sections):

```bash
npx vitest run --project main tests/main/speckitRules.test.js tests/main/speckitFeatures.test.js tests/main/watcher.test.js tests/main/ipc.test.js tests/main/frameworkViews.test.js
```

Renderer tests (the Spec Kit section and its mount):

```bash
npx vitest run --project renderer tests/renderer/SpeckitRules.test.jsx tests/renderer/ProjectView.test.jsx
```

Both run before the first Red step (Step 2); a new file reports "no test files" or fails until written.

## Expected coverage

- About 40 tests: hooks 7, reader 14, read-only guard 2, watcher and IPC 4, sections 2, renderer 11.
- The project's 80% line-coverage floor over `src/**` is checked by Build and Test on the full suite, not by these scoped runs. Never lower the threshold in `vitest.config.mjs`.

## Mocking and stubbing

- Reader and guard tests use real temp folders (`fs.mkdtemp`), real symbolic links, a real FIFO (`mkfifo`, skipped on a platform without it), and `vi.spyOn` on the `fs` write calls for the read-only check.
- `hooksFrom` tests pass plain objects; no files.
- The watcher tests use short debounce values and wait on `ready`, as the existing `watcher.test.js` does.
- IPC tests follow the existing `ipc.test.js` pattern for handlers.
- Renderer tests stub `window.bridge.speckitRules`, `onSpeckitChanged` and `readFile`, the editor context's `open`, and the terminal context's `type`.

## Test data

Fixtures are built in each test from small helpers (a constitution, `extensions.yml` text, one `extension.yml` per extension). The performance test generates 20 extensions, 50 hooks and a 100 KB constitution. The alias bomb is a few lines of nested YAML aliases. No fixture files are committed.
