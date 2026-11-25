# Unit Test Instructions: archive and unarchive an intent (US-0513)

## Setup

Vitest 5.1.0 is set up (`vitest.config.mjs`, projects `main`, `scripts`, `renderer`). Nothing is installed. `tests/main/archiveCommit.test.js` uses real git repositories in temporary folders, so it joins the `TIMED` list and runs in `scripts`.

## Run

Before the first test (Step 1), on the existing files:

```bash
npx vitest run tests/main/parsers.test.js tests/main/projectService.test.js tests/main/velocity.test.js tests/main/velocityLoad.test.js tests/main/tokenHistory.test.js tests/main/intentPark.test.js tests/main/planningSync.test.js tests/main/ipc.test.js tests/main/pty.test.js tests/main/preload.test.js tests/main/featureDocsStatus.test.js tests/main/i18nKeys.test.js tests/renderer/ResumeButton.test.jsx tests/renderer/RefreshPanel.test.jsx tests/renderer/useProject.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/Lcars.test.jsx tests/renderer/IntentDetail.test.jsx tests/renderer/IntentList.test.jsx
```

This unit's new files, once they exist:

```bash
npx vitest run tests/main/intentArchiveRules.test.js tests/main/intentArchive.test.js tests/main/archiveCommit.test.js tests/renderer/ArchiveDialog.test.jsx tests/renderer/ArchiveControls.test.jsx
```

Both commands together are the unit's run. During a step, run only that step's files.

## Coverage

The project's 80% line floor is measured by Build and Test on the full suite, not here. The floor is never changed. Each new file in `src/` should hold 80% on its own.

## Mocks and test data

- AI-DLC never runs: `exec` is injected, as `fakeExec` in `intentPark.test.js` does, and can write fixture files to stand in for the command.
- Git is real only in `archiveCommit.test.js` and `planningSync.test.js`, in temporary folders with a local user name and a bare repository as origin. Network, `gh` and `net.isOnline` are injected.
- `ipc.test.js` keeps its module mocks; add `intentArchive.js` and `archiveCommit.js` there.
- Renderer tests mock `window.bridge` and use the Swedish locale. Times use a fixed `now`.
- Fixtures are AI-DLC's own shapes: `status: "archived"` in `intents.json`; `- **Status**: Archived` and `- **Archived From**: Completed` (or `Running`) under `## Current Status`; `WORKFLOW_ARCHIVED` and `WORKFLOW_UNARCHIVED` in the audit. No real project's files are used.
