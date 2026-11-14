# Reliability Design: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reliability-requirements.md` (NFR2.1–NFR2.3, NFR4.3, NFR5.1–NFR5.7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/performance-requirements.md` (NFR1.5, NFR4.2)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (D1, D2, D3, D4, NFR8.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-01, R-03, R-04, R-06, R-07)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/nfr-design-questions.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (W1–W7, state machine, spike results)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1.2, BR1.3, BR1.4, BR2.3, BR2.4, BR3.2–BR3.5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1, C2, C6)
- Existing code: `src/main/pty.js` (`onExit`, `writeSession`), `src/main/ipc.js` (`pty:spawn`, `shutdown`), `src/main/index.js` (`will-quit`)

## The promise

An agent session is never left blocked by the dialog, and the answer it receives is the one the person picked (reliability-requirements.md). Every design element below serves one of the two. The component IDs (LC1 to LC10) are those of `logical-components.md`.

## RD1 Liveness and deadline in the hook (R-01)

**Satisfies:** u1 NFR5.1, NFR5.2, NFR5.11, NFR4.2.

**App side (LC1, ChannelHeartbeat).** `alive` holds the current epoch ms and a newline. It is replaced atomically (`alive.tmp`, then rename) every 500 ms by a `worker_threads` worker, not by a timer on main's event loop. The worker has its own event loop, so a main-process stall (a large synchronous parse, a slow IPC handler) does not stop the updates; only a crash or quit of the app does, which is the case the rule is for. The worker lists the channel root each tick and rewrites `alive` in every session folder, so it needs no messages from main. `openSession` writes the first `alive` synchronously before it returns the environment, so a hook never starts before the file exists.

```js
// LC1: inline worker source (eval: true runs it as CommonJS). A busy main loop cannot stall it (R-01).
const HEARTBEAT = `
  const fs = require('node:fs'), path = require('node:path');
  const { root } = require('node:worker_threads').workerData;
  setInterval(() => {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch {}
    for (const d of dirs) try {
      const tmp = path.join(root, d, 'alive.tmp');
      fs.writeFileSync(tmp, Date.now() + '\\n'); fs.renameSync(tmp, path.join(root, d, 'alive'));
    } catch {} // a folder being removed by closeSession; persistent errors are reported (OD2)
  }, 500);`;
new Worker(HEARTBEAT, { eval: true, workerData: { root } }).unref();
```

The atomic replace matters: a plain rewrite truncates first, and a hook reading the empty file in between would fail its `read` and hand back while the app is alive.

**Hook side (LC8, `dialog.sh`).** The hook counts unchanged polls of `alive` instead of measuring seconds. Each poll ends with `sleep 0.1`, so 20 polls that read the same content mean at least 2.0 s since the poll that last saw a change, which itself came after the update. The 595 s deadline keeps the wall clock (`date +%s`), because poll counting drifts upward with process time (D2). The setup lines that come before the loop are in RD4.

```sh
same=0
while :; do
  if [ -f "$a.ans" ] && mv "$a.ans" "$a.took"; then cat "$a.took"; exit 0; fi
  read -r cur < "$d/alive" || exit 0
  if [ "$cur" = "$last" ]; then same=$((same + 1)); else same=0; last=$cur; fi
  [ "$same" -lt 20 ] || exit 0
  now=$(date +%s) || exit 0
  [ $((now - t0)) -lt "$w" ] || exit 0
  sleep 0.1 || exit 0
done
```

Only POSIX features are used: `read -r` with a redirect, `[`, `$(( ))`, `case`, `trap` on `EXIT` and signals. There is no `[[`, no `$RANDOM`, no arrays, no `local`, no `ERR` trap. `read`, `[` and arithmetic are built in to both dash and macOS `sh` (bash in POSIX mode), so one poll costs two short processes (`date` and `sleep`). That matches NFR5.11's list, with `read` taking the place of the "one read of `alive`".

**Resulting bounds.**

