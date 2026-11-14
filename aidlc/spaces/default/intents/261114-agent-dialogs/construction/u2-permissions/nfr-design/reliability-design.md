# Reliability Design: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/nfr-design-questions.md` (Q1: A)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reliability-requirements.md` (NFR2.4–NFR2.7, NFR4.5, NFR5.13–NFR5.20)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/performance-requirements.md` (NFR4.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/tech-stack-decisions.md` ("Shared script", D7–D10, NFR8.5, NFR8.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reviews/review-01.md` (R-05, R-06)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (W1–W6, state machine, open points)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.1–BR5.4, BR5.7–BR5.11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 waiting, C2 "Delivering an answer")
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reliability-design.md` (RD1–RD9, the shared base)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (LC1–LC10, C1 amendment, `answerState`, `retract`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reviews/review-01.md` (R-01, R-02, R-03, R-04)
- Existing code: `src/main/pty.js` (`onExit`, `writeSession`), `src/main/ipc.js` (`shutdown`)

## The promise

As u1: an agent session is never left blocked, and the agent gets the decision the person picked. For a permission one more promise holds: **when anything goes wrong, nothing is allowed or denied; the agent's own prompt takes over.** Every element below ends either in the person's decision delivered once, or in a hand-back.

u1 RD1 (liveness and deadline), RD2 (wait marker and take by rename), RD3 (`hookWaits`), RD4 (silent exit), RD5 (tab exit and quit), RD6 (start-up clear) and RD8 (plugin never breaks opencode) carry permission events unchanged. This file designs only what differs. SD elements are in this folder's `security-design.md`.

## RD10 Permission delivery: confirmed, and never keys

**Satisfies:** NFR5.16, NFR5.20, NFR1.9, NFR3.19 (with SD13), review R-05.

`sendPermission` is u1 RD2's `sendViaHook` with two changes: every branch that would send keys ends in `timedOut`, and "taken" also needs the session folder to still exist (u1 NFR Design review R-04).

```js
// LC4 (illustrative): u1 RD2 for permissions; keys branches become timedOut (D10, NFR5.16, NFR5.20).
async function sendPermission(ev, text) {
  try { await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text }); }
  catch (e) { return failed(ev, e.message); } // shown if the hook still waits, else timedOut
  for (const end = Date.now() + windowMs(ev.harness); Date.now() < end; await sleep(25)) {
    const st = await channel.answerState(ev.sessionId, ev.file);
    if (!st.folder) return timedOut(ev, 'session ended');
    if (!st.waiting && !st.answerPresent) return st.nack ? timedOut(ev, 'the agent refused the answer') : sent(ev);
    if (!st.waiting) return (await channel.retract(ev.sessionId, ev.file)) ? timedOut(ev, 'the hook stopped waiting') : sent(ev);
  }
  return (await channel.retract(ev.sessionId, ev.file)) ? failed(ev, 'the hook did not take the answer') : sent(ev);
}
```

| Seen by main (u1 RD2 table) | Question (u1) | Permission (u2) |
|---|---|---|
| `.ans` gone, `.wait` gone, no `.nack`, folder present | sent via hook | **sent** |
| `.ans` gone, `.wait` gone, `.nack` present | keys | **timedOut**, `lastError` "the agent refused the answer" |
| `.wait` gone, `.ans` still there | retract, keys | **retract, timedOut** (NFR5.16) |
| folder gone | (u1 review R-04) | **timedOut**, "session ended" |
| neither within the window | retract, failure | retract: success means `failed` (shown while `hookWaits`, else timedOut, NFR5.20); `ENOENT` means taken, so sent |

