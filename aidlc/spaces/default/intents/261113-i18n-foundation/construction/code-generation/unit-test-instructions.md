# Unit Test Instructions: US-0701 i18n foundation and English

## Framework and configuration

- Vitest 5 with two projects in `vitest.config.mjs`: `main` (Node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`).
- This work adds `tests/renderer/setup-i18n.js` as the renderer project's `setupFiles`. It initializes i18n in Swedish, so existing renderer tests that assert Swedish text keep passing.

## Run this work's tests

Run the new and extended test files only:

```bash
npx vitest run tests/main/i18n.test.js tests/main/i18nKeys.test.js tests/main/settings.test.js tests/main/menu.test.js tests/main/notify.test.js tests/main/theme.test.js tests/renderer/format.test.jsx tests/renderer/AppSettingsDialog.test.jsx
```

This command runs before the first test step (Step 2 checks it against the existing `settings.test.js`, `menu.test.js` and `theme.test.js`; the new files are added in later steps).

## Tests (Minimal strategy, about 14 new tests)

| File | Tests | Requirements |
|------|-------|--------------|
| `tests/main/i18n.test.js` (new) | ICU plural n=1/n=2 in sv and en; interpolation; fallback to English; fallback to key, never empty; `resolveLanguage` for auto+sv-SE, auto+de-DE, en, invalid | FR3.2, FR3.3, FR4.2, FR5.1 |
| `tests/main/i18nKeys.test.js` (new) | same keys in sv/en; every `t('…')` key in `src/` exists in en; same placeholders per key; no empty values; no Swedish interface text left in renderer components or the menu (regression) | FR7.1, FR7.2, FR7.3, FR1.4 |
| `tests/main/settings.test.js` (extend) | `language` kept when valid, dropped when invalid | FR4.3 |
| `tests/main/menu.test.js` (extend) | English labels under `en`, Swedish under `sv` | FR1.2, FR4.4 |
| `tests/main/notify.test.js` (new) | title and gate body in English | FR1.2 |
| `tests/main/theme.test.js` (extend) | LCARS label rule wraps instead of overflowing | FR8.1, FR8.2 |
| `tests/renderer/format.test.jsx` (new) | dates formatted for sv-SE and en | FR3.4, FR3.5 |
| `tests/renderer/AppSettingsDialog.test.jsx` (new) | choosing English saves `language: 'en'` and switches the dialog's text at once | FR4.1, FR4.4, FR4.5 |

## Expected coverage

- No coverage floor applies to this scope (bugfix, Minimal). Every requirement above has at least one test, and every new module has a happy-path test.
- The whole existing suite must stay green; Build and Test runs it in full.

## Mocking and stubbing

- Main-process tests mock `electron` the way the existing `menu.test.js` and `settings.test.js` do (`app.getLocale`, `app.getPath`, `Notification`).
- Renderer tests stub `window.bridge` (`getSettings`, `setSettings`, `getLanguage`) as the existing renderer tests do.
- Tests that switch to English call `i18n.changeLanguage('en')` and switch back to `sv` in `afterEach`, so test order does not matter.

## Test data

- The translation files themselves are the test data for the key checks. No fixtures are added.
