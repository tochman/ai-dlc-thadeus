# Unit Test Instructions: change the plan of an intent that has started (US-0509)

## Setup

Vitest 5.1.0 (`vitest.config.mjs`, projects `main`, `scripts`, `renderer`) and Playwright 1.65 are set up. Nothing is installed or configured.

## Run

Before the first test (Step 1), on the existing files:

```bash
npx vitest run tests/main/parsers.test.js tests/main/projectService.test.js tests/main/plans.test.js tests/main/i18nKeys.test.js tests/renderer/Pipeline.test.jsx tests/renderer/IntentDetail.test.jsx tests/renderer/IntentList.test.jsx tests/renderer/ResumeButton.test.jsx tests/renderer/PlansView.test.jsx tests/renderer/ArchiveControls.test.jsx tests/renderer/noNativeTitle.test.jsx
```

This unit's new files, once they exist:

```bash
npx vitest run tests/main/planChange.test.js tests/renderer/PlanChange.test.jsx
```

Both together are the unit's run. During a step, run only that step's files.

The built app (Step 12), as two commands:

```bash
npx electron-vite build
```

```bash
npx playwright test tests/e2e/intentLayout.spec.js
```

## Coverage

The project's 80% line floor is measured by Build and Test on the full suite, not here. The floor is never changed. Each new file in `src/` should hold 80% on its own.

## Mocks and test data

- `planChange.test.js` uses plain pipeline objects, no files.
- `projectService.test.js` uses temporary folders, as today.
- Renderer tests mock `useTerminal` as `ArchiveControls.test.jsx` does (with `harness`, `type` and `sequence`), mock `window.bridge.listPlans` and `getPlanStages`, and use the Swedish locale through `t()`.
- The focus order is tested with a `type` double that focuses an element.
- The Playwright test uses its own copy of the fixture project, with plans added under `aidlc/scopes` and the audit log's time set back. Tool paths point nowhere, so no agent starts. AI-DLC and git never run against a real project.
