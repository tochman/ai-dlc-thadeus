# Unit Test Instructions: see whether each tool is signed in, and sign in from the app (US-0804)

## Setup

Vitest 5.1.0 (`vitest.config.mjs`, projects `main`, `scripts`, `renderer`) and Playwright 1.65 are set up. Nothing is installed or configured.

## Run

Before the first test (Step 1), on the existing files:

```bash
npx vitest run tests/main/exec.test.js tests/main/tools.test.js tests/main/pty.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/platforms.test.js tests/main/updater.test.js tests/main/i18nKeys.test.js tests/main/theme.test.js tests/renderer/SettingsView.test.jsx tests/renderer/TerminalPanel.test.jsx tests/renderer/terminalControl.test.jsx tests/renderer/AppShell.test.jsx tests/renderer/noNativeTitle.test.jsx
```

This unit's new files, once they exist:

```bash
npx vitest run tests/main/signInParsers.test.js tests/main/signIn.test.js tests/main/signInCommand.test.js tests/renderer/SignIn.test.jsx
```

Both together are the unit's run. During a step, run only that step's files.

The built app (Step 12), as two commands:

```bash
npx electron-vite build
```

```bash
npx playwright test tests/e2e/signIn.spec.js tests/e2e/intentLayout.spec.js
```

## Coverage

The project's 80% line floor is measured by Build and Test on the full suite, not here. The floor is never changed. Each new file in `src/` should hold 80% on its own.

## Mocks and test data

- The parsers' inputs are the outputs measured on 2026-11-25, with names, emails and ids changed. No real account or token is in a test.
- `signIn.test.js` runs real stand-in scripts and a stand-in shell startup file in `tests/.tmp` (as `tools.test.js` does), with its own `HOME` and `ZDOTDIR`, and a short limit injected. If a wall-clock limit makes it unreliable in a parallel run, it goes in `TIMED` in `vitest.config.mjs` with its reason.
- The real `gh`, `claude` and `opencode` never run in a test, and no test uses the network.
- Renderer tests mock `window.bridge.checkSignIn` and use the Swedish locale through `t()`. The clipboard is a double.
- The Playwright spec sets `toolPaths` to its stand-ins, in its own user data folder and project copy.
