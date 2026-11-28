# Code Generation: US-0058

## Cause
opencode 2 runs plugins in a shared `opencode serve` process that it starts on its own. The plugin never sees `THADEUS_SESSION_DIR`, so it sends nothing. The app reads opencode's own local database read-only instead.

## Changed
- `src/main/opencodeDb.js` reads assistant messages and tool parts for the opened project from `~/.local/share/opencode/opencode.db`; database errors return empty results. Existing Cost attribution is unchanged.
- `src/main/opencodeActivity.js` maps observed assistant timestamps (including persisted completion) and completed/error tool parts into text-free, harness-neutral events. It emits only relative supported file touches; child sessions are grouped under their parent.
- `src/main/agentEvents.js` folds imported events through the shared Activity reducer and existing Pulse touch stream, with duplicate suppression; `clearImportedActivity` drops database-derived rows, timers, and dedupe keys when a project closes.
- `src/main/ipc.js` refreshes the database timeline when a project opens and every 10 seconds while it remains open; project close clears the timer and imported activity.

## Evidence and limits
The installed database schema confirms `session_v2` ownership (`directory`, `parent_id`, `agent`), `session_message` assistant data, and `part` tool data. Assistant message shapes include `time.created` and `time.completed`; tool part shapes include `tool`, `callID`, and `state.status/time/input`; observed statuses were `completed` and `error`. The mapper does not return prompt/message text or tool input. Since the database snapshot only showed completed/error tool states, activity reflects persisted timestamps and may lag live streaming; no unsupported active event state is inferred. Activity and Pulse remain in-memory and are not written back to opencode.

## Tests
Before edits, `npx vitest run --project main tests/main/opencodeUsage.test.js tests/main/agentEvents.test.js tests/main/agentActivity.test.js tests/main/pulse.test.js` passed (112 tests). The mapper and store-ingestion tests failed first because their behavior was absent, then passed after implementation. Reviewer follow-up tests failed first for missing `time.completed` mapping, cleanup API, and protection against an in-flight refresh completing after project close; all three regressions passed after fixes. Final focused command: `npx vitest run --project main tests/main/opencodeUsage.test.js tests/main/opencodeActivity.test.js tests/main/agentEvents.test.js tests/main/agentActivity.test.js tests/main/pulse.test.js tests/main/projectService.test.js tests/main/ipc.test.js` (7 files, 285 tests passed). ESLint and Prettier checks passed. Full suite/build remain for Build and Test.
