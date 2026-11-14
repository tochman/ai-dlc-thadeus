# Scalability Requirements: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR5; FR2.4, FR6.1, FR6.2; Assumptions: one person per app)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR2.1, BR2.2, BR2.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/entities.md` (Question max 64 KB, 1–4 questions per event)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `max_bytes` 1 048 576, alive refresh 500 ms)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`

## Load, stated plainly

This is a desktop app used by one person. The load is a handful of agent tabs, each asking a question now and then while the person works. There is no growth projection, no scaling trigger and no capacity plan, because nothing here scales out: more load would only mean more tabs on the same machine. No throughput or concurrency target is set beyond the bounds below, which come from the requirements and the contract, not from load estimates.

| Quantity | Bound | Source |
|---|---|---|
| Users | 1 per app | requirements, Assumptions |
| Agent sessions | one per open agent tab; a few in practice; no limit is set | C2 |
| Open question events per session | at most 1 | BR2.2 |
| Questions per event | 1 to 4 | FR2.4, entities |
| Text per question | 64 KB shown; longer is cut | FR6.2, BR2.6 |
| Event file | 1 048 576 bytes | C1 |
| Waiting hooks | at most one per session, so at most one per tab | BR2.2 |

## Requirements at the bounds

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.8 | Text longer than 64 KB is cut, never dropped (BR2.6). | cut at 65 536 bytes on a UTF-8 character boundary, `truncated: true`, the "cut, full text in the terminal" line shown; text up to 64 KB is unchanged | Adapter tests at 64 KB exactly, 64 KB + 1 byte, and a cut that would split a 4-byte emoji |
| NFR5.9 | Several tabs asking at once are all shown, in arrival order, and the page being read never jumps (BR2.1). | 3 sessions each sending a question within the same 100 ms: 3 pages in `arrivedAt` then `tabId` order; the shown page stays and the count rises | Store test with three sessions; renderer test of the "+1 new" count |
| NFR5.10 | A newer question from the same session replaces the older one (BR2.2). | the older event goes to `ended` before the newer one is queued; never two open question events for one session | Store test |
| NFR5.11 | A waiting hook costs little. | per 100 ms poll: one `[ -f ]` test, one read of `alive`, one `date +%s`, one `sleep 0.1`; no loop without a sleep | Code review of the script against this list; script test that the loop sleeps (poll count over 1 s is at most 11) |
| NFR5.12 | The channel does not grow while the app runs. | a session's folder is removed on `closeSession` (tab exit and app quit) and at start (NFR5.4) | Channel tests |

An event file over 1 MB is refused outright (NFR3.3); that is the hard ceiling on what one event can cost.
