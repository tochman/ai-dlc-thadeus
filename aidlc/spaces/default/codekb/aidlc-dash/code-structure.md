# Code Structure

## Layout

```
src/
  main/            Electron main process (39 modules, plus parsers/ and platforms/)
    parsers/       pure parsers: audit, state, runtimeGraph, pipeline, intents, units, ledger, features, releases, auditCost, agentProgress
    platforms/     GitHub, GitLab and Bitbucket pull-request readers (US-1201)
    agent*.js      agent dialogs (US-0506) and agent progress (US-0507)
  preload/index.js window.bridge
  renderer/        React views and helpers (56 files), editor/ subfolder (6), theme.css (1429 lines), pure helpers (*.js)
  shared/          pure modules for both sides; locales/sv.json, en.json (1334 lines each)
scripts/           build and CI helpers
.thadeus/hooks/    dialog.sh, the hook script the app installs into projects
tests/main (82 files), tests/renderer (48 files), tests/helpers, tests/fixtures
docs/              FEATURES.md, features/epic-*.md, releases/, screenshots/
build/             icon sources
```

The counts are at `bbfb4c0`. Files outside `src/main/parsers/`, the scanned main modules and `src/renderer/` were only listed in this run.

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `src/main/ipc.js`, `src/main/agentIpc.js`, `src/preload/index.js`, `src/main/menu.js` |
| Service/UseCase | `projectService.js`, `features.js`, `releases.js`, `teamActivity.js`, `agentProgress.js`, `setup.js`, `plans.js`, `modelChoice.js`, `aidlcWrite.js`, `aidlcConfig.js`, `aidlcUpdate.js`, `updater.js`, `notify.js`, `agentEvents.js`, `agentPermissions.js`, `agentReplies.js`, `agentHooks.js` |
| Repository/DAO | `projectAccess.js` (read), `fileWrite.js` (write), `settings.js`, `tokenReadings.js`, `usageSnapshot.js`, `credentials.js`, `git.js`, `models.js` |
| Model/Parser | `src/main/parsers/*`, `questions.js`, `agentAdapters.js` |
| Utility | `exec.js`, `tools.js`, `harness.js`, `watcher.js`, `pty.js`, `agentChannel.js`, `agentTiming.js`, `src/shared/*`, renderer `format.js`, `tooltipPlacement.js`, `terminalControl.js`, `picker.js`, `tokenFlow.js`, `tokenChart.js`, `storyFilter.js`, `workflowBusy.js`, `tokens.js` |
| View | `src/renderer/*.jsx`, `src/renderer/editor/*` |
| Configuration | `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc` |
| Static/Asset | `theme.css`, `index.html`, `build/`, `locales/*.json` |
| Test | `tests/**` |

## Code Patterns

- **Header comments name the story and requirement** (`US-0209 FR1.4`). Exported functions carry JSDoc.
- **Pure first**: parsers and helpers take parsed values and return plain objects, and are tested directly. Exception: `parsers/agentProgress.js` imports `workingAgents` from `projectService.js`.
- **Never-throw readers** (`readJsonSafe` returns `{ok, missing, error}`), with the last good value kept in module-level caches. `loadFeatures` returns `{available: false, reason}` and per-epic `warnings` instead of throwing.
- **Events are one shape**: `{timestamp, timeMs, event, title, fields, source, index, key, seq, category}`, in time order. `timeMs` is inherited from the previous block when a block has no valid timestamp. Every consumer (`workingAgents`, `progressRows`, `stageRollups`, `pendingQuestions`, `unitStatuses`) walks them once in order and keys on `fields.Stage`.
- **Fixed commands**: `runFixed(cmd, args[])` with execFile, no shell, a timeout and the login-shell PATH; `safeArg` for values in git arguments.
- **i18n**: every user text goes through `t()`. Components use `useTranslation()`; modules outside a hook import `t` from `src/shared/i18n.js`. `tests/main/i18nKeys.test.js` checks that the key sets match.
- **`data-testid`** is `<component>-<role>` in kebab-case. Deliberate shortcuts carry a `ponytail:` comment naming the ceiling.
- **Views**: a project view is a `view === '<id>'` branch in `ProjectView.jsx`, with an `ArmBlock` (and optional `ArmSubtabs`) in `App.jsx`. Intent-level views are a `TABS` entry in `IntentDetail.jsx`.
- **LCARS primitives** live in `Lcars.jsx` (`Bar`, `Frame`, `Hairlines`, `Dots`, `Readout`). Tooltips only through `Tooltip.jsx`; native `title=` fails `tests/renderer/noNativeTitle.test.jsx`. Charts are plain SVG (`CostPanel`'s `CostChart`) or `@visx/*` (`TokenDetail`).
- **Formats**: `format.js` has `formatDuration(ms)`, `formatTime(iso)`, `stageTitle(slug)` and the status labels.

## Where US-0303 Lands

- A pure metrics module (a new parser beside `parsers/audit.js`) over the merged events, the parsed state and the stories.
- A loader for all intents in `projectService.js`, following `loadCrossMachineCost`, and one IPC handler plus one bridge member.
- `git.js`: a new fixed `git log` call for the history of the epic files (dates when a story's marker changed).
- The view: a new project view (`ProjectView.jsx` plus an `App.jsx` arm block), or a section beside `CostPanel`; for one intent, perhaps a tab in `IntentDetail.jsx`. Requirements decides.
- `src/shared/locales/{sv,en}.json`: new keys in both files.
- Tests: `tests/main/` for the metrics and the git parser; `tests/renderer/` for the view.
