# API Documentation

The app has no network API. Its surfaces are listed below. The EPIC-14 contracts (detection, settings, token log, terminal commands) are in section 8.

## 1. Preload Bridge (`window.bridge`, `src/preload/index.js`)

Every member is named; no generic `invoke` or `send` is exposed. The groups:

| Group | Members (selection) |
|---|---|
| Project | `pickProject`, `openProject`, `closeProject`, `getSpaces`, `getIntents(projectId, space, onlyDirs)`, `getIntent(projectId, space, dirName)`, `getCost`, `getVelocity`, `getTokenReadings`, `getAgentProgress(projectId, dirName)`, `getModels`, `detectHarnesses`, `onProjectChanged`, `onProjectDetected`, `onWatchError` |
| Agent activity (US-0214) | `agentActivity.list(projectId)`, `agentActivity.onChanged(fn)` |
| Files and editor | `readFileForEdit` (`file:read`), `writeFile` (`file:write`, hash-checked), `watchOpenFiles`, `listTree`, `onFileChanged`, `revealInFinder`, `openInEditor`, `pathForFile` |
| Terminal | `ptySpawn`, `ptyWrite`, `ptyResize`, `ptyKill`, `onPtyData`, `onPtyExit` |
| Git (read-only) | `getGitStatus`, `gitFetch`, `getRemoteChanges`, `showRemoteFile`, `getConflicts`, `onGitHeadChanged` |
| Team (US-1201) | platform, pulls, collisions, machines, comments, merge note |
| AI-DLC config | `getAidlcConfig`, `getWorkingAgents`, `previewConfigChange`, `applyConfigChange`, `previewGuardLock`, `applyGuardLock`, `onConfigChanged` |
| Models (US-0904) | `getModelOptions(projectId, harness)`, `previewModelChange(projectId, change)`, `applyModelChange(projectId, change)`, `checkModels(projectId, harness)` |
| Cost rules (US-0212) | `costRulesStatus`, `previewCostRules`, `applyCostRules` |
| Setup and tools | `getSetupInfo`, `runSetup`, `getTools`, `pickTool`, `saveTool`, `resetTool`, `getAidlcUpdateStatus`, `getAidlcProjectPlans` |
| Feature docs | `loadFeatures`, `getStoryLinks`, `setStoryRelease`, `createRelease`, `deleteRelease`, `getPlanningStatus`, `pushPlanning`, `getLifecycleRuleStatus`, `onFeaturesChanged` (lines 85-95, 138) |
| Settings and app | `getSettings`, `setSettings`, `getLanguage`, `getProjectSettings(projectId)`, `setProjectSettings(projectId, partial)`, `getAppInfo`, `openExternal(key)`, `openLicenses`, `toggleFullscreen`, `sendMenuState`, `onMenuCommand`, `openDocsUrl` |
| Updates | `checkUpdate`, `downloadUpdate`, `installUpdate`, `relaunchApp`, `skipUpdate`, `revealUpdate`, `onUpdateState` |
| Questions, agent dialogs | `listQuestions`, `onQuestions`, `setActiveProject`; `agentEvents.*`, `agentHooks.*` |

Since US-0608 there is a planning push, `onPlanningChanged` (`features:planningChanged`), and `resolvePlanning` (`features:resolvePlanning`) (re-read at `90031e2`).

## 2. IPC Channels (`src/main/ipc.js`)

All invoke handlers sit in one `<area>:<verb>` table, plus the agent handlers from `agentIpc.js` and `hooksHandlers()`. `registerIpc` wraps each one so that a failure is logged and rejects to the renderer (the renderer strips the "Error invoking remote method" prefix). Every handler checks `projectId` through `project(projectId)`.

Push channels (main to renderer):

