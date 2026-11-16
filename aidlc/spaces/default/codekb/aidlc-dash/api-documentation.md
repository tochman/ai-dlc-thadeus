# API Documentation

The app has no network API. Its surfaces are listed below.

## 1. Preload Bridge (`window.bridge`, `src/preload/index.js`)

Every member is named; no generic `invoke` or `send` is exposed. The groups:

| Group | Members (selection) |
|---|---|
| Project | `pickProject`, `openProject`, `closeProject`, `getSpaces`, `getIntents(projectId, space, onlyDirs)`, `getIntent(projectId, space, dirName)`, `getCost(projectId, space)`, `getTokenReadings(projectId, dirName)`, `getAgentProgress`, `getModels`, `detectHarnesses`, `onProjectChanged`, `onProjectDetected`, `onWatchError` |
| Files and editor | `readFile`, `readFileForEdit`, `writeFile` (hash-checked), `watchOpenFiles`, `listTree`, `onFileChanged`, `revealInFinder`, `openInEditor`, `pathForFile` |
| Terminal | `ptySpawn`, `ptyWrite`, `ptyResize`, `ptyKill`, `onPtyData`, `onPtyExit` |
| Git (read-only) | `getGitStatus`, `gitFetch`, `getRemoteChanges`, `showRemoteFile`, `getConflicts`, `onGitHeadChanged` |
| AI-DLC config | `getAidlcConfig`, `getWorkingAgents`, `previewConfigChange`/`applyConfigChange`, `previewGuardLock`/`applyGuardLock`, plans, models, `onConfigChanged` |
| Setup and tools | `getSetupInfo`, `runSetup`, `getTools`, `pickTool`, `saveTool`, `resetTool`, `getAidlcUpdateStatus`, `getAidlcProjectPlans` |
| Feature docs | `loadFeatures`, `getStoryLinks`, `setStoryRelease`, `createRelease`, `deleteRelease`, `getLifecycleRuleStatus`, `onFeaturesChanged` |
| Settings and app | `getSettings`, `setSettings`, `getLanguage`, `getProjectSettings`, `setProjectSettings`, `getAppInfo`, `openExternal(key)`, `openLicenses`, `toggleFullscreen`, `sendMenuState`, `onMenuCommand`, `openDocsUrl` |
| Updates | `checkUpdate`, `downloadUpdate`, `installUpdate`, `relaunchApp`, `skipUpdate`, `revealUpdate`, `onUpdateState` |
| Questions | `listQuestions`, `onQuestions`, `setActiveProject` |
| Agent dialogs | `agentEvents.{list, answer, close, latest, reopen, onChanged, onFocus}`, `agentHooks.{status, preview, apply, cancel, onChanged}` |

## 2. IPC Channels (`src/main/ipc.js`)

