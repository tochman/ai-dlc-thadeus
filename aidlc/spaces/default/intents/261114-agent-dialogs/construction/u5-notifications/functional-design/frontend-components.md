# Frontend Components: u5-notifications (US5.1)

## Sources

- Behaviour: `functional-spec.md` in this folder (D1–D9, W1–W6, the two state machines).
- Story: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md`, US5.1 (AC5.1.1–AC5.1.4).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR5.1–FR5.3, NFR6, NFR7).
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md` (AgentDialog).
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md` (M9, M1–M4 frame) and `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/interaction-spec.md` (AgentDialog states and accessibility, Notifications).
- Integration points: `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (AgentDialog, BR4.5, BR4.6) and `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (reopen, strip, BR6.14, BR6.17).
- Existing code: `src/renderer/SettingsView.jsx` (`Appearance`, `RadioBlocks`, `data-testid` `app-settings-<name>-<id>`), `src/renderer/QuestionPopup.jsx` (`OVERDUE_MS`, `is-calm` / `is-overdue`, escalation per shown page).

No new component is needed. The M9 row reuses `RadioBlocks`, and the escalation and focus changes live in AgentDialog and the app shell that already hold the dialog.

## Hierarchy

```
App
├── SettingsView
│   └── Appearance
│       ├── fieldset "Questions and permission prompts"   (existing, texts changed: D9)
│       │   └── RadioBlocks name="alerts"
│       ├── fieldset "Messages from the agent"            (new, M9)
│       │   └── RadioBlocks name="replies"
│       └── fieldset "Notification sound"                 (existing)
├── LatestMessageStrip                                    (u3, unchanged)
└── AgentDialog                                           (u1–u3; escalation for every kind, focus by event id)
```

## Appearance: the M9 row

### Placement and content

Directly under the `alerts` fieldset and above the sound fieldset, as M9 places it:

```
Messages from the agent   [ Dialog and notification ] [ Line only ] [ Off ]
                          When the agent finishes its turn. Questions and
                          permission prompts follow the setting above.
```

### Props and state

| Name | Kind | Type | Default | Description |
|---|---|---|---|---|
| `replyAlerts` | prop of `Appearance` and `SettingsView` | `'dialog-notify' \| 'line' \| 'off'` | `'dialog-notify'` | The saved value; an unknown value shows as the default |
| `onAlertSettings` | prop (existing) | `(partial) => Promise` | — | Now also accepts `{ replyAlerts }` |
| `error` | state (existing) | string or null | null | "Could not save" line shared by the section |

The App shell already loads `{ questionAlerts, notificationSound }` from settings and passes them down; it adds `replyAlerts` to the same object. No local copy of the value is kept: the radio shows the saved value, so a failed save leaves it on what is stored.

### Ids and texts

| Element | `data-testid` | Text key |
|---|---|---|
| legend | — | `settings.repliesLegend` |
| radio "Dialog and notification" | `app-settings-replies-dialog-notify` | `settings.replies.dialog-notify` |
| radio "Line only" | `app-settings-replies-line` | `settings.replies.line` |
| radio "Off" | `app-settings-replies-off` | `settings.replies.off` |
| help line | — | `settings.repliesHelp` |

### Accessibility

| Requirement | Implementation |
|---|---|
| Role | native `fieldset` and `legend` with one radio group (`name="app-replies"`), as the other rows |
| Keyboard | Tab into the group, arrow keys move and pick, as native radios do; the visually hidden radio keeps the focus outline on its `lcars-block` label |
| Label | the legend names the group; each label names its value in words |
| Help | the help line sits inside the fieldset after the radios, like `alertsHelp` |
| State | the active block is named by the checked radio, not only by `lcars-block--active` colour |
| Errors | the existing `role="alert"` line |

### Validation

None in the renderer beyond the three fixed values; main sanitises the stored value (D1).

## AgentDialog: escalation for every kind

### State

| Name | Type | Description |
|---|---|---|
| `overdue` | boolean | true once the shown page's 20 s count ran out (`OVERDUE_MS` = 20 000 ms) |
| `shownId` | string or null | the event id of the page on screen while the dialog is open; a change restarts the count |

- The count is keyed on the shown event id for every kind: question, batch, permission prompt, reply (D7). It is not skipped for `kind: 'reply'`.
- `red = overdue && !sentOk`: a send keeps the colour, a successful send makes it calm (D7).
- Pages in `stale`, `ended` or `dismissed` do not run a count. A reopened reply has the same id, so the reopen resets the count explicitly (u3 BR6.17).

### Rendering

| State | Class | Title |
|---|---|---|
| calm | `is-calm` with the kind colour (steel, amber, steel-deep) | the kind's title (u1–u3) |
| overdue | `is-overdue` (red header and edges) | `agentDialog.stillWaiting` with `{title}` the kind's title |

### Accessibility

- The overdue change is named in the title text, so it is not shown by colour alone (NFR6, u1 BR4.5).
- The title change is not announced as a live update: the dialog's title is read when it opens, and repeating it every 20 s would interrupt a screen-reader user who is reading the text. Focus does not move when the page turns red.
- The red style respects `prefers-reduced-motion` and the app's Animations setting as the US-0505 glow does today.

## AgentDialog and the app shell: opening from a notification

| Name | Where | Type | Description |
|---|---|---|---|
| `onAgentEventFocus` | bridge subscription (C4 push `agent-events:focus`) | `(eventId) => void` | Replaces `onQuestionFocus` |
| `focus` | prop of AgentDialog (existing shape) | `{ id } \| null` | A fresh object per click, so the same id twice still moves the dialog |

Flow on a push (D6):

1. Find the event in the open events of every project. Switch to its project.
2. Open: set `focus` and open the dialog on that page.
3. Dismissed reply: call `agentEvents.reopen(eventId)`; when the push with the shown reply arrives, focus it.
4. Not found: show the project only.

Focus management is AgentDialog's own (u1): the first choice, or the answer field for a reply, takes focus when the page shows.

## Opening on arrival

The shell opens the dialog on a newly arrived event only when `alertPlan(kind, settings, inFront).open` is true (D2). For questions and permission prompts this is today's rule (`questionAlerts` not `off`). Replies with "Line only" or "Off" never reach the pager, so the rule only matters for questions, permission prompts and default-setting replies.

## Tests (TDD, written first)

| Test | Checks |
|---|---|
| SettingsView: replies row renders three radios with the saved value checked | M9, D1 |
| SettingsView: picking "Line only" calls `onAlertSettings({ replyAlerts: 'line' })`; a rejected save shows the error line and keeps the saved radio | W6 |
| AgentDialog: a reply page turns `is-overdue` after 20 s with fake timers; a permission page too | D7, AC5.1.1 difference |
| AgentDialog: paging restarts the count; a reopened reply restarts it; a stale reply never turns red | D7 |
| App shell: `agent-events:focus` for an open event opens that page; for a dismissed reply calls `reopen` | D6 |
| Locale keys: every new key in both files (existing `i18nKeys` test) | D9, AC5.1.4 |
