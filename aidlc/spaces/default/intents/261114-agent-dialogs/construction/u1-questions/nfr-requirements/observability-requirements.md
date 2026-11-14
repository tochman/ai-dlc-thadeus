# Observability Requirements: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1 timing log; NFR3)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/delivery-planning/bolt-plan.md` (manual run with the timing log before the release pull request)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (W1, W3, W7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1.1, BR1.4, BR3.1, BR3.4)
- `aidlc/spaces/default/codekb/aidlc-dash/code-quality-assessment.md` (every IPC handler logs and rethrows; `console.*` in main)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`

## What is observed, and what is not

The app has no remote telemetry and this Unit adds none. Nothing leaves the machine. There are no dashboards, alerts or SLOs: the person is the only operator, and the dialog itself tells them what happened (sent, handed back, timed out, failed). Two things are added:

1. a **development timing log** that proves NFR1 on the release Mac;
2. **one log line per refusal or failure** through the app's existing `console.*` logging in main, so a missing question can be explained from the terminal the app was started from.

## Requirements

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.6 | The timing log stamps every hook event and its answer. It is off by default and on when the app starts with `THADEUS_TIMING=1` (works for `npm run dev` and for the built app on the release Mac). | one JSON line per stamp in `<userData>/logs/agent-timing.jsonl`: `{ eventId, harness, stamp, at }` with `stamp` one of `hookReceived` (the event file's `mtimeMs`), `dialogShown` (renderer, after the page paints), `answerClicked` (renderer), `answerDelivered` (main, after the `.ans` rename, the opencode reply, or `writeSession`), `at` in epoch ms; no question text, label, answer or secret in the file; with the variable unset, no file is created | Unit test: four stamps for one answered event, field names exact, no text fields; with the variable unset, no file; manual run reads the file to compute NFR1.1 to NFR1.3 |
| NFR1.7 | Stamps from the renderer reach main without slowing the dialog. | `dialogShown` and `answerClicked` go through one fire-and-forget bridge member that exists only when the timing log is on; it adds no `await` to Send | Renderer test: with timing off the member is absent and Send still works; with it on, Send's IPC call is not delayed by the stamp call |
| NFR3.11 | Every refusal and every failed send is logged once in main, with its reason. | one `console.warn` line per refused event file (BR1.1 reason), per adapter refusal (BR1.4 reason), per refused answer (C4 error) and per failed send (BR3.4 cause), each prefixed `[agent-events]` and naming `sessionId` and the event file name; never the secret, never more than the first 80 characters of any agent text | Unit tests capture `console.warn`: one line per case, prefix present, secret absent, length of quoted text ≤ 80 |
| NFR3.12 | Normal traffic is quiet. | an accepted, answered question writes 0 lines to `console.*` (the timing log aside) | Store test of the happy path with `console` spies |

Log messages in main are in English and are not user-facing, so they need no `t()`; the reason words match the C4 error names so a log line and the dialog's sentence can be matched.
