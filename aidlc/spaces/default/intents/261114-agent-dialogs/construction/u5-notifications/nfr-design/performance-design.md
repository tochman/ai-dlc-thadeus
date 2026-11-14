# Performance Design: u5-notifications

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-design/nfr-design-questions.md` (Q1 B, Q2 A)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/performance-requirements.md` (NFR1.50–NFR1.56, NFR5.50, NFR6.50–NFR6.58, NFR7.50)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/security-requirements.md` (NFR3.52, for the bounded cut)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/tech-stack-decisions.md` (D50–D54, NFR7.51, NFR7.52, NFR8.50–NFR8.53)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/reviews/review-01.md` (R-03, R-04, R-05, R-06)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md` (D1–D9, W1–W6, the two state machines)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/frontend-components.md` (M9 row, AgentDialog escalation, opening from a notification)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `THADEUS_WAIT_SECONDS`, C3, C4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/observability-design.md` (OD1 timing log and its stamps)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (LC4 `onAdded`, LC7 TimingLog, LC10 AgentDialog, "Reuse by the later Units")
- Existing code: `src/main/notify.js` (`notified`, `live`, `MAX_BODY`, `questions:focus`), `src/main/ipc.js` (`refreshQuestions`, line 291 passes the whole pending list and awaits `getSettings()`), `src/main/settings.js` (`getSettings` reads the file on every call, `update` queue), `src/preload/index.js` (`subscribe`, `onQuestionFocus`), `src/renderer/App.jsx` (`onQuestionFocus` handler, `askingIntents`), `src/renderer/QuestionPopup.jsx` (`OVERDUE_MS`), `src/renderer/theme.css` (`.question-popup.is-overdue`, `--alert`, `:root[data-motion='reduced']`)

## Scope

This is a `ui` Unit: it has this file, `security-design.md` and `logical-components.md`. Its one reliability point (NFR5.50) and its two timing stamps are designed here. Element IDs start at PD50; component IDs (LC50 …) are in `logical-components.md`; u1 elements are cited as "u1 LC7", "u1 OD1".

## PD50 Notify in the store's own turn, never in the event's way

**Satisfies:** NFR1.51, NFR1.52, NFR1.55, NFR5.50.

- **Call.** u1 LC4 calls `notifyEvent(event, ctx)` (LC50) once per accepted event from its `onAdded` signal, after the `agent-events:changed` push (u1 "Reuse by the later Units"). `ctx` is `{ settings, win, activeProjectId, projectName }`. `settings` comes from `settingsNow()` (LC52), a synchronous read of main's settings copy, so nothing between the store's call and `show()` awaits, reads a file or starts a timer.
- **Decision.** `alertPlan(kind, settings, inFront)` (LC51) is pure. `inFront` is `win && !win.isDestroyed() && win.isFocused() && event.projectId === activeProjectId`.
- **Several at once.** Each call builds and shows its own `Notification`; no queue, no debounce. Ten events accepted in one turn give ten `show()` calls in that turn.
- **Failure never stops the event.** The whole body of `notifyEvent` after the decided-id step sits in one `try`/`catch`. `Notification.isSupported()` false, a throwing constructor or a throwing `show()` each log one line `[notifications] failed event=<eventId> kind=<kind> cause=<error.name>` through `console.warn` and return. The store has already queued and pushed the event before it calls, so the push and the hook's wait (C1) cannot be affected.
- **Settings change.** LC52 replaces its copy in the same turn that `setSettings` resolves, so the first event after the save uses the new value. Nothing already shown or open is redone (D1).

**Tested by:** main tests with a fake `Notification`: `show()` is recorded before the store's call returns; spies on `fs` and on `getSettings` see no call during `notifyEvent`; 10 events in one turn give 10 `show()` calls; `isSupported` false, a throwing constructor and a throwing `show()` each leave the event in `agentEvents.list`, keep the push, and write exactly one `[notifications]` line holding no agent text; a save of `replyAlerts: 'line'` followed by a reply gives a `dismissed` reply and no dialog.

## PD51 The audit path: no await, and a decided set that stays bounded

**Satisfies:** NFR1.51 (audit path), NFR1.56. Resolves review R-04.

