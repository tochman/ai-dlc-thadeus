# API Documentation

The app has no network API. Its surfaces are listed below. US-0210 will extend the models channels and the project settings, and add one push channel (in design).

## 1. Preload Bridge (`window.bridge`, `src/preload/index.js`)

Every member is named; no generic `invoke` or `send` is exposed. The groups (the preload was only searched in this run):

| Group | Members (selection) |
|---|---|
| Project | `pickProject`, `openProject`, `closeProject`, `getSpaces`, `getIntents(projectId, space, onlyDirs)`, `getIntent(projectId, space, dirName)`, `getCost`, `getVelocity`, `getTokenReadings`, `getAgentProgress`, `getModels`, `detectHarnesses`, `onProjectChanged`, `onProjectDetected`, `onWatchError` |
| Files and editor | `readFile`, `readFileForEdit`, `writeFile` (hash-checked), `watchOpenFiles`, `listTree`, `onFileChanged`, `revealInFinder`, `openInEditor`, `pathForFile` |
| Terminal | `ptySpawn`, `ptyWrite`, `ptyResize`, `ptyKill`, `onPtyData`, `onPtyExit` |
| Git (read-only) | `getGitStatus`, `gitFetch`, `getRemoteChanges`, `showRemoteFile`, `getConflicts`, `onGitHeadChanged` |
| Team (US-1201) | platform, pulls, collisions, machines, comments, merge note |
| AI-DLC config | `getAidlcConfig`, `getWorkingAgents`, `previewConfigChange`, `applyConfigChange`, `previewGuardLock`, `applyGuardLock`, `onConfigChanged` |
| Models (US-0904) | `getModelOptions(projectId, harness)`, `previewModelChange(projectId, change)`, `applyModelChange(projectId, change)`, `checkModels(projectId, harness)` |
| Cost rules (US-0212) | `costRulesStatus`, `previewCostRules`, `applyCostRules` |
| Setup and tools | `getSetupInfo`, `runSetup`, `getTools`, `pickTool`, `saveTool`, `resetTool`, `getAidlcUpdateStatus`, `getAidlcProjectPlans` |
| Feature docs | `loadFeatures`, `getStoryLinks`, `setStoryRelease`, `createRelease`, `deleteRelease`, `getLifecycleRuleStatus`, `onFeaturesChanged` |
| Settings and app | `getSettings`, `setSettings`, `getLanguage`, `getProjectSettings(projectId)`, `setProjectSettings(projectId, partial)`, `getAppInfo`, `openExternal(key)`, `openLicenses`, `toggleFullscreen`, `sendMenuState`, `onMenuCommand`, `openDocsUrl` |
| Updates | `checkUpdate`, `downloadUpdate`, `installUpdate`, `relaunchApp`, `skipUpdate`, `revealUpdate`, `onUpdateState` |
| Questions, agent dialogs | `listQuestions`, `onQuestions`, `setActiveProject`; `agentEvents.*`, `agentHooks.*` |

## 2. IPC Channels (`src/main/ipc.js`)

All invoke handlers sit in one `<area>:<verb>` table, plus the agent handlers from `agentIpc.js` and `hooksHandlers()`. `registerIpc` wraps each one so that a failure is logged and rejects to the renderer. Every handler checks `projectId` through `project(projectId)`.

Push channels (main to renderer):

| Channel | Payload | Sent when |
|---|---|---|
| `project:changed` | `{projectId, space, dirNames[], indexChanged, costChanged}` | the debounced intents, ledger or usage watch fires |
| `project:watchError` | `{projectId, message}` | the watcher fails |
| `config:changed` | `{projectId}` | config files, plan folders or the inflight file change, or a config, model, guard-lock or cost-rules apply succeeds |
| `questions:changed` | the waiting questions of every open project | `refreshQuestions` after an intent change |
| `features:changed`, `git:headChanged` | `{projectId}` | the feature docs or `.git/HEAD` change; also after `projectSettings:set` |
| `pty:data`, `pty:exit`, `agent-events:*`, `agent-hooks:changed`, `update:state`, `menu:command` | various | terminal, dialogs, updater, menu |

### Models channels (US-0904)

| Channel | Arguments | Returns |
|---|---|---|
| `models:options` | `projectId, harness` | `{harness, editable, reason?, models[], efforts[], applied{}, configured[], usage}`; refreshed on every call |
| `models:preview` | `projectId, change` | `{command, dryRun\|null, error?, estimate\|null}` |
| `models:apply` | `projectId, change` | `{ok: true, command, output}` or `{ok: false, command, error}`; on success clears the caches and sends `config:changed` |
| `models:check` | `projectId, harness` | `aidlc config models --check` result as a value |

