# Code Summary: u5-notifications (US-0506 US5.1)

## What was built

- **`src/shared/alertPlan.js` (new, LC51).** `alertPlan(kind, settings, inFront)` returns `{ open, notify, silent }` (D2). The store, the notifications and the renderer all use it.
- **`src/main/settings.js` (LC52).** `REPLY_ALERTS` and one sanitising line for `replyAlerts` (D1, SD55). `settingsNow()` returns main's copy of the settings, as `getSettings` last read them or `setSettings` last saved them (PD51).
- **`src/main/notify.js` (LC50).**
  - `notificationText(event, projectName, platform)` builds the title per kind and the body `{project} · {text}`. The text goes through `firstLine`, a 2 000-unit pre-cut, `stripUnsafe`, `plainLine`, then `cutGraphemes` at 120 graphemes (40 for the project). The body is escaped for markup on Linux only (D3, SD50–SD52, SD56).
  - `notifyEvent` decides once per event id (D4). It shows exactly `{ title, body, silent }`, stamps `notificationShown` and `notificationClicked`, and logs a failure in one line without agent text (PD50). A click focuses the window and pushes `agent-events:focus` with `{ eventId }` (D6, SD53).
  - `notifyQuestions` is now a thin wrapper that maps each audit question to its `auditEvent` id (Amendment 5). The old `app.notification.title` key and `questions:focus` are gone.
- **Store.** `createAgentEventStore` takes `settings`. With `line` or `off`, `agentReplies.js` accepts a new reply straight as `dismissed` (D2).
- **Wiring.**
  - `ipc.js` passes `settings: settingsNow` to the store and subscribes `store.onAdded` to `notifyEvent`, with the project's window, the active project and the project's name.
  - `refreshQuestions` uses `settingsNow()`, so it no longer awaits a settings read.
  - Preload: `agentEvents.onFocus` replaces `onQuestionFocus`.
- **Renderer.**
  - App opens the dialog per `alertPlan` for each fresh event's kind.
  - `onFocus` checks the payload (a string id of at most 64 characters), switches to the event's project, and then opens the dialog on that page or reopens a dismissed reply.
  - AgentDialog keeps an event red while sending and after a failed send. A reopen (dismissed to shown, same id) restarts the 20 s count (D7).
  - SettingsView has the M9 row "Meddelanden från agenten". Both locales have the D9 keys.

## Tests

The Unit adds 50 tests: 6 settings, 17 alertPlan (one table), 13 notify, 4 store, 2 ipc and preload, 3 integration, 5 SettingsView, 4 AgentDialog and 4 AppAlerts. Each layer's test was written to fail before its code (TDD). The final swarm check passed: 1079 tests, 88.36% line coverage, ESLint with no errors, Prettier clean.

## Deviations and notes

- **Steps 1 and 22 were partly done already.** The C4 row was already in `contract-summary.md`. Red after 20 s already worked for replies and permission prompts. The tests for those still pass.
- **`agentDialog.stillWaiting` was not added.** AgentDialog already has an overdue title for each kind, so the key would be unused.
- **EPIC-05 docs.** Commit 647c607 had split the EPIC-05 `**Status (…)**` line over several lines, so `featureDocsStatus.test.js` failed on the base tree. The line was joined back with its words unchanged. The "every kind" wording waits for Deployment Execution (Amendment 9).
- **Flaky timing tests.** Two wall-clock tests outside this Unit (`dialogScriptReply` at 113 ms against a 100 ms limit, and the `watcher` ledger test) each failed once under load. Neither failed again on the next run.
