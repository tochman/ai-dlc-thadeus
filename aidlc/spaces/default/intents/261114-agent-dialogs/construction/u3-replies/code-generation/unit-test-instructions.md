# Unit Test Instructions: u3-replies

## Framework setup

- **Runner:** vitest 5.1.x as installed, with u1's three projects in `vitest.config.mjs`: `main` (node, `tests/main/**/*.test.js`), `scripts` (node, the real-time hook script tests in `TIMED`, run after the others) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale through `tests/renderer/setup-i18n.js`).
- **Changed in plan Step 2:** `tests/main/dialogScriptReply.test.js` joins `TIMED`, so it runs in the `scripts` project; per-file 80% line entries are added for `src/renderer/ReplyPage.jsx` and `src/renderer/LatestMessageStrip.jsx`. `@vitest/coverage-v8`, ESLint and Prettier are already set up by u1. No new dependency.
- **Shells for the script tests:** `tests/helpers/shells.js` (`SHELLS`: `sh`, plus `dash` when installed; `THADEUS_REQUIRE_DASH=1` in CI makes a missing dash fail). The Stop branch also needs `head` and `kill`, which macOS and Linux provide.
- **Prerequisites:** `npm ci`. Nothing else.
- **Built side by side:** this Unit's worktree holds u1 but not u2. Every command below passes on u1's code plus this Unit's.

## Runnable before the first test-first cycle (plan Step 2)

```bash
npx vitest run tests/main/agentText.test.js tests/main/agentEvents.test.js tests/main/dialogScript.test.js
```

These u1 files must be green on the unchanged tree before the first Red step.

## This Unit's tests, file by file

Run each file during its plan step; each Red step records the failing output of its exact command.

