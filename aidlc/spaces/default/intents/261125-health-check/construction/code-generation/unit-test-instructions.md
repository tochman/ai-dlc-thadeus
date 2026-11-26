# Unit Test Instructions: health check (US-0805)

## Setup

Vitest 5.1 and Playwright 1.65 are installed and configured (`vitest.config.mjs`, `playwright.config.*`); nothing is added. Component tests run in the Swedish locale (`tests/renderer/setup-i18n.js`).

## Run

Before the first Red step, on the existing files:

```bash
npx vitest run tests/main/tools.test.js tests/main/toolsLoginPath.test.js tests/main/speckitSetup.test.js tests/main/ipc.test.js tests/main/i18nKeys.test.js tests/renderer/SignIn.test.jsx tests/renderer/SettingsView.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/AppShell.test.jsx
```

After the build, with the new files:

```bash
npx vitest run tests/main/installCommands.test.js tests/main/health.test.js tests/main/tools.test.js tests/main/toolsLoginPath.test.js tests/main/speckitSetup.test.js tests/main/ipc.test.js tests/main/i18nKeys.test.js tests/renderer/HealthCheck.test.jsx tests/renderer/SignIn.test.jsx tests/renderer/SettingsView.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/AppShell.test.jsx tests/renderer/noNativeTitle.test.jsx
```

Built app, as two commands:

```bash
npx electron-vite build
```

```bash
npx playwright test tests/e2e/healthCheck.spec.js tests/e2e/signIn.spec.js
```

## Coverage

The project's floor is 80% lines over `src/**`. Build and Test checks it on the full suite. `health.js` and `installCommands.js` are pure and should be covered completely by their own tests.

## Volume

| Component | Tests |
|---|---|
| `installCommands.js` | 5 |
| `health.js` | 8 |
| `tools.js` (`noAnswer`) | 3 |
| `ipc.js` (pages) | 2 |
| `SignIn.jsx` (option, promise, copy) | 4 |
| `HealthCheck.jsx` (scan 7, views 10) | 17 |
| `App`, `ProjectView`, `SettingsView` | 6 |
| Built app | 4 |

## Mocking and data

- Main: the injectable `exec` and executables in a temporary folder, as `tools.test.js` does. No test runs a real tool, reads a credential or uses the network.
- Renderer: `window.bridge` with `getTools`, `checkSignIn`, `openExternal` and `platform`; deferred promises for the order of answers; `navigator.clipboard` replaced.
- Built app: stand-in tools and a user data folder in a temporary folder, as `signIn.spec.js`; the person's clipboard is put back. The scan's login shell is the real one, so answers get 20 s.
- An error case is needed for every boundary: `getTools` rejects, `checkSignIn` rejects, the clipboard refuses, `openExternal` fails.
