# Reliability Requirements: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR2 scenario 6, NFR4, NFR5; FR3.3–FR3.6, FR6.3, FR6.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (harness facts, W1–W6, state machine, open points)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.1–BR5.4, BR5.7–BR5.11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/reviews/review-01.md` (R-05 fixtures and `interrupt` as gates)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 waiting, alive and `THADEUS_WAIT_SECONDS`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reliability-requirements.md` (the shared base: NFR2.1–NFR2.3, NFR4.3, NFR5.1–NFR5.7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-01, R-02, R-03, R-04: corrections to the shared script)

## What "reliable" means here

As u1: an agent session is never left blocked by the dialog, and the agent gets the decision the person picked. For a permission one more promise holds: **when anything goes wrong, nothing is allowed or denied; the agent's own prompt takes over.**

## Correctness of the decision (NFR2, scenario 6)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR2.4 | NFR2 scenario 6, automated: the decision the agent receives is the choice the person picked, for allow once, allow always and deny. | 100%: Claude Code output equals `decision.behavior: "allow"` (allow once); `allow` with `updatedPermissions` deep-equal to the recorded suggestions (allow always); `deny` with `interrupt: true` (deny); opencode answer file and `permission.reply` decision equal `once`, `always`, `reject` | Adapter and plugin tests replaying recorded `PermissionRequest` stdin and `permission.asked` payloads, one per choice per harness (6 tests). The opencode fixtures are recorded first (FD review R-05) |
| NFR2.5 | NFR2 scenario 6 against real sessions. | 6 of 6 runs (3 choices × Claude Code and opencode) behave as the terminal prompt would: allow once runs the call and asks again next time; allow always runs it and the same call is not asked again; deny does not run it, and Claude Code stops the turn (confirms `interrupt: true`, FD open point) | Manual run on the release Mac before the release pull request, timing log on (bolt plan proof rule) |
| NFR2.6 | The adapter never guesses (BR5.1, BR5.2). | a Claude Code payload with missing or empty `tool_name`, or `tool_input` that is not an object, and an opencode `permission.asked` without `sessionID` or `requestID`, become a refusal with a logged reason; nothing is shown and the prompt is handed back (NFR5.13) | Adapter tests, one per malformed shape |
| NFR2.7 | The choices are the agent's own, in its order (BR5.3). | Claude Code: Allow once, Allow always (only with suggestions), Deny; opencode: Allow once, Allow always, Reject; `refuses` true for the deny choice only | Adapter tests with and without suggestions |

## Hand-back and no hang (NFR4, NFR5)

Every path below ends with the agent's own prompt and no decision from the app. The shared script corrections from u1's review are stated where this Unit depends on them; they are designed in NFR Design (see `tech-stack-decisions.md`, "Shared script").

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR4.5 | Every path where a permission hook gives up prints nothing and exits 0 (u1 NFR4.3, corrected by u1 review R-03). dash has no ERR trap, so the silent exit comes from `exec 2>/dev/null` at the top of the script and `\|\| exit 0` on each fallible step. | 0 bytes on stdout and stderr, exit 0, on: variable unset, script missing, folder or `alive` missing, app gone, wait reached, empty answer file, a failing `cat` or `mv` (read-only `events/`) | Script tests with the `permission` argument, one per path, under `sh` and `dash` (NFR8.5) |
| NFR5.13 | A permission the app will not show is handed back at once (BR5.4): the question tool (`AskUserQuestion`), an adapter refusal, a fallback project. | the empty `.ans` is written in the same main-process turn as the raw event; the hook exits silently ≤ 300 ms later (u1 NFR5.3); nothing is shown | Store test (synchronous write, no push); script test with an empty answer file |
| NFR5.14 | The app quits or crashes while a permission hook waits (BR1.2, FR6.3). Corrected liveness rule (u1 review R-01): the script reads `date +%s` (1 s resolution) and treats the app as gone after 3 unchanged whole seconds of `alive`, which is a real gap of at least 2 s. | hook exits silently no earlier than 2.0 s and no later than 3.5 s after the last `alive` update (3 s rule at 1 s resolution plus poll and process slack); Claude Code shows its own permission prompt; nothing allowed | Script test that stops updating `alive`; manual: quit the app while a Claude Code permission waits on the release Mac |
| NFR5.15 | The wait ends before Claude Code's own limit (BR1.3, BR5.9). The entry timeout is 600 s; `THADEUS_WAIT_SECONDS` is 595 and is the full wait (u1 review R-02: C1's "minus 5 s" is amended to match). | hook exits silently at 595 s by wall clock, never later than 596 s; the store marks the event timedOut at `waitSeconds` after `hookReceived`, disables every choice, shows the M6 line, and sends nothing, neither through the hook nor as keys | Script test with `THADEUS_WAIT_SECONDS=2` (exit at 2–3 s); store test with a fake clock |
| NFR5.16 | A permission answer is never reported sent unless the hook took it (u1 review R-04, for permissions). An answer the store accepts in the last second, whose `.ans` the hook did not print before it exited, ends as timedOut, never as "Sent". Nothing is allowed by it, because the hook has already exited and no process reads the late file. | 0 events in `sent` whose answer the hook did not print | Script and store test: the hook exits at the wait limit, the `.ans` appears just after; the event ends timedOut with `lastError` |
| NFR5.17 | Close and Esc hand back without a decision (BR5.10). | empty `.ans` written; Claude Code hook exits silently ≤ 300 ms later; the opencode plugin stops waiting and calls no `reply`; state handedBack, then ended; toast for 5 s | Store, script and plugin tests |
| NFR5.18 | A tab that exits ends all its permission events and sends nothing (u1 BR2.3, NFR5.5). | every permission event of the session, whatever its state, goes to `ended`; 0 answer files written after the exit; "Nothing was sent." shown | Store test with three open permissions in one session and a pty exit |
| NFR5.19 | The opencode plugin never makes two decisions and never breaks opencode (BR5.11, u1 NFR5.7). | `permission.reply` is called at most once per `requestID`, and not at all after `permission.replied` came for it; a rejected or missing `reply` writes an `answered` event marked failed, the store sets timedOut with `lastError`, and no error is thrown into opencode | Plugin tests with a stubbed V2 `ctx` (replied first, reply rejecting, reply missing, fs error) |
| NFR5.20 | A failed answer write keeps the choice and can be retried while the hook still waits (BR5.8, BR3.4). | state back to shown with `lastError` in one sentence when the hook still waits, else timedOut; a second send works; nothing is allowed by the failed one | Store tests with an unwritable answers folder |

u1 NFR5.4 (only new events after a restart) applies unchanged: leftover permission event files are removed at start and never shown.

## Recovery

| Failure | Recovery | Who acts |
|---|---|---|
| App crash or quit while a permission waits | NFR5.14; old folders cleared at the next start (u1 NFR5.4) | automatic; the person answers in the terminal |
| Hook timed out | choices disabled, the person answers in the terminal; never keys (NFR5.15, NFR3.19) | the person |
| Answer file could not be written | choice kept, retry or Open the terminal (NFR5.20) | the person |
| opencode reply failed | timedOut with the cause; the terminal prompt is still there (NFR5.19) | the person |

No data needs backup: permission events live only while their session lives.