- **Today.** `refreshQuestions` in `src/main/ipc.js` (line 291) passes every pending audit question that was not there at start to `notifyQuestions`, on every recompute, after `await getSettings()`. For these questions the decided set is the only guard against a second notification.
- **Change.** The audit path calls `notifyEvent` per fresh question with `settingsNow()` (LC52) in place of `await getSettings()`, so NFR1.51 holds for both paths. The `await loadPendingQuestions` before it stays: it is the audit's own read, done before the event exists, not part of notifying.
- **Decided set.** A `Set` of at most 500 ids in insertion order. When an id that is already in it is offered again, it is deleted and added again, so it moves to the newest end; a still-pending audit question offered on every recompute is therefore never the oldest. When the set passes 500, the oldest id is deleted.
- **Why 500 is safe.** Hook events are offered once (u1 LC4 calls once per accepted event). An audit question is offered on each recompute of its project while it is pending, and each offer refreshes it. A pending audit question can only fall out, and be notified a second time, if more than 500 other ids are decided between two recomputes of its own project. The pending list is bounded by open questions, not by total events.
- **Code comment.** `// ponytail: 500 ids, refreshed on each re-offer; a pending audit question is re-notified only if 500 other ids are decided between two recomputes of its project`.
- **Other memory.** The `live` set drops a notification on `close` and on `click`. AgentDialog holds at most one escalation timer (PD54).

**Tested by:** unit test with 501 fake hook events: size 500, the first id dropped; unit test offering one audit id on every one of 600 recomputes with 499 other ids between each pair: it stays in the set and is notified once; unit test that the audit caller makes no `getSettings` call; unit test firing `close` and `click`: `live` size 0.

## PD52 Bounded text work before the grapheme cut

**Satisfies:** NFR1.50 (stays inside budget), NFR3.52 (performance side). Resolves review R-03.

- **Inputs are already bounded upstream.** C3 caps a question's `text` and a reply's `message.text` at 64 KB (u1 LC3 cut); u2 caps `permission` fields. The event file's 1 048 576-byte limit never reaches Notifications as one string.
- **Pre-cut.** `notificationText` (LC50) takes the text, skips leading whitespace, takes the first non-empty line, then cuts it to 2 000 UTF-16 code units with `slice` before any Markdown, character or grapheme work. A surrogate split by that `slice` is a lone surrogate, which the sanitizer removes (`security-design.md` SD50), so nothing broken reaches the OS.
- **Grapheme cut.** One `Intl.Segmenter(undefined, { granularity: 'grapheme' })` built once at module load (D50). The segment iterator stops at the 121st grapheme; it is never spread into an array of the whole line.
- **`{project}` cap.** The project name is cleaned the same way and cut at 40 graphemes with "…", so a long folder name cannot crowd out `{text}`.
- **Budget.** Building title and body for a 64 KB single-line input takes under 50 ms.

**Tested by:** unit test that a 64 KB single-line `text` builds the notification in under 50 ms (measured with `performance.now()` around `notificationText`; the bound is generous for CI); unit tests at 119, 120, 121 graphemes and at 64 KB; a 120-grapheme project name is cut to 40 plus "…".

## PD53 Timing stamps: what the 1 s target measures

**Satisfies:** NFR1.50, NFR1.53, u1 NFR1.6 (extended). Resolves review R-05.

- **Stamps.** Two new stamp names go into u1 LC7 TimingLog: `notificationShown` (main, right after `Notification.show()` returns, in `notifyEvent`) and `notificationClicked` (main, first line of the click handler). Same record as u1 OD1: `{ eventId, harness, stamp, at }`, no text. Both are taken in main, so neither uses the renderer's `agentEvents.stamp` member. With `THADEUS_TIMING` unset, LC7 is a no-op and nothing is written.
- **Stamps relied on.** `hookReceived` (u1 OD1: the event file's `mtimeMs`, taken by AgentChannel on accept) and `dialogShown` (u1 OD1: renderer, in a `requestAnimationFrame` after the page's effect runs).
- **What is measured.** `notificationShown − hookReceived` ≤ 1 s measures the hand-off of the notification to the operating system. It does not measure the banner appearing on screen: the notification centre's own delay, Focus/Do Not Disturb and the user's banner style are outside the app, and Electron gives no callback for "drawn". `dialogShown − notificationClicked` ≤ 1 s measures from the app receiving the click to the page painting; the time between the person's click and Electron's `click` event is the OS's.
- **Proof.** CI proof is PD50's same-turn test (no await between the store's call and `show()`) plus a unit test that each stamp is written once per notified event and never for a silent one. Release evidence is the manual run on the release Mac with `THADEUS_TIMING=1`: 20 arrivals (10 questions, 5 permission prompts, 5 replies with `dialog-notify`) with the window not focused, and 10 clicks (5 on an open event, 5 on a reply dismissed by "Line only").

