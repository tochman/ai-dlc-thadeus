# Unit Test Instructions: US-0048

## Setup

vitest 5.1.0 (`renderer` project, jsdom, Swedish locale) and Playwright 1.65 (Electron's Chromium) are already set up. jsdom does not load `theme.css`, so the layout tests run in the built app.

## Run these tests

```bash
npx vitest run --project renderer tests/renderer/SpeckitFeatures.test.jsx tests/renderer/AppShell.test.jsx
```

```bash
npx electron-vite build
```

```bash
npx playwright test tests/e2e/speckitLayout.spec.js
```

## Expected coverage

The project floor is 80% line coverage over `src/**`. Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`); these commands do not judge it, and the threshold is never lowered.

## Mocks and test data

The renderer tests use the files' own bridge mocks. The end-to-end test writes a Spec Kit project (`.specify/`, `specs/`, `.thadeus/project.json`) and the app's settings in a temporary folder, with tool paths that point nowhere, so no agent starts, and removes them afterwards.
