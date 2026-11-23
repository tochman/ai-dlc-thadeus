# Code Summary: US-0045, the agent dialog clears stale pages and shows the newest message

Branch `fix/US-0045` (worktree `.claude/worktrees/fix-0045`), on `origin/main` `f3c8c5f`: `945ec79` red tests, `fd1f7ef` fix.

## Changes

- `src/main/agentEvents.js` `recordSignal`: a `session` signal (clear, compact, startup, resume) or a `postcompact` ends that session's handoff pages that are still `shown` (`endedBy: 'movedOn'`). This happens before the signal goes to the handoff controller, so the new-session offer it makes comes after. Pages whose choice is under way (`waiting`, `sending`) finish on their own, and other sessions' pages stay. (AC1)
- `src/renderer/App.jsx` `receiveAgentEvents`: a new page that opens the dialog becomes the dialog's focus whether the dialog is closed or open. Of several new pages, the newest arrival wins, with ties in pager order. A new page older than the one shown last opens the dialog without moving the page being read. This replaces US-0031's "an open dialog is never moved". The dialog's page guard (`GUARD_MS`) still keeps a keystroke from answering a page that just moved in. (AC2)

## Tests

- `tests/main/agentEvents.test.js`: 6 new tests. A shown page ends on clear, compact, startup, resume and postcompact; a choice under way and another session's page stay.
- `tests/renderer/AppAlerts.test.jsx`: 2 new tests. An open dialog moves to a newer message, and Previous reaches the old one; a closed dialog opens on the newest of several new pages.
- **Red:** 7 of the 8 failed on the old code. The "choice under way stays" test already passed, since it guards against over-clearing.
- **Green:** 176/176 across these files, `AgentDialog.test.jsx` and `sessionHandoff.test.js`. ESLint has 0 errors; its 2 older warnings in `App.jsx` belong to US-0043. Prettier is clean.

## Notes

- "No-intent" in the report is read as the new-session page. It clears by the same rule.