| Rule | Bound | Why |
|---|---|---|
| App gone (NFR5.1) | exits ≥ 2.0 s and about ≤ 2.3 s after the last `alive` update | 20 sleeps of ≥ 100 ms after the poll that saw the change; up to one poll of detection lag and about 5 ms of process time per poll |
| Folder or `alive` removed (NFR4.2, closeSession) | exits at the next poll, ≤ 100 ms | `read` fails, `|| exit 0` |
| Deadline (NFR5.2) | exits between 594 s and 596.1 s after the script started | both `date +%s` readings are floored, so the difference reaches 595 between 594 s and 595 s of real time, plus at most one poll; always at least 3.9 s inside Claude Code's 600 s entry timeout |

The deadline's early side (up to 1 s before the store's own 595 s timer) is harmless because the store never relies on its clock to decide whether the hook still waits; it checks the hook's wait marker (RD3). NFR5.2's script test window becomes 1.0 s to 3.2 s for `THADEUS_WAIT_SECONDS=2` instead of "2 to 3 s", for the same flooring reason; the requirement's intent (always out before the entry timeout) is unchanged.

The plugin (LC9) applies the same two rules with `Date.now()`, which has ms precision in JavaScript: gone after 2000 ms with no change in `alive`, deadline at `THADEUS_WAIT_SECONDS × 1000` ms, polled every 100 ms with `setTimeout`.

**Tested by:**

- Script test, `alive` stops changing: exit status 0, 0 bytes of output, elapsed time from the last update between 2.0 s and 2.5 s (NFR5.1).
- Script test, a helper keeps rewriting `alive` every 500 ms for 3 s, then stops: the hook is still waiting at 3 s and exits 2.0 to 2.5 s after the last write (no false hand-back while the app lives).
- Script test with `THADEUS_WAIT_SECONDS=2`: exit 0, no output, between 1.0 s and 3.2 s (NFR5.2).
- Script test, poll count: with a counter file the test injects through a wrapped `sleep` on `PATH`, at most 11 polls in 1 s (NFR5.11).
- Script test, folder lacking `alive`: exit 0, no output, no file written, ≤ 100 ms (NFR4.2).
- Channel test, stall: start the heartbeat on a temporary root, block the test's main thread with a 1.5 s busy loop, then read `alive`: its value was written during the busy loop (it is greater than the loop's start time).
- Channel test: `alive` is never read empty in 1 000 reads taken while the heartbeat runs.

## RD2 Delivery is confirmed: wait marker and take by rename (R-04)

**Satisfies:** u1 NFR1.2, NFR1.5, NFR2.1, NFR5.2, NFR5.3.

An answer file a hook never read is not an answer. The script and the plugin mark that they wait and take an answer atomically, and main reports "Sent" only after it sees the take.

| Step | Who | File operation |
|---|---|---|
| 1 | hook | creates `answers/<name>.wait`, then renames its event file to `.evt` (so the marker exists before main can see the event) |
| 2 | main | writes `answers/<name>.tmp`, renames it to `<name>.ans` (only when the marker exists, RD3) |
| 3 | hook | takes the answer: `mv <name>.ans <name>.took`, prints it, exits; its `EXIT` trap removes `.wait` and `.took` |
| 3' | plugin | renames `.ans` to `.took`, calls `session.form.reply`; on success removes `.took`; if the call is missing or rejects, renames `.took` to `.nack`; then removes `.wait` |
| 4 | main | polls the markers every 25 ms for up to 1 s and decides (table below) |

| Seen by main | Meaning | Outcome |
|---|---|---|
| `.ans` gone, `.wait` gone, no `.nack` | taken and finished | `sent`, `via: hook`; `answerDelivered` stamped (OD1) |
| `.ans` gone, `.wait` gone, `.nack` present | the harness refused it (opencode) | send `via: keys` (RD3) |
| `.wait` gone, `.ans` still there | the hook gave up before taking it | main deletes `.ans`; send `via: keys` |
| neither within 1 s | the hook is alive but has not taken it | main deletes `.ans` as the tie-breaker (below) |

**The tie-breaker is the unlink.** When the outcome is unclear, main calls `fs.unlink` on `<name>.ans`. Success means the hook had not taken it, and since the file is gone the hook can no longer take it: the answer was not delivered. `ENOENT` means the hook renamed it first: the answer was taken. Rename and unlink of the same name cannot both succeed, so the hook and main always agree. A hook whose `mv` loses that race keeps waiting and can take a later retry.

