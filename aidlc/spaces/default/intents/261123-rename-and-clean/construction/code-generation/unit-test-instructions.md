# Unit test instructions

## Framework

vitest 5.1.0, already set up in `vitest.config.mjs`: the `main` project runs in node (`tests/main/**`) and the `renderer` project in jsdom with the Swedish locale (`tests/renderer/**`). Nothing new to install.

## Run this work's tests

US-0508:

```bash
npx vitest run tests/main/intentNames.test.js tests/main/intents.test.js tests/main/projectService.test.js tests/main/ipc.test.js tests/renderer/IntentRename.test.jsx tests/main/i18nKeys.test.js
```

US-0043 (the renderer tests of the touched components, plus lint):

```bash
npx vitest run tests/renderer/App tests/renderer/CostRulesSection tests/renderer/FeaturesView tests/renderer/ModelProfilesSection tests/renderer/ProfileSwitchDialog tests/renderer/ProjectSettingsView tests/renderer/ProjectView tests/renderer/RefreshPanel tests/renderer/TerminalContext tests/renderer/TokenView tests/renderer/UpdateNotice tests/renderer/useFeatures tests/renderer/EditorPanel
```

```bash
npx eslint . --max-warnings 0
```

## Coverage

The 80% line floor applies to the whole project. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not on these scoped runs.

## Mocking

- Main: a temp directory per test as the project root (as `tests/main/projectService.test.js` does); no real `aidlc` calls.
- Renderer: `window.bridge.renameIntent` as a `vi.fn()` resolving or rejecting; the intent object passed in as props.

## Test data

Intent folders such as `261123-rename-and-clean` and `261122-other`, with `intents.json` entries written per test. `.thadeus/intent-names.json` is written per test: missing, broken JSON, and valid.
