# Code Summary — US-1302 Savings hints

## Files

- New: `src/main/savings.js` (families, the three hint kinds, sorting, dismissals, `loadSavings`, `sessionCalls`), `tests/main/savings.test.js`.
- Changed: `src/main/ipc.js` (`project:savings`, `project:savings-dismiss`), `src/main/parsers/ledger.js` (stage rows also carry their raw tokens per model and agent names), `src/preload/index.js` (`getSavings`, `dismissSaving`), `src/renderer/CostPanel.jsx`, `src/renderer/CostTab.jsx`, `src/renderer/IntentDetail.jsx`, `src/renderer/ProjectView.jsx`, `src/renderer/theme.css`, `src/shared/locales/en.json`, `src/shared/locales/sv.json`, `tests/renderer/CostPanel.test.jsx`, `tests/renderer/CostTab.test.jsx`, `docs/FEATURES.md`, `docs/features/epic-13-insights.md`.

## Key decisions

- Top tier is the dearest family in the price table that the project actually ran on (the table lists `fable-5-2` above Opus, so a literal "dearest in the table" would never fire). Tested.
- Only the dearest family's tokens are repriced at the cheaper family; the stage's other tokens are left out of the saving.
- Median output per run is taken over each stage's output per run, since the ledger sums a stage's runs (`ponytail:` comment).
- Turns are counted from the transcript files on each open of the Savings section, not from `loadTokenHistory`'s cache, which holds readings rather than single calls (`ponytail:` comment).
- Links only open views: models → Configuration `aidlc`, rule pack → `costRules`, handoff → Configuration `agent`, which holds `project-handoff`. So no `onOpenProjectSettings` prop and no `App.jsx` change.
- Hints carry a `links` array (a turns hint has two). Turns hint ids are `turns:<intent>:<stage>`. Hints arrive sorted from main; the intent tab also shows the stage hints for stages that intent ran.

## Tests

- Red outputs: Step 2 no tests (module missing); Step 4 8 failed of 20; Step 6 4 failed of 24; Step 8 7 failed of 28.
- Final: the scoped command, 4 files, 56 tests passed. `tests/main/ledger.test.js` and `tests/main/featureDocsStatus.test.js` also passed (10). `savings.js` 100% lines, `CostTab.jsx` 96%. No threshold changed.
- Not run here: the full suite with coverage, ESLint and Prettier over the whole project. Build and Test runs those.

## Deviations from the plan

- The items under Key decisions, plus: the handler tests cover the handler bodies (`loadSavings`, `sessionCalls`, `setDismissed`), not the IPC wiring, as with `loadRework`. The renderer tests stub `window.bridge` (the real preload object), not `window.api`.
- `docs/releases/0.3.2.md` was not changed: the app's release-plan sync rewrote it right after the edit, so its two US-1302 rows still read "Planned". They are set in the release pull request.
- Two test-file edits were made from the shell instead of with the file tools.
