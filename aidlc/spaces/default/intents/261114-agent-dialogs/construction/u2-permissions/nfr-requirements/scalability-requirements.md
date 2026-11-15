# Scalability Requirements: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR5; FR6.1, FR6.2; Assumptions: one person per app)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (W4, W5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.5, BR5.11, BR5.12)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md` (several open permissions per session; `what` 200, `detail` 64 KB, 2–3 choices)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `max_bytes`, event file name)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/scalability-requirements.md` (the shared base: bounds table, NFR5.8–NFR5.12)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md` (R-02 arrival order, R-05 file names)

## Load, stated plainly

As u1: one person, a handful of tabs, no growth projection and no scaling plan. One bound changes: a session may hold several waiting permission hooks at once (parallel tool calls, sub-agents; W5), where u1 had at most one waiting question per session.

| Quantity | Bound | Source |
|---|---|---|
| Open permission events per session | no fixed limit; one per waiting hook | BR5.11, entities |
| Waiting hooks per session | questions: at most 1 (u1); permissions: one per open permission | BR2.2, BR5.11 |
| Choices per permission | 2 or 3 | BR5.3, entities |
| `what` | 200 characters | entities |
| `detail` | 64 KB shown; longer is cut | BR5.5 |
| Event file | 1 048 576 bytes (u1 NFR3.3) | C1 |

## Requirements at the bounds

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.21 | Several permissions from one session are kept apart (BR5.11, W5). A newer event from the session does not end an older waiting permission; each ends by its own answer, close, time-out, `permission.replied` or exit. | 3 permission events from one session within 100 ms: 3 pages; answering the second writes only the second's answer file; the first and third stay `shown` | Store test with one session and three events |
| NFR5.22 | Event file names stay unique with several waiting hooks per session. u1 D3 relied on one waiting hook per session; for permissions the pid alone keeps names apart, because live processes have distinct pids. Arrival order comes from the file's `mtimeMs` and a main-side counter, never from the file name (u1 review R-02). | two hooks of one session writing in the same second produce two `.evt` files and two events; pager order follows the counter when `mtimeMs` ties | Script test: two `dialog.sh permission` processes started together; store test with equal `mtimeMs` and names whose string order differs from arrival |
| NFR5.23 | Questions and permissions come before replies (BR5.12), and the page being read never jumps (u1 BR2.1). | order by kind rank (question and permission 0, reply 1), then arrival; a permission arriving while a reply page is shown raises the count ("+1 new") and leaves the shown page | Store test with a reply-kind fixture (u3 not yet built); renderer test of the count |
| NFR5.24 | A long `detail` is cut, never dropped, and a cut command cannot be allowed (BR5.5). | as NFR3.16: cut at 65 536 bytes on a UTF-8 character boundary, a 4-byte emoji at the edge is not split, allow choices disabled | Adapter tests at 64 KB, 64 KB + 1 byte and a split emoji |

The cost of each waiting permission hook is u1 NFR5.11's poll (one `[ -f ]`, one `alive` read, one `date +%s`, one `sleep 0.1`), so n waiting hooks cost n times that. No extra limit is set.
