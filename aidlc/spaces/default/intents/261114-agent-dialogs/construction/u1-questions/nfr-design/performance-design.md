# Performance Design: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/performance-requirements.md` (NFR1.1–NFR1.5, NFR4.1, NFR4.2, NFR6.1–NFR6.3, NFR7.1, NFR7.2)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (D5 `chokidar` without write-finish polling)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (W1, W1b, W3)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR2.1, BR3.2, BR4.1, BR4.5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1, C2 picker readiness, C4)
- Existing code: `src/main/watcher.js` (`chokidar` with `ignoreInitial`), `src/main/pty.js` (`proc.onData`), `src/renderer/ArtifactReader.jsx` (`FileContent`)

## Scope

One person, one machine, no network. Latency is the only performance property that matters; there is no caching tier, pooling or pagination to design, because nothing is fetched twice and nothing is remote. The component IDs (LC1 to LC10) are those of `logical-components.md`; RD elements are in `reliability-design.md`.

## Latency budget for one question via hook

| Step | Component | Design | Expected share of 1 s |
|---|---|---|---|
| hook start, header, copy stdin, rename | LC8 | 2 to 4 short processes (`date`, `cat`, `mv`) | about 20 ms |
| event file noticed | LC2 | one `chokidar` watcher on the channel root, `ignoreInitial: true`, no `awaitWriteFinish`; files appear by rename, so they are complete when seen (D5) | about 10 to 50 ms on macOS FSEvents |
| check, read once, delete | LC2 | `stat` (size check before reading), one `readFile`, `unlink` | < 5 ms for ≤ 1 MB |
| parse, queue, push | LC3, LC4, LC6 | pure parse; synchronous queue update; one `webContents.send` | < 10 ms |
| first paint | LC10 | React render of one page | < 50 ms |
| answer: IPC, check, write | LC6, LC4, LC2 | `.tmp` then rename | < 10 ms |
| hook takes it | LC8 | ≤ one 100 ms poll, then `mv` and `cat` | ≤ 110 ms |
| main sees the take | LC4 | marker poll every 25 ms (RD2) | ≤ 25 ms |

The budget is guidance; only the NFR rows are checked.

## PD1 Intake path

**Satisfies:** u1 NFR1.1.

- One watcher for the whole app, on `<userData>/agent-channel/`, `depth: 2`, ignoring every file that does not end in `.evt` (so `.tmp`, `alive` and every file in `answers/` cost nothing). The watcher is started once in AgentChannel's `init()` (RD6); sessions do not add watchers.
- `arrivedAt` and the `hookReceived` stamp come from the event file's `mtimeMs`, read by the same `stat` that checks the size, so the measurement starts when the hook wrote the file and not when main noticed it.
- AgentChannel reads each `.evt` once and deletes it at once, accepted or refused, so a watcher event never makes main read the same file twice.

**Tested by:** channel test, a renamed `.evt` file produces one raw event within 500 ms in the test environment (a smoke bound, not the target); the manual run on the release Mac, 20 Claude Code runs plus the NFR2.2 opencode runs, each `dialogShown − hookReceived` ≤ 1 s from the timing log (NFR1.1).

## PD2 Answer path and picker readiness

**Satisfies:** u1 NFR1.2, NFR1.3, NFR1.5.

- `via: hook`: one atomic write (`.tmp`, rename), then the take is seen through 25 ms marker polls (RD2). `answerDelivered` is stamped when main sees the take, so NFR1.2's measurement includes the hook's own poll and is stricter than measuring the rename alone.
- `via: keys`: `spawnSession` gains a read-only output tap. `tapOutput(ptyId, fn)` adds `fn` to a per-session set called from the existing `proc.onData`, and returns a function that removes it. The store holds a tap only while it waits for the picker (at most 3 s), keeps a rolling buffer of at most 64 KB with ANSI escape sequences removed, and calls the guarded `writeSession` in the same turn as the chunk in which the label appears. No timer delays the write, so "keys written ≤ 1 s after the later of click and picker seen" holds with a large margin.
- The hook's 100 ms poll (RD1) is the only fixed delay on the hook path; NFR1.5's 300 ms leaves room for one poll, `mv`, `cat` and process start.

