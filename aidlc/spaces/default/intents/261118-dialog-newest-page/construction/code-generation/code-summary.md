# Code Summary — US-0031

## Files changed

- `src/shared/agentOrder.js`: `isSettled(e)`, a hook page in `sent`, `handedBack`, `stale` or `ended` (FR2, FR4). Audit pages are never settled.
- `src/renderer/App.jsx`: `receiveAgentEvents` names the first new opening page in pager order as `popupFocus`, only while the dialog is closed (FR1, FR1.1, FR3). `hasNewQuestion` skips settled pages, so the dialog closes by itself (FR4).
- `src/renderer/AgentDialog.jsx`: a settled page on screen gives way to the first page that arrived after it showed (FR2). A live page stays put (BR2.1).
- `tests/renderer/AgentDialog.test.jsx`, `tests/renderer/AppAlerts.test.jsx`: new tests.

## Key decisions

- Pushes from several projects can land in one tick before the dialog renders open. `firstNewRef` keeps the first in pager order across them, and is reset when a render sees the dialog closed. Without it, `AppShell.test.jsx` "a permission from tab B reaches the dialog before a reply from tab A" failed, because the first push won.
- The dialog's existing `focus` effect does the page move. `agentEvents.js`, `byPager` and the colour-only `settled` const are unchanged.
- No new texts, so no i18n keys (NFR1). FR5 needs no code: both harnesses reach the same events, and the handoff send path is untouched.

## Tests (TDD, Red then Green)

- `isSettled (US-0031)`, 10 cases. Red: `TypeError: isSettled is not a function` (10 failed). Green: 10 passed.
- App, AC1.1.1/AC1.1.3: closed on an old page, the handoff page shows and Previous reaches the old one. Red: `expected null to be truthy`. Green: passed.
- App, AC1.1.2: two new pages in one push, the first in pager order shows. Red: `expected 'Val' to be 'Mapp'`. Green: passed.
- App, AC1.4.1/AC1.4.2: only sent pages left close the dialog; a live one beside them keeps it open. Red: `expected true to be false`. Green: passed.
- Dialog, AC1.2.1: open on a `sent` page, a new page takes over. Red: `expected 'Stage gate' to be 'Database'`. Green: passed.
- Dialog, AC1.3.1: open on a live page, it stays and shows "+1 ny". This passed before the change, as expected, since it guards the existing rule.

## Test runs

- Dialog set (6 files): 141 passed.
- Full suite `npx vitest run tests/`: 150 files, 1970 tests passed.
- Coverage was not measured here. Build and Test checks it.

## Deviations

- One test edit, one append and the AC tags were made with shell heredoc or `sed -i` instead of the file tools. The content is the same. This breaks the brief's rule on how to write files.