| Channel | Payload | Sent when |
|---|---|---|
| `project:changed` | `{projectId, space, dirNames[], indexChanged, costChanged}` | the debounced intents, ledger or usage watch fires |
| `project:watchError` | `{projectId, message}` | the watcher fails |
| `config:changed` | `{projectId}` | config files, plan folders or the inflight file change, or a config, model, guard-lock or cost-rules apply succeeds |
| `questions:changed` | the waiting questions of every open project | `refreshQuestions` after an intent change |
| `features:changed` | `{projectId}` | the docs watcher fires; after every successful planning action; after a cycle that re-applied or pushed; after `projectSettings:set`; after `planningStatus` re-applied |
| `git:headChanged` | `{projectId}` | `.git/HEAD` changes |
| `agent:activity` | `{projectId, rows}` | 250 ms after an accepted hook event of the project, and 30 s after its last one |
| `pty:data`, `pty:exit`, `agent-events:*`, `agent-hooks:changed`, `update:state`, `menu:command` | various | terminal, dialogs, updater, menu |

### Models channels (US-0904; kept, not re-verified)

| Channel | Arguments | Returns |
|---|---|---|
| `models:options` | `projectId, harness` | `{harness, editable, reason?, models[], efforts[], applied{}, configured[], usage}` |
| `models:preview` | `projectId, change` | `{command, dryRun\|null, error?, estimate\|null}` |
| `models:apply` | `projectId, change` | `{ok: true, command, output}` or `{ok: false, command, error}` |
| `models:check` | `projectId, harness` | `aidlc config models --check` result as a value |

`change = {harness, where, agent?, preset?, group?, model?, effort?}`, with exactly one of `agent`, `preset` and `group` (as of `2b5d6a4`).

### `projectSettings:get` / `projectSettings:set`

`get` returns `projectSettings[root]` or `{featureDocs: 'auto', featuresPath: 'docs/FEATURES.md'}`. `set` passes only the known fields on: `featureDocs`, `featuresPath`, `harness`, `harnessTabs`, `delivery`, `modelProfiles`, `planningBranch`, `ratesPath`, `handoff` (`ipc.js:1221-1231`). Afterwards it restarts the feature-docs watch and sends `features:changed`.

### `project:intents`

`{intents[], warning}`. Each intent has `{uuid, slug, dirName, scope, status, missingOnDisk, missingInIndex, date, active}` from `intents.json` and the folders on disk, plus `{stateScope, plan, request, currentStage, stateStatus, done, executed, activityAt, error?, stale?}` from the state file.

### `project:intent`, `project:cost`, `project:velocity` (not re-read)

- `project:intent` is `{dirName, state, graph, pipeline, events, units, directive, files, warnings}`;
- `project:cost` is `summarizeLedger`'s shape with `machines` and `partial`;
- `project:velocity` (US-0303) is the intent, story and project metrics.

## 3. External Commands (through `runFixed`, no shell)

- **`aidlc`**: `--version`; `config <section> --show --json --harness <h>`; `config … --dry-run`, `engine config set`, `config flags`; `config models --show --json | --check | <policy> --harness <h> --project|--local --yes|--dry-run`; `engine scope save`, `engine graph compile`, `update --check`. Timeouts: 10 s for reads in `models.js`, 20 s in `modelChoice.js`, 120 s for config apply.
- **`git`** (`git.js`): fixed commands with `safeArg`. Release planning (`planningSync.js`, 30 s per call) adds writes:
  - `status --porcelain -z --untracked-files=all -- <doc paths>`, `add -A -- <files>`, `commit --quiet -m <subject> -- <files>`, `reset`;
  - `worktree add|remove|prune`;
  - `rev-parse --verify`, `rev-list --count`, `check-ref-format --branch`;
  - `fetch --quiet --prune origin`, `rebase`/`rebase --abort`;
  - `push --quiet origin HEAD:refs/heads/<target>`, `merge --ff-only`, `branch -D dash/planning`.
- **`gh`** (the saved path or `gh`, 30 s): `api repos/{owner}/{repo}/branches/main/protection`, `pr create --base main --head <docs branch>`, `pr merge <branch> --squash`; and the updater's release lookup (fallback).

## 4. AI-DLC Files Read (contracts the app depends on; not re-read)

