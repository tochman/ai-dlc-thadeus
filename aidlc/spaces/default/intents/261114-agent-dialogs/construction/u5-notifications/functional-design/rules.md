# Business Rules: u5-notifications

## Sources

- This Unit's behaviour specification: `functional-spec.md` (decisions D1–D9) and `frontend-components.md`, which stay the source of truth for this ui Unit; the rules below restate those decisions as numbered rules so they can be traced.
- Story: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US5.1, AC5.1.1–AC5.1.4).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR5.1–FR5.3, FR6.1, NFR7).

```yaml
rules:
  - id: BR8.1
    statement: Replies have their own alert setting, replyAlerts, with values dialog-notify (default), line and off; a missing or invalid value falls back to the default.
    category: validation
    applies_to: Settings Store, SettingsView
    trigger: reading or saving settings
    logic: IF the saved value is one of dialog-notify, line, off THEN use it ELSE use dialog-notify
    violation: the invalid value is dropped
    source: FR5.2
  - id: BR8.2
    statement: What an arriving event does is decided once, by kind, setting and whether the app is in front.
    category: policy
    applies_to: Notifications, AgentEventStore, AgentDialog
    trigger: an event arrives
    logic: questions and permission prompts follow questionAlerts and notificationSound; replies follow replyAlerts (dialog-notify opens the dialog and notifies, line updates the strip only and notifies in the background, off updates the strip only with no notification) and notificationSound (see functional-spec.md D2)
    violation: none
    source: FR5.1, FR5.2
  - id: BR8.3
    statement: At most one system notification per event id, and only when the app is in the background or showing another project.
    category: constraint
    applies_to: Notifications
    trigger: an event arrives
    logic: IF the window is focused on the event's project THEN no notification ELSE one notification titled by kind; never again for the same event id
    violation: none
    source: FR5.3, FR6.1
  - id: BR8.4
    statement: Clicking a notification brings the app forward on that event.
    category: policy
    applies_to: Notifications, App Shell, AgentDialog
    trigger: notification click
    logic: restore the window, switch to the event's project, open the dialog on the event if it is still open or reopen it if it is a dismissed reply, otherwise show the project only
    violation: none
    source: FR5.3
  - id: BR8.5
    statement: Every kind turns red after 20 seconds on screen without an answer, named in text as well as colour.
    category: policy
    applies_to: AgentDialog
    trigger: a page shown for 20 seconds
    logic: switch to the overdue style and "Still waiting" title; the count restarts when another page is shown; stale, ended and dismissed events never turn red (replies included, as decided in u3-replies Q1)
    violation: none
    source: FR5.1
  - id: BR8.6
    statement: Every new text is in sv.json and en.json through t().
    category: validation
    applies_to: all u5 texts
    trigger: build and test
    logic: the i18n key test finds the same keys in both files
    violation: the test fails
    source: NFR7
```

## Summary

| Rule | In short | Spec |
|---|---|---|
| BR8.1 | replyAlerts setting and its sanitising | D1 |
| BR8.2 | Decision per kind, setting and window state | D2, D5, D8 |
| BR8.3 | One notification per event, only when not in front | D3, D4 |
| BR8.4 | Click opens that event | D6 |
| BR8.5 | Red after 20 s for every kind | D7 |
| BR8.6 | Texts in both languages | D9 |
