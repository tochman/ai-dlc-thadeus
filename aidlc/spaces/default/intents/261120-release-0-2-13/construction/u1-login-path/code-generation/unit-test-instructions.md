# Unit Test Instructions: U1 u1-login-path

## Setup
vitest 5.1.0, already set up (`vitest.config.mjs`: `main` project in node, `renderer` project in jsdom with the Swedish locale). Nothing to install.

## Run this Unit's tests
```
npx vitest run tests/main/exec.test.js tests/main/tools.test.js tests/main/toolsLoginPath.test.js tests/renderer/SettingsView.test.jsx tests/main/i18nKeys.test.js
```
(`tests/main/toolsLoginPath.test.js` holds the `tools.js` cases: the AI-DLC guard refuses edits to `tests/main/tools.test.js`.)
Runnable before the first Red step; it is green on the unchanged code.

## What is tested
- `tests/main/exec.test.js`: 7 new cases for `readLoginPath` / `refreshLoginPath` / the 20 s limit (AC1.1.1–AC1.1.4).
- `tests/main/toolsLoginPath.test.js`: 4 cases for the scan's re-read, `pathFallback` and one login-shell read per scan (AC1.1.3, AC1.1.5, Step 13).
- `tests/renderer/SettingsView.test.jsx`: 2 new cases for the fallback line (AC1.1.5).
- `tests/main/i18nKeys.test.js`: the new key is in both locales (NFR1).

## Mocking
- The login shell is the injected `exec(file, args, options)`. A fake answers `'__AIDLC_DASH_PATH__<dirs>'` for `-l`. A timeout is a rejection with `killed: true`. A slow shell is a promise the test resolves itself, so no real 20 s wait.
- `vi.resetModules()` and a fresh `import()` per test give each test an empty login-PATH cache, as `tools.test.js` already does.
- Tool lookups use temporary directories with an executable file, as the existing `getTools` tests do.
- The renderer test stubs `window.bridge.getTools` to return rows with and without `pathFallback`.

## Test data
Temporary directories under the OS temp folder, made and removed in each test. No fixtures are added.

## Coverage
The project's 80% line-coverage floor (v8, `src/**`) is checked by Build and Test on the full suite (`npx vitest run tests/ --coverage`). This Unit's command above is not run with `--coverage`. The changed lines of `exec.js` and `tools.js` are all exercised by the new cases.