- `answerState` gains a `folder` flag (the session folder exists). It is an internal LC2 member, so C2 does not change.
- `windowMs` is 1 000 ms for Claude Code (the hook's take is one `mv` and one `cat`) and 5 000 ms for opencode, whose take is followed by the in-process `ctx.permission.reply` call. That widens u1 RD2's 1 s window for opencode, as u1's ponytail note invites.
- `failed(ev, cause)` asks `hookWaits(ev)` (u1 RD3, the `.wait` marker): still waiting gives `shown` with `lastError` and the choice kept, so a second Send works; not waiting gives `timedOut`. Nothing was allowed by the failed attempt, because the hook never took a file (the unlink succeeded) or no file was written.
- ponytail: a hook killed with `SIGKILL` between its take and its print leaves `.wait`, falls to the retract, gets `ENOENT` and is reported sent. Claude Code kills the hook only at its 600 s entry timeout, and the hook leaves at 595 s (u1 RD1), so this needs the person to answer in the last 5 s and Claude Code to kill the hook in the one `cat` between take and print. Known gap, same as u1 review R-04 notes; the terminal still shows the prompt if it happens.

**Tested by:** store tests with a fake channel, one per row (each also asserts `writeSession` was never called); a test where `writeAnswer` throws `EACCES` while `.wait` exists (state `shown`, `lastError` set, second Send succeeds) and while it is gone (state `timedOut`); the NFR5.16 case: the hook exits at the wait limit and the `.ans` appears just after, the event ends `timedOut` with `lastError`, never `sent`; a test that the folder is removed during the poll (state `timedOut`, never `sent`).

## RD11 Unshown permissions hand back at once

**Satisfies:** NFR5.13, NFR2.6.

When a raw `permission` event arrives and the store will not show it, it calls `handBack(ev)` in the same synchronous call that handles the raw event, before it returns, and pushes nothing:

- the adapter refused it (BR5.1, BR5.2): Claude Code without a non-empty `tool_name` or with a `tool_input` that is not an object; opencode `permission.asked` without `sessionID` or without its request id;
- the tool is `AskUserQuestion` (the question tool; u1 handles it through its own entry);
- the project's source for that harness is the fallback (BR2.7).

`handBack` writes the empty `.ans` through u1 RD2 only when `hookWaits(ev)` is true; otherwise there is nothing to hand back. Each case logs one line (OD7). The hook takes the empty file and exits silently within 300 ms (u1 RD2); Claude Code shows its own prompt.

An Allow always that cannot be shown (SD11) is not a refusal: the event is shown with Allow once and Deny.

**Tested by:** adapter tests, one per malformed shape, each returning a refusal with a reason; store tests per case: `writeAnswer` called with `''` before `onRawEvent` returns, no `agent-events:changed` push, one log line; script test with an empty answer file and the `permission` argument: exit 0, 0 bytes, ≤ 300 ms.

## RD12 Hand-back paths: app gone, wait limit, Close, Esc, tab exit

**Satisfies:** NFR5.14, NFR5.15, NFR5.17, NFR5.18, NFR4.5 (with RD14).

| Path | Design | Bound |
|---|---|---|
| App quits or crashes while a permission waits (NFR5.14) | u1 RD1 unchanged: the heartbeat worker stops; the hook counts unchanged polls of `alive` | u1 RD1 gives 2.0 s to about 2.3 s once u1 review R-03 is applied (21 unchanged polls, or one `sleep` before the loop). That lies inside NFR5.14's 2.0–3.5 s, which was written for an earlier 1 s-clock rule; the poll rule supersedes it and is stricter |
| Wait limit (NFR5.15) | u1 RD1's wall-clock deadline with `THADEUS_WAIT_SECONDS=595`; the store's timer at `arrivedAt + waitSeconds` sets `timedOut` for a queued or shown permission, disables every choice, shows the M6 line and writes nothing | u1 RD1: exit between 594 s and 596.1 s, always at least 3.9 s inside the 600 s entry. NFR5.15 says "never later than 596 s"; the extra 0.1 s is one poll and is accepted with u1's reasoning. The `THADEUS_WAIT_SECONDS=2` script test uses u1 RD1's window, 1.0 s to 3.2 s, for the same flooring reason |
| Close or Esc (NFR5.17) | `handBack(ev)`; state `handedBack`, then `ended` at once; toast for 5 s. The plugin takes the empty file, calls no `reply` and stops waiting | hook exits ≤ 300 ms later (u1 RD2) |
| Tab exits (NFR5.18) | u1 RD5: `endSession` ends every event of the session first, whatever its kind and state, pushes "Nothing was sent.", then `closeSession` removes the folder; no writer is called | each waiting hook exits at its next poll, ≤ 100 ms |
| App start (u1 NFR5.4) | u1 RD6 with the single-instance lock of u1 review R-02 (security-design.md SD14) | leftover permission event files are removed and never shown |

A timed-out permission ends on Close, a newer event from the same session, or exit (BR5.9). A newer event ends only a `timedOut` permission, never one whose hook still waits (SCD6).

**Tested by:** the u1 RD1 liveness and deadline script tests run once more with the `permission` argument, under `sh` and `dash` (RD14); store test with a fake clock: timedOut at `waitSeconds`, every choice `enabled: false`, no `writeAnswer`, no `writeSession`; store, script and plugin tests for Close and Esc (empty file, hook silent, no `reply`); store test with three open permissions in one session in different states and a pty exit: all `ended`, 0 writes after the exit; manual: quit the app while a Claude Code permission waits on the release Mac.

## RD13 The opencode plugin's permission path

**Satisfies:** NFR5.19, NFR8.6, NFR3.13 (plugin half, with SD8), review R-06.

LC9 gains two subscriptions in `thadeus-dialog.js`. Every handler keeps u1 RD8's `try`/`catch` and own async wait.

- `permission.asked`: write the C1 `permission` event (body unchanged) with u1 RD8's file naming, create the `.wait` marker first, and start the wait task. Several requests wait at once, each on its own files (SCD6).
- `permission.replied`: add the request id to a per-process `replied` set, and write an `answered` event carrying it. The store ends the matching permission event (PD9).
- When the wait task takes an answer file (u1 RD2 step 3'), it calls `deliver`:

```js
// LC9 (illustrative): one decision per request, only from the answer file (NFR3.13, NFR5.19, R-06).
const DECISIONS = new Set(['once', 'always', 'reject']);
async function deliver(ctx, req, text) {
  if (!DECISIONS.has(text) || replied.has(req.id)) return 'none'; // empty or other text: hand back
  if (typeof ctx.permission?.reply !== 'function') return 'nack';
  try {
    await ctx.permission.reply({ sessionID: req.sessionID, requestID: req.id, decision: text });
    return 'ok';
  } catch { return 'nack'; } // includes opencode refusing a request the terminal already answered
}
```

`'nack'` renames `.took` to `.nack` (u1 RD2); `'ok'` and `'none'` remove `.took`; then the task removes `.wait`. The failure signal is u1's `.nack` marker, which RD10 reads as `timedOut` with `lastError`. That replaces NFR5.19's "an `answered` event marked failed": one failure mechanism for both kinds instead of two, with the same outcome (timedOut, cause shown, nothing thrown into opencode).

**The residual window (review R-06), accepted.** A terminal answer can land between the `replied.has` check and the `reply` call. The plugin cannot close that window; opencode can, because it holds the request. opencode applies the first decision it receives and treats the request as answered; the plugin's late `reply` then rejects or does nothing. Either way the request gets one decision, and both possible decisions are the person's own. What the dialog shows afterwards may be "Sent" or "Answered in the terminal.", depending on which file main sees first; both are true enough, because the request is answered.

**Tested by** (plugin tests importing the module with a stubbed V2 `ctx`): `permission.replied` before the answer file (no `reply`); after it (one `reply`); **replied during reply**: the stub fires the `permission.replied` handler from inside `reply` and then rejects, and the test asserts `reply` was called exactly once, nothing was thrown, `.nack` was written and the `answered` event was written; `reply` rejecting (`.nack`, nothing thrown); `reply` missing (`.nack`); `fs` error on the event write (logged, nothing thrown); answer texts outside the three decisions (no `reply`); store test: an `answered` for a `sending` permission ends it and a later `.nack` changes nothing visible.

## RD14 The script with the `permission` argument

**Satisfies:** NFR4.4, NFR4.5, NFR8.5.

u2 changes one line of `dialog.sh`: `case $1 in question | permission) waits=1 ;; …`. Everything else is u1 RD4 as corrected by u1 review R-01 (`printf ''` for the wait marker under dash) and R-03 (the liveness count). The C6 `PermissionRequest` entry is u1's command with `permission`, a matcher for every tool and `timeout 600` (D7); it runs on every permission prompt in every checkout that has the settings, so u1 PD4's "no cost outside the app" matters most here.

**Tested by** (each under `sh` and, when installed, `dash`, spawning the shell explicitly as u1 RD4 does; each asserts exit 0 and 0 bytes on stdout and stderr): the exact C6 command through `sh -c` with `THADEUS_SESSION_DIR` unset and with the script folder deleted, 20 runs each, every run ≤ 100 ms (NFR4.4); folder or `alive` missing; app gone; wait reached; empty answer file; `events/` not writable; `answers/` missing (the dash case of u1 review R-01); two `permission` processes started together (SCD7). Manual: plain `claude` outside the app on the release Mac asks for a Bash permission and shows its own prompt at once.

## RD15 The decision received is the one picked

**Satisfies:** NFR2.4, NFR2.5, NFR2.7.

- **Choices.** The adapter builds the agent's own choices in its order: Claude Code Allow once, Allow always (SD11 rules), Deny; opencode Allow once, Allow always (only with always-patterns, Q1 A), Reject. `refuses` is true for the deny choice only. Their `effect` is `allowOnce`, `allowAlways` or `deny` on both harnesses; the adapter maps it to `once`, `always` or `reject` for opencode.
- **Replay.** Six adapter and plugin tests replay recorded payloads, one per choice per harness: Claude Code `behavior: "allow"`; `allow` with `updatedPermissions` deep-equal to the recorded suggestions; `deny` with `interrupt: true` and the fixed message (SD12); opencode answer file and `reply` decision `once`, `always`, `reject`. The opencode fixtures are recorded before the adapter is written (FD review R-05); they also fix the always-pattern field name (SD11).
- **Manual gate.** NFR2.5's six runs on the release Mac before the release pull request, timing log on. The deny run confirms that `interrupt: true` stops the turn (D8). The Allow always runs confirm on both harnesses that the next identical call is not asked again and that what was saved matches the lines the button showed.

**Tested by:** the six replay tests; adapter tests with and without suggestions and always-patterns (choice lists and `refuses`); the manual runs.

## Recovery

| Failure | Recovery | Design element |
|---|---|---|
| App crash or quit while a permission waits | hook exits 2.0 to 2.3 s later; the agent asks in the terminal; next start clears the folders | u1 RD1, RD6; RD12 |
| Hook timed out | choices disabled; answer in the terminal; never keys | RD12, SD13 |
| Answer file could not be written | choice kept, retry while the hook waits, or Open the terminal | RD10 |
| opencode reply failed or lost the race | timedOut with the cause; opencode's terminal prompt is still there or already answered | RD10, RD13 |
| Unreadable or unhandled permission | handed back at once | RD11 |

No data needs backup: permission events live only while their session lives.
