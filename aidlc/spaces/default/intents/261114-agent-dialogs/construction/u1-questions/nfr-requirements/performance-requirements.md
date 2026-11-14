# Performance Requirements: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1, NFR4, NFR6, NFR7; FR1.5, FR3.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (W1, W1b, W3, hook entries)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1.2, BR1.3, BR2.3, BR3.2, BR4.5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/entities.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 polling and alive file, C2 picker readiness)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/nfr-requirements-questions.md` (no questions; targets are the inception NFRs)

## Scope

A single-user desktop app on one machine. There is no network hop: the hook script, the app's main process and the renderer talk through local files and Electron IPC. The targets below are the inception numbers (NFR1, NFR4) split along the path a question takes. No throughput target applies; see `scalability-requirements.md`.

"Release Mac" means the MacBook Pro the person builds and checks releases on (NFR1). "Timing log" is the development log defined in `observability-requirements.md` (NFR1.6).

## Latency (NFR1)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.1 | A question from an app tab appears in the dialog after the hook fires. Measured from the event file's write time (`hookReceived`) to the dialog's first paint of that page (`dialogShown`). | ≤ 1 s in every one of 20 runs with Claude Code; every opencode run of the NFR2.2 manual run also ≤ 1 s | Manual run on the release Mac with the timing log on; the log's `dialogShown − hookReceived` per run |
| NFR1.2 | An answer sent `via: hook` reaches the hook. Measured from `answerClicked` to `answerDelivered` (the answer file renamed to `.ans`, or for opencode the `session.form.reply` call returned). | ≤ 1 s in every one of 20 runs | Manual run on the release Mac with the timing log on |
| NFR1.3 | An answer sent `via: keys` after a hand-back reaches the pty. The 1 s runs from the later of `answerClicked` and the moment the picker's first option label is seen in that pty's output, to `writeSession` returning. The picker wait itself ends at 3 s (C2, BR3.2) and then fails with "the agent's picker is not showing". | keys written ≤ 1 s after the later of click and picker seen; picker seen within 3 s in every hand-back of the manual run | Unit test with a fake pty stream (keys written after the label appears, never before; failure at 3 s); manual time-out case (AC1.1.6) on both harnesses on the release Mac, timing log |
| NFR1.4 | A question leaves the dialog after its session closes it (`answered` event, newer event, tab exit). | `agent-events:changed` is pushed in the same main-process turn as the closing raw event; the page is gone ≤ 1 s after the closing event's file is written | Store unit test (push happens synchronously on the closing raw event); manual run on the release Mac (FR1.5 criterion) |
| NFR1.5 | The waiting hook sees the answer file and prints it. | Hook exits with the answer printed ≤ 300 ms after the `.ans` file appears (one 100 ms poll plus process slack; part of the NFR1.2 budget, not a new target) | Script test: spawn `dialog.sh question`, drop an `.ans` file, measure the exit |

### Budget for one question (via hook)

| Step | Owner | Share of 1 s |
|---|---|---|
| sh start, header line, copy stdin, rename | ClaudeCodeHook | small; covered by NFR4.1's 100 ms check |
| file seen by the watcher in the session folder | AgentChannel | the existing `chokidar` watcher; no polling interval added beyond what it uses today |
| adapter, store, IPC push, React render | HarnessEventAdapter, AgentEventStore, AgentDialog | the rest |
| Answer: IPC, answer check, adapter output, atomic write | AgentEventStore, AgentChannel | most of the second half |
| Hook poll picks it up | ClaudeCodeHook | ≤ 100 ms (NFR1.5) |

The table is guidance for code generation; only NFR1.1 to NFR1.5 are checked.

## No harm when the app is absent (NFR4, timing part)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR4.1 | With no `THADEUS_SESSION_DIR` in the environment, or with the script missing, the hook entry's command returns before the script is looked for (FR4.6). | exit 0, no output, ≤ 100 ms, in each of 20 runs | Script test: run the exact C6 command string with `sh -c`, variable unset and script folder deleted, 20 runs; manual: plain `claude` started in a terminal outside the app on the release Mac asks a question and shows its own picker at once |
| NFR4.2 | With the variable set but the session folder or its `alive` file missing (the app has gone and cleared it), the script writes nothing and exits. | exit 0, no output, no file written, ≤ 100 ms | Script test with a temporary folder lacking `alive` |

The case "folder present, app gone without clearing it" waits for the 2 s alive rule; that is NFR5.1, not NFR4.

## Dialog use (NFR6, NFR7)

These are usability targets of this Unit's dialog. They sit here because this is the file for the `ui` side of the Unit.

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR6.1 | Focus moves into the dialog when a question page is shown. | focus on the first choice when the page shows (BR4.5) | Renderer test: `document.activeElement` after the event is pushed |
| NFR6.2 | The question layouts (M1 single, M2 batch) work by keyboard alone. | number keys 1..n pick; Space ticks in multi-select; Enter sends; Esc closes (hands back, BR3.5); every scenario of NFR2.1 can be answered with no pointer event | Renderer tests driving only keyboard events, one per layout and per multi-select and own answer |
| NFR6.3 | Kind and state are named in text, never by colour alone. | every state shown (shown, sending, sent, handedBack, timedOut, failed) has a text label or line; the overdue style also changes the title ("still waiting") | Renderer test: the text of each state is present in the DOM |
| NFR7.1 | Every app text in the dialog goes through `t()` with ICU placeholders. | 0 hard-coded user-facing strings in the new components; same keys in `sv.json` and `en.json` | Existing `tests/main/i18nKeys.test.js`; renderer tests run in the Swedish locale |
| NFR7.2 | The agent's own question text, headers, labels and descriptions are shown as the agent sent them. | byte-equal to the payload (after the 64 KB cut of NFR5.8); never translated | Adapter test with recorded payloads holding Swedish, emoji and non-ASCII text |
