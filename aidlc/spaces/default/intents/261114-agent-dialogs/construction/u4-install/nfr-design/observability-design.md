# Observability Design: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-design/nfr-design-questions.md` (no questions)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/observability-requirements.md` (NFR3.31, NFR3.32)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/reliability-requirements.md` (ApplyResult outcomes, NFR5.32)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (W1, W5–W7, Project settings > Agent dialogs)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (the `console.*` pattern of AgentChannel, LC2)
- Existing code: `src/main/ipc.js` (`registerIpc` logs a failed handler with `console.error`)

## Approach

There is no telemetry, dashboard, alert or SLO, and this Unit adds none. The person is the only operator. Two places show what happened: the app's own screens (each file's status in words with its reason, PD35 and RD39), and the terminal the app was started from, which gets one line per refusal, partial write and applied preview. A line names the same `refusal` value as the sentence the person saw, so the two can be matched.

## Design elements

### OD30 One line per apply outcome, without content

- **Satisfies:** NFR3.31.
- **Design:** one function in `agentHooks.js`, `logOutcome(harness, action, result)`, called once at the end of `run` (RD40), after the outcome is known:
  - a refusal or `partiallyWritten`: `console.warn('[agent-hooks] refused', { harness, action, refusal, file, code })`;
  - `written`: `console.info('[agent-hooks] applied', { harness, action, files: [{ path, change }] })`;
  - `nothingToChange`: `console.info` with an empty `files` list.
  
  `file` and `path` are the root-relative paths from the fixed table, never an absolute path. `code` is the OS error code (`EACCES`, `ENOSPC`, …), `link`, or `null`. No file content, diff line or digest is passed to the log. `previewUnknown` is logged the same way, so a double click shows up as one line.
  
  A thrown error in an IPC handler is already logged by `registerIpc` (`[ipc] <channel> failed`). An argument refusal (SD32) therefore needs no second line.
- **Test:** unit tests capturing `console.warn` and `console.info`: one line per refusal value, for `partiallyWritten` and for `written`; prefix and fields present; none of the fixture's strings (a non-app hook command, a key name, the root's absolute path) in any captured argument.

### OD31 Status computation is quiet

- **Satisfies:** NFR3.32.
- **Design:** the installer keeps, per root, the last reason logged for each file (`lastReason: Map`). A computation logs `console.warn('[agent-hooks] file not usable', { file, reason, code })` only when a file's reason differs from the last one logged, and clears the entry when the reason goes. A computation with no new reason logs nothing. The map is dropped with the project (SCD31).
- **Test:** main test: 5 computations over an unchanged, valid project give 0 lines; 3 computations over the same invalid JSON give 1 line; fixing the file and breaking it again gives a second line.
