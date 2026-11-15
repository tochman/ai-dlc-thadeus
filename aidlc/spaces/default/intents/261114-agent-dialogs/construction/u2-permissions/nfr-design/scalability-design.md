# Scalability Design: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/scalability-requirements.md` (bounds table, NFR5.21–NFR5.24)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md` (NFR3.16 bounds)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reviews/review-01.md` (R-02 label cap)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (W4, W5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.5, BR5.11, BR5.12)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md` (`what` 200, `detail` 64 KB, 2–3 choices)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `max_bytes`, event file name)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/scalability-design.md` (SCD1–SCD5, the shared base)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reliability-design.md` (RD1, RD8)

## Scope

One person, a handful of tabs; nothing scales out. What changes against u1 is one bound: a session may hold several waiting permission hooks at once (parallel tool calls, sub-agents; W5). This file designs behaviour at that bound and at the text caps. u1 SCD2 (arrival order), SCD4 (hook cost) and SCD5 (the channel does not grow) carry permission events unchanged.

| Quantity | Bound | Enforced by |
|---|---|---|
| Event file | 1 048 576 bytes | AgentChannel (u1 SD3) |
| Open permission events per session | one per waiting hook, no fixed limit | store (SCD6) |
| Choices per permission | 2 or 3 | adapter (RD15) |
| `what` | 200 characters | adapter (SCD8) |
| `detail` | 65 536 bytes shown | adapter (SCD8, u1 SCD1) |
| `cwd` | 4 096 bytes shown | adapter (SCD8) |
| Allow always rule lines | 8 lines, 256 characters each, 1 024 characters in all | adapter (SCD8, SD11) |

## SCD6 Several permissions per session stay apart

**Satisfies:** NFR5.21.

- u1 SCD3's "one open question per session" applies to the `question` kind only. The store's rule is by kind: a newer `question` ends an older open `question` of the session; nothing ends a permission whose hook still waits except its own answer, Close, time-out, `permission.replied` or the tab's exit (BR5.11). A newer event of any kind ends only a `timedOut` permission of the same session (BR5.9).
- Each permission has its own event file, `.wait`, `.ans` and `.took`, all named by its own base name (u1 RD2), so answering one touches only its own files.

**Tested by:** store test with one session and three permission events within 100 ms: three pages; answering the second writes only the second's answer file; the first and third stay `shown`; a question arriving after them leaves all three open; a newer event ends a `timedOut` permission and no other.

## SCD7 Unique file names with several waiting hooks

**Satisfies:** NFR5.22, u1 NFR5.11.

- The script names its files `<epoch-s>-<pid>` (u1 C1 amendment). Two waiting hooks are two live processes and have different pids, so their names differ even within the same second. u1 SCD3's pid-reuse note needs the earlier process to be gone, which a waiting hook is not.
- The plugin names its files by a strictly increasing epoch ms in its process (u1 RD8), so concurrent `permission.asked` events in one opencode process never share a name.
- Order never comes from names: u1 SCD2 (`arrivedAtMs`, then `tabId`, then main's `seq`) with the kind rank of SCD9 in front.
- Each waiting hook costs u1 SCD4's poll; n waiting hooks cost n times that. No extra limit is set.

**Tested by:** script test: two `dialog.sh permission` processes started together in one session folder produce two `.evt` files, two `.wait` markers and two events; store test with equal `mtimeMs` and names whose string order differs from arrival: pager order follows `seq`; plugin test: three `permission.asked` in the same ms get three names.

## SCD8 Every agent string is capped, and a cut blocks allowing

**Satisfies:** NFR5.24, NFR3.16 (bounds), review R-02 (cap part), u1 NFR5.8.

The adapter cuts each agent string on its own text, before SD9 escapes it:

| Field | Cut | Effect of a cut |
|---|---|---|
| `detail` | `cutUtf8(text, 65536)` (u1 SCD1): on a UTF-8 character boundary | `truncated: true`; Allow once and Allow always `enabled: false`; "Shortened at 64 KB. The full text is in the terminal." |
| `what` | at 200 code points (`Array.from`), so a surrogate pair is never split | the same as a cut `detail` |
| `cwd` | `cutUtf8(text, 4096)` | the same as a cut `detail` |
| Allow always lines | not cut: measured | over 8 lines, a line over 256 characters, or over 1 024 characters in all: Allow always `enabled: false` with its bare label (SD11) |

- One `truncated` flag covers all three fields. NFR3.16 asks for disabling only on a cut `detail`; disabling also on a cut tool name or working folder is stricter, because a cut there hides what runs or where. These fields are rarely long, so the cost is small.
- Deny, Close and Open the terminal always work.

**Tested by:** adapter tests: `detail` at exactly 65 536 bytes is unchanged and allows stay enabled; at 65 537 bytes it is cut, `truncated` is set and both allow choices are disabled; a 4-byte emoji starting at byte 65 534 is not split; `what` at 200 and 201 code points, the 201st being half of a pair; `cwd` at 4 096 and 4 097 bytes; the Allow always bounds of SD11; renderer test: with `truncated` the allow buttons are `disabled` while Deny, Close and Open the terminal respond.

## SCD9 Questions and permissions before replies

**Satisfies:** NFR5.23.

The store's sort key is `[rank, arrivedAtMs, tabId, seq]`, with rank 0 for `question` and `permission` and 1 for `reply` (BR5.12); the last three are u1 SCD2's. u1's no-jump rule holds: an event that sorts before the shown page only raises the "+1 new" count; paging from the start, or the next opening, shows it first.

**Tested by:** store test with a `reply`-kind fixture (u3 is not built yet) arriving before a permission: the permission sorts first; renderer test: a permission arriving while a reply page is shown leaves that page and the count reads "+1 new".

## SCD10 The channel does not grow

**Satisfies:** u1 NFR5.12, u1 NFR5.4 (for permission files).

u1 SCD5 unchanged: each `.evt` is deleted on read; each hook removes its own `.wait` and `.took`; main removes a `.ans` the hook never took (RD10); `closeSession` and the start-up clear remove the rest. A `.nack` is removed with the session folder. LC4's private `alwaysRules` map entry is deleted when its event ends.

**Tested by:** channel test: after three permission round trips in one session (allow, close, time-out) the session folder holds only `alive`, `events/` and `answers/` with no leftover marker except an expected `.nack`; store test: the `alwaysRules` map is empty after every event has ended.
