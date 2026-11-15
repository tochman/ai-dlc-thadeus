# Reliability Requirements: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR2, NFR4, NFR5; FR1.5, FR3.3, FR3.5, FR3.6, FR4.6, FR6.3, FR6.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (NFR2 scenario-to-story table: scenarios 1–5 are US1.1)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (spike results, W1–W7, state machine)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1.2, BR1.3, BR1.4, BR2.3, BR2.4, BR3.2–BR3.5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/entities.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 waiting and alive rules, C2 closeSession, C6 entries)

## What "available" means here

There is no service to keep up and no availability SLO. The app runs while the person uses it. The reliability promise is about the agent, not the app: **an agent session is never left blocked by the dialog, and the answer it receives is the one the person picked.** Every target below serves one of those two.

## Correctness of the answer (NFR2)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR2.1 | The option the agent receives is the option the person picked, for the five question scenarios this Unit owns: (1) labels that differ from AI-DLC's logged labels (the 2026-11-14 case), (2) options in another order than logged, (3) a batch of four questions, (4) a multi-select question with two picks, (5) an own answer. | 100%: the built hook output (Claude Code `updatedInput.answers`) and opencode reply equal the expected labels for every scenario | Adapter and store tests replaying recorded Claude Code `PreToolUse` stdin and opencode `form.created` payloads, one test per scenario per harness (10 tests) |
| NFR2.2 | The same five scenarios hold against real sessions. | 10 of 10 runs (5 scenarios × Claude Code and opencode) end with the agent stating or using the picked option | Manual run on the release Mac before the release pull request, timing log on (bolt plan proof rule) |
| NFR2.3 | The adapter never guesses (BR1.4). | a payload with 0 or more than 4 questions, a question without text, or an option without a label becomes a refusal with a logged reason and shows nothing | Adapter tests, one per malformed shape |

Scenario (6), a permission prompt, belongs to u2-permissions; scenario (7), a plain-text question, belongs to u3-replies.

## No harm and no hang (NFR4, NFR5)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR4.3 | Every path where the hook gives up prints nothing and exits 0, so the agent behaves as without the hook. | 0 bytes on stdout and stderr, exit status 0, on: variable unset, script missing, folder or `alive` missing, app gone (NFR5.1), wait limit reached (NFR5.2), empty answer file (NFR5.3), any shell error inside the script | Script tests, one per path; the script runs with `set -u` off and traps errors to the same silent exit |
| NFR5.1 | The hook hands back when the app is gone (BR1.2, FR6.3). The app rewrites `alive` every 500 ms; the hook treats it as gone after 2 s without a change. | hook exits silently no earlier than 2.0 s and no later than 2.5 s after the last `alive` update (2 s rule; the 0.5 s is poll and process slack, not a new target) | Script test that stops updating `alive`; manual: quit the app while a Claude Code question waits on the release Mac, Claude Code shows its own picker |
| NFR5.2 | A waiting hook gives up before the agent's own limit (BR1.3). The entry timeout is 600 s; `THADEUS_WAIT_SECONDS` is 595 and is the full wait (the 5 s margin is applied once, in main). | the hook exits silently at 595 s by wall clock (`date +%s`), never later than 596 s; the store marks the event timedOut by then | Script test with `THADEUS_WAIT_SECONDS=2` (exit at 2–3 s); store test with a fake clock marking timedOut at `waitSeconds` |
| NFR5.3 | Close and Esc hand the question back at once (BR3.5). | empty `.ans` written; hook exits silently ≤ 300 ms later; Claude Code shows its own picker | Script test with an empty answer file; store test that Close writes an empty file and nothing else |
| NFR5.4 | After a restart only new events exist (BR2.4). | every channel folder from an earlier run is removed before the first session opens; 0 old questions shown | Unit test: leftover folders with `.evt` files are gone after start and no raw event is emitted for them |
| NFR5.5 | A tab that exits ends its events and sends nothing (BR2.3, FR6.4). | on pty exit: every event of the session goes to `ended`, its folder is removed, no write to any pty or hook, "The … session ended. Nothing was sent." shown for 3 s | Store and channel tests driving a pty exit |
| NFR5.6 | A failed send keeps the answer and can be retried (BR3.4, FR3.5). | state back to shown (or stays timedOut), `lastError` is one sentence, typed answer kept, a second Send works | Store and renderer tests for each failure: session ended, answer file not writable, picker not showing |
| NFR5.7 | The opencode plugin never blocks or breaks opencode. | the wait runs in its own async task; every error inside the plugin is caught and logged to opencode's log, never thrown into opencode; if `session.form.reply` is missing or rejects, the plugin writes nothing back and the store sends `via: keys` | Plugin tests with a stubbed V2 `ctx` (reply missing, reply rejecting, fs error); manual opencode run on the release Mac |

## Recovery

| Failure | Recovery | Who acts |
|---|---|---|
| App crash or quit while a hook waits | NFR5.1; the next start clears old folders (NFR5.4) | automatic |
| Hook timed out, the person still answers | `via: keys` after the picker shows (NFR1.3) | the person's click |
| Keys could not be sent | answer kept, Open the terminal offered (NFR5.6) | the person |
| Hook entry present but app or script absent | nothing runs (NFR4.1, NFR4.3) | none |

No data needs backup: events live only while their session lives.
