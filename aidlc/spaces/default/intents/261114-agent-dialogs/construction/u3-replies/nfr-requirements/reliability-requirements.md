# Reliability Requirements: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR2 scenario 7, NFR4, NFR5; FR2.7, FR3.3, FR3.5, FR6.1, FR6.3, FR6.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (harness facts, W1–W8, state machines, typed delivery, known limits)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md` (BR6.1–BR6.7, BR6.12, BR6.13, BR6.15)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/entities.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/reviews/review-01.md` (R-01 terminal input, R-02 text plus Enter in one write)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `reply` never waits, file names; C2 `ptyOf`, guarded `writeSession`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reliability-requirements.md` (rows reused by id)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-02 file names in seconds, R-03 no ERR trap in dash, R-07 tests under dash)

## What "reliable" means for a reply

As u1: no availability SLO; the promise is about the agent. For replies it reads: **the Stop hook and the plugin never change or delay how the agent stops, and a typed answer reaches the tab that is waiting for it, once, or not at all.** A reply never holds its session (C1), so u1's hand-back and time-out rows (u1 NFR5.1–NFR5.3) do not apply to it.

## Correctness of the answer (NFR2, scenario 7)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR2.4 | Scenario (7), a plain-text question answered from a reply, from recorded payloads. | 100%: for a recorded Claude Code `Stop` stdin and a recorded opencode `session.status` idle event with its `ctx.session.context` result, both ending with "Which name should the file have?", answering "notes.md" writes exactly `notes.md` and one Enter to the asking tab's fake pty | Adapter and store tests, one per harness (2 tests) |
| NFR2.5 | Scenario (7) against real sessions. This run is also the check that the chosen write (text and Enter in one write, or Enter as a separate write after a short gap) submits in each TUI (u3 FD review R-02). | 2 of 2 runs (Claude Code and opencode) end with the agent taking "notes.md" as the person's next message and acting on it; no stray newline left in the input box | Manual run on the release Mac before the release pull request, timing log on (as u1 NFR2.2); the result and the chosen write go into the harness facts table in NFR Design |
| NFR2.6 | The adapter never guesses a reply (BR6.3). | a payload with no last-message field is refused with a logged reason and shows nothing; an empty or whitespace-only message sets `empty` and shows "<harness> finished its turn without a message." | Adapter tests for both harnesses: field missing, empty string, whitespace only |

## The agent's stop is never changed (NFR4)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR4.7 | `dialog.sh reply` never makes Claude Code continue and never prints a decision (BR6.1). It applies the u1 correction for the shared script (u1 NFR review R-03): dash has no ERR trap, so the script starts with `exec 2>/dev/null` and every fallible step ends in `\|\| exit 0`. | 0 bytes on stdout and stderr and exit status 0 on every path: event written; `events/` not writable; disk full simulated by a read-only folder; `mv` failing; stdin closed early; never exit 2 | Script tests, one per path, each run with `sh dialog.sh reply` and again with `dash dialog.sh reply` where `dash` exists (u1 NFR review R-07) |
| NFR4.8 | The Stop entry's `; exit 0` and the script's silence hold together. | the exact C6 Stop command string run with `sh -c` returns exit 0 with no output in every NFR4.7 case | Script test running the full command string |

## No hang, no wrong tab (NFR5)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.13 | The opencode plugin never blocks or breaks opencode on idle (BR6.2, as u1 NFR5.7). | only `status.type` `idle` of a session with no parent is forwarded; `busy` and `retry` are not; a sub-agent session is not; a rejected or throwing `ctx.session.context` writes nothing and logs to opencode's log; no error is thrown into opencode | Plugin tests with a stubbed V2 `ctx`: idle top-level, idle child, busy, retry, context rejecting, context throwing, fs error; manual opencode run of NFR2.5 |
| NFR5.14 | A shown reply goes stale, and types nothing, as soon as the tab moves on (BR6.5–BR6.7, BR6.13). | on a newer event from the session, on the person's terminal input (NFR3.20) and on tab exit: state `stale`, typed text kept, Send disabled, the right line shown; a queued or dismissed reply ends instead; no `writeSession` call | Store tests for each trigger and each prior state; renderer test that the typed text survives the change to stale |
| NFR5.15 | The check and the write happen in one step (BR6.12). | between the re-check of `shown` and the last byte the store writes, no other `pty:write` for that tab can run and no `await` yields; if Enter is a separate write (NFR2.5), Enter is written only after the same send's text, to the same pty, and never on its own | Store unit test with a fake pty: the call order is text then Enter with nothing between; a person's input queued during the send is written after it, and the reply is already `ended` |
| NFR5.16 | A failed typed send keeps the answer and can be retried (as u1 NFR5.6, BR3.4). | `ptyOf` null fails "session ended"; a throwing `writeSession` fails "send failed: <cause>"; in both the reply is back to `shown` (or `stale` if the session ended), `lastError` is one sentence, the text is kept, a second Send works while shown | Store and renderer tests for each failure |
| NFR5.17 | After a restart there is no old reply and no old latest message (BR2.4, as u1 NFR5.4). | the strip shows "No message from the agent yet" for every project until a reply arrives; reply files left from an earlier run are removed with their folders and never shown | Unit test with leftover reply `.evt` files; renderer test of the empty strip |
| NFR5.18 | Arrival order of replies comes from the file's `mtimeMs` and a main-side arrival counter, never from the file name (u1 NFR review R-02: names are `<epoch-s>-<pid>.evt`, in seconds). This decides the LatestMessage (BR6.15) and the pager order inside the reply group. | two replies from two tabs of one project in the same second, whose names sort the other way as strings, give the LatestMessage of the later `mtimeMs` (then the counter, then `tabId`) | Store test with crafted names `1700000000-100000.evt` (later `mtimeMs`) and `1700000000-99999.evt` (earlier `mtimeMs`, but last in string order) |
| NFR5.19 | The same message reported twice is one reply (BR6.4). | a second reply with equal text from a session whose newest reply is still waiting creates no event, no page, no push of a new event and no notification; a reply with different text is a newer event (BR6.5) | Store tests: equal text, different text, equal text after the first was answered (a new reply) |

## Recovery

| Failure | Recovery | Who acts |
|---|---|---|
| The reply event could not be written | nothing shown; Claude Code stops as usual; the person answers in the terminal | none |
| The tab moved on before Send | the stale line, text kept, Copy and Open the terminal (NFR5.14) | the person |
| The typed send failed | text kept, retry or Open the terminal (NFR5.16) | the person |
| Another project hook makes Claude continue after the Stop | the reply shows; the next event from the session makes it stale (functional spec, Known limits) | automatic |

No data needs backup: replies and the latest message live in memory only, for one app run.
