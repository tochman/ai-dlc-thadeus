# Observability Design: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/observability-requirements.md` (NFR1.12, NFR1.13, NFR3.20, NFR3.21)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/performance-requirements.md` (NFR1.8–NFR1.10 are measured from the timing log)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/tech-stack-decisions.md` (NFR8.5, NFR8.6; u1 NFR8.1–NFR8.3 apply)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.1, BR5.2, BR5.4, BR5.7, BR5.8, BR5.11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md` (`alwaysRules` main only)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 error names)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/observability-design.md` (OD1–OD4, the shared base)

## Scope

As u1: no remote telemetry, dashboards, alerts or SLOs; the dialog tells the person what happened. u1 OD1 (timing log), OD2 (one line per refusal or failure), OD3 (quiet happy path) and OD4 (quality gates) cover permission events. This file adds one stamp, the permission reasons, and the rule that the log is never a record of what the person allowed.

## OD5 Permission stamps in the timing log

**Satisfies:** NFR1.12, u1 NFR1.6.

A permission gets u1 OD1's four stamps with the same line shape, `{ eventId, harness, stamp, at }`, and no new field. `answerDelivered` is taken when main sees the take (u1 OD1, PD7), which for Claude Code follows the `.ans` rename. TimingLog accepts only those four values, so no `what`, `detail`, rule text or decision can reach the file.

**Tested by:** unit test: one answered Claude Code permission with the switch on gives exactly four lines with the exact field names and no other fields; none of the lines holds the payload's command text or the chosen effect; with the switch off no file exists.

## OD6 `agentConfirmed` for opencode

**Satisfies:** NFR1.13.

- `agentConfirmed` is a fifth `stamp` value, not a new field. It is taken only in main, by the store, when the `answered` event for a permission that was `sending` or `sent` arrives (PD9). The renderer's `agentEvents.stamp` bridge still accepts only `dialogShown` and `answerClicked` (u1 OD1).
- A Claude Code permission never gets it: its delivery ends at the take. A permission answered in the opencode terminal (state `shown`) does not get it either, because the app sent nothing.

**Tested by:** unit test with a recorded `answered` event: one `agentConfirmed` line for an opencode permission answered from the dialog; none for Claude Code; none for a terminal answer; none with the switch off; the bridge refuses `agentConfirmed` from the renderer.

## OD7 Permission refusals and failures, one line each

**Satisfies:** NFR3.20.

Same format and prefix as u1 OD2: `[agent-events] <reason> session=<sessionId> file=<event file name> [text="<first 80 characters>"]`.

| Source | When | `<reason>` |
|---|---|---|
| HarnessEventAdapter (RD11) | malformed Claude Code or opencode payload | `adapter refused: <reason>`, for example `adapter refused: tool_input is not an object` |
| AgentEventStore (RD11) | question tool or fallback project handed back | `handed back: question tool`, `handed back: fallback project` |
| AgentEventStore (SD10) | a refused permission answer | the C4 error, for example `event not open` |
| AgentEventStore (RD10) | a failed write or delivery | `send failed: <cause>`, for example `send failed: the hook stopped waiting` |
| AgentEventStore (RD10, RD13) | opencode refused or lost the reply (`.nack`) | `send failed: the agent refused the answer effect=<effect>` |

- `text=` holds at most the first 80 characters of `what` or `detail`, passed through `visibleText` (SD9) and with line breaks shown as escapes, so a command cannot inject terminal escape codes into the log.
- Never logged: the secret, `alwaysRules`, rule lines, the full command.
- The choice's `effect` appears only in failure lines, never in normal traffic, so the log is not a record of what the person allowed.

**Tested by:** unit tests capturing `console.warn`, one per row: one line, the prefix, `session=` and `file=` present; no secret; no `alwaysRules` content (a sentinel string planted in a suggestion never appears); `text=` at most 80 characters with an ESC in the payload shown as `\u001b`.

## OD8 Normal permission traffic is quiet

**Satisfies:** NFR3.21, u1 NFR3.12.

An answered permission, a Close, a time-out and an opencode terminal answer have no `console.*` call. Only OD7's table logs.

**Tested by:** store and plugin tests of those four paths with spies on `console.log`, `console.info`, `console.warn` and `console.error`: zero calls.

## OD9 Quality gates for this Unit

**Satisfies:** NFR8.5, NFR8.6, u1 NFR8.1–NFR8.3 (applied to this Unit's files).

| Gate | Signal | Where |
|---|---|---|
| Test first | each Code Generation plan step names its failing test before its code | the plan; the pull request history |
| Coverage | 80% line floor with `@vitest/coverage-v8` on the files this Unit changes: `src/main/agentAdapters.js`, `agentEvents.js`, `agentChannel.js` (`answerState.folder`), `agentTiming.js`, `ipc.js`, `src/renderer/AgentDialog.jsx`, `thadeus-dialog.js` | the `verify` job of `.github/workflows/release.yml` |
| Lint and format | ESLint and Prettier, 0 errors | the same job |
| Script tests (NFR8.5) | every RD14 case spawns `sh dialog.sh permission` and, when `dash` is on the path, `dash dialog.sh permission` | `npx vitest run tests/` in CI on `ubuntu-latest`, where `sh` is dash; locally on the release Mac before the release pull request |
| Plugin tests (NFR8.6) | `tests/main/opencodePlugin.test.js` loads the plugin with a stubbed V2 `ctx`: `permission.asked`, `permission.replied` before and after the answer file and during `reply`, `reply` rejecting and missing, no `evaluate` registration (RD13, SD8) | the same suite |

**Tested by:** the CI `verify` job itself; the Code Generation plan review.
