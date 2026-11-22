# Code Structure

## Layout

```
src/
  main/            Electron main process (41+ modules, plus parsers/ and platforms/)
    parsers/       pure parsers: audit, state, runtimeGraph, pipeline, intents, units, ledger, features, releases, auditCost, agentProgress, velocity
    platforms/     GitHub, GitLab and Bitbucket pull-request readers (US-1201)
    agent*.js      agent dialogs (US-0506), the handoff signals (US-0213), activity (US-0214) and agent progress (US-0507)
    planning*.js   the release planning record and its commit and push cycle (US-0606, US-0607)
    costRules.js   the THADEUS cost rule pack (US-0212)
  preload/index.js window.bridge (188 lines at `90031e2`)
  renderer/        React views and helpers, editor/ subfolder, theme.css, pure helpers (*.js)
  shared/          pure modules for both sides (incl. configTables.js, costRules.js, agentActivity.js); locales/sv.json, en.json
scripts/           build and CI helpers
.thadeus/hooks/    dialog.sh, the hook script the app installs into projects
tests/main, tests/renderer, tests/helpers, tests/fixtures
docs/              FEATURES.md, features/epic-*.md, releases/, screenshots/
build/             icon sources
```

The module and test counts are from `2b5d6a4`. The `90031e2` run (EPIC-14) read the detection, watcher, settings, IPC, terminal-command and token-log area (see `reverse-engineering-timestamp.md`); everything else is from earlier scans.

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `src/main/ipc.js`, `src/main/agentIpc.js`, `src/preload/index.js`, `src/main/menu.js` |
| Service/UseCase | `projectService.js`, `features.js`, `releases.js`, `planningSync.js`, `teamActivity.js`, `agentProgress.js`, `setup.js`, `plans.js`, `modelChoice.js`, `aidlcWrite.js`, `aidlcConfig.js`, `aidlcUpdate.js`, `costRules.js`, `updater.js`, `notify.js`, `agentEvents.js`, `agentPermissions.js`, `agentReplies.js`, `agentHooks.js` |
| Repository/DAO | `projectAccess.js` (read), `fileWrite.js` (write), `planningRecord.js`, `settings.js`, `tokenReadings.js`, `usageSnapshot.js`, `credentials.js`, `git.js`, `models.js` |
| Model/Parser | `src/main/parsers/*`, `questions.js`, `agentAdapters.js`, `src/shared/agentActivity.js` |
| Utility | `exec.js`, `tools.js`, `harness.js`, `watcher.js`, `pty.js`, `agentChannel.js`, `agentTiming.js`, `src/shared/*`, renderer `format.js`, `tooltipPlacement.js`, `terminalControl.js`, `picker.js`, `tokenFlow.js`, `tokenChart.js`, `storyFilter.js`, `workflowBusy.js`, `tokens.js` |
| View | `src/renderer/*.jsx`, `src/renderer/editor/*` |
| Configuration | `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc`, `.github/workflows/release.yml` |
| Static/Asset | `theme.css`, `index.html`, `build/`, `locales/*.json`, `.thadeus/hooks/dialog.sh` (shipped as text) |
| Test | `tests/**` |

## Code Patterns

- **Header comments name the story and requirement** (`US-0209 FR1.4`). Exported functions carry JSDoc.
- **Pure first**: parsers and helpers take parsed values and return plain objects, and are tested directly.
- **Never-throw readers** (`readJsonSafe` returns `{ok, missing, error}`), with the last good value in module-level caches.
- **Fixed CLI commands from tables**: the renderer sends a small change object. Main refuses unknown fields and values before anything runs. Commands come in pairs: `--yes` and `--dry-run`.
- **Results as values**: `run()` and `apply()` return `{ok, command, output}` or `{ok: false, command, error}`. Planning returns `{ok, inPlace, error?}`, `{conflict: rel}`, or a cycle result `{reapplied, pending, pushed?, noRemote?, merged?, prOffer?, error?: {kind, reason?, files?}}`.
- **Exec**: `runFixed(file, args[], {cwd, timeout, exec, env, maxBuffer})` uses execFile with no shell and the login-shell PATH. `exec` is injectable, so the tests run no real CLI. `planningSync.test.js` runs real git instead, against a local bare origin.
- **Hash-checked, atomic writes**: `writeFileSafe(root, rel, content, {expectMtime, expectHash})` compares the mtime first, then the sha256. A mismatch is `{conflict: true, disk}`. `writeAtomic` writes a temp file, then renames it. `releases.js` passes only `expectHash`, so it always hashes.
- **Serialised work**:
  - `serial(root, fn)` chains one planning operation per root in the process.
  - `planningRecord.update` has one write queue for all roots.
  - `settings.update()` queues writes too.
