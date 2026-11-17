# Unit Test Instructions: release planning sync

## Framework

vitest 5.1.0, already set up (`vitest.config.*`, projects `main` and `renderer`). Nothing new to install.

## Run this work's tests

```bash
npx vitest run tests/main/planningRecord.test.js tests/main/releasesPlan.test.js tests/main/planningSync.test.js tests/main/settings.test.js tests/main/i18nKeys.test.js
npx vitest run tests/renderer/FeaturesView.test.jsx tests/renderer/SettingsView.test.jsx
```

(The renderer file names follow the existing test files; use the existing Settings test file's name if it differs.)

## Coverage

The 80% line floor (team rule) is measured by Build and Test on the full suite. Expect at least 80% lines on `planningRecord.js` and `planningSync.js`.

## Mocking and test data

- Git: real repos in `fs.mkdtemp(os.tmpdir())`: a bare `origin.git` plus a clone with a minimal `docs/FEATURES.md`, an epic file and `docs/releases/`. Set `user.name`/`user.email` locally in each repo. Removed in `afterEach`.
- `gh`: an injected function standing in for the call (`gh(args) => Promise<stdout>`), never the real binary.
- Online and busy state: injected `online()` and `isBusy()` stubs.
- `userData`: a temporary folder per test.
- Renderer: mock `window.api.features.planningStatus` and `pushPlanning` the way the existing FeaturesView tests mock `setRelease`.