```js
// LC4 (illustrative). answerState reads .wait, .ans and .nack with fs.access; retract unlinks .ans and says if it was there.
async function sendViaHook(ev, text) {
  if (!(await hookWaits(ev))) return sendViaKeys(ev); // RD3
  await channel.writeAnswer({ sessionId: ev.sessionId, file: ev.file, text });
  for (const end = Date.now() + 1000; Date.now() < end; await sleep(25)) {
    const st = await channel.answerState(ev.sessionId, ev.file);
    if (!st.waiting && !st.answerPresent) return st.nack ? sendViaKeys(ev) : sent(ev, 'hook');
    if (!st.waiting) return (await channel.retract(ev.sessionId, ev.file)) ? sendViaKeys(ev) : sent(ev, 'hook');
  }
  if (await channel.retract(ev.sessionId, ev.file)) return failed(ev, 'send failed: the hook did not take the answer');
  return sent(ev, 'hook'); // taken but not finished within 1 s
}
```

Close and Esc (NFR5.3, BR3.5) use the same write with empty text and skip step 4: the hook takes the empty file, prints nothing and exits 0. When the marker is already gone there is nothing to hand back and nothing is written.

- ponytail: "taken but not finished within 1 s" is reported as sent. For the sh hook the gap between the take and the exit is one `cat`. For opencode it is the local `session.form.reply` call; if that call ever needs more than 1 s and then fails, the dialog says "Sent" while opencode's own form is still open in the terminal. Raise the window for opencode if the manual run shows slow replies.
- A hook that is killed with `SIGKILL` cannot run its trap and leaves `.wait` behind. RD3's age check covers it.

**Tested by:**

- Script test: drop an `.ans` file; the hook prints it byte for byte, exits 0 within 300 ms, and leaves neither `.wait` nor `.took` (NFR1.5).
- Script test: empty `.ans`; 0 bytes printed, exit 0 within 300 ms (NFR5.3).
- Store test with a fake channel, one case per row of the decision table, plus the tie-breaker both ways (unlink succeeds; unlink gets `ENOENT`).
- Channel test, race: a real hook and `retract` started together 200 times; in every run exactly one of "hook printed the answer" and "retract returned true" holds.
- Store test (R-04 case): the hook exits by deadline, then the person sends; the answer goes `via: keys` and is never reported `via: hook`.

## RD3 Choosing hook or keys (R-04)

**Satisfies:** u1 NFR1.3, NFR5.2, NFR5.6.

The store sends `via: hook` only when the hook still waits, and it learns that from the file system, not from its clock:

- `hookWaits(ev)` is true when `answers/<name>.wait` exists **and** less than `waitSeconds + 5` s have passed since `arrivedAt` (the entry timeout; past it Claude Code has killed the hook, and a marker left by `SIGKILL` is stale).
- The store's timer at `arrivedAt + waitSeconds` sets `timedOut` for the dialog (M6 line). From `timedOut`, Send asks `hookWaits` again: a hook that is still inside its last second takes the answer through RD2, and one that has gone sends keys.
- `via: keys` taps the pty output (LC5) for at most 3 s, keeps a rolling 64 KB buffer with ANSI escape sequences removed, and types the adapter's key sequence only after the event's first option label appears. Otherwise it fails with "the agent's picker is not showing" (BR3.2).

**Tested by:** store tests with a fake channel and a fake clock: marker present and young → hook; marker absent → keys; marker present but older than `waitSeconds + 5` s → keys; timedOut with marker present → hook. Picker tests with a fake pty stream: keys written after the label appears (also when the label arrives split across two chunks and wrapped in colour codes), never before; failure at 3 s with nothing written (NFR1.3).

## RD4 Silent exit on every path (R-03, R-07)

**Satisfies:** u1 NFR4.3, NFR4.2, NFR3.8, NFR8.4.

The script's first line sends stderr to `/dev/null` for the whole run, and every step that can fail ends in `|| exit 0`. There is no `set -e` (its rules differ between shells) and no `ERR` trap (dash has none). The `EXIT` trap removes the script's own markers; the signal trap turns `HUP`, `INT` and `TERM` into a normal exit so the `EXIT` trap runs. stdout is written in one place only: the `cat` of a taken answer.

