# Scalability Design: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-design/nfr-design-questions.md` (the over-1 MB point)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/scalability-requirements.md` (load, NFR5.20–NFR5.24)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/reliability-requirements.md` (NFR5.18)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/tech-stack-decisions.md` (D8)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/reviews/review-01.md` (R-01)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W3, W7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `max_bytes` 1 048 576)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/scalability-design.md` (SCD1, SCD2, SCD5)

## Scope

As u1: one person, a few agent tabs, no scaling out. A reply arrives at the end of every agent turn, so it is the most frequent event kind. The elements below keep that frequency from growing anything in memory or on disk. Element IDs continue after u1's (u1 ends at SCD5).

| Quantity | Bound | Held by |
|---|---|---|
| open replies per session | 1 | SCD6 |
| LatestMessages per project | 1, in memory | SCD8 |
| shown reply text | 65 536 bytes | SCD7 |
| reply event file | 1 048 576 bytes | SCD9, u1 SD3 |
| reply hooks waiting | 0 | performance-design PD7 |

## SCD6 Replies do not pile up

**Satisfies:** NFR5.20.

When a reply is accepted, the session's older open reply is moved on first (reliability-design RD12: `stale` if shown, `ended` otherwise), and only then is the new one added. An `ended` reply is removed from the store's map in the same call. A `stale` reply stays only until the person closes its page, which ends and removes it. So a session holds at most one open reply, plus at most one stale page the person is reading.

**Tested by:** store test: 100 replies with different texts from one session, none shown on screen: exactly 1 open reply and 0 ended replies in the store; a variant where the first is shown: 1 open, 1 stale, and after Close 1 open and 0 others; never two open replies for one session at any step.

## SCD7 Long reply text is cut, never dropped

**Satisfies:** NFR5.21, and u1 NFR5.8 for replies.

The adapter applies u1 SCD1's cut (65 536 bytes, on a UTF-8 character boundary, `truncated: true`) to `last_assistant_message`, and for opencode to the text parts **after** joining them in order, so parts that are each small but together cross 64 KB are cut too. The dialog adds the "Shortened at 64 KB" line, the strip adds "(shortened)".

**Tested by:** adapter tests for both harnesses at exactly 65 536 bytes (unchanged, not truncated), 65 537 bytes (cut, truncated), a cut point inside a 4-byte emoji (cut before it), and opencode parts of 40 KB and 30 KB (joined, then cut).

## SCD8 One latest message per project, newest first

**Satisfies:** NFR5.22, NFR5.18.

The store keeps a `Map<projectId, LatestMessage>`. An accepted reply replaces the entry when there is none or when it is newer by u1 SCD2's order: the event file's `mtimeMs`, then the main-side accept counter, then `tabId`. The file name is never used for order, because names are `<epoch-s>-<pid>.evt` and two replies in the same second can sort the other way as strings.

**Tested by:** store test: replies from 3 tabs of one project and 2 of another give exactly 2 entries, each the newest by the order above; store test with crafted names `1700000000-100000.evt` (later `mtimeMs`) and `1700000000-99999.evt` (earlier `mtimeMs`, last in string order): the LatestMessage is the first, and the pager order inside the reply group follows `mtimeMs`.

## SCD9 The 1 MB event limit stays, and an over-limit reply still counts

**Satisfies:** NFR5.23.

The script copies stdin unchanged and never parses it (u1 SD5), so it cannot cut a long message to 64 KB before u1 SD3's 1 048 576-byte limit. The limit stays as C1 sets it for every kind (u3 D8). An over-limit Stop event is refused and logged, and no page opens. As settled in the questions file and resolving u3 NFR review R-01, the refusal is still a sign that the agent finished a turn: when the file's header passes u1 SD3 checks 3 to 5, the session's older reply is moved on with the "newer message not shown" line, and the LatestMessage gets status `notShown` (reliability-design RD11). So the strip **does** change in this case, to say a newer message exists. This narrows NFR5.23's "the strip does not change" in the direction the review asks.

Known limit, unchanged from D8: a last message above about 1 MB is not shown at all, not even its first 64 KB. The person reads it in the terminal.

**Tested by:** channel test with a 1 048 577-byte reply event file: refused, one log line, no page; the store test named in reliability-design RD11 for the effect on an older reply and on the strip.

## SCD10 One reply hook run costs little

**Satisfies:** NFR5.24.

One run of `dialog.sh reply` runs: u1 RD4's existence tests and `alive` read (built-ins), one `date +%s`, the header by `printf` (a built-in in dash and macOS `sh`), one `cat` in the background, one watchdog subshell with one `sleep 2`, at most two `kill` (built-ins), one `mv`. There is no loop. The watchdog is the one addition to NFR5.24's list; it resolves u3 NFR review R-04 and is recorded as a deviation in reliability-design RD10.

**Tested by:** code review of the reply branch against this list; the NFR4.5 script tests (performance-design PD7).

## The channel does not grow

u1 SCD5 holds: each `.evt` is read once and deleted by main, and a session folder is removed when its tab exits. The reply branch leaves a `.tmp` behind only when stdin was closed before it started; main ignores it and the session folder's removal takes it.
