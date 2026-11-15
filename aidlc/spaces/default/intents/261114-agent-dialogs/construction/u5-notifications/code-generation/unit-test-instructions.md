# Unit Test Instructions: u5-notifications

## Framework setup

- **Runner:** vitest 5.1.x as installed, with the projects in `vitest.config.mjs`: `main` (node, `tests/main/**/*.test.js`), `scripts` (real-time hook script tests, not used by this Unit) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale through `tests/renderer/setup-i18n.js`).
- **Changed in plan Step 2:** a per-file 80% line entry for `src/shared/alertPlan.js`. `@vitest/coverage-v8`, ESLint and Prettier are already set up. No new dependency.
- **Prerequisites:** `npm ci`. Nothing else.
- **Built side by side:** this Unit's worktree holds u1–u3 but not u4-install. Every command below passes on u1–u3's code plus this Unit's.

## Runnable before the first test-first cycle (plan Step 2)

```bash
npx vitest run tests/main/notify.test.js tests/main/settings.test.js tests/main/agentEvents.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AgentDialog.test.jsx
```

These files must be green on the unchanged tree before the first Red step.

## This Unit's tests, file by file

Each Red step records the failing output of its exact command.

| Plan step | Component | Command |
|---|---|---|
| 3–5 | Settings Store `src/main/settings.js` | `npx vitest run tests/main/settings.test.js` |
| 6–8 | AlertPlan `src/shared/alertPlan.js` | `npx vitest run tests/main/alertPlan.test.js` |
| 9–11 | Notifications `src/main/notify.js` | `npx vitest run tests/main/notify.test.js` |
| 12–14 | AgentEventStore at arrival `src/main/agentEvents.js`, `src/main/agentReplies.js` | `npx vitest run tests/main/agentEvents.test.js tests/main/agentEventsReply.test.js` |
| 15–17 | Wiring `src/main/ipc.js`, preload | `npx vitest run tests/main/ipc.test.js tests/main/preload.test.js` |
| 18 | Event to notification (integration) | `npx vitest run tests/main/agentAlertsFlow.test.js` |
| 19–21 | SettingsView M9 row, locale keys | `npx vitest run tests/renderer/SettingsView.test.jsx tests/main/i18nKeys.test.js` |
| 22–24 | AgentDialog escalation, app shell focus | `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/AppAlerts.test.jsx` |

## The whole Unit in one run

```bash
npx vitest run tests/main/settings.test.js tests/main/alertPlan.test.js tests/main/notify.test.js tests/main/agentEvents.test.js tests/main/agentEventsReply.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/agentAlertsFlow.test.js tests/main/i18nKeys.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AgentDialog.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/AppAlerts.test.jsx
```

## Expected coverage targets

- **Project floor:** 80% line coverage of the whole project (Testing Contract, team rule), measured by Build and Test on the full suite. A run of this Unit's files alone does not judge it.
- **This Unit's files:** at least 80% line coverage of each file it creates or changes. Checked with its own command, with nothing after it, because a threshold exit stops the line:

```bash
npx vitest run tests/main/settings.test.js tests/main/alertPlan.test.js tests/main/notify.test.js tests/main/agentEventsReply.test.js tests/main/agentAlertsFlow.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AgentDialogReply.test.jsx tests/renderer/AppAlerts.test.jsx --coverage --coverage.include=src/shared/alertPlan.js --coverage.include=src/main/notify.js --coverage.include=src/main/settings.js --coverage.include=src/renderer/SettingsView.jsx
```

If it exits non-zero only on a threshold with every selected test passing, record that with the results; it is not a failed test. Never change a threshold to make it pass.

## Mocking and stubbing

- **`electron`:** `vi.mock('electron')` with a `Notification` class that records `{ title, body, silent }`, `show`, and its `click` and `close` handlers; `isSupported` returns true unless a test sets it false. `app.getPath` returns a temp folder for `settings.js`.
- **Window:** a plain object with `isDestroyed`, `isFocused`, `isMinimized`, `restore`, `show`, `focus` and `webContents.send` spies.
- **Store:** u1's fake channel and fake pty, fake timers, and a `settings` function returning the test's object.
- **Renderer:** `window.bridge` stubbed with `agentEvents.onChanged`, `onFocus` (captures the handler), `reopen`, `latest`, and `getSettings`/`setSettings`; fake timers advanced past `OVERDUE_MS` (20 000 ms).
- **Timing:** a `timing.stamp` spy; nothing written to disk.

## Test data

- Events are built inline with a small `event({ kind, ... })` helper per file: `eventId` `h1-…`, `harness` `claude-code` or `opencode`, `projectId` `p1`, plus `questions`, `permission` (`what`, `detail`) or `message` (`text`, `empty`).
- Text cases: a 200-character line, an emoji with ZWJ on the 120th grapheme, a line with `**bold**` and a link, U+202E and `\x1b`, an empty reply.
- No files on disk except `settings.json` in the temp folder.