`change = {harness: 'claude'|'opencode', where: 'project'|'local', agent?, preset?, group?, model?, effort?}`. Exactly one of `agent`, `preset` and `group` is allowed. `buildModelCommand` turns it into:
- `--agent <a> [--effort e] [--model m]`;
- `--preset thorough|balanced|minimal`;
- `--<group>-effort <e>`.

Each is followed by `--harness <h> --<where>` and then `--yes` or `--dry-run`. Any other field or value throws before a command runs. There is no `--from` today.

### `projectSettings:get` / `projectSettings:set`

`get` returns `projectSettings[root]` or `{featureDocs: 'auto', featuresPath: 'docs/FEATURES.md'}`. `set` passes only `featureDocs`, `featuresPath`, `harness`, `harnessTabs` and `delivery` on to `setProjectSettings`, which validates each one and merges it. Afterwards it restarts the feature-docs watch and sends `features:changed`.

### `project:intents`

`{intents[], warning}`. Each intent has:
- `{uuid, slug, dirName, scope, status, missingOnDisk, missingInIndex, date, active}` from `intents.json` and the folders on disk;
- `{stateScope, plan, request, currentStage, stateStatus, done, executed, activityAt, error?, stale?}` from the state file.

`scope` is `intents.json`'s, else the state file's.

### `project:intent`, `project:cost`, `features:load`, `project:velocity`

The shapes are unchanged since the previous scan (not re-read):
- `project:intent` is `{dirName, state, graph, pipeline, events, units, directive, files, warnings}`;
- `project:cost` is `summarizeLedger`'s shape with `machines` and `partial`;
- `features:load` is `loadFeatures` plus `tags`;
- `project:velocity` (US-0303) is the intent, story and project metrics.

## 3. External Commands (through `runFixed`, no shell)

- **`aidlc`**:
  - `--version`;
  - `config <section> --show --json --harness <h>` (sections `models`, `flags`, `providers`, `project`);
  - `config … --dry-run`, `engine config set`, `config flags`;
  - `config models --show --json | --check | <policy> --harness <h> --project|--local --yes|--dry-run`;
  - `engine scope save`, `engine graph compile`, `update --check`.

  Timeouts: 10 s for reads in `models.js`, 20 s in `modelChoice.js`, 120 s for config apply.
- **`aidlc config models` contract (input for US-0210)**:
  - `--from <preset|profile>` loads a preset's or a saved profile's group efforts.
  - `--save-as <name>` (lowercase letters, digits and hyphens) needs `--from`.
  - `--from` and `--preset` are mutually exclusive.
  - A saved profile is `{groups: {deciding|reviewing|writing-up: {effort}}}`, so it carries no models.
  - `--show --json` gives `data.effective[{agent, model, effort, modelSource, effortSource}]`. Whether it also lists profiles is not known.
- **`git`** (`git.js`): read-only fixed commands, including `log -p` over the epic files for US-0303.
- **`gh`**: release lookup for the updater (fallback only).

## 4. AI-DLC Files Read (contracts the app depends on)

| File | Parser | Fields used |
|---|---|---|
| `aidlc/spaces/<s>/intents/intents.json` | `parsers/intents.js` | `dirName`, `slug`, `scope`, `status` (seen: `complete`, `in-flight`; `archived` handled), `uuid`. No dates: the date comes from the `YYMMDD-` folder prefix |
| `<intent>/aidlc-state.md` | `parsers/state.js` | Project Information (`Start Date`, `Scope`, `Plan` = a custom plan's name), Current Status (`Current Stage`, `Status`, `Last Updated`), stage checkboxes |
| `<intent>/runtime-graph.json` (git-ignored) | `parsers/runtimeGraph.js` | stages, `bolt_dag` |
| `<intent>/audit/*.md` | `parsers/audit.js` | `## Title` blocks with `**Key**: value` fields |
| `<intent>/.aidlc-engine/active-directive.json` | none | `kind`, `stage`, `delivery` |
| `aidlc/.aidlc-sessions/usage-ledger.json` | `parsers/ledger.js` | schemaVersion 3 `usd` and token entries |

Audit events and fields (seen in this project's shards at `bbfb4c0`, not re-read):

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

- Story head line: `**US-XXYY: Title** <marker> <status text>`, with the markers 📋 🚧 ✅ 🚀 and "for vX.Y.Z" / "Released in vX.Y.Z".
- Epic status line: `**Status (date):** …`.
- Release plans: `docs/releases/X.Y.Z.md`; tags `vX.Y.Z` with their creator dates.
