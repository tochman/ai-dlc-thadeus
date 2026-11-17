# Code Summary: US-0212 THADEUS cost rule pack

## Files

Created:
- `src/shared/costRules.js`: the markers, the target table, the shipped pack (4 lines, under 800 characters) and the clash pairs.
- `src/main/costRules.js`: `blockState`, `withBlock`, `targetFile`, `findClashes`, `costRulesStatus`, `previewCostRules`, `applyCostRules`.
- `src/renderer/CostRulesSection.jsx`: the Configuration sub-block. It reuses `ChangePanel`, `Section` and `RadioBlocks`.
- `tests/main/costRules.test.js` (17 tests) and `tests/renderer/CostRulesSection.test.jsx` (5 tests).

Changed:
- `src/main/plans.js`: `compileEveryHarness` is now exported.
- `src/main/ipc.js`: `costRules:status`, `costRules:preview` and `costRules:apply`, with the preview kept in `p.costRules`.
- `src/preload/index.js`: the three bridge calls.
- `src/renderer/ProjectSettingsView.jsx`: adds `costRules` and an `AIDLC_SECTIONS` constant.
- `src/renderer/App.jsx` and `src/renderer/ProjectView.jsx`: the arm filter and the mount.
- `src/renderer/theme.css`: LCARS text-field style for text areas, and `.cost-rules-lines`.
- `sv.json` and `en.json`: the new keys.
- Tests extended: `tests/main/preload.test.js` (+1), `tests/main/ipc.test.js` (+1, plus a mock), `tests/renderer/AppShell.test.jsx` (2 assertions).

## Key decisions

- The pack is on when its block is in the files. Nothing is stored separately.
- An added block goes straight after the file's last line, with no blank line in between. Turning the pack off therefore gives the file back byte for byte, with or without a final newline (FR2.3).
- A missing target file counts as broken (`missing`) when the pack is turned on. It is skipped when the pack is turned off.
- When the compile fails, every file written in that save is written back from the text it was previewed from (FR5.4).

## Tests

- The unit-scoped command passes: `npx vitest run tests/main/costRules.test.js tests/renderer/CostRulesSection.test.jsx tests/main/i18nKeys.test.js`, 3 files, 26 tests.
- The other touched test files (preload, ipc, AppShell, ProjectView, plans) pass as well.

## Not run here

- The full suite is left to Build and Test.
- Line coverage was not measured. `vitest.config.mjs` already has the v8 provider and an 80% threshold, although the team rule says coverage is not set up yet. Build and Test checks it.
- ESLint and Prettier are not set up in the repository.

## Deviations from the plan

- Step 9 (IPC and bridge) was written before its tests, so it has no recorded Red run.
- The main tests build their temp project in `tests/.tmp/cost-rules`, the repository's convention, not in `os.tmpdir()`.
- The renderer tests check `textContent`, `.value` and `.disabled`, because jest-dom is not installed.
- `theme.css` and `ipc.test.js` were changed, though the plan does not name them.
