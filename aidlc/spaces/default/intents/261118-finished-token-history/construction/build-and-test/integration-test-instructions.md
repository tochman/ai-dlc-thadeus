# Integration Test Instructions: US-0215

Key boundaries, all in vitest (Node for main, jsdom for the view; no real browser and no built app):

- **Transcript files → calls** (`tests/main/tokenHistory.test.js`): real files in a temp projects folder, read with `readTranscriptCalls`; a file outside the folder or a missing one gives null.
- **Ledger + audit + transcripts → history** (`loadTokenHistory`, same file): recorded / rebuilt / none, the memory cache, the gap, and that nothing is written under the temp project's `aidlc/` or `.thadeus/`.
- **Main answer → view** (`tests/renderer/TokenDetail.test.jsx`): the stubbed bridge returns `{ source, readings, wallMs, gap }` or a bare array; the view shows the note, gap line and figures strip.

Run: `npx vitest run tests/main/tokenHistory.test.js tests/renderer/TokenDetail.test.jsx`

Coverage: part of the project's 80% line floor, measured with `npm run coverage` on the full suite.

Not covered by an automated test: the IPC handler in a running app and real transcripts. Real transcripts were checked by hand in Code Generation Step 13 (25 intents).
