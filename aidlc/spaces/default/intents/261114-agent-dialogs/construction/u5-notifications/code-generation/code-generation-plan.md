# Code Generation Plan: u5-notifications

## Summary

- Builds: alerts for every agent event (US-0506 US5.1): the `replyAlerts` setting, one shared `alertPlan` decision, one notification per event titled by kind, the click that opens that event, red after 20 s for every kind, and the M9 settings row
- Touches: new `src/shared/alertPlan.js`; changes in `src/main/notify.js`, `settings.js`, `agentEvents.js`, `agentReplies.js`, `ipc.js`, `src/preload/index.js`, `src/renderer/App.jsx`, `AgentDialog.jsx`, `SettingsView.jsx`, both locale files, `contract-summary.md`
- Tests: about 45 new tests in 3 new and 5 extended files: unit tests per component and one main-side integration test from an accepted event to a shown notification

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "classic",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:0db0277d6c2a6742d5982d08f7356d1c82513cd0b72253b0dfc67cfe6f0770b5",
  "contract_sha256": "sha256:71418531672369a589adb02df222cd73b11bef5572eb7b2d1ef1c7ed1dcfb984"
}
```

## Sources

- Design: `functional-design/functional-spec.md` (D1–D9, W1–W6), `rules.md` (BR8.1–BR8.6), `frontend-components.md`; `nfr-design/logical-components.md` (LC50–LC55 and its "Amendments for Code Generation" 1–9), `performance-design.md` (PD50–PD59), `security-design.md` (SD50–SD56).
- Built by u1–u3 on this branch and reused, not rewritten: `src/shared/agentText.js` (`stripUnsafe`, `plainLine`, `firstLine`, `cutGraphemes`), the store's `onAdded` hook (`src/main/agentEvents.js`, fired by `addEvent` and by u3's `notifyAdded`), `replies.reopen`, AgentDialog's per-`shownId` escalation (`OVERDUE_MS`) and its kind titles, `notify.js`'s once-per-id set and click handler.

## Decisions made in this plan

- **The u4 line is not touched.** `hooksCurrent` in `src/main/ipc.js` and the store's source choice belong to u4-install, built beside this Unit. u5 adds its lines to `agentWiring()` after the `createAgentEventStore` call only, so the two merge cleanly.
- **The audit path keeps `notifyQuestions` as a thin wrapper** over `notifyEvent` (Amendment 5), so `refreshQuestions` changes one line.
- **Reopen restarts the count (D7).** The escalation effect is keyed on `shownId` plus a reopen counter the dialog bumps when a `dismissed` reply comes back as `shown` with the same id.

## Steps

### Structure, contracts and runner

- [x] Step 1: Contract amendment, before any code (Amendment 1). In `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md`, with the file-edit tool: confirm the C4 YAML block holds `agentEvents.focus: { push: "agent-events:focus", payload: { eventId: string }, unit: U5 }` (it is already there) and change C4's Owner to "U1; U3, U4 and U5 add members" if it does not say so yet. Traces: SD53, C4.
- [x] Step 2: Runner check on the unchanged tree. Run `npx vitest run tests/main/notify.test.js tests/main/settings.test.js tests/main/agentEvents.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AgentDialog.test.jsx` and record the pass count. In `vitest.config.mjs`, add a per-file 80% line entry for `src/shared/alertPlan.js` beside the existing ones (setting a floor up, never lowering one). Traces: NFR8.5.

### Data model: the `replyAlerts` setting (LC52)

- [x] Step 3: Red. Extend `tests/main/settings.test.js` (6 tests): each of `dialog-notify`, `line`, `off` is kept on read and on write; a missing key, `'loud'`, `42` and `null` are left out (no throw), so the default applies; `questionAlerts` and `notificationSound` sanitising unchanged; `settingsNow()` returns the defaults-only copy before the first read, then the last value `getSettings` read or `setSettings` resolved. Run `npx vitest run tests/main/settings.test.js`; record the failures.
- [x] Step 4: Green. In `src/main/settings.js`: `export const REPLY_ALERTS = new Set(['dialog-notify', 'line', 'off'])`, one sanitise line beside `questionAlerts`, and `settingsNow()` with the module-level copy updated in `getSettings` and `setSettings`. Traces: D1, BR8.1, SD55, PD51, AC5.1.2.
- [x] Step 5: Refactor. Comment names US-0506 u5 D1; tests green.

### Business logic: the shared decision (LC51)

- [x] Step 6: Red. New `tests/main/alertPlan.test.js` (8 tests, one table): every row of D2 for `question`, `permission` and `reply` × each setting × in front / in the background gives `{ open, notify, silent }` as the table says; unknown or missing settings give the defaults; `questionAlerts` never changes a reply's answer and `replyAlerts` never changes a question's (AC5.1.2); `notificationSound: false` gives `silent: true`. Run `npx vitest run tests/main/alertPlan.test.js`; record the failures (module missing).
- [x] Step 7: Green. New `src/shared/alertPlan.js` (header: US-0506 u5 US5.1, D2, BR8.2), pure, no imports: `export function alertPlan(kind, settings, inFront)`. Traces: D2, BR8.2, PD50, PD61.
- [x] Step 8: Refactor. Defaults as two named constants; tests green.

### Business logic: Notifications (LC50)

- [x] Step 9: Red. Extend `tests/main/notify.test.js` (12 tests, `electron` `Notification` mocked as today, a fake `win`):
  - `notificationText(event)`: the title per kind (`app.notification.question`, `.permission`, `.reply`) with the harness's display name; body `{project} · {text}`; `{text}` is the first question's text, a batch's first question, `what` plus the first line of `detail`, the reply message, or u3's empty-reply line; Markdown dropped, whitespace runs to one space, cut at 120 graphemes with "…" (an emoji on the cut is kept whole), the project name at 40; a control or bidi character is removed (SD52, SD56).
  - `notifyEvent(event, ctx)`: notifies when `alertPlan` says so; not when the window is focused on the event's project; once per `eventId` (a second call with the same id, a reopen, does nothing); a reply with `off` never; `silent` follows `notificationSound`; `Notification.isSupported()` false or `show` throwing is logged and returns without throwing (D5, NFR5.50); the click restores, shows and focuses the window and sends `agent-events:focus` with `{ eventId }` (never `questions:focus`); a click after the window was destroyed does nothing; stamps `notificationShown` and `notificationClicked` through the passed `timing`.
  - The audit wrapper `notifyQuestions(fresh, ctx)` still gives today's gate and ask texts through the same path.
  Run `npx vitest run tests/main/notify.test.js`; record the failures.
- [x] Step 10: Green. In `src/main/notify.js`: `notificationText`, `notifyEvent(event, { settings, win, activeProjectId, projectName, timing })` using `alertPlan` and `stripUnsafe`/`plainLine`/`firstLine`/`cutGraphemes` from `src/shared/agentText.js`; `notifyQuestions` maps each audit question to a question event and calls `notifyEvent`. The old key `app.notification.title` is removed. `ponytail:` comment on the decided set (one id per event for the app run, no cap; a cap or an LRU if a run ever sees millions). Traces: D3, D4, D5, D6, BR8.3, BR8.4, SD52–SD54, SD56, PD50–PD53, FR6.1, AC5.1.3.
- [x] Step 11: Refactor. One `focusWindow(win)` helper for the click; tests green.

### Business logic: the store at arrival (LC4 change)

- [x] Step 12: Red. Extend `tests/main/agentEventsReply.test.js` (5 tests, the real store with u1's fake channel and pty): with `settings().replyAlerts` `line` or `off` a new reply is accepted straight as `dismissed`, is not in the pager, and `latest(projectId)` shows it; `reopen` then shows it; with `dialog-notify` it is `queued`/`shown` as u3 has it; `onAdded` fires once per accepted event for a question, a permission and a reply, and never for a duplicate (u3 BR6.4). Run `npx vitest run tests/main/agentEventsReply.test.js`; record the failures.
- [x] Step 13: Green. `createAgentEventStore` takes `settings = () => ({})`; `agentReplies.js`'s `add` picks the arrival state through `alertPlan('reply', settings(), false).open`. Traces: D2, BR8.2, u3 BR6.14.
- [x] Step 14: Refactor. u1–u3 store test files green unchanged.

### API: wiring, preload

- [x] Step 15: Red. Extend `tests/main/ipc.test.js` (2 tests): `agentWiring` passes `settings: settingsNow` to the store and subscribes `store.onAdded` to `notifyEvent` with the event's window, the active project and its name; `refreshQuestions` notifies through `settingsNow()`, not an awaited read. Extend `tests/main/preload.test.js` (1 test): `agentEvents.onFocus` subscribes `agent-events:focus`; `onQuestionFocus` is gone. Run `npx vitest run tests/main/ipc.test.js tests/main/preload.test.js`; record the failures.
- [x] Step 16: Green. `src/main/ipc.js`: the `settings` dependency and one `store.onAdded(...)` line in `agentWiring()` after the store is built; `refreshQuestions` uses `settingsNow()`. `src/preload/index.js`: `agentEvents.onFocus: subscribe('agent-events:focus')`; remove `onQuestionFocus`. Traces: Amendment 5, SD53, C4.
- [x] Step 17: Refactor. Tests green.

### Integration: event to notification

- [x] Step 18: New `tests/main/agentAlertsFlow.test.js` (3 tests; real store, real `notifyEvent`, mocked `Notification`, fake channel): a hook question in the background gives one notification and its click pushes `agent-events:focus`; a reply with `line` gives a `dismissed` event and one notification; the same raw event delivered twice gives one event and one notification. Written after the layers; a failure is fixed in the layer it names. Run `npx vitest run tests/main/agentAlertsFlow.test.js`. Traces: W1, W3, D4, FR6.1.

### Frontend: SettingsView M9 row (LC55)

- [x] Step 19: Red. Extend `tests/renderer/SettingsView.test.jsx` (5 tests): the "Meddelanden från agenten" fieldset sits between the alerts and sound fieldsets with three radios (`app-settings-replies-dialog-notify`, `-line`, `-off`) and the saved value checked; an unknown value shows the default; picking "Bara raden" calls `onAlertSettings({ replyAlerts: 'line' })`; a rejected save shows the `role="alert"` line and the radio stays on the saved value; the alerts legend reads "Frågor och behörighetsfrågor". Run `npx vitest run tests/renderer/SettingsView.test.jsx`; record the failures.
- [x] Step 20: Green. In `src/renderer/SettingsView.jsx`: `REPLY_IDS`, a `replyAlerts` prop, one fieldset with `RadioBlocks name="replies"`, through `t()`. Locale keys of D9 in both `sv.json` and `en.json` (new keys, the two changed `alerts` texts, the three notification titles and the body). Traces: D1, D9, BR8.1, BR8.6, PD59, AC5.1.2, AC5.1.4.
- [x] Step 21: Refactor. `tests/main/i18nKeys.test.js` green.

### Frontend: AgentDialog and the app shell (LC53, LC54)

- [x] Step 22: Red. Extend `tests/renderer/AgentDialogReply.test.jsx` and `tests/renderer/AgentDialog.test.jsx` (6 tests, fake timers): a reply page and a permission page turn `is-overdue` after 20 s with the "still waiting" title; paging restarts the count; a reopened reply (same id, `dismissed` to `shown`) starts calm and restarts its count; a `stale` or `dismissed` page never turns red; a failed send keeps the red. New `tests/renderer/AppAlerts.test.jsx` (4 tests, stubbed bridge): `agentEvents.onFocus` with an open event's id switches to its project and opens the dialog on that page; with a dismissed reply it calls `agentEvents.reopen(eventId)`; with an unknown or non-string id it opens nothing; a new reply with `replyAlerts` `dialog-notify` opens the dialog, a new question with `questionAlerts` `off` does not. Run `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/AppAlerts.test.jsx`; record the failures.
- [x] Step 23: Green. `src/renderer/AgentDialog.jsx`: the reopen counter in the escalation effect's key. `src/renderer/App.jsx`: `replyAlerts` in `alertSettings` and to `SettingsView`; `receiveAgentEvents` opens through `alertPlan(kind, alertSettings, true).open` for the fresh event's kind; `onFocus` replaces `onQuestionFocus` (find the event across projects, switch, focus or reopen; check the payload is a string of at most 64 characters). Traces: D6, D7, BR8.4, BR8.5, SD53, PD54–PD58, AC5.1.1, AC5.1.3.
- [x] Step 24: Refactor. u1–u3 renderer tests green unchanged.

### Documentation and traceability

- [x] Step 25: Module headers and exported doc comments name US-0506 u5 and the D or BR they implement. Write `code-summary.md`, `source-manifest.json` and `traceability.json` in this folder. The feature-doc wording "every kind" for the red escalation (Amendment 9) waits for Deployment Execution. Run `npx vitest run tests/` once at the end and record the result.

## Story traceability

| AC | Steps |
|---|---|
| AC5.1.1 (red after 20 s, every kind) | 22, 23 |
| AC5.1.2 (own reply setting) | 3–8, 12, 13, 19, 20 |
| AC5.1.3 (notification in the background, click opens it) | 9–11, 15, 16, 18, 22, 23 |
| AC5.1.4 (texts in both languages) | 20, 21 |
