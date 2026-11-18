# Requirements — US-0031: the agent dialog opens on the page that just arrived

## Intent analysis

The person must be able to trust that the dialog shows the moment they are in. Today it can reopen on an old, already answered message (mostly over the compact / fresh-session page), and answered pages keep the dialog from closing by itself. This is a bug fix (EPIC-00, `quick-fix`-sized), narrow in scope: the renderer's page choice and its "something is still waiting" test. Source: the story US-0031 in `docs/features/epic-00-fixes.md` and the code it names, checked on 2026-11-18.

Confirmed in the code:
- `AgentDialog.jsx` keeps `pageId` / `lastIndex` across close and reopen; it falls back to another page only when that page has left the list.
- `App.jsx` `receiveAgentEvents` opens the dialog on a fresh event (`setPopupOpen(true)`) without naming that event as the page to show, although the dialog already takes a `focus` for notifications.
- `agentEvents.js` `move` removes an event only on `ended`; questions in `sent` / `handedBack` and replies in `stale` stay in the list. `byPager` ranks handoff pages last, so an old answered question sorts before a new compact / fresh-session page.
- `hasNewQuestion` in `App.jsx` counts every non-early page, settled ones included.

**Settled page** (used below): a hook page that no longer waits for the person, that is a question or permission in `sent`, `handedBack` or `ended` (kept for its line), or a reply in `stale`. A page in `shown`, `timedOut`, `sending`, or a handoff in `waiting`, is **live**.

## Functional requirements

- **FR1** When new pages arrive and open the dialog, it shows the newest arrival, not the page it was last closed on.
  - **FR1.1** With several new pages in one push, the first of them in pager order is shown.
  - **FR1.2** The earlier pages stay in the list and are reachable with Previous / Next.
  - **FR1.3** A notification click that names a page still opens that page (existing `focus` rule unchanged).
- **FR2** When the dialog is open on a settled page and a new page arrives, the new page takes over.
- **FR3** When the dialog is open on a live page and a new page arrives, the page being read stays put and "+n nya" counts the new one (BR2.1 unchanged).
- **FR4** The dialog closes by itself when no live, non-early page is left; settled pages do not keep it open.
- **FR5** Claude Code and opencode behave the same; the fresh-session choice is still typed through the existing handoff path.

## Non-functional requirements

- **NFR1** Any new or changed text goes through `t()` with the same keys in `sv.json` and `en.json`, in the LCARS look; no state is shown by colour alone. (No new text is expected.)
- **NFR2** TDD: for FR1, FR2 and FR4 a test fails without the fix and passes with it; FR3 is covered by the existing tests, which stay green; line coverage stays at or above 80%.

## Constraints

- The rule that a page stays put while it is read (BR2.1) is kept.
- Stay inside the existing pager order (`byPager`) and the dialog's `focus` mechanism; no new state store.

## Assumptions

- The fix lives in the renderer (`App.jsx`, `AgentDialog.jsx`). Settled pages stay in main's list (`agentEvents.js` unchanged), because their "sent" / "answered in the terminal" lines are meant to stay readable for a while (BR2.3). Reason: the acceptance criteria want the earlier page still reachable.
- A handoff that is replaced by a newer offer (`movedOn`) needs no extra handling: the newer offer is a fresh page and FR1 shows it.

## Out of scope

- Changing `byPager` ranks or removing settled pages from the store sooner.
- Changes to how answers are sent or handed back.

## Open questions

None.