| File | Parser | Fields used |
|---|---|---|
| `aidlc/spaces/<s>/intents/intents.json` | `parsers/intents.js` | `dirName`, `slug`, `scope`, `status`, `uuid` |
| `<intent>/aidlc-state.md` | `parsers/state.js` | Project Information, Current Status, stage checkboxes |
| `<intent>/runtime-graph.json` (git-ignored) | `parsers/runtimeGraph.js` | stages, `bolt_dag` |
| `<intent>/audit/*.md` | `parsers/audit.js` | `## Title` blocks with `**Key**: value` fields |
| `<intent>/.aidlc-engine/active-directive.json` | none | `kind`, `stage`, `delivery` |
| `<intent>/construction/[<unit>/]code-generation/code-generation-plan.md` | `planSteps` | `- [x]` / `- [ ]` lines |
| `aidlc/.aidlc-sessions/usage-ledger.json` | `parsers/ledger.js` | schemaVersion 3 `usd` and token entries |
| the inflight file (`INFLIGHT_PATH`) | `inflightCount` | `entries.length` |

The audit events used (`WORKFLOW_*`, `PHASE_*`, `STAGE_*`, `GATE_*`, `PLAN_APPROVAL_*`, `REVIEW_*`, `SUBAGENT_*`, `WORKTREE_CREATED`, `BOLT_*`) and their fields are as recorded at `bbfb4c0` and `0ebb196`.

## 5. Feature-doc Contracts (re-read at `39a3dbf`)

- Story head line: `**US-XXYY: Title** <marker> <status text>` (`STORY_HEAD`), with the markers 📋 🚧 ✅ 🚀. "for vX.Y.Z" means planned, "Released in vX.Y.Z" means released (case-insensitive).
- `setReleaseMarker(text, storyId, version|null)` changes only the story's head line, and the segments of a `**Status (…):**` line or a table row that name that story alone (split on `·`, `. `, `|`). A segment that names several stories is left alone.
- Release plans: `docs/releases/X.Y.Z.md` beside the overview's folder (`plansDir`), starting `# Release plan vX.Y.Z`. `addPlanRows` and `removePlanRows` work on the first table whose header starts with `| Story |`.
- Tags `vX.Y.Z` with their creator dates; a planned story whose tag exists is `stale`.
- Hashes: `loadFeatures` gives `overviewHash`, each epic's `hash` and each plan's `hash`, as the sha256 of the UTF-8 text. `writeFileSafe` compares them with the sha256 of the bytes on disk.

## 6. Agent Progress Contracts (read at `0ebb196`, not re-verified)

- `agents:progress(projectId, dirName)` returns audit rows `[{kind: 'build'|'review'|'agent', key, unit, agent, stage, startedMs, endedMs, status, minutes, ...}]`. A build adds `steps`, `unreadable`, `commit` and `worktree`; a review adds `reviewer`, `verdict`, `record`, `severities`.
- `agentActivity:list(projectId)` and `agent:activity` return hook rows `[{key, kind: 'main'|'agent', parent, sessionId, tabId, harness, agentId, agentType, state, tool, reason, error, sinceMs}]`.
- Hook channel (`dialog.sh`, protocol C1 v1): an event file is `THADEUS-EVENT v1 <kind> <secret>` followed by the raw hook payload. The adapters keep only `IDENT`-shaped fields.

## 7. Release Planning Contracts (US-0606, US-0607; read at `39a3dbf`)

### Invoke channels

| Channel | Arguments | Returns |
|---|---|---|
| `features:load` | `projectId` | `loadFeatures(...)` plus `tags` |
| `features:setRelease` | `projectId, {storyId, version\|null, epicHash, overviewHash}` | `{ok, inPlace, error?}` or `{conflict: rel}`; throws for an unknown or released story |
| `features:createRelease` | `projectId, version` | same; throws for a bad or known version |
| `features:deleteRelease` | `projectId, {version, hash}` | same; throws when `canDelete` refuses |
| `features:planningStatus` | `projectId, opened` | `{pending, reapplied, noRemote, prOffer, error}`; `opened === true` re-applies lost actions first |
| `features:pushPlanning` | `projectId` | runs a cycle now (ignores idle), then the status |
| `file:read` / `file:write` | `projectId, rel[, content, {mtimeMs, hash}]` | `readForEdit` / `writeFileSafe` result; engine-owned paths throw |