```sh
exec 2>/dev/null
d=${THADEUS_SESSION_DIR:-}; s=${THADEUS_SESSION_SECRET:-}; w=${THADEUS_WAIT_SECONDS:-}
case $1 in question) waits=1 ;; answered) waits=0 ;; *) exit 0 ;; esac
case $w in '' | *[!0-9]*) exit 0 ;; esac
[ -n "$d" ] && [ -n "$s" ] && read -r last < "$d/alive" || exit 0
t0=$(date +%s) || exit 0
n=$t0-$$; a=$d/answers/$n
trap 'rm -f "$a.wait" "$a.took"' EXIT
trap 'exit 0' HUP INT TERM
if [ "$waits" = 1 ]; then : > "$a.wait" || exit 0; fi
{ printf 'THADEUS-EVENT v1 %s %s\n' "$1" "$s" && cat; } > "$d/events/$n.tmp" || exit 0
mv "$d/events/$n.tmp" "$d/events/$n.evt" || exit 0
[ "$waits" = 1 ] || exit 0
```

The kind comes only from the entry's argument and is matched against a fixed list; u2 adds `permission` to the waiting kinds and u3 adds `reply` to the non-waiting ones on the same `case` line. An unknown kind exits before anything is written. The payload is copied by `cat` and never expanded (SD5).

**Script test harness (R-07).** The script tests in `tests/main/` always spawn the shell explicitly, `spawn('sh', [script, kind])`, never the file as an executable, and run every case once per shell in `['sh', 'dash']`, where `dash` is included when `spawnSync('dash', ['-c', 'exit 0']).status === 0`. On `ubuntu-latest` (CI) `sh` is dash already; on the release Mac `sh` is bash in POSIX mode and dash is usually absent; on a developer's Linux machine where `sh` is bash, the `dash` run still catches a bashism before the manual Mac run.

**Tested by** (each under `sh` and, when installed, `dash`; each asserts exit 0 and 0 bytes on stdout and on stderr):

- the exact C6 command through `sh -c` with `THADEUS_SESSION_DIR` unset, and with the script folder deleted, 20 runs each, every run ≤ 100 ms (NFR4.1);
- folder or `alive` missing (NFR4.2); `THADEUS_WAIT_SECONDS` empty or not a number; unknown kind;
- `events/` not writable, `answers/` missing (shell errors inside the script; nothing on stderr);
- app gone (RD1), deadline (RD1), empty answer (RD2);
- `TERM` sent to a waiting hook: exit, no output, `.wait` removed.

## RD5 Tab exit and app quit

**Satisfies:** u1 NFR5.5, NFR5.12.

`spawnSession` (LC5) gains an `onExit` callback. On a pty exit IpcRouter calls the store first (`endSession`: every event of the session goes to `ended`, the "session ended" line is pushed, nothing is written) and then `channel.closeSession` (folder removed with `fs.rm(dir, { recursive: true, force: true, maxRetries: 3 })`; the retries cover the heartbeat writing `alive.tmp` during the removal). A waiting hook then fails its next `read` and exits within 100 ms. `shutdown()` in `ipc.js` closes every session the same way before `killAllSessions()` runs.

**Tested by:** store and channel tests driving a fake pty exit: no `writeAnswer`, no `writeSession`, folder gone, state `ended`, the message key pushed; channel test that `closeSession` succeeds while the heartbeat runs on the same folder (100 repetitions).

## RD6 Nothing from an earlier run

**Satisfies:** u1 NFR5.4.

The first `openSession` awaits a one-time `init()`: remove `<userData>/agent-channel/` recursively, create it again with mode `0700`, start the heartbeat and the watcher. No session can open before `init()` has finished, so no leftover event is ever read.

**Tested by:** channel test with leftover folders holding `.evt` files: after the first `openSession` they are gone and no raw event was emitted.

## RD7 The adapter never guesses, and an unreadable question hands back at once

**Satisfies:** u1 NFR2.3, NFR2.1.

