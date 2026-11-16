# API Documentation

The app has no network API. Its surfaces are listed below. US-0303 will add one IPC channel and one bridge member (in design) and one fixed git command.

## 1. Preload Bridge (`window.bridge`, `src/preload/index.js`)

Every member is named; no generic `invoke` or `send` is exposed. The groups (from the earlier scans; the preload was skimmed in this run):

| Group | Members (selection) |
|---|---|
| Project | `pickProject`, `openProject`, `closeProject`, `getSpaces`, `getIntents(projectId, space, onlyDirs)`, `getIntent(projectId, space, dirName)`, `getCost(projectId, space)`, `getTokenReadings`, `getAgentProgress`, `getModels`, `detectHarnesses`, `onProjectChanged`, `onProjectDetected`, `onWatchError` |
| Files and editor | `readFile`, `readFileForEdit`, `writeFile` (hash-checked), `watchOpenFiles`, `listTree`, `onFileChanged`, `revealInFinder`, `openInEditor`, `pathForFile` |
| Terminal | `ptySpawn`, `ptyWrite`, `ptyResize`, `ptyKill`, `onPtyData`, `onPtyExit` |
| Git (read-only) | `getGitStatus`, `gitFetch`, `getRemoteChanges`, `showRemoteFile`, `getConflicts`, `onGitHeadChanged` |
| Team (US-1201) | platform, pulls, collisions, machines, comments, merge note |
| AI-DLC config | `getAidlcConfig`, `getWorkingAgents`, config, guard lock, plans and models preview/apply, `onConfigChanged` |
| Setup and tools | `getSetupInfo`, `runSetup`, `getTools`, `pickTool`, `saveTool`, `resetTool`, `getAidlcUpdateStatus`, `getAidlcProjectPlans` |
| Feature docs | `loadFeatures`, `getStoryLinks`, `setStoryRelease`, `createRelease`, `deleteRelease`, `getLifecycleRuleStatus`, `onFeaturesChanged` |
| Settings and app | `getSettings`, `setSettings`, `getLanguage`, `getProjectSettings`, `setProjectSettings`, `getAppInfo`, `openExternal(key)`, `openLicenses`, `toggleFullscreen`, `sendMenuState`, `onMenuCommand`, `openDocsUrl` |
| Updates | `checkUpdate`, `downloadUpdate`, `installUpdate`, `relaunchApp`, `skipUpdate`, `revealUpdate`, `onUpdateState` |
| Questions, agent dialogs | `listQuestions`, `onQuestions`, `setActiveProject`; `agentEvents.*`, `agentHooks.*` |

## 2. IPC Channels (`src/main/ipc.js`)

