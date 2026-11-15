# Reliability Design: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-design/nfr-design-questions.md` (no questions; four settled points)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/reliability-requirements.md` (NFR2.4–NFR2.6, NFR4.7, NFR4.8, NFR5.13–NFR5.19)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/performance-requirements.md` (NFR4.5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/scalability-requirements.md` (NFR5.23, NFR5.24)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/tech-stack-decisions.md` (D7–D10)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/reviews/review-01.md` (R-01, R-04)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W1–W8, state machines, typed delivery, known limits)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `reply` never waits, C2 `ptyOf` and the guarded `writeSession` caller)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reliability-design.md` (RD4, RD5, RD6, RD8, RD9)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/security-design.md` (SD3)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reviews/review-01.md` (R-01 `:` redirect under dash, R-02 start-up wipe, R-06 `O_NOFOLLOW`)
- Existing code: `src/main/pty.js` (`writeSession` is synchronous: `get(id).proc.write(data)`), `src/main/ipc.js` (`'pty:write'` handler), `src/renderer/TerminalContext.jsx` (`withEnter(text, true)` already types an own answer and Enter in one write into an agent tab)

## The promise

As the requirements state it: the Stop hook and the plugin never change or delay how the agent stops, and a typed answer reaches the tab that is waiting for it, once, or not at all. Component IDs are those of u1 `logical-components.md` (LC1–LC10) and this Unit's (LC11–LC12). Element IDs continue after u1's (u1 ends at RD9).

## RD10 The Stop branch: bounded copy, publish, exit 0

**Satisfies:** NFR4.5, NFR4.7, NFR4.8, NFR5.24, and u3 NFR review R-04.

The `reply` kind joins the non-waiting kinds on u1 RD4's `case` line. Its copy step is different from u1's plain `cat`: `cat` would block for as long as the writer keeps stdin open, which is up to the entry's `timeout 10`. So the reply branch copies stdin in the background and a watchdog stops the copy after 2 s. The script never waits for the watchdog.

```sh
# reply: after u1 RD4's setup lines (exec 2>/dev/null, variables, alive check, t0, n)
f=$d/events/$n.tmp
printf 'THADEUS-EVENT v1 reply %s\n' "$s" > "$f" || exit 0
{ cat <&3 >> "$f" & c=$!; } 3<&0 || exit 0      # stdin of a background job is /dev/null; fd 3 carries it
( sleep 2; kill "$c" ) </dev/null >/dev/null 3<&- & k=$!
wait "$c"                                       # returns at EOF, or when the watchdog kills cat
kill "$k"
mv "$f" "$d/events/$n.evt" || exit 0
exit 0
```

- **Why fd 3 in a brace group.** With job control off, POSIX gives a background command `/dev/null` as stdin before its own redirects, so `cat &` alone reads nothing. The `3<&0` sits on a brace group, not on `exec` or `:`. Both are special builtins, and under dash a failed redirect on them exits the shell before `|| exit 0` runs (u1 review R-01). A failed redirect on a brace group reaches `|| exit 0` in both shells. Checked on this machine: with stdin closed, `{ cat <&3 & } 3<&0 || echo reached` prints `reached` under `/bin/dash` and under macOS `sh`.
- **Why the watchdog cannot hold the hook.** Its stdout and stdin are `/dev/null` and it closes fd 3, so after `kill "$k"` nothing that Claude Code waits on stays open. Its orphaned `sleep 2` holds no hook descriptor. Checked on this machine: with stdin held open for 6 s, the script returns in 2.02 s under dash and under `sh`, and a `| cat` on its stdout ends at the same time. With stdin closed at once, it returns in 0.01 s.
- **Cut copies are still published.** When the watchdog fires, the file holds the header and part of the payload. The script renames it to `.evt` anyway. Main refuses it as unreadable and RD11 applies: the older reply of the session is moved on and says a newer message was not shown. Leaving the file unpublished would leave the older reply answerable, which is the error u3 NFR review R-01 names.
- **No `: >`, no `exec` redirect.** The reply branch writes no `.wait` marker, and its only redirects are on `printf`, `cat`, a brace group and a subshell, so u1 review R-01 has no instance here.
- **The bound.** 2 s is the copy's ceiling, not the expected time. A 1 MB stdin from Claude Code is copied in milliseconds. Exit is at most about 2.1 s after start, well inside the 10 s entry timeout (NFR4.5). The 10 s timeout stays as the outer ceiling that Claude Code itself enforces.
- **Deviation from NFR4.5 and NFR5.24 wording, recorded.** NFR4.5 says the branch has "no `sleep`" and NFR5.24 lists exactly one `cat` and one `mv`. The design adds one background subshell with `sleep 2` and at most two `kill` calls. This `sleep` is a ceiling on the copy, not a wait for an answer. The branch still has no loop, never reads `answers/` and never waits for the watchdog. The code-review check of NFR4.5 and NFR5.24 becomes: no loop, no read of `answers/`, one `sleep` only inside the watchdog subshell.

