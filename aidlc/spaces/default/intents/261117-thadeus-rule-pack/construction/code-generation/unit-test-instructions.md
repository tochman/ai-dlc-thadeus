# Unit Test Instructions: US-0212 THADEUS cost rule pack

## Setup

The existing vitest 5.1.0 setup (`vitest.config.*`, projects `main` and `renderer`) is used unchanged. No new dependency.

## Run this work's tests

```bash
npx vitest run tests/main/costRules.test.js tests/renderer/CostRulesSection.test.jsx tests/main/i18nKeys.test.js
```

During the TDD loop run only the file being worked on, for example `npx vitest run tests/main/costRules.test.js`. If Step 9 changes the preload bridge list, add `tests/main/preload.test.js` to the command.

## Expected coverage

- About 14 new tests: 9 in `tests/main/costRules.test.js` (pure block functions, file access, compile and restore), 5 in `tests/renderer/CostRulesSection.test.jsx`.
- The project floor is 80% line coverage (team rule). Build and Test checks it on the full suite; coverage tooling is not set up in the repository yet, so it cannot be measured here.

## Mocking and test data

- Main tests write a temp project (`fs.mkdtemp` under `os.tmpdir()`) with `aidlc/spaces/default/memory/` and `aidlc/spaces/team-b/memory/`, each with `project.md`, `team.md`, `org.md` and `phases/construction.md`. Byte checks compare `Buffer`s.
- The compile is never run for real: `exec` is injected and answers success, a non-zero exit, a timeout (`killed: true`) or `ENOENT`.
- Renderer tests stub `window.bridge.costRulesStatus`, `previewCostRules` and `applyCostRules`, and use the Swedish locale from `tests/renderer/setup-i18n.js`.
