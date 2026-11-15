# Unit Test Instructions: US-0410 Settings in LCARS tabs

- **Framework:** vitest 5.1.0, projects `main` (node) and `renderer` (jsdom, Swedish locale, `tests/renderer/setup-i18n.js`). No new configuration.
- **Prerequisites:** `npm ci`.

## Run this work's tests

```sh
npx vitest run tests/main/tools.test.js tests/main/settings.test.js tests/main/updater.test.js tests/main/i18nKeys.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AppShell.test.jsx
```

This command is runnable before the first Red step (Step 2 verifies it green on the unchanged tree).

## Expected tests (Minimal: one per requirement)

| Requirement | Test file |
|---|---|
| FR1.1–FR1.3 rail sub-buttons, aria-current | `tests/renderer/AppShell.test.jsx` |
| FR2.1–FR2.6 one panel per tab, Notifications content | `tests/renderer/SettingsView.test.jsx` |
| FR3.1–FR3.3, NFR2 frame and motion classes | `tests/renderer/SettingsView.test.jsx` |
| FR4.1, FR4.3 five tools, not found | `tests/main/tools.test.js`, `tests/renderer/SettingsView.test.jsx` |
| FR4.2 chosen gh path used | `tests/main/updater.test.js`, `tests/main/settings.test.js` |
| FR4.4 path breaks after `/` | `tests/renderer/SettingsView.test.jsx` |
| FR5.1 last tab saved and restored | `tests/main/settings.test.js`, `tests/renderer/AppShell.test.jsx` |
| FR6.1 shared card class | `tests/renderer/SettingsView.test.jsx` |
| NFR1 keys in both locales | `tests/main/i18nKeys.test.js` |

## Coverage

The project floor is 80% line coverage over all measured source, set in `vitest.config.mjs`; Build and Test checks it on the full suite (`npm run coverage`). This scoped command is not the floor's judge.

## Mocking

`window.bridge` stubs as the existing SettingsView and AppShell tests use (`getTools`, `getSettings`, `setSettings`); `exec` injected into `getTools` and the updater, as today. Motion via `document.documentElement.dataset.motion`.
