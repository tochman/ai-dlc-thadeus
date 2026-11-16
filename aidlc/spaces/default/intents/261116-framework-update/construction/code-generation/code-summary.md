# Code Summary: US-0504, update the AI-DLC framework from the console

## What was built

- **`src/main/aidlcUpdate.js`** (new): `readUpdateCheck`, `checkProgram` (30 s bound, never throws, exit 5 read from the error), `readProjectPlan` (drops `preserve`, conflicts apart), `projectPlan` (fixed `--dry-run --json` arguments, table harness ids only, absolute root), `programCommand`, `projectCommand`.
- **`src/main/exec.js`**: `defaultExec` keeps stdout on a non-zero exit's error, so exit 5 from `update --check` can be read.
- **`src/main/ipc.js`**: `startAidlcCheck` (cached, `force` runs again), IPC `aidlc:updateStatus(force)` and `aidlc:projectPlans(projectId)` (one dry run per installed harness; a failure comes back as that line's `error`).
- **`src/main/index.js`**: the program check starts after the first window's `did-finish-load`.
- **`src/preload/index.js`**: `getAidlcUpdateStatus`, `getAidlcProjectPlans`.
- **`src/renderer/workflowBusy.js`** (new): `isWorkflowRunning` and `useWorkflowRunning`. RefreshPanel uses it and no longer has its own copy of the rule.
- **`src/renderer/AidlcUpdate.jsx`** (new): the program card and the project card (one line per harness) under the tool cards in Settings › Tools.
- **`SettingsView.jsx`, `App.jsx`, `ProjectView.jsx`**: Settings sits outside every project's `TerminalProvider`. App therefore hands it a small terminal for the active project: `type` sends a `terminalCommand` of kind `type`, Settings closes and ProjectView types into the shell tab without Enter, and `anyBusy` reads the project's `busy` meta. ProjectView also reports `lastIntentChangeAt` in the meta.
- **Locales**: an `aidlcUpdate.*` block in `sv.json` and `en.json`. **`theme.css`**: two small rules.

## Decisions to note

- The update buttons are disabled when no project is open, because there is no shell tab to type into. The card then says "Open a project…".
- The program update button stays enabled when the program is up to date, so the person can still run it. It is disabled only while a workflow runs.
- Timeouts say "timed out after 30 s" (a new key). The shared `errors.timeout` says 10 s.

## Tests

- New: `tests/main/aidlcUpdate.test.js` (10) and `tests/renderer/AidlcUpdate.test.jsx` (5). Extended: `tests/main/index.test.js` (the start-up check runs after load) and the `SettingsView.test.jsx` bridge stub.
- Full suite: 110 files and 1415 tests pass (baseline 108 files, 1400 tests). ESLint gives 0 errors; all of its warnings were already there. Prettier is clean, and `electron-vite build` passes.
