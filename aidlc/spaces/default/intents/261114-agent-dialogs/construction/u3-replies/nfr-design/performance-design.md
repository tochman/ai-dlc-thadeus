# Performance Design: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-design/nfr-design-questions.md` (no questions; four settled points)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/performance-requirements.md` (NFR1.8–NFR1.11, NFR4.4–NFR4.6, NFR6.4–NFR6.6, NFR7.3, NFR7.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/observability-requirements.md` (NFR1.12)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/tech-stack-decisions.md` (D7, D9, D11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W1–W5, W9, typed delivery, Stop entry `timeout 10`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `reply` never waits, C4 `agentEvents.latest`, `agentEvents.reopen`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/performance-design.md` (PD1, PD3, PD4, PD5, PD6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/observability-design.md` (OD1)
- Existing code: `src/main/pty.js` (`writeSession` is synchronous), `src/renderer/ArtifactReader.jsx` (`FileContent`)

## Scope

u1's performance design holds for replies wherever it is written for every event: the intake path (u1 PD1), closing events in the same turn (u1 PD3), and no cost when the app is absent (u1 PD4). The elements below are what replies add. Element IDs continue after u1's (u1 ends at PD6). Component IDs are those of `logical-components.md`.

## Latency budget for one reply

All numbers are for the release Mac and are checked from the timing log (OD5), not estimated in tests.

| Step | From → to | Budget | Design element |
|---|---|---|---|
| Stop hook writes the event | Claude Code runs the entry → `.evt` renamed | ≤ 50 ms normal, ≤ 2.1 s with stdin left open | PD7, reliability-design RD10 |
| Intake and parse | `hookReceived` (`mtimeMs`) → push | as u1 PD1 | u1 PD1 |
| Paint | push → `dialogShown` | one frame after the effect | PD8 |
| **Shown** | `hookReceived` → `dialogShown` | **≤ 1 s** (NFR1.8) | PD8 |
| Typed delivery | `answerClicked` → `answerDelivered` | one IPC round trip and one synchronous write; **≤ 1 s** (NFR1.9) | PD9 |
| Stale push | trigger → `agent-events:changed` | same main-process turn (NFR1.10) | PD10 |
| Reopen | click → page painted | one invoke, **≤ 1 s** (NFR1.11) | PD11 |

## PD7 The Stop entry and the reply branch never hold the agent

**Satisfies:** NFR4.4, NFR4.5, NFR5.24, and u1 NFR4.1, NFR4.2 for the Stop command.

- **App absent.** The Stop entry is the exact C6 command with argument `reply`. Its `[ -n "$THADEUS_SESSION_DIR" ] && [ -f … ]` tests return before the script is looked for, as u1 PD4 designs for the question entry, and the script's own `alive` check exits when the folder is gone (u1 RD4).
- **App present.** The reply branch writes the header with the shell's `printf`, copies stdin in the background with a 2 s watchdog, renames the file and exits (reliability-design RD10). It never enters u1's poll loop and never reads `answers/`. With stdin closed at once by Claude Code, the measured run is 0.01 s; with stdin held open it is 2.02 s, both under dash and macOS `sh` on this machine.

**Tested by:** u1's NFR4.1 and NFR4.2 script tests run once more with the Stop command string and the argument `reply`: exit 0, no output, ≤ 100 ms in each of 20 runs, for each of: variable unset, script folder deleted, folder or `alive` missing. The NFR4.5 script tests of reliability-design RD10 (1 MB stdin < 1 s; stdin held open, exit between 1.9 s and 2.6 s). Code review of the reply branch: no loop, no read of `answers/`, the only `sleep` is inside the watchdog subshell.

## PD8 A reply is on screen within 1 s

**Satisfies:** NFR1.8, and u1 NFR1.6 for replies.

The reply takes u1 PD1's path unchanged: one watcher, intake, adapter, store, push. The adapter's reply parse is one `JSON.parse` of at most 1 MB and one 64 KB cut (scalability-design SCD7). AgentDialog stamps `dialogShown` in a `requestAnimationFrame` after the M4 page's effect runs, as u1 OD1. A reply queued behind a question or permission prompt (BR6.8) gets `dialogShown` when it is first painted, and that run is left out of NFR1.8's count. The strip updates on the same push either way.

**Tested by:** the manual run on the release Mac with the timing log on: 20 Claude Code turns and each opencode run of NFR2.5, `dialogShown − hookReceived` ≤ 1 s in every run; renderer test that `dialogShown` is stamped once per first paint and not for a queued reply until it is painted.

## PD9 Typed delivery in one synchronous step