**Tested by:** the unit tests above; the manual run, its lines kept with the release pull request.

## PD54 Escalation: one relative timer, every kind

**Satisfies:** NFR1.54, NFR1.56 (timer part), u3 NFR6.6 (extended to every kind), NFR6.53.

- AgentDialog (LC54) keeps one `setTimeout(OVERDUE_MS)` keyed on `shownId`, the id of the page on screen. A change of `shownId` (paging, the page leaving) clears it and starts a new one; a reopen of a dismissed reply starts a new one explicitly, because the id is the same. Pages in `stale`, `ended` or `dismissed` start none.
- The timer is relative from showing, so a system clock change cannot make it fire early or late.
- `red = overdue && !sentOk`, as `QuestionPopup` today: `sending` keeps the colour, a failed send returns to `shown` without restarting the count.
- Reduced motion: the overdue head uses the existing `:root[data-motion='reduced']` rule (static outline in place of the `lcars-alert` animation), which already covers `prefers-reduced-motion: reduce` and the app's Animations setting.

**Tested by:** renderer tests with fake timers for a question, a batch, a permission prompt and a reply: no `is-overdue` at 19 999 ms, present at 20 000 ms; paging and reopen restart at 0; `vi.setSystemTime` one hour ahead keeps a calm page calm; `vi.getTimerCount()` is at most 1 with four events in the pager; with `data-motion='reduced'` the overdue head has no `animation-name`.

## PD55 Clicking a notification: straight to the page

**Satisfies:** NFR1.53, NFR6.55, NFR6.58.

- The click handler restores, shows and focuses the window and sends `agent-events:focus` with `{ eventId }` (`security-design.md` SD53).
- The App shell (LC53) looks the id up in the events it already holds for every project (it receives `agent-events:changed` for each). For an open event it sets AgentDialog's `focus` to a fresh `{ id }` and opens the dialog on that page with no further round trip. For a dismissed reply it makes exactly one `agentEvents.reopen(eventId)` call and focuses the page when the reopened reply arrives in the next push. For an unknown id it shows the project only (D6 step 6).
- The clicked page shows at once even if another page was being read: the click is the person's own choice, so u1 BR2.1 does not hold it back. The other pages keep their arrival order. Typed answers and picks are kept per `eventId` in AgentDialog, so the page that was on screen keeps its draft when paged back.
- Focus goes to the first choice (question, permission) or the answer field (reply) once the page shows, by u1 LC10's own focus rule.

**Tested by:** renderer tests: a push for an open event shows that page with no bridge call; a push for a dismissed reply makes one `reopen` call; after a click on the third of four events the dialog shows the third, the other three keep their order and the first page's typed text is intact; `document.activeElement` is the first choice or the answer field after the push, also after reopen.

## PD56 An arrival never takes over the screen

**Satisfies:** NFR6.56.

