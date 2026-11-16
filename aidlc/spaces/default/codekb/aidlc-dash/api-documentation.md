# API Documentation

The app has no network API. Its surfaces are listed below.

## 1. Preload Bridge (`window.bridge`, `src/preload/index.js`)

Every member is named; no generic `invoke` or `send` is exposed. The groups:

| Group | Members (selection) |
|---|---|
| Project | `pickProject`, `openProject`, `closeProject`, `getSpaces`, `getIntents(projectId, space, onlyDirs)`, `getIntent(projectId, space, dirName)`, `getCost`, `getTokenReadings`, `getModels`, `detectHarnesses`, `onProjectChanged`, `onProjectDetected`, `onWatchError` |
| Files and editor | `readFile`, `readFileForEdit`, `writeFile` (hash-checked), `watchOpenFiles`, `listTree`, `onFileChanged`, `revealInFinder`, `openInEditor`, `pathForFile` |
| Terminal | `ptySpawn`, `ptyWrite`, `ptyResize`, `ptyKill`, `onPtyData`, `onPtyExit` |
| Git (read-only) | `getGitStatus`, `gitFetch`, `getRemoteChanges`, `showRemoteFile`, `getConflicts`, `onGitHeadChanged` |
| AI-DLC config | `getAidlcConfig`, `getWorkingAgents`, `previewConfigChange`/`applyConfigChange`, `previewGuardLock`/`applyGuardLock`, plans (`listPlans`, `getPlanStages`, `savePlan`, `previewPlanEdit`, `applyPlanEdit`, `deletePlan`), models (`getModelOptions`, `previewModelChange`, `applyModelChange`, `checkModels`), `onConfigChanged` |
| Setup and tools | `getSetupInfo`, `runSetup`, `getTools`, `pickTool`, `saveTool`, `resetTool`, `getAidlcUpdateStatus`, `getAidlcProjectPlans` |
| Feature docs | `loadFeatures`, `getStoryLinks`, `setStoryRelease`, `createRelease`, `deleteRelease`, `getLifecycleRuleStatus`, `onFeaturesChanged` |
| Settings and app | `getSettings`, `setSettings`, `getLanguage`, `getProjectSettings`, `setProjectSettings`, `getAppInfo`, `openExternal(key)`, `openLicenses`, `toggleFullscreen`, `sendMenuState`, `onMenuCommand`, `openDocsUrl` |
| Updates | `checkUpdate`, `downloadUpdate`, `installUpdate`, `relaunchApp`, `skipUpdate`, `revealUpdate`, `onUpdateState` |
| Questions | `listQuestions`, `onQuestions`, `setActiveProject` |
| Agent dialogs | `agentEvents.{list, answer, close, latest, reopen, onChanged, onFocus}`, `agentHooks.{status, preview, apply, cancel, onChanged}` |

## 2. IPC Channels (`src/main/ipc.js`)

There are 76 `ipcMain.handle` channels, named `<area>:<verb>`, plus the agent handlers from `agentIpc.js` and `hooksHandlers()`. Every handler validates `projectId` through `project(projectId)`, and `projectService` validates names (`assertName`: no `/`, `\` or leading `.`).

Push channels (main to renderer):

| Channel | Payload | Sent when |
|---|---|---|
| `project:changed` | `{projectId, space, dirNames[], indexChanged, costChanged}` | the debounced intents or ledger watch fires |
| `project:watchError` | `{projectId, message}` | the watcher fails |
| `config:changed` | `{projectId}` | config files, plan folders or `aidlc/.aidlc-subagent-inflight` change |
| `features:changed`, `git:headChanged` | `{projectId}` | the feature docs or `.git/HEAD` change |
| `pty:data`, `pty:exit` | session id, data or code | terminal output |
| `agent-events:changed`, `agent-events:focus`, `agent-hooks:changed`, `questions:changed`, `update:state`, `menu:command` | various | the agent dialogs, questions, the updater, the menu |

### `project:intent`, the intent detail (US-0507's input)

`loadIntentDetail(root, space, dirName)` returns:

```
{ dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale? }
graph = { workflowId, scope, startedAt, stages[{slug, agent, startedAt, completedAt, outcome, durationMs,
          unitsApproved, unitsSeen, sensorFirings}], boltDag: {units[{name, kind, dependsOn[]}], batches[[name]]} | null }
units = { [unitName]: 'pending' | 'running' | 'done' } | null
events[] = { timestamp, timeMs, event, title, fields{}, source, index, key, seq, category }
```

### `agents:working`

The agents of the active intent: `[{agent, name, startedMs, stage, intent}]`. It is empty when the inflight file is missing.

## 3. External Commands (through `runFixed`, no shell)

- **`aidlc`**: `--version`, `config <section> --show --json --harness <id>`, `config … --dry-run`, `config --harness <id> --yes`, `engine config set`, `config flags`, `config models`, `engine scope save`, `engine graph compile`, `update --check`.
- **`git`**: `fetch`, `rev-parse`, `rev-list`, `diff`, `status`, `show <remote>:<path>`, `tag --list`, `ls-files`, `init` (setup only). There is no `log` call today.
- **`gh`**: release lookup for the updater (fallback only).

## 4. AI-DLC Files Read (contracts the app depends on)

| File | Parser | Fields used |
|---|---|---|
| `aidlc/spaces/<s>/intents/intents.json` | `parsers/intents.js` | `dirName`, `slug`, `scope`, `status`, `uuid` |
| `<intent>/aidlc-state.md` | `parsers/state.js` | Project Information, Scope Configuration, Current Status, stage checkboxes |
| `<intent>/runtime-graph.json` | `parsers/runtimeGraph.js` | `stages[].{stage_slug, agent, started_at, completed_at, outcome, instances[], sensor_firings}`, `bolt_dag.{units, batches}` |
| `<intent>/audit/*.md` | `parsers/audit.js` | `## Title` blocks with `**Key**: value` fields, separated by `---` |
| `<intent>/.aidlc-engine/active-directive.json` | none | `kind`, `stage`, `delivery` |
| `aidlc/.aidlc-sessions/usage-ledger.json` | `parsers/ledger.js` | schemaVersion 3 `usd` and token entries |
| `aidlc/.aidlc-subagent-inflight` | `projectService.inflightCount` | `entries[]` length |

The audit events US-0507 needs carry these fields (seen in `261114-agent-dialogs`):
- `WORKTREE_CREATED`: `Bolt slug`, `Worktree path`, `Branch name`, `Swarm Stage`;
- `BOLT_STARTED` and `BOLT_COMPLETED`: `Bolt slug`;
- `REVIEW_REQUESTED`: `Stage`, `Reviewer`, `Unit?`, `Iteration`, `Review File`;
- `REVIEW_COMPLETED`: the same plus `Verdict` (`READY`/`NOT-READY`) and `Review Record`;
- `UNIT_COMPLETED`: `Stage`, `Unit`.

The review record JSON has `findings[].severity` (for example `Major`, `Minor`).
