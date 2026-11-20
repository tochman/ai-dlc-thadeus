# Unit Test Instructions: U1 u1-framework-views

- **Framework:** vitest 5.1.0, with the existing `vitest.config.mjs` projects `main` (node) and `renderer` (jsdom, Swedish locale). There is no new configuration.
- **This Unit's tests:** run this command before Step 3 and after every Green step.

  ```
  npx vitest run tests/main/frameworkViews.test.js tests/main/projectService.test.js tests/main/harness.test.js tests/main/menu.test.js tests/renderer/AppShell.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/SpeckitShell.test.jsx
  ```

  Before `frameworkViews.test.js` and `SpeckitShell.test.jsx` exist, the same command without those two files is the runner check.
- **Volume:** 5–8 tests per component: the views table, detection, harness markers, menu, IPC open and watcher, App, ProjectView and SpeckitShell.
- **Coverage:** at least 80% line coverage for the new and changed files, checked with `--coverage` in the full run (Step 18).
- **Mocking:** detection tests use temp-dir fixtures, created per test and removed after, never mocks of `fs`. Renderer tests pass a Detection object through the existing bridge stub used by `AppShell.test.jsx`.
- **Test data:** fixture folders hold only `aidlc/spaces/<name>/` and `.specify/memory/constitution.md` placeholders. Nothing is read from this repo's own `aidlc/`.
