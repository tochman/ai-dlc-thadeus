# Unit Test Instructions: v0.2.3 release

## Framework

Vitest, configured in `vitest.config.mjs` with two projects: `main` (Node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, setup `tests/renderer/setup-i18n.js`, Swedish). No new runner or dependency is needed.

## Run this work's tests

Main-process modules:

```bash
npx vitest run tests/main/settings.test.js tests/main/aidlcWrite.test.js tests/main/modelChoice.test.js tests/main/updater.test.js tests/main/menu.test.js tests/main/i18nKeys.test.js tests/main/features.test.js
```

Renderer components:

```bash
npx vitest run tests/renderer/ConfigView.test.jsx tests/renderer/TerminalPanel.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx tests/renderer/UpdateNotice.test.jsx tests/renderer/AboutDialog.test.jsx
```

The runner is ready before the first test step: `npx vitest run tests/main/settings.test.js` runs on the unchanged tree.

## Expected coverage

Minimal strategy: at least one test per requirement (FR1.2–FR1.5, NFR3–NFR5) and a happy-path test per new module or component. That comes to about 15 new tests plus the extended ones. The project sets no line-coverage floor. Build and Test runs the full suite (`npx vitest run tests/`) and compares it with the Step 1 baseline.

## Mocking and stubbing

- **Commands:** every new main module takes an injectable `exec(file, args, options) => Promise<stdout>`, as `aidlcConfig.js` and `models.js` already do. Tests pass a fake that records `args` and returns fixture stdout. No real `aidlc`, `gh`, `hdiutil`, `ditto`, `xattr`, `pkexec` or `opencode` runs in a unit test.
- **Files:** the updater takes an injectable `fs` (or a temp folder under the test's own directory) for checksum and cleanup tests.
- **Renderer:** stub `window.bridge` with `vi.fn()` per call, as the existing renderer tests do. Wrap components in the existing `TerminalContext` provider with controlled tab states.

## Test data

- Fixture JSON for `gh release view --json …` (a stable release, a draft, a pre-release), `aidlc config models --show --json` (Claude and opencode), and `opencode models` output, inline in each test file.
- A two-row ledger fixture for the cost estimate.
- A small memory-file string with `## Guard Policy` between two other sections, for the diff test.
