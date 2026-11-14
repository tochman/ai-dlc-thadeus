# Observability Requirements: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1 timing log; NFR3)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W1, W3, W4, W6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md` (BR6.2, BR6.3, BR6.4, BR6.10, BR6.12, BR6.14)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 errors)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/observability-requirements.md` (timing log, log line rules, reused by id)

## What is observed

As u1: no remote telemetry, no dashboards, alerts or SLOs; the person is the only operator. This Unit adds no new log file and no new mechanism. It adds the reply kind to u1's timing log (u1 NFR1.6, NFR1.7) and to u1's one-line-per-refusal rule (u1 NFR3.11, NFR3.12).

## Requirements

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.12 | The timing log stamps replies with u1's four stamps, so NFR1.8 and NFR1.9 can be computed. | for an answered reply: `hookReceived`, `dialogShown`, `answerClicked` and `answerDelivered` (after the store's last `writeSession` of the send), same file and fields as u1 NFR1.6; a dismissed reply has the first two only; a reply queued behind a question gets `dialogShown` when it is first painted; no message text or answer in the file; nothing written with `THADEUS_TIMING` unset | Unit test: four stamps for one answered reply, two for a dismissed one, field names exact, no text fields |
| NFR3.21 | Every refusal and failure on the reply path is logged once in main, with u1 NFR3.11's prefix and limits. | one `console.warn` line, prefixed `[agent-events]`, naming `sessionId` and the event file name, per: refused reply file (BR1.1 reason, including over 1 MB, NFR5.23), adapter refusal (no last-message field, BR6.3), refused answer (C4 error), refused reopen (C4 error), failed typed send (cause); never the secret; at most 80 characters of agent or answer text | Unit tests capture `console.warn`: one line per case, prefix present, secret absent, quoted text ≤ 80 characters |
| NFR3.22 | The opencode plugin logs its own failures to opencode's log, not to the app. | one line in opencode's plugin log per failed `ctx.session.context` read or failed file write, prefixed `thadeus-dialog`; no message text, no secret | Plugin tests with a stubbed log function |
| NFR3.23 | Normal reply traffic is quiet (as u1 NFR3.12). | an accepted reply that is answered, dismissed, reopened, made stale or dropped as a duplicate (BR6.4) writes 0 lines to `console.*` (the timing log aside) | Store tests of each path with `console` spies |

Log lines are English and not user-facing (as u1). The reason words match the C4 error names.
