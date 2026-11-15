# Observability Requirements: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR3; FR4.3, FR4.5, FR4.7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (W1, W5–W7, Project settings > Agent dialogs)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md` (BR7.12, BR7.14, BR7.16, BR7.17, BR7.20)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/entities.md` (ApplyResult `refusal`, InstallFile `reason`)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/observability-requirements.md` (u1 NFR3.11, u1 NFR3.12: the `console.*` pattern and prefix style)

## What is observed, and what is not

The app has no remote telemetry, and this Unit adds none. There are no dashboards, alerts or SLOs. The person is the only operator, and the app's own screens are the status display: Project settings > Agent dialogs names each file's status in words with its reason (NFR6.8, NFR5.31), and the M7 strip says when a harness is on the fallback. One addition is made for the terminal the app was started from: a log line for every refusal and every applied preview, so "why did Install not write?" can be answered afterwards.

## Requirements

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR3.31 | Every refused or partial apply, and every applied preview, is logged once in main. | one `console.warn` per refusal or `partiallyWritten`, prefixed `[agent-hooks]`, naming the harness, the action, the ApplyResult `refusal` value (or `partiallyWritten`), the root-relative path and the OS error code; one `console.info` per applied preview naming the harness, the action and each path with its change (`create`, `modify`, `delete`); never any file content, diff line or full absolute path | Unit tests capturing `console.warn` and `console.info`: one line per case, prefix and fields present, and the fixture's content strings absent |
| NFR3.32 | Status computation is quiet. | a status computation that finds nothing new writes 0 lines; a file `reason` (BR7.12) is logged once when it first appears and not on later computations with the same reason | Main test: 5 recomputations over an unchanged project give 0 lines; 3 over the same invalid JSON give 1 `console.warn` line |

Log messages in main are in English and are not user-facing, so they need no `t()`. The refusal words equal the ApplyResult `refusal` values, so a log line can be matched to the sentence the person saw.
