# Developer Code Scan: US-0031 (dialog opens on the newest page)

## Developer Code Scan Results

Focused scan at `6ec3546`, code read only (no tests, builds or app runs).

### Scan Coverage
- **Analyzed deeply**:
  - src/renderer/AgentDialog.jsx
  - src/renderer/ReplyPage.jsx
  - src/renderer/App.jsx (the agent-event and dialog wiring, lines 86-298 and 741-752)
  - src/main/agentEvents.js
  - src/shared/agentOrder.js
- **Skimmed only**: src/main/agentReplies.js (reply states, `moveOn` at 60-85), src/shared/alertPlan.js, src/main/sessionHandoff.js and src/main/ipc.js (callers of `addHandoff`/`setHandoff` only), src/preload/index.js (`agentEvents` members, 160-165), tests/renderer/AgentDialog.test.jsx, tests/renderer/AgentDialogHandoff.test.jsx, tests/main/agentEvents.test.js, tests/main/agentOrder.test.js (by test name)
- **Left out**: node_modules/, out/, dist/, coverage/, tests/.tmp/, .claude/ and the rest of AI-DLC's install and workspace

### Packages Found
- aidlc-dash — Electron desktop app — JavaScript/JSX — unchanged from the store (see `technology-stack.md`)

### Build System
- Unchanged from the store: npm, electron-vite, vitest (see `technology-stack.md`).

### APIs Discovered
- IPC `agentEvents:list|answer|close|latest|reopen` and the `agentEvents.onChanged`/`onFocus` pushes (preload 160-165); unchanged.

### Frameworks & Libraries
- React 19 (`useState`/`useRef`/`useEffect` in the dialog), react-i18next; no new dependency involved.

### Test Coverage
- **Test Directories**: tests/renderer (AgentDialog 65 cases, AgentDialogHandoff 8), tests/main (agentEvents 63, agentOrder 5).
- **Test Frameworks**: vitest, jsdom, Testing Library.
- **Coverage Config**: present (`vitest.config.mjs`, 80% floor).
- Existing case `AgentDialog.test.jsx:259` pins BR2.1 (page stays, "+1 ny", "+2 nya"). No case found for closing and reopening the dialog, or for a settled page in the list.

### Code Quality Indicators
- **Linting**: ESLint and Prettier in CI; `AgentDialog.jsx:590` and `:601`, `:628` disable `react-hooks/exhaustive-deps` on purpose.
- **CI/CD**: `.github/workflows/release.yml` (unchanged).
- **Documentation**: module headers name stories and rules (BR2.1, FR2.4); comments match the code read.

### Technical Debt Signals
- `agentEvents.js:345-347`: `ponytail:` taken-within-1 s is reported sent (unchanged, line numbers moved).
- `App.jsx:91`: `ponytail:` one notice at a time.

## Findings for US-0031 (file:line at `6ec3546`)

1. **Page choice in the dialog.** `AgentDialog` stays mounted while closed (`App.jsx:741`, `open={popupOpen}`), so `pageId`/`lastIndex` (`AgentDialog.jsx:559-560`) survive close and reopen. The shown index is `events.findIndex(pageId)`, else `min(lastIndex, len-1)` (`:564-565`). The effect at `:587-590` writes the shown page back into `pageId`/`lastIndex` on every change of id or index. Nothing resets them on open: the `[open]` effect (`:603-611`) only calls `showModal`/`close`. Only `focus` (a notification or `openReply`, `:598-601`) or Previous/Next (`browse`, `:671-674`) names another page. So a reopened dialog shows the page it was closed on whenever that page is still in the list, whatever just arrived.
2. **"+n nya".** `seen` (`:593-595`) snapshots the list's ids the first time a page is shown; `newCount` counts ids not in that snapshot. The snapshot survives a close, so after reopening on the old page the just-arrived page is only a "+1 ny" in the footer (`:757`).
3. **Opening from `App.jsx`.** `receiveAgentEvents` (`App.jsx:222-229`) sets `popupOpen` true when an event not seen before, not `early`, in `shown` or `timedOut`, passes `alertPlan(kind, …).open`. A `handoff` kind falls into the question branch of `alertPlan` (`alertPlan.js:24-25`), so it opens unless question alerts are `off`. No page id is passed. `dialogEvents` (`:253-256`) drops only `queued`/`dismissed` replies, then sorts with `byPager`; `popupEvents` puts `early` events last (`:257`). `hasNewQuestion = dialogEvents.some(!early)` (`:258`) closes the dialog only when the list is empty of non-early events (`:259-261`), so any settled page keeps it open.
4. **Event states in the store.** `move` (`agentEvents.js:146-157`) deletes only on `ended`: at once, or after `ENDED_MS` 3 s when `endedBy` is in `KEPT` (`session`, `terminal`, `typed`, `:41-42`). `list` (`:133-137`) returns every event of the project, whatever its state. So these stay pager items: a question in `sending`, `sent` (`:435`) or `handedBack` (`:458`); a permission after its answer until `answered` (agentPermissions, skimmed); a reply in `stale` (agentReplies `:79`) until closed or replaced by a newer stale one; a handoff in `waiting`/`sending`. `OPEN` = `shown`, `timedOut` (`:48`, and the dialog's own copy `AgentDialog.jsx:32`).
5. **What ends a settled question.** Only `onAnswered` (`:232-239`, the harness's answered event), a newer non-reply event of the same session (`addEvent` `:197` via `endsOnNewer`), or `endSession` (`:400`). A reply returns before that (`onRaw` `:322`), and `addHandoff` (`:493-520`) ends only older handoffs, not questions. So when the handoff page is offered after a turn (the typical compact / fresh-session moment), a question answered earlier in that turn can still be in the list if no answered event or other event came after it [assumption: whether each adapter always posts `answered` after a hook or key answer was not verified here].
6. **Order.** `byPager` (`agentOrder.js:6-10`): rank question/permission 0, reply 1, handoff 2, then `arrivedAtMs`, `tabId`, `seq`. The handoff is always last, so with the dialog's fallback index (finding 1) any older page ranks before it.
7. **Handoff page replacement.** A newer offer ends the old handoff with `endedBy: 'movedOn'` (not in `KEPT`, so it is deleted at once, `:496`). If the dialog was on it, `pageId` misses and the index fallback (`:565`) lands on the same position, which is now the new handoff only if nothing was inserted before it. The person sees no notice of the swap.

## Handoff Summary
- **Intent-relevant finding**: the dialog never chooses a page on open. It keeps `pageId`/`lastIndex` across close (`AgentDialog.jsx:559-565`, `:587-590`); `App.jsx:228` opens it without naming the new event; and settled pages (`sent`, `handedBack`, `stale`, …) stay in the store's list (`agentEvents.js:146-157`, `:133-137`) and rank before the handoff page (`agentOrder.js:6`). The same settled pages keep `hasNewQuestion` true (`App.jsx:258`), so the dialog does not close by itself.
- **Risks / follow-up**: keep BR2.1 (a live page being read stays put while open; `AgentDialog.test.jsx:259`). The fix point that serves every caller is the dialog's page choice (on open, and when the shown page is settled) plus a "settled" test shared with `hasNewQuestion`; the dialog's `settled` (`AgentDialog.jsx:646`) already defines it for hook pages. Audit (`source: 'audit'`) pages have no store state and must stay counted as open. A KEPT `ended` page lingers 3 s on purpose for its status line. The `newCount` snapshot resets by itself whenever the shown page id changes (`:594`), so switching to the new page needs no extra reset; staying on a page keeps the count.
