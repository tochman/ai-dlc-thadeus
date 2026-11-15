# Performance Requirements: u5-notifications

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1, NFR5, NFR6, NFR7; FR5.1–FR5.3, FR6.1)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md` (D1–D9, W1–W6, the two state machines, corners swept)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/frontend-components.md` (M9 row, AgentDialog escalation state, opening from a notification, tests)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/rules.md` (BR8.1–BR8.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/reviews/review-01.md` (R-01–R-04)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `THADEUS_WAIT_SECONDS` hand-back, C3 AgentEvent, C4 bridge)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (Electron 45.3.1, React 19.3.1, vitest 5.1.0)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/observability-requirements.md` (u1 NFR1.6 timing log)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/performance-requirements.md` (u3 NFR6.6 overdue title for replies)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/nfr-requirements-questions.md` (no questions)
- Existing code checked: `src/main/notify.js` (`notified` set, `live` set, `MAX_BODY = 120`, `questions:focus`), `src/main/settings.js` (`QUESTION_ALERTS`, `sanitize`), `src/renderer/App.jsx` (question popup opens app-wide without switching project; `askingIntents` marker on the project view), `src/preload/index.js` (`onQuestionFocus`)

## Scope and numbering

This is a `ui` Unit, so it has performance and security files but no scalability, reliability or observability files. Its one reliability concern (a failing notification must not stop an event) is NFR5.50 below, and its two timing-log stamps are part of NFR1.50 and NFR1.53.

**Numbering.** u2-permissions and u3-replies both used the sub-IDs that follow u1's (for example NFR1.8–NFR1.12 exist in both), and u4-install has not numbered its rows yet. So this Unit's rows start at `.50` in every group (NFR1.50, NFR3.50, NFR5.50, NFR6.50, NFR7.50, NFR8.50). A row from another Unit is always cited with its Unit name, for example "u1 NFR1.6".

"Release Mac" and "timing log" mean what u1 defines (u1 NFR1.6). "Reaches main" means the moment AgentEventStore accepts the event (after the duplicate check, u3 BR6.4), which is the moment it calls Notifications (D5).

## Latency (NFR1)

NFR1 sets 1 s for an event to reach the person. For a notification, this Unit applies the same 1 s from the event reaching main to the system notification being handed to the operating system.

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.50 | A notification is shown soon after the event reaches main. The timing log gains the stamp `notificationShown` (main, right after `Notification.show()` returns), in the same shape as u1 NFR1.6: `{ eventId, harness, stamp, at }`, no text. | `notificationShown − hookReceived` ≤ 1 s in each of 20 runs (10 questions, 5 permission prompts, 5 replies with `dialog-notify`), window not focused | Manual run on the release Mac with `THADEUS_TIMING=1`; unit test that the stamp is written once per notified event and never for a silent one |
| NFR1.51 | The decision to notify is synchronous and does no I/O. `alertPlan` is a pure function; Notifications uses the settings the store passes (D5) and reads no file and awaits nothing before `show()`. | 0 `await`, timer or file read between the store's call and `show()` | Unit test: a fake `Notification` records `show()` before the store's call returns; a spy on `fs` and on `getSettings` sees no call during notify |
| NFR1.52 | Several events at once each get their own notification without waiting for each other (FR6.1, D4). | 10 events accepted in one main-process turn give 10 `show()` calls in that same turn | Unit test with a fake `Notification` |
| NFR1.53 | Clicking a notification brings the event forward. The timing log gains the stamp `notificationClicked` (main, in the click handler); `dialogShown` (u1 NFR1.6) is stamped when the focused page paints. | `dialogShown − notificationClicked` ≤ 1 s in each of 10 runs: 5 with the event open in the pager, 5 with a reply dismissed by "Line only" (reopen path, D6 step 5) | Manual run on the release Mac with the timing log on; renderer test that the page shows after the `agent-events:focus` push with no extra round trip for an open event and exactly one `agentEvents.reopen` call for a dismissed reply |
| NFR1.54 | Escalation happens at 20 s on screen for every kind (D7, BR8.5), counted from showing with a relative timer, never from the wall clock. | overdue absent at 19 999 ms and present at 20 000 ms after the page shows, for a question, a batch, a permission prompt and a reply; the count restarts at 0 on paging and on reopen; moving the system clock forward 1 h with `vi.setSystemTime` does not make a calm page overdue | Renderer tests with fake timers (as u3 NFR6.6, extended to permission prompts and batches) |
| NFR1.55 | A settings change applies to the next event (D1, W6). Main's settings copy is updated in the same turn as the save resolves. | the first event accepted after `setSettings({ replyAlerts })` resolves uses the new value; an open reply page is not closed by the change | Main test: save `line`, accept a reply, expect `dismissed`; renderer test that the open page stays |

## Resources (R-04)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.56 | The memory Notifications holds is bounded. The decided-id set (D4) keeps at most 500 ids and drops the oldest first. That is safe because AgentEventStore calls Notifications once per accepted event (D5) and event ids are unique per run (C3), so the set is a second guard, not the only one. The code carries a `ponytail:` comment naming the 500 ceiling. The `live` set of shown notifications drops each one on `close` and on `click`. AgentDialog runs at most one escalation timer, for the page on screen. | decided set size ≤ 500 after 501 events, and the first id is the one dropped; `live` size 0 after every shown notification is closed or clicked; at most 1 pending escalation timer with 4 events in the pager | Unit test with 501 fake events; unit test firing `close` and `click`; renderer test with `vi.getTimerCount()` |

## Never in the event's way (NFR5)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.50 | A failure in Notifications never stops the event (D5). When `Notification.isSupported()` is false, or the constructor or `show()` throws, the event is still queued and `agent-events:changed` is still pushed, and the hook's wait (C1) is unaffected. The failure is logged once per event with its event id and kind only. | in all three failure cases the event is in `agentEvents.list` and the push happened in the same turn; exactly one log line per failed event, holding no agent text | Store test with `isSupported` false, a throwing constructor and a throwing `show()`; assert queue, push and the log line's fields |

## Dialog, settings row and click (NFR6, NFR7)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR6.50 | The overdue state is named in text as well as colour (D7, u1 BR4.5). | at 20 s the title reads `agentDialog.stillWaiting` with the kind's title, in Swedish and in English; the overdue header's text-to-background contrast is at least 4.5:1 | Renderer test of the title text in both locales; one test that reads the two colour tokens from `theme.css` and computes the WCAG contrast ratio |
| NFR6.51 | Escalation neither moves focus nor interrupts a screen reader (frontend-components.md, AgentDialog accessibility). | `document.activeElement` is the same element before and after the 20 s mark; the title is not inside an `aria-live` region; the dialog keeps `aria-labelledby` pointing to the title, so the state is read when the dialog is read | Renderer test with fake timers |
| NFR6.52 | An overdue page works by keyboard exactly like a calm one (NFR6). | number keys pick, Space ticks in multi-select, Enter sends, Esc closes, on a page that turned overdue | Renderer tests driving only keyboard events after 20 s |
| NFR6.53 | The overdue style does not move when motion is reduced. | with `prefers-reduced-motion: reduce` or the app's Animations setting off, the overdue page has no animation (as the US-0505 glow today) | Renderer test on the class the app sets for reduced motion; CSS rule reviewed in the pull request |
| NFR6.54 | The M9 settings row works by keyboard and names its state in words. | Tab enters the `app-replies` group; arrow keys move and pick; the checked radio carries the value; a failed save shows the `role="alert"` line and the checked radio stays on the saved value | Renderer tests driving keyboard events; the W6 test of frontend-components.md |
| NFR6.55 | After a notification click, focus is in the dialog on the event. | the first choice (question, permission) or the answer field (reply) has focus once the page shows, also after reopen | Renderer test: `document.activeElement` after the `agent-events:focus` push |
| NFR6.56 | An arrival never takes over the screen the person is using (R-01). An event for a project that is not on screen never changes the active project and never moves focus out of the terminal or editor on its own. Whether the dialog opens over the current project at once (today's US-0505 popup does, naming the question's project) or waits until that project is shown is set in NFR Design with u1's pager (C4 `agentEvents.list` takes a `projectId`). This Unit recommends today's behaviour, opening over the current view with the event's project named in the page. The notification (the window counts as in the background for that project) and the project marker of NFR6.57 signal it either way. | after a push for project B while project A is shown: the active project is A; if the dialog does not open, focus is unchanged; if it opens, its page names project B in text | Renderer test with two projects; NFR Design records the chosen rule and rewrites W2 to match |
| NFR6.57 | With `questionAlerts` set to `off`, a waiting question or permission prompt from a hook is still reachable (R-02). The project shows a text marker with the number of waiting events (the existing per-project marker of `askingIntents`, extended to hook events), and the marker is a button: Enter or a click opens the dialog on the oldest waiting event of that project. If nobody opens it, the hook still hands back after `THADEUS_WAIT_SECONDS` minus 5 s (C1), and the agent shows its own picker. | marker present with the count in text, reachable by Tab, opening the dialog by Enter; no dialog, notification or sound on arrival | Renderer test with `questionAlerts: 'off'`; the C1 hand-back is u1's existing test (u1 NFR5 rows) |
| NFR6.58 | A click opens the clicked page at once, and the others keep their order (R-03). The click is the person's own choice, so "the page being read never jumps" (u1 BR2.1) does not hold it back. The page that was on screen goes back to its place in arrival order, and its typed answer and picks are kept. The same holds for a reply reopened while another page is shown (u3 BR6.14). | after a click on the third of four events: the dialog shows the third; the pager order of the other three is unchanged; the first page's typed text is intact when paged back | Renderer test with four events and a typed answer on the first |
| NFR7.50 | Notification texts are built when shown, in the app's language at that moment (D3, D9). | an event shown after the language is switched from Swedish to English has the English title; the previous one is not re-sent | Main test switching the i18n language between two events |
