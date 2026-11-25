# Unit Test Instructions: archive and unarchive a Spec Kit feature (US-1411)

## Setup

Vitest 5.1.0 is set up (`vitest.config.mjs`, projects `main`, `scripts`, `renderer`). Nothing is installed or configured.

## Run

Before the first test (Step 1), on the existing files:

```bash
npx vitest run tests/main/speckitFeatures.test.js tests/main/frameworkSwitch.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/i18nKeys.test.js tests/renderer/SpeckitFeatures.test.jsx tests/renderer/SpeckitShell.test.jsx
```

This unit's new files, once they exist, and the list of modules that use `writeAtomic` (SD36):

```bash
npx vitest run tests/main/speckitArchive.test.js tests/renderer/SpeckitArchive.test.jsx tests/main/fileWrite.test.js
```

Both commands together are the unit's run. During a step, run only that step's files.

## Coverage

The project's 80% line floor is measured by Build and Test on the full suite, not here. The floor is never changed. Each new file in `src/` should hold 80% on its own.

## Mocks and test data

- `speckitArchive.test.js` and `speckitFeatures.test.js` use real files in temporary folders, with real links. The no-write test spies on `fs` as it does today. A failed write is injected or made by a read-only folder.
- `ipc.test.js` keeps its module mocks; add `speckitArchive.js` there, and `listedFeatures` beside `loadSpeckitFeatures`.
- Renderer tests mock `window.bridge`, use the Swedish locale and the fixtures of `SpeckitFeatures.test.jsx`, with `archived` added.
- Git, the network and Spec Kit never run. No real project's files are used.