There are 87 `<area>:<verb>` invoke handlers in one table at `bbfb4c0`, plus the agent handlers from `agentIpc.js` and `hooksHandlers()`. `registerIpc` wraps each one so that a failure is logged and rejects to the renderer. Every handler validates `projectId` through `project(projectId)`, and `projectService` validates names (`assertName`: no `/`, `\` or leading `.`).

Push channels (main to renderer):

| Channel | Payload | Sent when |
|---|---|---|
| `project:changed` | `{projectId, space, dirNames[], indexChanged, costChanged}` | the debounced intents or ledger watch fires |
| `project:watchError` | `{projectId, message}` | the watcher fails |
| `config:changed` | `{projectId}` | config files, plan folders or the inflight file change |
| `features:changed`, `git:headChanged` | `{projectId}` | the feature docs or `.git/HEAD` change |
| `pty:data`, `pty:exit`, `agent-events:*`, `agent-hooks:changed`, `questions:changed`, `update:state`, `menu:command` | various | terminal, dialogs, updater, menu |

### `project:intent`, the intent detail

`loadIntentDetail(root, space, dirName)` returns:

```
{ dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale? }
state = { sections, project, scope, plan, startDate, depth, testStrategy, currentStage, currentStatus, lastUpdated,
          phases[{name, stages[{slug, status, mode}]}] }
graph = { workflowId, scope, startedAt, stages[{slug, agent, startedAt, completedAt, outcome, durationMs,
          unitsApproved, unitsSeen, sensorFirings}], boltDag } | null
events[] = { timestamp, timeMs, event, title, fields{}, source, index, key, seq, category }
```

### `project:cost`

The cached intent list plus `loadCrossMachineCost`: `summarizeLedger`'s shape (`project`, `perIntent`, `byScope`, `timeline[{dirName, slug, date, usd}]`) with `machines` and `partial`. It is the only handler today that reads every intent's audit shards.

### `features:load`

`loadFeatures(root, featuresPath)` plus `tags`:

```
{ available, overviewPath, overviewText, overviewHash, intro, warnings[], plans[{version, file, hash, headingOnly}],
  epics[{id, title, link, topic, status, statusKind, file, hash,
         parsed: {id, title, storiesLine, statusLine, stories[{id, title, status, statusText, criteria[], done, total, ...}], raw, warnings}}],
  tags[{name, date}] }
```

`status` is `planned | progress | done | deployed | null` from the first marker on the story head line. `releaseOf(statusText)` gives `{planned, released}`.

## 3. External Commands (through `runFixed`, no shell)

- **`aidlc`**: `--version`, `config <section> --show --json`, `config … --dry-run`, `engine config set`, `config flags`, `config models`, `engine scope save`, `engine graph compile`, `update --check`.
- **`git`** (`git.js`): `rev-parse`, `rev-list`, `status --porcelain`, `fetch --quiet`, `diff --name-only|--numstat`, `show <ref>:./<path>`, `tag --list v* --format=%(refname:short)%09%(creatordate:short)`, `log -1 --format=%s`, `remote get-url origin`, `for-each-ref`, `merge-tree --write-tree`. There is no `git log` over a path, so no file history.
- **`gh`**: release lookup for the updater (fallback only).

## 4. AI-DLC Files Read (contracts the app depends on)

| File | Parser | Fields used |
|---|---|---|
| `aidlc/spaces/<s>/intents/intents.json` | `parsers/intents.js` | `dirName`, `slug`, `scope`, `status`, `uuid` (no dates; the date comes from the `YYMMDD-` folder prefix) |
| `<intent>/aidlc-state.md` | `parsers/state.js` | Project Information (`Start Date`, `Scope`, `Plan`), Scope Configuration, Current Status (`Current Stage`, `Status`, `Last Updated`), stage checkboxes |
| `<intent>/runtime-graph.json` (git-ignored) | `parsers/runtimeGraph.js` | `stages[].{stage_slug, agent, started_at, completed_at, outcome, instances[], sensor_firings}`, `bolt_dag` |
| `<intent>/audit/*.md` | `parsers/audit.js` | `## Title` blocks with `**Key**: value` fields, separated by `---` |
| `<intent>/.aidlc-engine/active-directive.json` | none | `kind`, `stage`, `delivery` |
| `aidlc/.aidlc-sessions/usage-ledger.json` | `parsers/ledger.js` | schemaVersion 3 `usd` and token entries |

Audit events and fields US-0303 can use (seen in this project's shards):

| Event | Fields |
|---|---|
| `WORKFLOW_STARTED`, `WORKFLOW_COMPLETED` | `Scope`, `Request`, `Stage count`; completion also carries the cost rollup |
| `WORKFLOW_PARKED`, `WORKFLOW_UNPARKED` | `Stage` |
| `PHASE_STARTED`, `PHASE_COMPLETED`, `PHASE_SKIPPED`, `PHASE_VERIFIED` | `Phase` |
| `STAGE_STARTED`, `STAGE_COMPLETED`, `STAGE_SKIPPED`, `STAGE_JUMPED`, `STAGE_REVISING` | `Stage`, `Agent`; completion carries `Cost USD` and tokens |
| `STAGE_AWAITING_APPROVAL` | `Stage`, `Next Stage`, `Question Id`, `Question Type: gate` |
| `GATE_APPROVED`, `GATE_REJECTED` | `Stage`, `Person Reply`, `Message Id`; rejection `Feedback` |
| `PLAN_APPROVAL_BLOCKED`, `PLAN_APPROVAL_RECORDED`, `PLAN_APPROVAL_SKIPPED` | `Stage`, `Person Reply` |
| `REVIEW_REQUESTED`, `REVIEW_COMPLETED` | `Stage`, `Reviewer`, `Unit`, `Request Id`, `Verdict`, `Review Record` |

## 5. Feature-doc Contracts

- Story head line: `**US-XXYY: Title** <marker> <status text>`, with markers 📋 🚧 ✅ 🚀 and "for vX.Y.Z" / "Released in vX.Y.Z" in the status text (`parsers/features.js` `STORY_HEAD`, `parsers/releases.js`).
- Epic status line: `**Status (date):** …` (`parseEpic` `statusLine`).
- Release plans: `docs/releases/X.Y.Z.md`; tags `vX.Y.Z` with their creator dates.