- **Rule chosen.** An event for a project that is not on screen opens the dialog over the current view (today's US-0505 behaviour), and its page names the event's project in text in its header. The active project never changes on arrival; only a click on the notification (D6 step 3) or the person's own choice switches it.
- **Focus.** The dialog's opening on arrival follows u1 LC10's rule; it never moves focus out of a terminal or editor the person is typing in on its own (u1 BR2.1 and the u1 dialog's own focus rule). The notification and the project marker (PD57) signal it as well.
- **Amendment.** Functional Design W2 step 3 reads: "The dialog opens on its own over project A, on the reply page, which names project B; 20 s later it turns red if not answered or closed." (Listed under "Amendments for Code Generation" in `logical-components.md`.)

**Tested by:** renderer test with two projects: after a push for project B while A is shown, the active project is A, the dialog's page names B in text, and focus is not moved out of the terminal.

## PD57 With alerts off, a waiting event is still one key away

**Satisfies:** NFR6.57.

- The existing per-project marker of `askingIntents` (App shell, LC53) counts hook questions and permission prompts of that project too, shown as text with the number. The marker is a `button`: Enter or a click opens AgentDialog on the oldest waiting event of that project.
- With `questionAlerts: 'off'` nothing opens, sounds or notifies on arrival (`alertPlan`). If nobody opens it, the hook hands back after `THADEUS_WAIT_SECONDS` (C1, u1 rows) and the agent shows its own picker.

**Tested by:** renderer test with `questionAlerts: 'off'`: no dialog and no `Notification` on arrival; the marker shows the count in text, is reached by Tab, and Enter opens the dialog on the oldest event.

## PD58 The overdue state for every reader

**Satisfies:** NFR6.50, NFR6.51, NFR6.52, NFR6.53. Resolves review R-06.

- **Words.** At 20 s the title becomes `agentDialog.stillWaiting` with `{title}` the kind's title.
- **Screen readers.** The title stays outside any live region, and focus does not move. AgentDialog renders one visually hidden `role="status"` element (polite) from mount, empty. When the page turns overdue it receives the same "Still waiting: …" text once; it is cleared when another page is shown. Polite means it is read when the reader is idle and never interrupts. It fires once per shown page, never repeatedly.
- **Contrast.** The overdue header text against `--alert` is at least 4.5:1. The red border and header (`--alert`) against the dialog's background token is at least 3:1 (non-text contrast).
- **Keyboard.** An overdue page has the same key handling as a calm one; nothing is rebound at 20 s.

**Tested by:** renderer tests in both locales for the title text; a test that the `role="status"` node holds the text once after 20 s and is empty after paging, and that `document.activeElement` is unchanged; one test that reads the tokens from `theme.css` and computes both WCAG ratios (≥ 4.5 for the header text, ≥ 3 for `--alert` against the background); keyboard-only tests on an overdue page (number keys, Space in multi-select, Enter, Esc).

## PD59 The M9 settings row

**Satisfies:** NFR6.54, NFR1.55 (renderer side).

The row is `RadioBlocks` with `name="app-replies"` (LC55), so Tab and arrow keys behave as native radios. The checked radio always shows the saved value; there is no local copy, so a failed save leaves it on what is stored and the shared `role="alert"` line shows. An open reply page is not closed by the change.

**Tested by:** renderer tests driving only keyboard events; the W6 test of `frontend-components.md` (rejected save keeps the radio and shows the alert); a test that an open reply page stays open after the save.

## PD60 Texts built at show time

**Satisfies:** NFR7.50, NFR7.51, NFR7.52.

`notifyEvent` calls `t()` when it builds the notification, never earlier, so the app's current language applies; a shown notification is never re-sent. The agent's text is cleaned (`security-design.md` SD50) but never translated. Every new user-facing text is one of D9's keys; `app.notification.title` is removed from both locale files.

**Tested by:** main test switching the i18n language between two events (the second has the English title, the first is not re-sent); the existing `tests/main/i18nKeys.test.js`; unit tests with recorded C3 payloads in Swedish, with emoji and with non-ASCII text, equal to the agent's first line after cleaning.

## PD61 Quality gates for this Unit

**Satisfies:** NFR8.50, NFR8.51, NFR8.52, NFR8.53.

- Every row of this file and of `security-design.md` names its test; the Code Generation plan puts each failing test before its code (team TDD).
- Coverage, ESLint and Prettier run in the CI `verify` job as u1 OD4 sets them up; the floor covers `notify.js`, `settings.js`, `src/shared/alertPlan.js`, `src/shared/agentText.js`, the M9 row in `SettingsView.jsx`, AgentDialog's escalation code and the App shell's focus and marker code.
- `alertPlan` has one table-driven test: the 9 kind-and-setting rows of D2, each with `inFront` true and false, plus `notificationSound: false`.

**Tested by:** the CI `verify` job; the Code Generation plan review.
