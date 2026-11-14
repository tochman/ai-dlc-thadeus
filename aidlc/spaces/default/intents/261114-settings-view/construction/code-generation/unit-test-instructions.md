# Unit Test Instructions — US-0405 Settings view

**Test strategy:** Minimal (one requirement-driven test per requirement at the narrowest effective level, a happy-path floor per component).
**Scope floor:** ultra-express adds no extra new-test floor; the existing suite must stay green.
**Methodology:** test-after — each layer is implemented, then its tests are written and run.

## Framework

| Item | Value |
|------|-------|
| Runner | Vitest 5 (`vitest.config.mjs`, two environments) |
| Main-process tests | `tests/main/` — Node environment |
| Renderer tests | `tests/renderer/` — jsdom + Testing Library, i18n set up by `tests/renderer/setup-i18n.js` |
| UI helpers | `@testing-library/react` (`render`, `fireEvent`, `screen`, `waitFor`, `within`) |
| Test data | a temp folder under `tests/.tmp/` (`fs.mkdtemp`/`rm` in `beforeEach`/`afterEach`), never the repo's real files |

## Run this work's tests

Run from the repo root. This is the exact command for this work; it names only this work's files, so Build and Test can run it beside other work:

```bash
npx vitest run tests/main/tools.test.js tests/main/settings.test.js tests/main/pty.test.js tests/main/i18nKeys.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AppShell.test.jsx
```

Run a single file while working on it, for example:

```bash
npx vitest run tests/main/tools.test.js
```

The full suite (`npm test`) is a separate check, run once at the end of this work; it is not the unit-scoped command.

## Expected coverage targets

- No line-coverage floor applies to this scope (ultra-express, Minimal strategy).
- One test per requirement, at the narrowest level that proves it:
  - FR2.1, FR2.3, FR2.4 → `tests/main/tools.test.js` (with `exec` injected and a temp folder for the files)
  - FR7.1 → `tests/main/settings.test.js`
  - FR2.4 shell/agent start → `tests/main/pty.test.js`
  - FR1.1–FR1.3, FR2.2, FR2.5, FR3.1, FR4.1–FR4.3, FR5.1, FR6.1–FR6.3, NFR1 → `tests/renderer/SettingsView.test.jsx`
  - the left arm and menu entry → `tests/renderer/AppShell.test.jsx`
  - NFR2 (key parity, no inline Swedish text) → `tests/main/i18nKeys.test.js`, which needs no change but must stay green

## Mocking and stubbing

- **Main:** `runFixed` accepts an injected `exec`; pass a fake `exec(file, args, options)` that resolves fake versions or rejects, exactly as `tests/main/harness.test.js` and `tests/main/models.test.js` do. Mock `electron` with `vi.mock('electron', () => ({ app: { getPath: () => TMP } }))` where `settings.js` is loaded, as `settings.test.js` already does.
- **Renderer:** set `window.bridge` before rendering with only the functions the view calls (`getSettings`, `getTools`, `pickTool`, `saveTool`, `resetTool`, `pickDefaultFolder`, `clearDefaultFolder`, `getAppInfo`, `openExternal`, `setSettings`, `getLanguage`). `vi.fn()` for each; assert on the calls, not on Electron.
- Never let a test touch the real `aidlc`, `claude` or the user's `$SHELL`: always inject `exec` or stub the bridge.

## Test data

- Tool files for validation are created in a temp folder (`tests/.tmp/tools`), with and without the executable bit (`fs.chmod`), and removed afterwards. A clean-up in `afterEach` keeps runs repeatable.
- Renderer tests use plain objects for settings and tool rows; no fixtures on disk.

## Accessibility checks in the renderer tests

- `screen.getByLabelText(...)` for every field in the view (proves the label is attached).
- `getByRole('button', { name: '<the Swedish name>' })` for the file buttons (proves the accessible name).
- After opening, `document.activeElement` is inside the view (proves focus moved in).
