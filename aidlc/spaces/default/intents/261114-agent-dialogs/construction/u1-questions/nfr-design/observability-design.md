# Observability Design: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/observability-requirements.md` (NFR1.6, NFR1.7, NFR3.11, NFR3.12)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/performance-requirements.md` (NFR1.1–NFR1.3 are measured from the timing log)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (D6 quality gates, NFR8.1–NFR8.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-07)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1.1, BR1.4, BR3.1, BR3.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 error names)
- Existing code: `src/main/ipc.js` (`registerIpc` logs and rethrows every handler error), `src/main/index.js` (`windowOptions`, sandboxed preload), `src/preload/index.js` (one named member per channel)

## Scope

No remote telemetry, dashboards, alerts or SLOs: the person is the only operator, and the dialog itself says what happened to each question. Two things are designed here: a development timing log that proves NFR1 on the release Mac, and one log line per refusal or failure. A third section states how the quality gates show up in CI. Component IDs are those of `logical-components.md`.

## OD1 Development timing log

**Satisfies:** u1 NFR1.6, NFR1.7.

- **Switch.** Main reads `process.env.THADEUS_TIMING === '1'` once at start. When it is off, TimingLog (LC7) is a no-op: no folder, no file, no IPC listener.
- **File.** `<userData>/logs/agent-timing.jsonl`, one JSON line per stamp, `{ "eventId", "harness", "stamp", "at" }`. `stamp` is one of `hookReceived`, `dialogShown`, `answerClicked`, `answerDelivered`; `at` is epoch ms. Lines are appended through one promise queue (`fs.appendFile`), like the settings write queue in `src/main/settings.js`, so stamps never interleave and never block a caller.
- **Where each stamp comes from.**

| Stamp | Taken in | Value |
|---|---|---|
| `hookReceived` | AgentChannel, on accept | the event file's `mtimeMs` (SCD2) |
| `dialogShown` | renderer, in a `requestAnimationFrame` after the page's effect runs | `Date.now()` |
| `answerClicked` | renderer, at the start of the Send handler | `Date.now()` |
| `answerDelivered` | store, when RD2 sees the take, the opencode reply finished, or `writeSession` returned | `Date.now()` |

- **Renderer bridge.** When the switch is on, `windowOptions` adds `--thadeus-timing` to `webPreferences.additionalArguments`. The preload adds `agentEvents.stamp(eventId, stamp)` to `window.bridge` only when `process.argv` contains that flag. The member uses `ipcRenderer.send` (fire and forget), not `invoke`, so Send never awaits it. Main registers the `agent-timing:stamp` listener only when the switch is on, and accepts only `dialogShown` and `answerClicked` with a string `eventId` of at most 64 characters.
- **No content.** The four fields are the whole record: no question text, label, answer or secret can reach the file, because the writer takes only those four values.

**Tested by:** unit test: one answered event with the switch on produces exactly four lines with the exact field names and no other fields; with the switch off no file and no folder exist after the same round trip; renderer test: with the flag absent `window.bridge.agentEvents.stamp` is `undefined` and Send still works; with it present, the Send IPC call is made in the same tick as the click (the stamp call is not awaited); preload test that the member's presence follows `process.argv` (this also confirms in Code Generation that a sandboxed preload sees `additionalArguments`).

## OD2 One log line per refusal or failure

**Satisfies:** u1 NFR3.11.

Every line goes through `console.warn` in main and has the same shape, so a missing question can be explained from the terminal the app was started from:

```text
[agent-events] <reason> session=<sessionId> file=<event file name> [text="<first 80 characters>"]
```

| Source | When | `<reason>` (matches the C4 error words where one exists) |
|---|---|---|
| AgentChannel (SD3) | a refused event file | `unknown session`, `ended session`, `bad name`, `not a file`, `too large`, `malformed header`, `unaccepted version`, `wrong secret` |
| HarnessEventAdapter (RD7) | an unreadable payload | `adapter refused: <BR1.4 reason>`, with `text=` holding the first 80 characters of the offending question text when there is one |
| AgentEventStore (SD4) | a refused answer | the C4 error, for example `answer does not fit the event` |
| AgentEventStore (RD2, RD3, RD9) | a failed send | `send failed: <cause>`, for example `the hook did not take the answer`, `the agent's picker is not showing` |
| ChannelHeartbeat (RD1) | a write error other than `ENOENT`, reported once per folder and error code through the worker's `parentPort` | `heartbeat failed: <code>` |

- The header line of an event file is never logged, so the secret cannot appear. The `text=` part is cut to 80 characters and has its line breaks replaced by spaces.
- Log messages are English and not user-facing, so they do not go through `t()`.
- The existing `registerIpc` wrapper still logs and rethrows an error thrown by a new handler; the store returns its C4 errors as thrown `Error`s, so a refused answer gives one `[agent-events]` line from the store plus the existing `[ipc]` line. That is two lines for one cause; accepted, because the `[ipc]` line is the app-wide convention.

**Tested by:** unit tests capturing `console.warn`: one line per case in the table, the `[agent-events]` prefix, `session=` and `file=` present, the secret absent, the quoted text at most 80 characters.

## OD3 Normal traffic is quiet

**Satisfies:** u1 NFR3.12.

The accepted path (accept, parse, queue, push, answer, take, close) has no `console.*` call. Only the table in OD2 logs.

**Tested by:** store and channel test of the happy path with spies on `console.log`, `console.info`, `console.warn` and `console.error`: zero calls.

## OD4 Quality gates as CI signals

**Satisfies:** u1 NFR8.1, NFR8.2, NFR8.3, NFR8.4.

| Gate | Signal | Where |
|---|---|---|
| Test first (NFR8.1) | each Code Generation plan step names its failing test before its code | the plan's steps; the pull request history |
| Coverage (NFR8.2) | `@vitest/coverage-v8` with an 80% line floor on the Unit's new and changed files (`src/main/agentChannel.js`, `agentAdapters.js`, `agentEvents.js`, `agentTiming.js`, the changed `pty.js` and `ipc.js`, `src/renderer/AgentDialog.jsx`) | the `verify` job of `.github/workflows/release.yml` fails below the floor |
| Lint and format (NFR8.3) | ESLint and Prettier, 0 errors | the same `verify` job; a failure blocks the merge |
| Script and plugin tests (NFR8.4) | `tests/main/dialogScript.test.js` spawns `sh` explicitly and repeats every case under `dash` when it is installed (RD4); `tests/main/opencodePlugin.test.js` loads the plugin with a stubbed V2 `ctx` (RD8) | `npx vitest run tests/` in CI on `ubuntu-latest`, where `sh` is dash, and locally on the release Mac before the release pull request |

The shell script is not measured by V8 coverage; its cases are listed one by one in RD4, and the review of `dialog.sh` against SCD4's list is part of the Code Generation plan.

**Tested by:** the CI `verify` job itself (coverage floor, lint, format, full suite); the Code Generation plan review (NFR8.1).