`error` is `{kind: 'offline'|'conflict'|'push'|'commit'|'git', reason?, files?}`. `pending` is the count of every recorded action, committed or not.

### Planning record (`<userData>/planning/<sha1(root)>.json`)

```json
{ "protectedMain": true, "actions": [
  { "id": "uuid", "kind": "setRelease", "storyIds": ["US-0608"], "version": "v0.2.10", "at": "ISO", "state": "pending" } ] }
```

Invalid actions are dropped on read; an unreadable file reads as empty (and warns). `kind` must be in `KINDS`, `version` must be `vX.Y.Z` or null, and `storyIds` must be `US-\d{4}`.

### Commit subjects

`subjectOf`: `docs: plan US-A, US-B for vX.Y.Z; plan vX.Y.Z; remove the plan for vX.Y.Z; take US-C out of their release`. With no actions (agent edits only) it is `docs: update the feature docs`. The pull request title is the single subject or `docs: release planning`.

## 8. Framework-dependent Contracts (EPIC-14 area, read at `90031e2`)

### Detection (`project:open`, `project:detected`)

- `project:open(dir)` returns `{projectId, root, name, detection}`.
- `detection` is `{isAidlc: true, activeSpace, spaces[]}`, or `{isAidlc: false, reason}`. `reason` is `errors.notAidlc` (no `aidlc/spaces/`) or `errors.noSpace`.
- `activeSpace` is `aidlc/active-space` when it names a space, else `default`, else the first.
- `project:detected {projectId, detection}` is pushed once, when `aidlc/spaces/<space>` appears in a folder opened without AI-DLC.
- No other field exists. A `framework` must be added to this payload, or sent beside it.

### Project settings (`projectSettings:get|set`)

- They are stored in `userData/settings.json` → `projectSettings[<real root path>]`, capped at 200 roots. Nothing is stored in the repository.
- `get` returns the saved object or `PROJECT_DEFAULTS`.
- `set` validates each known key and throws on a bad value. `ipc.js:1298-1310` passes only the nine known keys, so a new key (for example `framework`) must be added in three places: `sanitizeProject`, the checks in `setProjectSettings`, and the `ipc.js` pass-through.

### Token log (`tokens:readings`, `.thadeus/tokens/`)

- The file is `.thadeus/tokens/<dirName>.json`, an array of `{at, input, output, cacheWrite5m, cacheWrite1h, cacheRead, usd}`, at most 2000 readings, 30 s apart.
- `dirName` must match `^[\w.-]+$` (`tokenReadings.fileOf`), which Spec Kit names such as `001-photo-albums` do.
- Writer: only `project:cost`, from AI-DLC's `aidlc/.aidlc-sessions/usage-ledger.json`, for intents with `status === 'in-flight'`.
- Reader: `tokens:readings(projectId, dirName, space)`. It looks the name up in the intent list; a finished intent without readings is rebuilt from the ledger's transcript sessions inside its audit stage windows (`tokenHistory.js`).
- A Spec Kit project has neither a ledger nor an audit log, so both the writer and the rebuild need a new source.

### Terminal commands (renderer only)

- `HARNESSES[].commands` is `{aidlc: '/aidlc'}` for `claude` and `opencode`, and `{}` for the others. `harnessCommand(entry, suffix)` returns `commands.aidlc + suffix`, or null.
- Resume types `"/aidlc"` (no Enter) for the active intent. For another one it runs `sequence`: `"/aidlc intent <dir>"` with Enter, then `"/aidlc"` without. The folder name must match `^[A-Za-z0-9][A-Za-z0-9._-]*$`.
- Quick commands: `QUICK_COMMANDS = [' --status', ' --doctor', ' continue']`, typed without Enter.
- All of them go through `TerminalContext.type(tab, text, {submit})` or `sequence(tab, steps)`, then `pty:write`. No main channel builds commands; the text never crosses into main except as pty input.
