# Unit Test Instructions: US-0050

## Setup

Existing runners: vitest 5.1 (projects `main` and `renderer`, jsdom, Swedish locale) and Playwright 1.65 on the built Electron app. No new configuration.

## Run this work's tests

Shared motion and the hook:

```bash
npx vitest run tests/main/theme.test.js tests/renderer/Lcars.test.jsx
```

The views (only the files this work touches, for example):

```bash
npx vitest run tests/renderer/IntentList.test.jsx tests/renderer/IntentDetail.test.jsx tests/renderer/DiagonalViews.test.jsx tests/renderer/TokenDetail.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/AgentDialog.test.jsx
```

Add each other touched view's own test file to that command (Spec Kit, GitHub, Timeline, StoryComments, Plans, FileTree, CostPanel).

Built app (build first):

```bash
npm run build
```

```bash
npx playwright test tests/e2e/motion.spec.js
```

## Expected coverage

The 80% line floor is project-wide; Build and Test checks it on the full suite. These scoped runs do not judge it.

## Mocking and test data

- Motion mode: set `document.documentElement.dataset.motion` to `full`, `reduced` or `off`; use fake timers for the 600 ms and 1,000 ms windows (the `useEntrance` tests in `Lcars.test.jsx` are the pattern).
- The built-app test writes a temp project with 25 intents and 2,000 timeline audit events, with stand-in tools (the `speckitLayout.spec.js` pattern).
