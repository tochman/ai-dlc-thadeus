# Scalability Design: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/scalability-requirements.md` (bounds, NFR5.8–NFR5.12)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (D3 file names)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-02 part b, R-05)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR2.1, BR2.2, BR2.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (state machine)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `max_bytes`, C3 `arrivedAt`)

## Scope

One person, a handful of agent tabs on one machine. Nothing scales out, so there is no load balancing, partitioning or auto-scaling to design. What this file designs is behaviour at the stated bounds: text size, several tabs at once, one open question per session, the hook's cost while it waits, and a channel that does not grow. Component IDs are those of `logical-components.md`; RD elements are in `reliability-design.md`.

| Quantity | Bound | Enforced by |
|---|---|---|
| Event file | 1 048 576 bytes | AgentChannel, before reading (SD3 check 2) |
| Questions per event | 1 to 4 | adapter (RD7) |
| Text per question | 65 536 bytes shown | adapter (SCD1) |
| Open question events per session | 1 | store (SCD3) |
| Waiting hooks per session | 1 | follows from the above and from the agent running one question tool at a time |
| Watchers | 1 for the whole app | AgentChannel `init()` (PD1) |
| Heartbeat threads | 1 for the whole app | AgentChannel `init()` (RD1) |

## SCD1 Long text is cut, never dropped

**Satisfies:** u1 NFR5.8.

The adapter cuts each text field at 65 536 bytes of UTF-8 on a character boundary and sets `truncated: true`; the dialog then shows the "cut, full text in the terminal" line.

```js
// HarnessEventAdapter (illustrative): cut at max bytes without splitting a UTF-8 sequence (BR2.6).
export function cutUtf8(text, max = 65536) {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= max) return { text, truncated: false };
  let end = max;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--; // step back off continuation bytes
  return { text: buf.subarray(0, end).toString('utf8'), truncated: true };
}
```

**Tested by:** adapter tests at exactly 65 536 bytes (unchanged, `truncated: false`), at 65 537 bytes (cut, `truncated: true`), and with a 4-byte emoji that starts at byte 65 534 (the cut lands before it and no replacement character appears).

## SCD2 Arrival order from file time, never from the name (R-02 part b)

**Satisfies:** u1 NFR5.9.

- Event file names identify files; they never order them. The script writes `<epoch-s>-<pid>` and the plugin `<epoch-ms>-<pid>` (RD8), so names tie within a second and compare as strings in the wrong numeric order when pids differ in length.
- AgentChannel gives each accepted raw event `arrivedAtMs` (the file's `mtimeMs`, from the `lstat` of SD3) and `seq` (a counter in main, incremented on every accepted file). `arrivedAt` in C3 is `new Date(arrivedAtMs).toISOString()` with the offset.
- The store's pager order is by `arrivedAtMs`, then `tabId`, then `seq` (BR2.1 with a final tie-breaker that makes the order total). A new event while a page is shown only raises the "+1 new" count (PD5).
- The exact C1 wording is in `logical-components.md` > "C1 amendment".

**Tested by:** store test: three sessions each send a question within the same 100 ms, written in an order different from their names' string order; the pager order follows `arrivedAtMs` then `tabId`, and two files with the same `mtimeMs` and `tabId` keep their `seq` order; renderer test: the shown page stays and the count reads "+1 new", then "+2 new".

## SCD3 One open question per session, and file name reuse (R-05)

**Satisfies:** u1 NFR5.10.

- When a question event arrives from a session that already has an open one, the store moves the older one to `ended` ("the session moved on") and only then queues the newer one, in the same synchronous step, so the store never holds two open question events for one session.
- File name reuse: a script name repeats only if the same pid is reused within the same second while the earlier file still exists. AgentChannel reads and deletes each `.evt` as soon as the watcher reports it (PD1), so the earlier file is usually gone within tens of milliseconds. If a repeat does happen, the hook's `mv` replaces the earlier file and that earlier event is lost. For an `answered` event the open question then stays until the next event from the session or the tab's exit (BR2.3); for a question the earlier hook has already ended, since its pid was reused. Accepted, with this note.
- The same applies to the answer side: `.wait`, `.ans` and `.took` use the event's base name, and only one hook per session waits at a time.

**Tested by:** store test: a second question from the same session ends the first before the second is queued; at no point does `list()` return two open question events for one session.

## SCD4 A waiting hook costs little

**Satisfies:** u1 NFR5.11.

Per 100 ms poll the script runs one `[ -f ]` test, one `read` of `alive` and one arithmetic comparison (all built in), one `date +%s` and one `sleep 0.1`. `mv` and `cat` run only once, when an answer is there. There is no loop without a `sleep` (RD1). On the app side, one heartbeat thread rewrites every session's `alive` every 500 ms with two system calls per session (RD1).

**Tested by:** code review of `dialog.sh` against this list; script test that counts `sleep` calls through a wrapper on `PATH`: at most 11 polls in 1 s (RD1).

## SCD5 The channel does not grow

**Satisfies:** u1 NFR5.12.

- Each `.evt` is deleted as soon as it is read, accepted or refused (SD3, PD1).
- The hook removes its `.wait` and `.took` on exit; main removes a `.ans` the hook never took (RD2).
- `closeSession` removes the whole session folder on tab exit and at app quit (RD5); `init()` removes every folder left from an earlier run (RD6).

**Tested by:** channel tests: after a full question round trip the session folder holds only `alive`, `events/` and `answers/` (both empty); after `closeSession` the folder is gone; after `init()` the root is empty.
