# Code Generation: US-0058, part 1 (Cost)

## Cause
opencode 2 runs plugins in a shared `opencode serve` process that it starts on its own. The plugin never sees `THADEUS_SESSION_DIR`, so it sends nothing. AI-DLC writes no opencode ledger.

## Changed
- `src/main/opencodeDb.js` (new): reads the assistant messages of this project's sessions from `~/.local/share/opencode/opencode.db`, read only (`node:sqlite`). It gives `[]` on any error.
- `src/main/parsers/opencodeUsage.js` (new): turns the messages into ledger-shaped nodes per intent. A message goes to the intent whose audit was active at the time, and to the stage it was in.
- `src/main/parsers/auditCost.js`: `mergeIntentCosts` adds the opencode part.
- `src/main/projectService.js`: `loadCrossMachineCost` takes the messages and returns `opencode`.
- `src/main/ipc.js`: `project:cost`, `intent:rework` and `project:savings` pass the messages on. This machine's readings include opencode, even without a ledger.

## Tests
`tests/main/opencodeUsage.test.js` (new, 6), `tests/main/crossMachineCost.test.js` (+2), `tests/main/ipc.test.js` (+1). 161 pass; ESLint and Prettier are clean.

## Open
Activity and Astrometrics come from the plugin's live events and are still empty for opencode. The plugin has to find its session without the env vars. The snapshot for other clones stays ledger-only (`ponytail:` in ipc.js).
