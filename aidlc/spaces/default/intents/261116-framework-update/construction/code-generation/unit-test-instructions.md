# Unit Test Instructions: US-0504

- **Framework:** vitest 5.1.0; `main` project for `tests/main/aidlcUpdate.test.js`, `renderer` project (jsdom, Swedish locale) for `tests/renderer/AidlcUpdate.test.jsx`. No new configuration.
- **Run this work's tests:** `npx vitest run tests/main/aidlcUpdate.test.js tests/renderer/AidlcUpdate.test.jsx tests/renderer/RefreshPanel.test.jsx tests/renderer/SettingsView.test.jsx tests/main/setup.test.js tests/main/i18nKeys.test.js`
- **Runnable before the first Red:** yes for the existing files; the two new files are created in Steps 3 and 6.
- **Expected:** about 10 new tests, all green, with the existing ones unchanged.
- **Coverage:** the project's 80% line floor is checked by Build and Test on the full suite.
- **Mocking:** main tests pass an injectable `exec` (as `tests/main/setup.test.js` does). It answers `aidlc --version`, rejects `aidlc update --check --json` with `{code: 5, stdout: '<json>'}` for "newer", and returns the `config --dry-run --json` sample. Renderer tests mock `window.bridge.getAidlcUpdateStatus`, `getAidlcProjectPlans` and the terminal context (`type`, `anyBusy`).
- **Test data:** the real shape of `aidlc config --harness claude --dry-run --json` (`data.counts`, `data.actions[{path, action}]`), one conflict, and an offline check answer `{"ok":false,"message":"update check unavailable while offline"}`.
