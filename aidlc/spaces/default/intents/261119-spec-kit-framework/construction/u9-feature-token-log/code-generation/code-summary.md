# Code Summary: U9 u9-feature-token-log (US-1409)

## Files

| File | Change |
|---|---|
| `src/main/speckitTokens.js` | New. `createSpeckitTokens({ userDataDir, projectsDir, ratesOf })` and `onTurn`: per-project queue, Claude and opencode turn usage, bucket choice, pricing, bucket write, then cursor advance; cursor store per project in `userData/speckit-tokens/` |
| `src/main/tokenReadings.js` | `mergeReading` (adds a turn, replaces inside 30 s, thins past 2000), `writeReadings`; `recordReading` now writes through it |
| `src/main/tokenHistory.js` | Calls keep `id` and `model` |
| `src/main/speckitFeatures.js` | `activeFeature(root)` from the C5 reader |
| `src/main/agentAdapters.js` | opencode `usage` result carries `usage: { tokens, cost }` |
| `src/main/ipc.js` | One `store.onSignal` listener for Spec Kit projects (BR1.1) |
| `vitest.config.mjs` | `src/main/speckitTokens.js`: 80% lines |
| `tests/main/*.test.js` (5 files) | 24 new tests, 2 older expectations updated for the wider call/usage shape |

## Decisions

- opencode is counted by the increase of the session's running totals and its own `cost` (no message id or model in
  the event); Claude calls are priced from the rate table (BR4.1).
- Transcript and `~/.claude/projects` go through `fs.realpath` before `insideDir` (NFR3.2).
- First seen turn starts at the last real user prompt in the transcript; earlier calls go to `speckit-project`
  (NFR3.6). For opencode the first event's totals go to `speckit-project`, later increases to the feature.
- `writeReadings` makes and checks `.thadeus/tokens` one level at a time, so a `.thadeus` linked out of the project
  never gets a folder created outside it. This also hardens the existing per-intent `recordReading`.
- The default writer is resolved at call time, so modules that mock `fileWrite.js` (the `ipc.test.js` setup) still load.
- `ponytail:` ceilings: a lost cursor recounts a session's earlier calls once; each Stop reads the whole transcript; a
  crash between the bucket write and the cursor write credits that turn twice.

## Tests

- Unit command (`unit-test-instructions.md`): 5 files, 103 tests passed. Red runs recorded for Steps 3, 6, 9 and 12.
- `src/main/speckitTokens.js`: 96.73% line coverage.
- `tests/main/ipc.test.js` also run after the change: passes.
- ESLint and Prettier clean on the changed files.

## Not executed here

- The full suite and the project-wide 80% floor: Build and Test runs them.
- A real Claude Code and opencode turn in a Spec Kit project: left to the manual release check, as the opencode event
  shape is still provisional (K12).

## Deviations from the plan

None in the steps. `unit-test-instructions.md` gained the Step 2 baseline line, as the step asked.