- **Per-project state in `ipc.js`**: the `projects` map holds the root, space, watchers (`watcher`, `featuresWatcher` with `featuresKey`), sender, `intentChangedAt`, cached `harnesses`, `models` and `modelOptions`, pending previews and `questions`.
- **Baseline then alert**: `refreshQuestions` adds every id of a project's first computation to `startedWith`. Only ids that appear after it alert.
- **Hook events**: the shell hook copies, the pure adapter reads, the store decides.
- **Settings**: `sanitize`/`sanitizeProject` keep known keys only. `settingsNow()` is a synchronous copy for main.
- **i18n**: every user text goes through `t()`. `tests/main/i18nKeys.test.js` checks that the key sets match. Planning keys are under `features.planning.*` and `features.release.*`.
- **`data-testid`** is `<component>-<role>` in kebab-case (`planning-sync`, `planning-pending`, `planning-push-now`, `planning-error`, `releases-add-story`, `releases-remove-story`, `features-view-release-picker`). Deliberate shortcuts carry a `ponytail:` comment naming the ceiling.
- **Views**:
  - A project view is a `view === '<id>'` branch in `ProjectView.jsx`, with an `ArmBlock` in `App.jsx`.
  - Configuration sections come from `PROJECT_SECTIONS` in `ProjectSettingsView.jsx`.
  - A settings section is a `<form>` with `Section`, `RadioBlocks` and `useSectionSave`.
- **LCARS primitives** live in `Lcars.jsx`. Tooltips go only through `Tooltip.jsx`.

## Where EPIC-14 Lands (read at `90031e2`)

The assumption map is in `architecture.md`; the blast radius per file is in `dependencies.md`. By layer:
- **Detection and the value**: `projectService.detectProject` gains `.specify/` (and `.specify/feature.json`). The app's framework value is kept in a repo file the app writes after a confirm (US-1408). The app's own files already live in `.thadeus/`, written with `resolveInRoot` and `writeAtomic` as `tokenReadings.recordReading` does. `settings.sanitizeProject` keeps the per-machine settings.
- **Main wiring**: `ipc.js` `project:open` chooses a Spec Kit watcher (`specs/`, `.specify/`) beside `watchSpace` and `watchForSetup`, and gives it a push such as `project:changed`. `watchForAidlc` learns `.specify/`. `refreshQuestions`, `agents:*` and `tokens:readings` get a Spec Kit branch or an explicit "nothing known" answer.
- **New pure parsers** (the pattern of `parsers/state.js` and `audit.js`):
  - `specs/<n>-<name>/` folders, with `feature.json` naming the active one;
  - `tasks.md` (phase headings, `- [ ] T001 [P] [US1] …`), and flow steps worked out from which files exist;
  - `extensions.yml`, for which no YAML library is installed.
- **Setup**: `setup.js` has the preview, then apply, pattern (`getSetupInfo`, `runSetup` with `runFixed` and fixed arrays). `specify init --integration <claude|opencode>` follows it. `tools.js` needs a `specify` tool id.
- **Commands**: `shared/harnesses.js` `commands` gains a Spec Kit family per harness beside `aidlc`, plus a helper like `harnessCommand`. `ResumeButton.jsx` and `TerminalPanel.jsx` `QUICK_COMMANDS` pick the family from the framework.
- **Renderer**: `App.jsx` and `ProjectView.jsx` swap `isAidlc` for the framework, with one shared view table. They add Spec Kit blocks (features, constitution) as `ArmBlock`s and `view === '<id>'` branches, a `useSpecKit` hook like `useProject`, and a framework choice and switch (US-1406, US-1407) as LCARS dialogs, not `window.confirm`.
- **Locales**: new keys in both `sv.json` and `en.json` (`i18nKeys.test.js`).

## Where US-0608 Landed (kept from `39a3dbf`, not re-verified)

- `src/main/planningRecord.js`: a new kind for a file change that cannot be replayed (`{rel, baseHash, content}`), or kinds for the other edits (markers, criteria, new story). It needs a write queue per project, and a way to tell a story's own change from another one.
- `src/main/planningSync.js`:
  - apply and commit the new kinds;
  - group a short window into one commit (`subjectOf` already joins releases);
  - keep the non-story changes out of the story's tree;
  - on a conflict, keep both versions.
- `src/main/ipc.js`:
  - record a change in `file:write` (`:1008`) and in the docs watcher (`syncFeaturesWatch`, `:308`);
  - push the planning status to the renderer after every cycle (`planning.run`, `:568`);
  - make `planningStatus` carry per-change detail (stories, target).
- `src/main/fileWrite.js`: likely no change; the caller records first. `writeAtomic` is already shared.
- `src/renderer/FeaturesView.jsx` and `useFeatures.js`:
  - a live, always-visible waiting list (stories, target, Push now);
  - lock writes until the result's own reload, not any reload;
  - ignore out-of-order `loadFeatures` replies;
  - give `ReleasePicker` the same lock.
- `src/preload/index.js`: an `onPlanningStatus` subscription, if the status is pushed.
- `src/shared/locales/{sv,en}.json`: new `features.planning.*` keys.
- Tests: `tests/main/planningSync.test.js`, `planningRecord.test.js`, `tests/renderer/FeaturesView.test.jsx`, `useFeatures.test.jsx`; new end-to-end tests (Playwright `_electron`), plus `package.json` and the `verify` job.

## Where US-0030 Landed (kept from `0ebb196`, not re-verified)

`src/main/agentEvents.js` (`KIND_ACTIVITY`/`feedActivity`), `src/shared/agentActivity.js` (clearing waits, last-seen time, bounded task and description), `src/main/agentAdapters.js` (`tool_input.description`), `src/renderer/AgentProgress.jsx` (join hook and audit rows), both locale files and their tests.

## Where US-0210 Landed (kept, not re-verified)

`modelChoice.js` (a `from` field), `settings.js` (the critical and economy profile fields), `ipc.js` (a check in `watchSpace`'s `onChange` with a baseline), `preload/index.js`, `ProjectSettingsView.jsx`, an LCARS question dialog, and both locale files.
