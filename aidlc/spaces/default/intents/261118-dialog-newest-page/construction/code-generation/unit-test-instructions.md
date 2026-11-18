# Unit Test Instructions — US-0031

## Framework

vitest 5.1.0, `renderer` project (jsdom, Swedish locale), Testing Library. No new configuration.

## Run this work's tests

```bash
npx vitest run tests/renderer/AppAlerts.test.jsx tests/renderer/AgentDialog.test.jsx
```

The dialog tests this change could break:

```bash
npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogHandoff.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/AppAlerts.test.jsx tests/renderer/AppShell.test.jsx tests/renderer/LatestMessageStrip.test.jsx
```

## New tests (5)

- `isSettled`: settled and live states (FR2, FR4).
- App: closed on an old page, a handoff page opens the dialog on itself, Previous reaches the old page (FR1, FR1.2).
- App: two new pages in one push, the first in pager order shows (FR1.1).
- App: only a `sent` page left closes the dialog; a live page beside it keeps it open (FR4).
- Dialog: open on a `sent` page, a new page takes over (FR2). The live-page case (FR3) is kept by an existing or added assertion.

## Coverage

The project floor is 80% line coverage; Build and Test checks it on the full suite.

## Mocking and test data

Reuse the fixtures already in the test files (`question()`, `reply()` in `AppAlerts.test.jsx`, the handoff event shape from `AgentDialogHandoff.test.jsx`) and the existing `window.bridge` stubs. Push events with the file's `push(projectId, events)` helper.