About 76 `ipcMain.handle` channels, named `<area>:<verb>`, plus the agent handlers. Every handler validates `projectId` through `project(projectId)`, and `projectService` validates names (`assertName`: no `/`, `\` or leading `.`).

Push channels (main to renderer):

| Channel | Payload | Sent when |
|---|---|---|
| `project:changed` | `{projectId, space, dirNames[], indexChanged, costChanged}` | the debounced intents, worktree-plan or ledger watch fires; only the ledger sets `costChanged` |
| `project:watchError` | `{projectId, message}` | the watcher fails |
| `config:changed` | `{projectId}` | config files, plan folders or the inflight file change |
| `features:changed`, `git:headChanged` | `{projectId}` | the feature docs or `.git/HEAD` change |
| `pty:data`, `pty:exit`, `agent-*`, `questions:changed`, `update:state`, `menu:command` | various | terminals, agent dialogs, questions, the updater, the menu |

### `project:cost` (US-0209's output)

`(projectId, space)` → `loadCost(root)`; when unavailable, `{available: false, reason}` is returned as it is. Otherwise `{available: true, stale?, warning?, project, perIntent, byScope, timeline}`:

```
project   = { total: Cost, byModel: Row[], byAgent: Row[], legacy: Cost | null, agentModels, complete }
perIntent = { [dirName]: IntentCost | null }          // null = no ledger entry, shown as "–"
IntentCost = { total: Cost, tokens: {input, output, cacheCreate5m, cacheCreate1h, cacheRead},
               byStage: Row[], byAgent: Row[], byModel: Row[], stageModels, agentModels, complete }
Cost = { usd, tokens: {input, output, cacheWrite, cacheRead}, totalTokens, missingPrice }
Row  = Cost & { name }
byScope = { [scope]: {usd, count, avg, missingPrice} }; timeline = [{dirName, slug, date, usd}]
```

Side effect: a token reading for each `in-flight` intent (`recordReading`, not awaited). `modelUsage` and `modelEstimate` in `ipc.js` use `summarizeLedger(ledger, [])` for the project level only.

### `tokens:readings`

`(projectId, dirName)` → the intent's stored readings `[{at, input, output, cacheWrite5m, cacheWrite1h, cacheRead, usd}]`, oldest first; `[]` when missing or corrupt.

## 3. External Commands (through `runFixed`, no shell)

- **`aidlc`**: `--version`, `config <section> --show --json --harness <id>`, `config … --dry-run`, `config --harness <id> --yes`, `engine config set`, `config flags`, `config models`, `engine scope save`, `engine graph compile`, `update --check`.
- **`git`**: `fetch`, `rev-parse`, `rev-list`, `diff`, `status`, `show <remote>:<path>`, `tag --list`, `ls-files`, `log -1` in a worktree (US-0507), `init` (setup only).
- **`gh`**: release lookup for the updater (fallback only).

## 4. AI-DLC Files Read (contracts the app depends on)

| File | Parser | Fields used |
|---|---|---|
| `aidlc/spaces/<s>/intents/intents.json` | `parsers/intents.js` | `dirName`, `slug`, `scope`, `status`, `uuid` |
| `<intent>/aidlc-state.md` | `parsers/state.js` | Project Information, Scope Configuration, Current Status, stage checkboxes |
| `<intent>/runtime-graph.json` | `parsers/runtimeGraph.js` | `stages[]`, `instances[]`, `bolt_dag` |
| `<intent>/audit/*.md` | `parsers/audit.js` | `## Title` blocks with `**Key**: value` fields, separated by `---` |
| `<intent>/.aidlc-engine/active-directive.json` | none | `kind`, `stage`, `delivery` |
| `aidlc/.aidlc-sessions/usage-ledger.json` | `parsers/ledger.js` | schemaVersion 3: `totals`, `byModel`, `byAgent`, `workflows["intent:<uuid>" \| "record:<space>/legacy"].{totals, byStage.{totals, byModel, byAgent}, byModel, byAgent}`; each node `{tokens: {input, output, cacheCreate5m, cacheCreate1h, cacheRead}, usd}` |
| `aidlc/.aidlc-subagent-inflight` | `projectService.inflightCount` | `entries[]` length |
| `aidlc/.aidlc-clone-id` (not read yet) | none | this clone's id, the suffix of its shard name |

### Audit cost rollups (seen in the committed shards)

Shard name: `<host>-<clone-id>.md`, one per clone and intent. `STAGE_COMPLETED` (with `Stage`) and `WORKFLOW_COMPLETED` (whole intent) carry:

```
**Tokens In**: 174
**Tokens Out**: 70968
**Cache Read**: 13426141
**Cache Write**: 350484
**Cost USD**: 6.18
**By Model**: opus-5-5=6.18
**By Agent**: main=2.93; aidlc-developer-agent=3.25
**Tokens By Model**: opus-5-5=174/71k/13.4M/350.5k
**Tokens By Agent**: main=104/29k/7.5M/107.2k; aidlc-developer-agent=70/42k/6M/243.3k
```

- `By …` lists are `name=usd` joined by `; `. `Tokens By …` values are `in/out/cacheRead/cacheWrite`, rounded with `k`/`M`.
- `Cache Write` is one figure; the ledger splits it 5 m / 1 h.
- Not every `STAGE_COMPLETED` has the fields (147 of 254 in this repo carry `Cost USD`).
- A stage completed twice carries cumulative figures (see `code-quality-assessment.md`, note 2).
