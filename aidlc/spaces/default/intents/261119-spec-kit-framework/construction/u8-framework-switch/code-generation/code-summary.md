# Code Summary: U8 u8-framework-switch (US-1407)

The code is in the git worktree `/Users/thomasochman/Projects/aidlc-dash-US-1407`, on branch `feat/US-1407`, made from `main` at 94998c5. Nothing is committed yet. Paths below are relative to that worktree.

## What was built

- `src/main/frameworkSwitch.js` (new):
  - `switchTarget(from, to)` refuses anything but the other framework before any file access (BR8.1, NFR3.5).
  - `switchPreview(root, from, to)` gives `setupNeeded`, `keeps` (fixed folder names), `inProgress` and an additive `unread`. The open intents come through `inProgress()` from every space, and the features are those with open tasks. Each list read is guarded on its own, and the function only reads (BR8.2, BR8.3, NFR3.4).
  - `switchFramework(root, to)` checks the target folder again, then writes once through U2's `writeProjectFile`. When the detection after the write fails, the write is kept and the reply is `{ ok: true, detection: null }` (BR8.4, BR8.5). The module imports no runner (NFR4.5).
- `src/main/ipc.js`:
  - `applyDetection` closes only the old framework's watcher (and any setup watcher), starts the new one and sends `project:detected`. `watchForSetup` now calls it.
  - The new handlers `project:switchPreview` and `project:switch` take their root from the open-project record. Calls to `project:switch` are serialised through `p.switching` (NFR3.6, NFR7.4, NFR7.5).
- `src/preload/index.js`: adds `switchPreview` and `switchFramework`.
- `src/shared/frameworkViews.js`: a `framework` section for AI-DLC and Spec Kit projects, not for a folder with no framework.
- `src/renderer/FrameworkSection.jsx` (new), with `SwitchPreview` inside: the states `idle | preview | setup | writing | failed`, the test ids from `frontend-components.md` plus `framework-switch-setup`, `-unread`, `-close` and `-reopen`. The setup step mounts the existing `SetupAidlc` or `SetupSpeckit` unchanged, and `onApplied` triggers the write. It is mounted in `ProjectView.jsx`, with LCARS styles in `theme.css`, and `framework.*` and `settings.project.sections.framework` keys in `sv.json` and `en.json`.

## Deviations from the plan

- **A failed setup.** It does not move the section to `failed` on its own. The setup panels have no failure callback, and the plan does not touch them. The panel stays up with its own output (BR8.4), and the section's Cancel then shows `framework-switch-error` ("stays on X"). No write follows either way.
- **Props and signature.** `FrameworkSection` takes `{ project, harness, harnesses }` instead of `{ projectId, framework, harness }`, because `SetupAidlc` needs the project and the detected harnesses. `switchTarget` takes `(from, to)`. The project-id check stays in `ipc.js` (`project()`).
- **Two more test files changed.** `tests/main/frameworkViews.test.js` and `tests/renderer/AppShell.test.jsx` pinned the old section lists, and now include `framework`.

## Tests

Test first, in three Red runs: a missing module for the main and timed tests, a missing handler for the 7 IPC tests, and a missing module plus 1 ProjectView failure for the renderer. Final results: main 113 passed, scripts 1 passed, renderer 31 passed. The runs touching shared code also passed: `frameworkViews`, `preload`, `AppShell`, `SetupAidlc`, `SetupSpeckit` and `featureDocsStatus`. ESLint and Prettier are clean on the changed files. Coverage is measured at Build and Test.
