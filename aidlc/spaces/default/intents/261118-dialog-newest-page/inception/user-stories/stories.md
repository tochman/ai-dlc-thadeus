# User Stories — US-0031

Persona: P1, the developer answering the app's dialogs. "Settled" and "live" pages are defined in `requirements.md`.

## US1.1 — The dialog opens on the page that just arrived (Must Have)

As P1, I want the dialog to open on the page that made it open, so that I answer the moment I am in, not an old message.
Traces: FR1, FR1.1, FR1.2, FR1.3, NFR1.

- **AC1.1.1** Given the dialog was closed on a page that is still in the list, when a compact, fresh-session or gate page arrives and opens the dialog, then that new page is shown.
- **AC1.1.2** Given several new pages arrive in one push, when the dialog opens, then the first of them in pager order is shown.
- **AC1.1.3** Given the new page is shown, when I press Previous / Next, then the earlier pages are still reachable.
- **AC1.1.4** Given I click a notification that names a page, when the dialog opens, then that page is shown.

## US1.2 — A finished page gives way to a new one (Must Have)

As P1, I want a page that is already settled to make way for a new page, so that an answered message never sits as the current one.
Traces: FR2, NFR1. Depends on nothing.

- **AC1.2.1** Given the dialog is open on a settled page (sent, handed back or stale), when a new page arrives, then the new page is shown.

## US1.3 — The page I am reading stays put (Must Have)

As P1, I want the page I am still answering to stay on screen when something new comes in, so that what I pick never changes under me.
Traces: FR3.

- **AC1.3.1** Given the dialog is open on a live page, when a new page arrives, then the same page stays shown and "+n nya" counts the new one (BR2.1, unchanged).

## US1.4 — The dialog closes once nothing waits (Must Have)

As P1, I want the dialog to close by itself when nothing is left waiting for me, so that answered pages do not hold it open.
Traces: FR4, NFR1.

- **AC1.4.1** Given only settled pages are left in the list, when the last live page settles, then the dialog closes by itself.
- **AC1.4.2** Given a settled page and a live page are left, then the dialog stays open.

## US1.5 — Both coding tools behave the same (Should Have)

As P1, I want the same behaviour with Claude Code and opencode, so that I do not need to know which tool asked.
Traces: FR5.

- **AC1.5.1** Given a compact / fresh-session page from either tool, when it opens the dialog, then it is shown first, and the fresh-session choice is still typed through the existing handoff path.

## Across all stories

Any text goes through `t()` (Swedish and English) in the LCARS look, and no state is shown by colour alone (NFR1). Tests come first (NFR2, see Code Generation).

## INVEST notes

Each story is one behaviour of the same two renderer files, small and testable on its own. US1.3 guards today's behaviour and needs no new code, only its existing tests kept green.