**Tested by** (each under `sh` and under `dash` where it exists, per u1 RD4's harness; each asserts exit 0 and 0 bytes on stdout and stderr):

- 1 048 576-byte stdin, closed at once: one `.evt` whose body equals stdin byte for byte, elapsed < 1 s (NFR4.5).
- stdin held open by the test for 8 s after 200 bytes: the script exits between 1.9 s and 2.6 s, one `.evt` with the header and those 200 bytes (review R-04).
- stdin closed before the script runs (`<&-`): exit 0, silent, no `.evt` (NFR4.7 "stdin closed early"); the header-only `.tmp` left behind is ignored by main (u1 SD3) and removed with the session folder (u1 RD5).
- `events/` not writable; the session folder made read-only; `mv` failing (a folder planted at the `.evt` name): exit 0, silent, no `.evt` (NFR4.7).
- the exact C6 Stop command string through `sh -c` for every case above: exit 0, no output (NFR4.8).
- `ps` after each case: no `cat` or `sleep` child of the script is left holding stdout (the test's stdout pipe reaches EOF when the script exits).

## RD11 An authentic reply that cannot be shown still moves the older one on

**Satisfies:** NFR5.23, NFR2.6, NFR5.14, and u3 NFR review R-01.

A refused Stop event still means the agent finished a turn. The person must not be left answering an older reply that the agent has already moved past. The rule is: **when a `reply` event from a live session is authentic but cannot be shown, the session's open reply is moved on as by a newer event, and it says a newer message could not be shown.**

| Case | Where it is found | Authentic means |
|---|---|---|
| over 1 048 576 bytes (NFR5.23) | AgentChannel, u1 SD3 check 2 | the first 128 bytes, read from the same descriptor that was opened with `O_NOFOLLOW` and checked by `fstat` (u1 review R-06), pass u1 SD3 checks 3 to 5 and name kind `reply` |
| body not valid JSON (cut by RD10's watchdog, or broken) | HarnessEventAdapter | the file passed all of u1 SD3 |
| no last-message field (BR6.3) | HarnessEventAdapter | the file passed all of u1 SD3 |

Files that fail checks 1, 3, 4 or 5 get nothing beyond u1's deletion and log line, because they may be forged (as u1 RD7).

**Interface.** AgentChannel gains one internal signal, `onRefusedReply({ sessionId, reason })`, fired only for the first row. The adapter's refusal of a reply returns `{ refused: reason }` to the store, which handles the second and third rows the same way. This is additive to C2 and internal to main.

**Store effect** (one synchronous step, push in the same turn, as PD10):

| The session's open reply was | It becomes | Shown line |
|---|---|---|
| `shown` | `stale`, `staleReason: 'notShown'`, typed text kept | "<harness> sent a newer message that could not be shown. It is in the terminal. Your text is kept." |
| `queued` or `dismissed` | `ended` | none |
| none | nothing changes | none |

The project's LatestMessage, when it names that session's reply, gets status `notShown`. The strip then shows "(newer message not shown)" after the tab name and offers Show. `notShown` is a new value of the existing `status` field of C4 `agentEvents.latest`, additive. `staleReason` (`movedOn`, `sessionEnded`, `notShown`) is a new optional field of the C3 event view, additive. Both texts go through `t()` (PD13).

**Tested by:**

- Store test (the one the review asks for): a reply is `shown` with typed text; a 1 048 577-byte reply event file for the same session arrives through a real AgentChannel on a temporary root. Result: the file is gone, one `[agent-events] too large` line, the shown reply is `stale` with `staleReason: 'notShown'`, `writeSession` is never called, the LatestMessage status is `notShown`, and exactly one `agent-events:changed` push was made in the same turn.
- The same with the older reply `dismissed` (it ends) and `queued` (it ends).
- An over-limit file with a wrong secret: the older reply stays `shown`.
- Adapter refusal cases (cut JSON, no `last_assistant_message`) with an older reply shown: same effect as the first test.
- An empty `last_assistant_message`: not a refusal. It is a newer reply with `empty: true` (NFR2.6).

## RD12 When a reply goes stale

**Satisfies:** NFR5.14, NFR1.10.

The store moves an open reply on in exactly four cases, each in the same synchronous call as its trigger:

| Trigger | Caller | `staleReason` |
|---|---|---|
| an accepted newer event of any kind from the same session (BR6.5) | AgentChannel's raw event, via the store | `movedOn` |
| the person's terminal input to that tab's pty (BR6.6), classified by SD10 | IpcRouter's `pty:write` handler calls `store.terminalInput(ptyId, data)` before `writeSession` | `movedOn` |
| an authentic reply that cannot be shown | RD11 | `notShown` |
| tab exit (BR6.7) | IpcRouter's pty exit wiring, store first and then `closeSession`, as u1 RD5 | `sessionEnded` |

`shown` becomes `stale` with the typed text kept in the renderer; `queued` and `dismissed` become `ended`. No path calls `writeSession`. A newer reply that is a duplicate (RD17) is not a newer event and changes nothing.

**Tested by:** store tests, one per trigger and per prior state (`shown`, `queued`, `dismissed`), each asserting the new state, the reason, no `writeSession` call and one push; renderer test that the typed text is still in the field after the push that makes the page stale.

## RD13 Check and write in one step; Enter only after the same send's text

**Satisfies:** NFR5.15, NFR1.9, NFR2.4, NFR2.5, and u3 FD review R-02.

`answerReply` runs as one synchronous function in main. Between the re-check and the write there is no `await`, so no other IPC handler, `pty:write` included, can run in between: main runs one task at a time and `writeSession` is synchronous (`proc.write`).

```js
// LC4 (illustrative): the whole send is one synchronous step (BR6.12, NFR5.15)
function answerReply(ev, raw) {
  if (ev.state !== 'shown') throw fail('event not open');        // re-check (BR6.10 order)
  const ptyId = channel.ptyOf(ev.sessionId);
  const line = cleanLine(raw);                                   // SD8
  if (ptyId && (!line || utf8Bytes(line) > 65536)) throw fail('answer does not fit the event');
  if (!ptyId) return failSend(ev, 'session ended');              // RD14
  try { writeSession(ptyId, line + '\r'); } catch (e) { return failSend(ev, `send failed: ${e.message}`); }
  endReply(ev, 'typed');                                         // ended, LatestMessage answered, push
}
```

- **One write.** Text and Enter go in one `writeSession` call to the one pty that `ptyOf(sessionId)` names. Enter can therefore never be written on its own, to another pty, or before the text. This is also what the app does today when it types an own answer with Enter into an agent tab (`withEnter(answer.own, true)` in `src/renderer/TerminalContext.jsx`), which is why one write is the chosen default.
- **The person's input during the send.** A `pty:write` that arrives while the send runs waits in the IPC queue. It runs after `answerReply` has returned, when the reply is already `ended`, so it neither interleaves with the line nor marks the reply stale.
- **Fallback, only if NFR2.5 fails.** If the manual run shows that a TUI takes a single write as a paste and leaves a newline in its input box, the Enter becomes a second write 30 ms later. The text write stays inside the step above, and the timer writes `'\r'` only when the text write succeeded, to the same `ptyId` captured in the step, and only when no `terminalInput` for that pty arrived in the gap. A person's keystroke in those 30 ms then means no Enter is sent, and the text waits in the TUI's input box. `ponytail:` comment in code if the fallback is ever needed: the 30 ms gap is a guess. Make it per harness if one TUI needs more.

**Harness facts (filled by the NFR2.5 run before the release pull request):**

| Harness | Write used | Result of scenario (7) on the release Mac | Stray newline |
|---|---|---|---|
| Claude Code 2.1.325 | one write, `line + '\r'` | to be recorded | to be recorded |
| opencode 2.1.4 | one write, `line + '\r'` | to be recorded | to be recorded |

**Tested by:**

- Store test with a fake pty (NFR5.15): the fake records calls; one Send makes exactly one call, `('pty-A', 'notes.md\r')`; a `pty:write` for the same pty issued in the same tick as Send is recorded after it, and the reply is already `ended` at that point.
- Two-tab store test: only the asking tab's pty id is written (also NFR3.15).
- Replay tests (NFR2.4): a recorded Claude Code `Stop` stdin and a recorded opencode `session.status` idle event with its `ctx.session.context` result, both ending with "Which name should the file have?". Answering "notes.md" writes exactly `notes.md\r` to the fake pty, one test per harness.
- Manual run (NFR2.5): both harnesses on the release Mac, timing log on. The table above is filled in. If a stray newline appears, the fallback is switched on for that harness and the run is repeated.

## RD14 A failed typed send keeps the answer

**Satisfies:** NFR5.16, and u1 NFR5.6 for replies.

u1 RD9 applies unchanged: `ptyOf` null fails with "session ended", and the reply is `stale` with `staleReason: 'sessionEnded'` when the session is gone, otherwise back to `shown`. A throwing `writeSession` fails with "send failed: <cause>" and the reply goes back to `shown`. `lastError` is one sentence, the renderer keeps the text, and a second Send runs `answerReply` again.

**Tested by:** store tests per failure (state, `lastError`, one log line, a second Send succeeds against a fake pty that throws only once); renderer test that the text survives each failure.

## RD15 The opencode idle handler never blocks or breaks opencode

**Satisfies:** NFR5.13, NFR4.6, and u1 NFR5.7 for replies.

u1 RD8's rules hold for the new handler: the body is wrapped in `try`/`catch`, errors go to opencode's log (OD7), and file names use u1 RD8's strictly increasing ms. The handler forwards only `status.type === 'idle'` for a session with no parent, starts `ctx.session.context({ sessionID })` and the file write as one promise chain with its own `.catch`, and returns without awaiting it (u3 D9). A rejected or throwing read writes nothing.

**Tested by:** plugin tests with a stubbed V2 `ctx`: idle top-level (one `.evt`), idle child (none), busy (none), retry (none), context rejecting, context throwing synchronously, `fs` write error (each: nothing thrown, one log line, no `.evt`); a context that never resolves (the handler has returned and the next event is handled).

## RD16 Nothing from an earlier run

**Satisfies:** NFR5.17, and u1 NFR5.4 for replies.

Replies and LatestMessages live in the store's memory only, so a new app run starts with none. Leftover reply files are removed by u1 RD6's start-up clear. u3 relies on the resolution of u1 NFR Design review R-02 (a single-instance lock taken before `init()`, or a clear scoped to this instance): either way a second app start never wipes a running instance's reply files, and nothing in this Unit depends on which of the two is chosen.

**Tested by:** channel test with leftover reply `.evt` files: none is emitted after the first `openSession`; renderer test of the empty strip ("No message from the agent yet") before any reply.

## RD17 The same message twice is one reply

**Satisfies:** NFR5.19.

On an accepted reply, the store compares its text with the session's newest reply, if that one is still open (`queued`, `shown` or `dismissed`). Equal text: the event is dropped with no push, no `added` signal and no log line (OD8). Different text: it is a newer event (RD12). A reply after the earlier one was answered or ended is always new.

**Tested by:** store tests: equal text while open (dropped), different text (newer event), equal text after the first was answered (new reply).

## Rows reused from u1 without change

| Row | Why it holds or does not apply for replies |
|---|---|
| u1 NFR5.1, NFR5.3 | do not apply: a reply hook never waits (C1), so there is nothing to hand back and no liveness loop; the rows stay in force for the waiting kinds |
| u1 NFR5.6 | RD14 |
| u1 NFR5.7 | RD15 |
| u1 NFR5.4 | RD16 |
| u1 NFR2.2 | the manual run of the question scenarios is unchanged; NFR2.5 adds scenario (7) to the same session on the release Mac |

## Review findings

| Finding | Resolution |
|---|---|
| u3 NFR review R-01 (refused over-limit reply leaves the older one answerable) | RD11: authentic refusals move the older reply on with "newer message not shown"; store test named there |
| u3 NFR review R-04 (open stdin holds the Stop hook up to 10 s) | RD10: background copy with a 2 s watchdog; the 10 s entry timeout is the outer ceiling only; script test with stdin held open |
| u1 NFR Design review R-01 (`:` redirect under dash) | RD10 uses no redirect on `:` or `exec` |
| u1 NFR Design review R-02 (start-up wipe vs a second instance) | RD16 relies on its resolution |
| u3 FD review R-02 (text and Enter in one write) | RD13: one write by default, the fallback and the manual run that decides |

## Recovery

| Failure | Recovery | Design element |
|---|---|---|
| Stop stdin stays open | the copy is cut at 2 s, published, refused, and the older reply says a newer message was not shown | RD10, RD11 |
| Stop payload over 1 MB | refused; the older reply is moved on; the person reads the message in the terminal | RD11 |
| The tab moved on before Send | stale line, text kept, Copy and Open the terminal | RD12 |
| The typed send failed | text kept, retry or Open the terminal | RD14 |
| Another project hook makes Claude continue after the Stop | the next event from the session makes the reply stale (functional spec, Known limits) | RD12 |

No backup is needed: replies live in memory for one app run.
