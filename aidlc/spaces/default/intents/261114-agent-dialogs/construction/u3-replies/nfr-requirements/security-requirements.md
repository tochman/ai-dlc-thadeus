# Security Requirements: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR3; FR2.2, FR2.7, FR3.1, FR3.3, FR6.2; Constraints)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (harness facts, W1, W3, W4, W9, typed delivery, interfaces)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md` (BR6.1, BR6.3, BR6.6, BR6.10–BR6.14, BR6.16)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/entities.md` (LatestMessage `sessionId` kept in main only; Answer `text`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/reviews/review-01.md` (R-01 what counts as the person's input)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 security note, C2 guarded `writeSession` caller, C3 secret never included, C4 errors and `agentEvents.reopen`)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (react-markdown without raw HTML, sandboxed preload)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/security-requirements.md` (u1 threat model and rows reused by id)

## Threat model: what replies add

u1's threat model holds unchanged (as u1 Threat model, including its accepted risk that an agent's own command can forge events for its own session). Replies add one new way out of the app and one new kind of agent text:

| Asset | Threat | Where it is stopped |
|---|---|---|
| The asking tab's pty | the person's answer is typed into another tab, typed after the tab moved on, typed twice, or typed without a click | NFR3.15, NFR3.16 |
| The asking tab's pty | control or escape sequences in the typed answer act on the TUI (Ctrl-C, a bracketed-paste end, a cursor move, an extra Enter) | NFR3.14 |
| The renderer | HTML, script or unsafe links in the agent's last message, now shown in two places (dialog and strip) | NFR3.13 |
| The person's files | the app reads the session transcript the Stop payload points to | NFR3.17 |
| Main-only data | the session id or secret reaching the renderer through `agentEvents.latest` | NFR3.18 |

The forging risk is the same as u1's: a forged reply reaches only the person's own dialog for that tab, and a typed answer still needs the person's Send.

## Reused from u1 for the reply kind

| u1 row | Holds for replies because |
|---|---|
| u1 NFR3.1 private session folder | the reply event uses the same folder |
| u1 NFR3.2 secret stays in env and AgentChannel | the reply line 1 carries the same secret |
| u1 NFR3.3 seven refusal cases, constant-time compare | AgentChannel checks every kind the same way (BR1.1) |
| u1 NFR3.8 script never interprets the payload | `dialog.sh reply` copies stdin with `cat`, like `question` |
| u1 NFR3.9 file names checked before use as paths | same names, same check |
| u1 NFR3.10 fallback events keep today's path | the fallback has no replies (entities) |

Each u1 test for these rows gets one more case with kind `reply`.

## Requirements (NFR3)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR3.13 | The agent's message is shown as sanitized Markdown in the dialog and in the strip, as u1 NFR3.5 and NFR3.6 (BR4.1, BR6.9, BR6.16). | in both places: `<script>`, `<style>`, `<iframe>`, `<img onerror=…>` and `javascript:` produce no element of that kind and run nothing; only `http` and `https` links are anchors; `shell.openExternal` is called only on click; the strip's inline rendering adds no block element | Renderer tests with one payload holding each case, run against the M4 page, the strip and the read-only Show view |
| NFR3.14 | The typed answer is one line with no control characters (BR6.11). | every character of Unicode category `Cc` (U+0000–U+001F, U+007F, U+0080–U+009F) is gone: CR, LF and TAB become one space each, all others are removed; the store then writes the line and exactly one Enter; emoji, quotes and non-ASCII are unchanged | Store unit tests with answers holding `\x03`, `\x1b[201~`, `\x1b[2J`, `\r\n`, `\t`, `\x7f`, `\x9b` and an emoji; the bytes passed to `writeSession` are the expected line plus one Enter only |
| NFR3.15 | The answer goes only to the asking tab, only while it waits, and only once (BR6.10, BR6.12, FR3.1). | `agentEvents.answer` refuses with the named C4 error for: unknown event, event not open (queued, dismissed, stale, ended, sending), session ended, answer does not fit (empty after cleaning, over 64 KB); a second answer to the same reply is refused; on accept, `writeSession` is called only with `ptyOf(event.sessionId)` | One store test per error, each asserting `writeSession` is never called; a two-tab test asserting only the asking tab's pty id is written |
| NFR3.16 | Nothing is typed without the person's Send (as u1 NFR3.7). | arrival, duplicate, dismiss (Close, Esc), reopen, stale, tab exit and app restart type nothing and write no answer file | Store tests: no `writeSession` and no `writeAnswer` call on each of these |
| NFR3.17 | The reply text comes only from the payload's own last-message field; the transcript is never read (BR6.3). | the app never opens `transcript_path`; the shown text is `last_assistant_message` even when the transcript holds other text | Adapter test with a recorded Stop payload whose `transcript_path` names a file holding a marker: the marker is not shown, and an `fs` spy records no open of that path |
| NFR3.18 | `agentEvents.latest` and the pushed events carry no main-only data (entities: LatestMessage `sessionId`). | the serialised `agentEvents.latest` result has only `tabId`, `harness`, `text`, `arrivedAt`, `status`, `eventId`, `truncated`, `empty`; no `sessionId`, no secret, no session folder path | Unit test on the serialised payload, as u1 NFR3.2 does for `agentEvents.list` |
| NFR3.19 | Reopen works only for a dismissed reply of a live session (BR6.14). | `agentEvents.reopen` refuses "unknown event" or "event not open" for every other state and kind; a refused reopen changes nothing | Store tests per state |
| NFR3.20 | Only the person's own terminal input makes a reply stale (BR6.6, u3 FD review R-01). Terminal auto-responses the renderer's terminal emits by itself (device-attribute and cursor-position reports, colour query answers, focus in and out `\x1b[I`, `\x1b[O`) and writes by other app features do not count. | a shown reply stays `shown` after each auto-response; it goes `stale` after a keystroke or paste; NFR Design names how the signal tells them apart | Store and renderer tests: each auto-response sequence while a reply is shown leaves it shown; a printable keystroke and a paste make it stale |

## Compliance

As u1: nothing leaves the machine and nothing is stored beyond the app run. The LatestMessage text is held in main's memory only and is gone at quit (entities). No compliance regime applies.