| Plan step | Component | Command |
|---|---|---|
| 4 | TextSanitizer `src/shared/agentText.js` (u3 cases) | `npx vitest run tests/main/agentTextReply.test.js` |
| 5–7 | ClaudeCodeHook Stop branch `.thadeus/hooks/dialog.sh` (with u1's cases) | `npx vitest run tests/main/dialogScript.test.js tests/main/dialogScriptReply.test.js` |
| 8–10 | OpencodePlugin idle handler `.opencode/plugins/thadeus-dialog.js` | `npx vitest run tests/main/opencodePlugin.test.js tests/main/opencodePluginReply.test.js` |
| 11–13 | HarnessEventAdapter reply parsing `src/main/agentAdapters.js` | `npx vitest run tests/main/agentAdapters.test.js tests/main/agentAdaptersReply.test.js` |
| 14–16 | AgentChannel refused reply `src/main/agentChannel.js` | `npx vitest run tests/main/agentChannel.test.js tests/main/agentChannelReply.test.js` |
| 17–19 | Auto-response classifier `src/main/agentReplies.js` | `npx vitest run tests/main/agentReplies.test.js` |
| 20–22 | AgentEventStore replies `src/main/agentEvents.js`, `src/main/agentReplies.js` | `npx vitest run tests/main/agentEvents.test.js tests/main/agentEventsReply.test.js` |
| 23–25 | Typed delivery `src/main/agentReplies.js` | `npx vitest run tests/main/agentEventsTyped.test.js` |
| 26–28 | IpcRouter `src/main/agentIpc.js`, `src/main/ipc.js`, preload | `npx vitest run tests/main/agentIpc.test.js tests/main/agentIpcReply.test.js tests/main/ipc.test.js tests/main/preload.test.js` |
| 29 | Main side end to end (real channel) | `npx vitest run tests/main/agentRepliesFlow.test.js` |
| 30–32 | Reply page `src/renderer/ReplyPage.jsx`, `src/renderer/AgentDialog.jsx` | `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogReply.test.jsx` |
| 33–35 | LatestMessageStrip, `FileContent` inline, ProjectView | `npx vitest run tests/renderer/LatestMessageStrip.test.jsx tests/renderer/ProjectView.test.jsx` |
| 36–38 | App pager and reopen | `npx vitest run tests/renderer/AppShell.test.jsx` |
| 39 | Texts in both locales | `npx vitest run tests/main/i18nKeys.test.js` |

## The whole Unit in one run

All of this Unit's test files and the u1 files it changes, without coverage:

```bash
npx vitest run tests/main/agentTextReply.test.js tests/main/dialogScript.test.js tests/main/dialogScriptReply.test.js tests/main/opencodePlugin.test.js tests/main/opencodePluginReply.test.js tests/main/agentAdapters.test.js tests/main/agentAdaptersReply.test.js tests/main/agentChannel.test.js tests/main/agentChannelReply.test.js tests/main/agentReplies.test.js tests/main/agentEvents.test.js tests/main/agentEventsReply.test.js tests/main/agentEventsTyped.test.js tests/main/agentIpc.test.js tests/main/agentIpcReply.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/agentRepliesFlow.test.js tests/main/i18nKeys.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/LatestMessageStrip.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/AppShell.test.jsx
```

This Unit's own coverage target (at least 80% line coverage of each file it creates or changes, NFR8.7) is checked with the same files and coverage limited to those source files. The `--coverage.include` flags replace the config's `include`, so the thresholds apply to the listed files only. Run it as its own command, with nothing after it:

```bash
npx vitest run tests/main/agentTextReply.test.js tests/main/dialogScript.test.js tests/main/dialogScriptReply.test.js tests/main/opencodePlugin.test.js tests/main/opencodePluginReply.test.js tests/main/agentAdapters.test.js tests/main/agentAdaptersReply.test.js tests/main/agentChannel.test.js tests/main/agentChannelReply.test.js tests/main/agentReplies.test.js tests/main/agentEvents.test.js tests/main/agentEventsReply.test.js tests/main/agentEventsTyped.test.js tests/main/agentIpc.test.js tests/main/agentIpcReply.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/agentRepliesFlow.test.js tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/LatestMessageStrip.test.jsx tests/renderer/AppShell.test.jsx --coverage --coverage.include='src/shared/agentText.js' --coverage.include='src/main/agent*.js' --coverage.include='src/renderer/AgentDialog.jsx' --coverage.include='src/renderer/ReplyPage.jsx' --coverage.include='src/renderer/LatestMessageStrip.jsx' --coverage.include='.opencode/plugins/thadeus-dialog.js'
```

Lint and format of this Unit's files (plan Step 40):

```bash
npx eslint .opencode/plugins src/main/agentReplies.js src/main/agentEvents.js src/main/agentAdapters.js src/main/agentChannel.js src/main/agentIpc.js src/main/ipc.js src/preload/index.js src/renderer/ReplyPage.jsx src/renderer/LatestMessageStrip.jsx src/renderer/AgentDialog.jsx src/renderer/ArtifactReader.jsx src/renderer/ProjectView.jsx src/renderer/App.jsx tests/main tests/renderer
```

```bash
npx prettier --check src/main/agentReplies.js src/main/agentEvents.js src/main/agentAdapters.js src/main/agentChannel.js src/main/agentIpc.js src/main/ipc.js src/preload/index.js src/renderer/ReplyPage.jsx src/renderer/LatestMessageStrip.jsx src/renderer/AgentDialog.jsx src/renderer/ArtifactReader.jsx src/renderer/ProjectView.jsx src/renderer/App.jsx .opencode/plugins/thadeus-dialog.js src/shared/locales/sv.json src/shared/locales/en.json tests/main tests/renderer tests/fixtures/agent-events
```

## Expected coverage

- **Project floor:** 80% line coverage over all measured source (`src/**/*.{js,jsx}` and the plugin), set in `vitest.config.mjs` and run in CI. Build and Test checks it on the full suite of the assembled project with the Construction Verification Command `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .`. A Unit-scoped run does not judge that floor. If a Unit-scoped coverage command exits non-zero only on a threshold while every selected test passes, record that with this Unit's results as a coverage note, not a failed test. Never lower a threshold or exclude a file to pass.
- **This Unit's files:** at least 80% line coverage for `src/main/agentReplies.js` and the changed `src/main/agent*.js` files, `src/shared/agentText.js`, `src/renderer/ReplyPage.jsx`, `src/renderer/LatestMessageStrip.jsx`, `src/renderer/AgentDialog.jsx` and `.opencode/plugins/thadeus-dialog.js`, checked by the Unit-scoped coverage command above and by the per-file entries in `vitest.config.mjs`. The aim is above 90% for the classifier and the reply store.
- **Not measured by V8:** `.thadeus/hooks/dialog.sh`. Its Stop cases are listed one by one in `dialogScriptReply.test.js` and run under `sh` and `dash`; plan Step 7 reviews the branch against SCD10's list.

## Mocking and stubbing

- **File system:** never mocked for the channel, the script or the plugin. Each test makes its own folder with `fs.mkdtempSync(path.join('tests/.tmp', 'u3-'))` (gitignored) and removes it in `afterEach`.
- **Shell:** the script is spawned as `spawn(shell, [scriptPath, 'reply'], { env })` with `shell` from `SHELLS`, and the C6 Stop string through `spawn(shell, ['-c', command])`. "stdin held open" is a pipe the test writes 200 bytes to and closes after 8 s; "stdin closed" is `stdio: ['ignore', …]` with the command run as `exec <&- sh dialog.sh reply` inside `sh -c`. Elapsed times are measured around the child's `exit` event, with `{ timeout: 15_000 }` per test. The windows (< 1 s, 1.9–2.6 s, ≤ 100 ms) are the design's; the slack is a check tolerance, not a new target.
- **Time:** the store, the plugin's handler bookkeeping and the dialog use `vi.useFakeTimers()` for `ENTER_GAP_MS`, the 3 s linger of a typed reply, `OVERDUE_MS` and `GUARD_MS`. The plugin tests that write real files use real timers, as u1's do.
- **Channel in store tests:** u1's fake channel (`onRawEvent`, `onRefusedReply`, `ptyOf`, `isLive`, `writeAnswer` and `answerState` spies); the test fires raw events and refused replies itself. `writeAnswer` must never be called for a reply.
- **Pty:** a fake `{ write: vi.fn(), tapOutput }`; tests assert the exact `(ptyId, data)` calls and their order. A `write` that throws once tests RD14.
- **IPC:** `agentIpc.js` tests pass plain fake senders and a fake store. The `ipc.test.js` case spies on the agent wiring's `terminalInput` and on `writeSession` and asserts their order inside one `pty:write` call.
- **Electron:** `tests/main/preload.test.js` keeps its `electron` mock; the new case checks the two invoke channels.
- **opencode:** a stubbed V2 `ctx`: `event.on(type, fn)` captured, `session.context` as a spy that resolves with a fixture, rejects, throws or never resolves, and a logger spy. The module is imported fresh per test (`vi.resetModules()`).
- **Renderer:** `window.bridge.agentEvents` stubbed with `list`, `answer`, `close`, `reopen`, `latest`, `onChanged` (the test calls the captured listener to push) and `stamp`; `navigator.clipboard.writeText` and `window.open` spied. Tests look texts up by their Swedish wording, so an English literal left in a component fails them.
- **Console:** spies on `console.log`, `info`, `warn` and `error` for the quiet paths (OD8) and the one-line-per-refusal checks (OD6): `[agent-events]` prefix, no secret, quoted text at most 80 characters.

## Test data

- `tests/fixtures/agent-events/claude/stop-which-name.json`, `stop-done.json`, `stop-empty.json`, `stop-no-message.json`, `stop-swedish.json`: Claude Code `Stop` hook stdin (`hook_event_name`, `stop_hook_active`, `last_assistant_message`, `transcript_path`, `session_id`).
- `tests/fixtures/agent-events/opencode/idle-which-name.json`, `idle-child.json`, `idle-two-parts.json`: the plugin's `{ event, context }` body (plan K12, provisional).
- **Generated in the test, not stored:** the 1 048 576- and 1 200 000-byte stdins, the 65 536/65 537-byte boundary texts with a 4-byte emoji on the cut, the 40 KB and 30 KB opencode parts, the over-limit event file, the SD8 and SD10 input lists.
- **Event files** are written by the tests in the C1 format (`THADEUS-EVENT v1 reply <secret>`, then the fixture bytes), as `.tmp` renamed to `.evt`.
- The fixtures follow the documented shapes; the NFR2.5 run on the release Mac saves real Stop and idle payloads, which replace or confirm them (`tests/fixtures/agent-events/README.md`).

## Development hook entries (for the manual run, not for the automated tests)

The automated tests need no hook installed. For the NFR2.5 run (plan K2), add this entry by hand to `.claude/settings.json` next to u1's two, until u4 installs it, and start the app with `THADEUS_AGENT_HOOKS=1 THADEUS_TIMING=1 npm run dev`:

```text
Stop  (no matcher)  timeout 10  command: [ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" reply; exit 0
```

opencode loads `.opencode/plugins/thadeus-dialog.js` from this repository by itself. Scenario 7, 20 runs per harness: the agent ends its turn with "Which name should the file have?", the dialog opens, "notes.md" is sent. Pass: the agent takes "notes.md" as its next prompt, its input box is empty afterwards, and the timing log shows `dialogShown − hookReceived` ≤ 1 s and `answerDelivered − answerClicked` ≤ 1 s. Record the result per harness in `code-summary.md` (RD13's table).
