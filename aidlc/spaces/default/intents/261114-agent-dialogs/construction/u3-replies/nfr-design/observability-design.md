# Observability Design: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/observability-requirements.md` (NFR1.12, NFR3.21–NFR3.23)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/tech-stack-decisions.md` (NFR8.5–NFR8.7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/performance-requirements.md` (NFR1.8, NFR1.9 are measured from the timing log)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W1, W3, W4, W6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 error names)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/observability-design.md` (OD1, OD2, OD3, OD4)

## Scope

As u1: no remote telemetry, dashboards, alerts or SLOs; the person is the only operator, and the dialog and the strip say what happened to each reply. This Unit adds no log file and no mechanism. It adds the reply kind to u1's timing log and log line rules. Element IDs continue after u1's (u1 ends at OD4).

## OD5 Timing stamps for replies

**Satisfies:** NFR1.12, and u1 NFR1.6 for replies.

u1 OD1's TimingLog, file, switch and four fields are used unchanged.

| Stamp | Reply case |
|---|---|
| `hookReceived` | the reply event file's `mtimeMs`, at accept |
| `dialogShown` | first paint of the M4 page; for a queued reply, when it is first painted |
| `answerClicked` | the start of the Send handler |
| `answerDelivered` | right after the store's `writeSession` call that writes the Enter returns (reliability-design RD13) |

An answered reply has four lines; a dismissed or stale one has the first two only. The writer takes only `eventId`, `harness`, `stamp` and `at`, so no message or answer text can reach the file.

**Tested by:** unit test with the switch on: one answered reply gives exactly four lines with the exact field names; one dismissed reply gives two; no line has a text field; with the switch off no file exists after the same round trips.

## OD6 One log line per refusal or failure on the reply path

**Satisfies:** NFR3.21, and u1 NFR3.11 for replies.

Same shape and prefix as u1 OD2: `[agent-events] <reason> session=<sessionId> file=<event file name> [text="<first 80 characters>"]`.

| Source | When | `<reason>` |
|---|---|---|
| AgentChannel | refused reply file, any u1 SD3 reason, `too large` included | as u1 OD2 |
| HarnessEventAdapter | reply without a last-message field, or a body that is not JSON (BR6.3, reliability-design RD11) | `adapter refused: no last message`, `adapter refused: not JSON` |
| AgentEventStore | refused answer or refused reopen | the C4 error, for example `event not open` |
| AgentEventStore | failed typed send | `send failed: <cause>`, or `session ended` |

The moved-on effect of an authentic refusal (reliability-design RD11) adds no second line: the refusal line already names the session and the file. Never the header line or the secret; quoted text at most 80 characters with line breaks replaced by spaces.

**Tested by:** unit tests capturing `console.warn`: one line per row and reason, prefix present, `session=` and `file=` present, secret absent, quoted text ≤ 80 characters; the over-limit test of RD11 asserts exactly one line.

## OD7 The opencode plugin logs to opencode

**Satisfies:** NFR3.22.

The idle handler's `catch` (reliability-design RD15) writes one line through opencode's plugin logger, prefixed `thadeus-dialog`, naming the failed step (`context read failed` or `event write failed`) and the error's `code` or `name`. No message text and no secret.

**Tested by:** plugin tests with a stubbed log function: one line per failure case, prefix present, no message text from the stubbed context result, no secret.

## OD8 Normal reply traffic is quiet

**Satisfies:** NFR3.23, and u1 NFR3.12 for replies.

An accepted reply that is answered, dismissed, reopened, made stale or dropped as a duplicate writes nothing to `console.*`; the timing log is the only output. `terminalInput` never logs.

**Tested by:** store tests of each path with spies on `console.log`, `console.info`, `console.warn` and `console.error`: zero calls.

## OD9 Quality gates for this Unit

**Satisfies:** NFR8.5, NFR8.6, NFR8.7.

u1 OD4's gates apply unchanged. For this Unit:

- the reply branch's script tests spawn `sh` and repeat each case with `dash` when it is on `PATH` (u1 RD4's harness); the test fails if the two shells differ in output or exit status (NFR8.5). `/bin/dash` is present on the Mac this design was checked on, so where it is installed both shells run locally as well as in CI;
- the plugin's idle handler tests and the two scenario (7) replay tests use recorded payloads committed under `tests/` (NFR8.6);
- the new and changed files (adapter reply parsing, store reply, LatestMessage and classifier code, `src/shared/agentText.js`, the strip, the reply page, the plugin's idle handler) are held to the 80% line-coverage floor by `@vitest/coverage-v8` in the CI `verify` job (NFR8.7).

**Tested by:** the CI `verify` job on every pull request into `main`; the full `npx vitest run tests/` green before merge.
