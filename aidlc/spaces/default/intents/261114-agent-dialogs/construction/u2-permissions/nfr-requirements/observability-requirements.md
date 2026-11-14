# Observability Requirements: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1 timing log; NFR3)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (W1b, W6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.1, BR5.2, BR5.4, BR5.7, BR5.8, BR5.11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md` (`alwaysRules` main only)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/observability-requirements.md` (the shared base: NFR1.6, NFR1.7, NFR3.11, NFR3.12)

## What is observed

As u1: no remote telemetry, no dashboards, alerts or SLOs; the dialog tells the person what happened. u1's timing log (NFR1.6) and its one-line-per-refusal rule (NFR3.11) cover permission events. This Unit adds one stamp for opencode and the permission reasons to log.

## Requirements

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.12 | The timing log stamps permission events with u1 NFR1.6's four stamps. For a Claude Code permission, `answerDelivered` is the `.ans` rename. | the same JSON line shape as u1 NFR1.6, no new fields; no `what`, `detail`, rule text or decision in the file | Unit test: four stamps for one answered Claude Code permission, field names exact, no text fields |
| NFR1.13 | An opencode permission also gets `agentConfirmed`, stamped in main when the plugin's `answered` event for that `requestID` arrives, so NFR1.10 can be measured. | one `agentConfirmed` line per opencode permission answered from the dialog; none for Claude Code; none with the timing log off | Unit test with a recorded `answered` event |
| NFR3.20 | Every permission refusal and failure is logged once in main (u1 NFR3.11 format, prefix `[agent-events]`, `sessionId` and event file name). Reasons added: adapter refusal (BR5.1, BR5.2), the question tool handed back, the fallback project handed back (BR5.4), a refused permission answer (C4 error name, BR5.7), a failed answer write (BR5.8), an opencode reply failure (BR5.11). | one `console.warn` per case; never the secret, never `alwaysRules`, never more than the first 80 characters of `what` or `detail` | Unit tests capturing `console.warn`, one per reason |
| NFR3.21 | Normal permission traffic is quiet (u1 NFR3.12). An answered permission, a Close and an opencode terminal answer log nothing. | 0 lines to `console.*` on these paths, the timing log aside | Store tests with `console` spies |

Log lines name the choice's `effect` only in failure lines, never in normal traffic, so the log is not a record of what the person allowed.