A question payload with 0 or more than 4 questions, a question without text, or an option without a label is refused with a logged reason (OD2). If its hook waits, the store also writes the empty answer through RD2, so Claude Code shows its own picker at once instead of after 595 s. That is what BR1.4's "the agent's own picker stays usable" needs. This is a hand-back, not an answer, so it does not conflict with NFR3.7. Events refused by AgentChannel (BR1.1: unknown folder, wrong secret, unaccepted version) get no hand-back, because they may be forged.

The five answer scenarios of NFR2.1 are tested against recorded payloads: Claude Code `PreToolUse` stdin and opencode `form.created`, one test per scenario per harness. Each test asserts that the built output names exactly the labels at the picked indexes.

**Tested by:** adapter tests, one per malformed shape (NFR2.3); store test that a refused waiting question writes an empty `.ans` and pushes nothing; the 10 replay tests (NFR2.1); NFR2.2 stays the manual run on the release Mac with the timing log on.

## RD8 The opencode plugin never breaks opencode

**Satisfies:** u1 NFR5.7.

The plugin is `thadeus-dialog.js`, an ES module against plugin API V2. This supersedes the functional spec's `.opencode/plugins/thadeus-dialog.ts` (R-06); the folder stays u4's decision (C6). Every handler body is wrapped in `try`/`catch` and logs through opencode's logger. The wait runs in its own async task (a `setTimeout` chain), never awaited by the event handler. `session.form.reply` is looked up with optional chaining and `typeof … === 'function'`; when it is missing or rejects, the plugin writes `.nack` (RD2) and returns. File names use a strictly increasing epoch ms (`Math.max(Date.now(), last + 1)`) and `process.pid`: the plugin's pid is the same for every event of the session, so the script's seconds-based name would repeat when two events fall in one second.

**Tested by:** plugin tests importing the module with a stubbed V2 `ctx`: reply missing (`.nack`, nothing thrown), reply rejecting (`.nack`, nothing thrown), `fs` error on the event write (logged, nothing thrown), two events in the same ms get different names; manual opencode run on the release Mac.

## RD9 A failed send keeps the answer

**Satisfies:** u1 NFR5.6.

A failure from RD2 ("the hook did not take the answer"), RD3 ("the agent's picker is not showing") or LC2 ("session ended", "cannot write the answer file") puts the event back to `shown`, or keeps it `timedOut`, sets `lastError` to one sentence and leaves the renderer's typed answer untouched. Send calls `agentEvents.answer` again with the same body; the answer check (SD4) treats the retry as a first answer because the earlier one was not delivered.

**Tested by:** store tests per failure (state, `lastError`, a second Send succeeds); renderer test that the own-answer text survives a failure.

## Review findings (NFR Requirements review-01)

| Finding | Resolution |
|---|---|
| R-01 liveness with a 1 s clock; keep `alive` fresh during a stall | RD1: 20 unchanged polls, wall clock only for the deadline; heartbeat in a worker thread |
| R-02 C1 meanings changed without amending C1 | `logical-components.md` > "C1 amendment"; ordering in `scalability-design.md` SCD2 |
| R-03 no `ERR` trap in dash | RD4: `exec 2>/dev/null`, `|| exit 0` on each fallible step |
| R-04 answer written after the hook has gone | RD2 (wait marker, take by rename, unlink tie-breaker) and RD3 (hook or keys from the marker) |
| R-05 pid reuse within one second | `scalability-design.md` SCD3; and the plugin names its files by ms (RD8) |
| R-06 `.ts` path in the functional spec | RD8: the plugin is `thadeus-dialog.js`; the spec's `.ts` name is superseded |
| R-07 tests must spawn `sh` and also run under `dash` | RD4: test harness |

## Recovery

| Failure | Recovery | Design element |
|---|---|---|
| App crash or quit while a hook waits | the heartbeat stops; the hook exits 2.0 to 2.3 s later; the next start clears the folders | RD1, RD6 |
| Main busy for more than 2 s | the heartbeat keeps `alive` changing; nothing happens | RD1 |
| The hook gave up just before the answer | the answer is retracted and sent as keys after the picker shows | RD2, RD3 |
| The hook is alive but slow | the answer is retracted, the dialog shows the failure, Send can be tried again | RD2, RD9 |
| Keys could not be sent | the answer is kept and Open the terminal is offered | RD3, RD9 |

No backup is needed: events live only while their session lives.
