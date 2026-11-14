# Performance Requirements: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1, NFR4, NFR6, NFR7; FR2.7, FR2.8, FR5.1)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W1–W5, W9, typed delivery, Stop entry with `timeout 10`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md` (BR6.1, BR6.2, BR6.5, BR6.6, BR6.9, BR6.12, BR6.14, BR6.16, BR6.17)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/entities.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `reply` never waits, C4 `agentEvents.latest`, `agentEvents.reopen`)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/performance-requirements.md` (u1 rows reused by id)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/nfr-requirements-questions.md` (no questions)

## Scope

This Unit reuses u1's channel, script, store and dialog, so u1's performance rows hold for replies where they are written for every event: the hook entry's early exit (as u1 NFR4.1), the missing-folder exit (as u1 NFR4.2), and the close push in the same main-process turn (as u1 NFR1.4). The rows below are only what replies add. "Release Mac" and "timing log" mean what u1 defines (u1 NFR1.6).

IDs continue after u1's so a row can be cited across Units without clashing; they are this Unit's own requirements.

## Latency (NFR1)

NFR1 states its 1 s for questions, permission prompts and answers that reach the pty. A reply is the third event kind of FR2.1 and its answer is keys that reach the pty, so the same 1 s applies. No new number is added.

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.8 | A reply from an app tab appears in the dialog after the Stop hook (Claude Code) or the idle status (opencode) fires: `hookReceived` (event file `mtimeMs`) to `dialogShown`. When the reply is queued behind a question (BR6.8) the time is not counted; the strip still updates (NFR1.10). | ≤ 1 s in every one of 20 Claude Code runs; every opencode run of NFR2.5 also ≤ 1 s | Manual run on the release Mac with the timing log on; `dialogShown − hookReceived` per run |
| NFR1.9 | A typed answer reaches the pty: `answerClicked` to `answerDelivered` (the store's `writeSession` call for the final Enter returned). If NFR Design splits the text and Enter into two writes (u3 FD review R-02), the gap between them is inside this 1 s. | ≤ 1 s in every one of 20 runs | Manual run on the release Mac with the timing log on; store unit test with a fake pty that the whole sequence is written in one call chain with no wait longer than the chosen gap |
| NFR1.10 | The strip and a shown reply follow the session. A newer event, the person's terminal input (BR6.6) or a tab exit changes the reply (stale or ended) and the LatestMessage in the same main-process turn as the trigger, and pushes `agent-events:changed` then. | push in the same turn as the trigger; the dialog's stale line and the strip's new state painted ≤ 1 s after the trigger | Store unit tests: the push is synchronous on the raw event, on the terminal-input signal and on `closeSession`; manual check on the release Mac (W4, W5) |
| NFR1.11 | Reopen from the strip is immediate. `agentEvents.reopen` shows the reply again in the same dialog. | reply page painted ≤ 1 s after the click on Answer | Renderer test that the page is shown after the resolved reopen call with no extra round trip; manual check in the NFR2.5 run |

## The Stop hook and the plugin never hold the agent (NFR4, timing part)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR4.4 | The Stop entry's command, with the app absent or the session not the app's, returns before the script is looked for, exactly as u1 NFR4.1 and NFR4.2 for the question entry. | exit 0, no output, ≤ 100 ms, in each of 20 runs, for the exact C6 Stop command string (variable unset; script folder deleted; folder or `alive` missing) | The u1 NFR4.1/NFR4.2 script tests run once more with the Stop command string and the argument `reply` |
| NFR4.5 | With the app present, `dialog.sh reply` writes the event and exits at once. The `reply` branch has no wait: no `sleep`, no poll of `answers/`, no read of `alive` beyond the existence test it shares with u1. | exits well inside the entry's 10 s timeout in every run, including a 1 048 576-byte stdin; no `.ans` file is ever looked for | Script test: run `sh dialog.sh reply` (and `dash dialog.sh reply` where `dash` exists) with a live session folder and a 1 MB stdin; assert exit 0, 0 bytes on stdout and stderr, one `.evt` file, elapsed time < 10 s; code review that the `reply` branch contains no `sleep` and no loop |
| NFR4.6 | The opencode idle handler returns to opencode before the last message is read. | the handler returns while `ctx.session.context` is still pending; the read and the write run in a task the handler does not await | Plugin test with a stubbed V2 `ctx` whose `session.context` never resolves: the handler returns, and opencode's next event is handled |

## Dialog and strip use (NFR6, NFR7)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR6.4 | Focus moves into the reply page when it shows, including after reopen. | focus on the empty answer field when the M4 page shows (BR6.9) and when it is reopened (BR6.14) | Renderer test: `document.activeElement` is the answer field after the push and after reopen |
| NFR6.5 | The reply page and the strip work by keyboard alone. | Enter sends; Esc closes (dismisses, BR6.14); Copy and Open the terminal reachable by Tab on a stale page; the strip's Answer and Show reachable by Tab and pressed with Enter or Space | Renderer tests driving only keyboard events: send, dismiss, stale page, strip Answer, strip Show |
| NFR6.6 | Reply states are named in text, never by colour alone. | each of waiting, answered, session ended, shortened, stale and overdue has a text label or line: the strip's "(answered)", "(session ended)", "(shortened)"; the stale and session-ended lines; the overdue title after 20 s (BR6.17) | Renderer tests: the text of each state is in the DOM; fake-timer test that the overdue title is absent at 19.9 s and present at 20 s, absent for a dismissed or stale reply, and restarts at 0 on reopen |
| NFR7.3 | Every app text this Unit adds goes through `t()` with ICU placeholders. | 0 hard-coded user-facing strings in the reply page and the strip ("Message from {harness}", "{harness} finished its turn without a message.", "Shortened at 64 KB. The full text is in the terminal.", "No message from the agent yet", the stale, session-ended and sent lines); same keys in `sv.json` and `en.json` | Existing `tests/main/i18nKeys.test.js`; renderer tests run in the Swedish locale |
| NFR7.4 | The agent's message is shown as the agent sent it. | the shown text equals `last_assistant_message` (Claude Code) or the joined text parts (opencode) byte for byte, after the 64 KB cut of NFR5.21; never translated | Adapter tests with recorded payloads holding Swedish, emoji and non-ASCII text |
