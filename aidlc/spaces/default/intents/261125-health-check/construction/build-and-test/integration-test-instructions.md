# Integration Test Instructions: health check (US-0805)

The key boundaries are the bridge between the renderer and main (`getTools`, `checkSignIn`, `app:openExternal`) and the login shell the checks run in.

| Boundary | Test | Where it runs |
|---|---|---|
| App, scan and the views together | `tests/renderer/AppShell.test.jsx`, `HealthCheck.test.jsx` | jsdom (integration) |
| Page keys in main | `tests/main/ipc.test.js` | Node |
| Built app, real shell, stand-in tools | `tests/e2e/healthCheck.spec.js`, `signIn.spec.js` | Electron's Chromium through Playwright |

Run:

```bash
npx electron-vite build
```

```bash
npx playwright test
```

Data: each spec has its own temporary user data folder and stand-in tools (`tests/e2e/standInTools.js`). The real tools never run, and the person's clipboard is put back.

Coverage: the 80% line floor over `src/**` is measured by the full suite (`npx vitest run tests/ --coverage`).
