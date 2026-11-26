# Unit Test Instructions: US-0051 and US-0053

## Setup

Existing runners, no new configuration: vitest 5.1 (`vitest.config.mjs`, project `main`) and Playwright 1.65 driving the built Electron app (`tests/e2e`).

## Run this work's tests

US-0053, the planning sync (real git repos in the OS temp folder, removed after each test):

```bash
npx vitest run tests/main/planningSync.test.js
```

US-0051, the built-app layout test (build first, so `out/main/index.js` is current):

```bash
npm run build
```

```bash
npx playwright test tests/e2e/speckitLayout.spec.js
```

## Expected coverage

The 80% line floor is project-wide; Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`). These scoped runs do not judge it.

## Mocking and test data

- Planning sync: no mocks; a bare `origin.git` and a clone from the file's own `setup()`. "Committed outside the app" is a plain `git commit` + `git push` in the clone; offline is `online: () => false`.
- Layout: the spec's own temp Spec Kit project with stand-in tools; widths set with `BrowserWindow.setSize`.