**Tested by:** store test with a fake pty stream: the keys are written in the same tick as the chunk that carries the label, never before it, and nothing is written when the label never comes (failure at 3 s, fake timers); script test, drop `.ans`, exit with the answer printed ≤ 300 ms (NFR1.5); the manual run on the release Mac reads `answerDelivered − answerClicked` ≤ 1 s (NFR1.2) and the time-out case on both harnesses (NFR1.3).

## PD3 Closing events in the same turn

**Satisfies:** u1 NFR1.4.

The store applies a closing raw event (`answered`, a newer event from the same session, or a pty exit) and calls its `onChanged` listeners synchronously in the same function; IpcRouter's listener calls `webContents.send('agent-events:changed', …)` at once. No debounce, no `setTimeout`, no `await` between the raw event and the push.

**Tested by:** store unit test: after a synchronous `onRawEvent(answered)` call, the push spy has been called before the call returns; the manual run on the release Mac (the page is gone ≤ 1 s after the closing event's file is written).

## PD4 No cost when the app is absent

**Satisfies:** u1 NFR4.1, NFR4.2.

- The C6 entry command tests `THADEUS_SESSION_DIR` and the script's existence with the shell's built-in `[` before `sh` is started for the script, so outside the app the whole cost is one shell's start (FR4.6).
- Inside the script, the first fallible step is the `read` of `alive` (RD4), before any file is written. A folder the app has already cleared ends the script after a few built-ins.

**Tested by:** script tests from RD4: the C6 command through `sh -c`, variable unset and script folder deleted, 20 runs each ≤ 100 ms, exit 0, no output (NFR4.1); a temporary folder lacking `alive`: ≤ 100 ms, exit 0, no output, no file written (NFR4.2); manual: plain `claude` outside the app on the release Mac shows its own picker at once.

## PD5 Dialog by keyboard, states in words

**Satisfies:** u1 NFR6.1, NFR6.2, NFR6.3.

- When a page is shown, the dialog's effect focuses the first choice (a `ref` on the first option button). A new event that arrives while a page is shown only changes the "+1 new" count; focus is not moved (BR2.1).
- One `keydown` handler on the dialog root: digits 1..n pick (or tick in multi-select), Space ticks, Enter sends when Send is enabled, Esc calls `agentEvents.close`. The handler ignores digits while the own-answer field has focus, so typed text is never taken as a pick.
- Every state has a text line from `t()`: shown, sending, sent, handedBack, timedOut, failed. The overdue style also changes the title to "still waiting", so colour is never the only signal.

**Tested by:** renderer tests (Swedish locale) driving keyboard events only: one per layout (M1 single, M2 batch), one for multi-select with two picks, one for an own answer; `document.activeElement` is the first choice after the push (NFR6.1); every NFR2.1 scenario is answered with no pointer event (NFR6.2); the DOM text of each of the six states is present (NFR6.3).

## PD6 Texts: the app's own through `t()`, the agent's untouched

**Satisfies:** u1 NFR7.1, NFR7.2.

- Every app text in the new components goes through `t()` with ICU placeholders (`{harness}`, `{answered}`, `{total}`); the keys are added to `sv.json` and `en.json` together.
- The agent's question text, headers, labels and descriptions are passed through as JavaScript strings decoded once from the UTF-8 payload by `JSON.parse`; the adapter never trims, normalises or re-encodes them. The only change is the 64 KB cut of SCD1.

**Tested by:** the existing `tests/main/i18nKeys.test.js` (same keys in both files) and the renderer tests, which run in the Swedish locale and look up each state line by its Swedish text, so an English literal left in a component fails them (NFR7.1); adapter test with recorded payloads holding Swedish characters, emoji and other non-ASCII text: every field is equal to the payload's field (NFR7.2).