**Satisfies:** NFR1.9.

The renderer's Send calls `agentEvents.answer` once. Main runs `answerReply` (reliability-design RD13), which writes text and Enter in one `writeSession` call and stamps `answerDelivered` right after that call returns. There is no wait anywhere in the chain. Should the NFR2.5 run require the fallback with a separate Enter, the gap is 30 ms, well inside the 1 s, and `answerDelivered` is stamped after the Enter write.

**Tested by:** store test with a fake pty: one Send makes one write, and `answerDelivered` is stamped after it with no timer in between; the manual run on the release Mac, 20 runs, `answerDelivered − answerClicked` ≤ 1 s in every run.

## PD10 Stale and session-ended changes are pushed in the same turn

**Satisfies:** NFR1.10, and u1 NFR1.4 for replies.

Every trigger of reliability-design RD12 (a newer event, the person's terminal input, an authentic reply that cannot be shown, a tab exit) changes the reply and the LatestMessage and calls the push in the same synchronous call, as u1 PD3 does for closing events. `store.terminalInput` runs inside the `pty:write` handler before `writeSession`, so the first keystroke that makes a reply stale is also the one that pushes the change. A tab sends many keystrokes, so `terminalInput` returns at once when the tab has no open reply: one map lookup per write.

**Tested by:** store unit tests asserting the push is called synchronously on the raw event, on `terminalInput`, on the refused-reply signal and on `endSession`; a store test that `terminalInput` for a tab with no open reply makes no push; the manual check on the release Mac (W4, W5) that the stale line and the strip's new state paint within 1 s.

## PD11 Reopen shows the page from the answer to one call

**Satisfies:** NFR1.11, NFR6.4.

`agentEvents.reopen` changes the reply to `shown` and returns `{ state: 'shown' }`. The same store call pushes `agent-events:changed`, which the dialog already listens to, so the page is shown with no second request. Focus goes to the empty answer field when the page shows, after arrival and after reopen. The 20 s overdue count restarts at 0 (BR6.17).

**Tested by:** renderer test with a fake bridge: one `reopen` call, then the page is present and `document.activeElement` is the answer field, with no further bridge call; the same focus check after an arrival push.

## PD12 The opencode idle handler returns before the read

**Satisfies:** NFR4.6.

The handler checks `status.type === 'idle'` and the parent, starts `ctx.session.context({ sessionID })` and the file write as one promise chain with its own `catch`, and returns `undefined` without awaiting it (u3 D9, reliability-design RD15).

**Tested by:** plugin test with a stubbed V2 `ctx` whose `session.context` never resolves: the handler returns, and a second event passed straight after is handled.

## PD13 Reply page and strip: keyboard, words, the app's texts and the agent's text

**Satisfies:** NFR6.4, NFR6.5, NFR6.6, NFR7.3, NFR7.4, and u1 NFR6.1–NFR6.3, NFR7.1, NFR7.2 for the reply page (u1 PD5, PD6).

- **Keyboard.** Enter in the answer field sends; Esc closes and dismisses. On a stale page Copy and Open the terminal are buttons in Tab order. The strip's Answer and Show are `button` elements, so Enter and Space press them.
- **States in words.** Each state has a text: waiting (Answer shown), "(answered)", "(session ended)", "(shortened)", "(newer message not shown)" (reliability-design RD11), the stale line, the session-ended line, the not-shown line, and the overdue title after 20 s. No state is shown by colour alone.
- **The app's texts.** Every text above, plus "Message from {harness}", "{harness} finished its turn without a message.", "Shortened at 64 KB. The full text is in the terminal.", "No message from the agent yet" and the sent line, goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`.
- **The agent's text.** The M4 page renders the adapter's text exactly as it came, after the 64 KB cut. It is never translated, trimmed or cleaned by the app's sanitizer (SD8 is for answers and notifications, not for the shown message).

**Tested by:** renderer tests driving only keyboard events (send, dismiss, stale page, strip Answer, strip Show); one renderer test per state asserting its text in the DOM; a fake-timer test that the overdue title is absent at 19.9 s and present at 20 s, absent for a dismissed or stale reply, and restarts at 0 on reopen; `tests/main/i18nKeys.test.js` with the new keys; renderer tests in the Swedish locale; adapter tests with recorded payloads holding Swedish, emoji and non-ASCII text: the shown text equals the payload's text byte for byte.

## What is not designed here

No caching, pooling or pagination: one person, a few tabs, at most one open reply per session (scalability-design). The only heavy step is one `JSON.parse` of at most 1 MB per finished turn.
