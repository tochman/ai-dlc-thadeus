# Scalability Requirements: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR5; FR2.8, FR6.1, FR6.2; Assumptions: one person per app)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W3, W7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/rules.md` (BR6.3, BR6.4, BR6.5, BR6.15)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/entities.md` (one open reply per session, one LatestMessage per project, 64 KB text)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `max_bytes` 1 048 576)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/scalability-requirements.md` (load statement and rows reused by id)

## Load

As u1 (Load, stated plainly): one person, a few agent tabs, no scaling out. Replies differ from questions in one way: a reply arrives at the end of every agent turn, so it is the most frequent event kind. The bounds below keep that frequency from growing anything.

| Quantity | Bound | Source |
|---|---|---|
| Open reply events per session | at most 1 | entities, BR6.5 |
| LatestMessage per project | at most 1, in memory only | entities, BR6.15 |
| Reply text | 64 KB shown; longer is cut | FR6.2, BR6.3 |
| Event file | 1 048 576 bytes | C1 |
| Waiting hooks from replies | 0: a reply hook never waits | C1, BR6.1 |

## Requirements at the bounds

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.20 | Replies do not pile up. A newer event from the session moves the older reply on (BR6.5), and an ended reply leaves the store. | after 100 replies with different texts from one session, the store holds exactly 1 open reply for it and 0 ended replies; never two open replies for one session | Store test |
| NFR5.21 | Reply text longer than 64 KB is cut, never dropped (as u1 NFR5.8, BR6.3). For opencode the cut is applied after the text parts are joined. | cut at 65 536 bytes on a UTF-8 character boundary, `truncated: true`, the "Shortened at 64 KB" line in the dialog and "(shortened)" in the strip; text up to 64 KB unchanged | Adapter tests for both harnesses at 64 KB exactly, 64 KB + 1 byte, a cut that would split a 4-byte emoji, and opencode parts that cross 64 KB only when joined |
| NFR5.22 | The latest-message state stays at one entry per project. | after replies from 3 tabs of one project and 2 tabs of another, the store holds exactly 2 LatestMessages; each is the newest by NFR5.18 | Store test |
| NFR5.23 | A Stop payload over the 1 MB event file limit is refused, not cut, because the script copies stdin unchanged and never parses it (u1 NFR3.3, NFR3.8). | the event is refused with one log line (NFR3.21); no page opens; the strip does not change; the session waits in the terminal as without the hook | Channel test with a 1 048 577-byte reply event file. This is a known limit: a last message above about 1 MB shows nothing rather than the first 64 KB (see `tech-stack-decisions.md` D8) |
| NFR5.24 | One reply hook run costs little. | `dialog.sh reply` runs at most: the existence tests shared with u1, one `date +%s`, the header line by the shell's `printf` builtin, one `cat` of stdin, one `mv`; no loop | Code review of the `reply` branch against this list; NFR4.5's script test |
